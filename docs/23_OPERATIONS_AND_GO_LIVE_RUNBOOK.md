# Operations, Backup/Restore & Closed Beta Go-Live Runbook

> Scope: **Mianwali Closed Beta** (`D-003`), aligned with `docs/07_SECURITY_PRIVACY_QA.md`, `docs/19_PHASE_2_OPEN_QUESTIONS.md`, and Milestone 7 security audit remediations (`1c52940`, `5521f71`).

---

## 1. CI Verification Baseline
- GitHub Actions workflow `.github/workflows/ci.yml` executes against live `postgres:16-alpine` on every push and PR to `main`:
  1. `prisma validate` & `prisma generate`
  2. `prisma migrate deploy` & `prisma:seed`
  3. Security Checks: tracked secret guard, unsafe sink pattern check, `pnpm audit --prod --audit-level=critical`
  4. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
  5. Playwright Chromium Web E2E (`pnpm --filter @saudavo/web test:e2e`)
- Commit `5521f71` verified green on CI Run `44856807889`.

---

## 2. Production Environment & Secrets Checklist
Ensure all required variables from `.env.example` are injected via the hosting platform secret manager (never committed to git):
- `NODE_ENV=production` (enforces fail-closed checks on `WEB_ORIGIN`, `MFA_ENCRYPTION_KEY`, `OUTBOX_ENCRYPTION_KEY`, `S3_*`)
- `WEB_ORIGIN=https://<production-web-domain>`
- `TRUST_PROXY=1` (preserves real client IPs behind reverse proxy/CDN for `RateLimitGuard` and `AdminAuditLog`)
- `DATABASE_URL` (TLS-enabled PostgreSQL connection string with least-privilege DB role)
- `MFA_ENCRYPTION_KEY` & `OUTBOX_ENCRYPTION_KEY` (independent 32+ byte random keys)
- `SESSION_SECRET` & `CSRF_SECRET` (independent 32+ byte random keys)
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- `SENTRY_DSN` (PII-scrubbed error reporting via `ErrorReporterService`)
- `RESEND_API_KEY` & `MAIL_FROM` (optional transactional password-reset email delivery; falls back cleanly to encrypted `OutboxEvent` queueing when unset)

---

## 3. Private S3 Bucket & Media Security Setup
1. **Block Public Access:** Enable **Block All Public Access** at bucket level; media is accessed exclusively via short-lived (`600s`) AWS SigV4 presigned `GET` URLs issued after ownership checks.
2. **Server-Side Verification & EXIF Stripping:** `MediaService.confirmUpload` (`apps/api/src/modules/media/media.service.ts`) enforces server-side object download, binary magic-byte validation (`JPEG`/`PNG`/`WebP`), and automatic binary EXIF/XMP/comment stripping via `S3PresignerService.verifyAndSanitizeUploadedObject` whenever `NODE_ENV=production` or `S3_ENDPOINT` is configured.
3. **CORS Policy (Bucket PUT only):** Allow `PUT` from `WEB_ORIGIN` only with `Content-Type` header; disallow anonymous `GET`/`LIST`/`DELETE`.
4. **IAM Least Privilege:** Grant the API IAM user/key `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` scoped strictly to `arn:aws:s3:::<bucket>/stores/*`.

---

## 4. Encrypted PostgreSQL Backups & Restore Drill Procedure
> Requirement (`docs/07_SECURITY_PRIVACY_QA.md`): Backups must be encrypted at rest and periodically restore-tested before live customer orders.

### Daily Automated Backup
1. Enable managed provider automated daily snapshots + Point-In-Time Recovery (PITR) where supported, plus an encrypted off-site `pg_dump` archival job:
   ```bash
   DATE_STAMP=$(date -u +%Y-%m-%dT%H%MZ)
   pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges \
     | openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
     > "saudavo-prod-${DATE_STAMP}.dump.enc"
   ```
2. Upload `.dump.enc` to a private backup bucket with versioning + 30-day retention lock; never log `BACKUP_ENCRYPTION_PASSPHRASE` or `DATABASE_URL`.

### Restore Drill (Before Launch + Monthly Thereafter)
1. Provision a **disposable staging database** (never touch production DB).
2. Decrypt and restore:
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
     -in "saudavo-prod-${DATE_STAMP}.dump.enc" \
     | pg_restore --dbname="$STAGING_DATABASE_URL" --clean --if-exists --no-owner --no-privileges
   ```
3. Verify schema & invariant integrity on staging:
   - Check table row counts (`users`, `stores`, `orders`, `commission_ledger`, `payments`, `admin_audit_logs`).
   - Run `pnpm --filter @saudavo/api exec prisma migrate status` -> confirms `Database schema is up to date!`.
   - Record drill date, operator, elapsed RTO, and verification outcome in ops log.

---

## 5. Error Monitoring & Observability (`SENTRY_DSN`)
- `ErrorReporterService` (`apps/api/src/common/monitoring/error-reporter.service.ts`) automatically hooks into `HttpExceptionFilter`.
- Every unhandled 5xx exception log and outbound Sentry Envelope scrubs:
  - Emails -> `[REDACTED_EMAIL]`
  - Pakistani mobile numbers (`+923XXXXXXXXX`, `03XXXXXXXXX`) -> `[REDACTED_PHONE]`
  - `password`, `token`, `secret`, `csrf`, `saudavo_sid`, `cookie`, `authorization` pairs -> `[REDACTED_SECRET]`
  - PostgreSQL DSNs -> `postgresql://[REDACTED_DSN]`
- No request headers, cookies, or request bodies are attached to outbound Sentry events.

---

## 6. Incident Response Procedures

### A. User Password Recovery & Admin MFA Loss (`PQ-05` / `PQ-06`)
1. Email-registered users reset via `/auth` → **"Forgot password?"** (`POST /api/v1/auth/password-reset/request` + `/confirm`). Phone-only accounts (`PQ-05`) or local developers without SMTP configured can ask an authorized operator with DB/shell access to issue a single-use 30-minute reset link:
   ```bash
   pnpm --filter @saudavo/api auth:recover -- <email-or-pakistan-phone>
   ```
2. For staff MFA loss, the staff member must contact a `SUPER_ADMIN` out-of-band (verified identity check).
3. `SUPER_ADMIN` temporarily revokes active sessions (`user_sessions.revoked_at = NOW()`), resets `mfa_enabled = false` / `mfa_secret_encrypted = NULL` inside an audited administrative maintenance window, and rotates credentials.
4. Staff re-enrolls TOTP immediately and verifies via `POST /api/v1/auth/admin/mfa/verify` (`STAFF_MFA_VERIFIED` written to `admin_audit_logs`).

### B. Payment / COD / Manual Offline Dispute Incident
1. **COD-only policy:** Platform never holds customer funds, wallets, or escrow (`D-014`, `PQ-13`, `PQ-14`).
2. When buyer/seller disputes COD cash handover or `REMOTE` manual offline transfer:
   - `SUPPORT`/`ADMIN` opens order dispute, inspects `order_status_history`, `payment_events`, and `order_messages` (every staff read/action generates an `AdminAuditLog` row).
   - For disputed reversals/refunds, `ADMIN` records explicit adjustment/refund entry in `commission_ledger` (never mutating historical ledger rows).

### C. Security / Data Breach Escalation
1. Immediately rotate compromised `SESSION_SECRET`, `CSRF_SECRET`, `MFA_ENCRYPTION_KEY`, `OUTBOX_ENCRYPTION_KEY`, and `S3_*` credentials.
2. Revoke all active `user_sessions` (`UPDATE user_sessions SET revoked_at = NOW() WHERE revoked_at IS NULL`).
3. Preserve immutable `admin_audit_logs` and API `requestId` traces for root-cause investigation.
4. Notify affected users and regulators per legal counsel (`Gate F`).

---

## 7. Scheduled Background Operations & Founder Sign-Off Status
### Scheduled Sweeps
- **DB-Backed Outbox Processor (`OutboxProcessorService`):** Polls due `PENDING` `OutboxEvent` rows every 60 seconds in development/production (`ENABLE_BACKGROUND_WORKERS !== "false"`, inert in `test`), marking processed bus items and applying exponential backoff up to 5 attempts before `FAILED`.
- **7-Day Service Auto-Completion (`PQ-10`, `D-036`):** Automated 6-hour scheduler (`OrdersSchedulerService`) and manual Admin trigger `POST /api/v1/admin/orders/auto-complete-services` both run `autoCompleteExpiredServiceOrders` to complete `DELIVERY_SUBMITTED` service orders older than 7 days with `COLLECTED` payment and no open revision/dispute.
- **Public SEO, Trust & Account Routes:** `/robots.txt`, `/sitemap.xml`, `/terms`, `/privacy`, `/account`, `/messages`, plus `public/sw.js` static-shell caching (never caches `/api/`).
- **Admin Finance & Subscriptions Console (`/admin`):** Manage versioned `CommissionRule` policies (`SUPER_ADMIN`), log offline `SellerSettlementRecord` receipts, approve/reject 30-day `SubscriptionRenewalRequest` transfers (`RAAST_MANUAL`, `JAZZCASH_MANUAL`, `EASYPAISA_MANUAL`, `BANK_TRANSFER`, `CASH_OFFICE`), and toggle all 7 `PlatformFeatureFlag` modules in 1 click (Monthly Seller Subscriptions + 5 Saudavo differentiators start `OFF` by default until explicitly enabled by Admin).
- **Pending Database Rollout (`202611260001_messenger_and_subscriptions` & `202611260002_feature_flags_and_differentiators`):** Run `pnpm --filter @saudavo/api exec prisma migrate deploy && pnpm --filter @saudavo/api prisma:seed` upon human approval before live Messenger, Feature Control Center, Demand Board, Flash Deals, Voice Notes, and Handover PIN usage.

### Approved vs. Remaining Open Pre-Public Items
Locked by Founder (`2026-11-21`):
- **`PQ-03` (`D-034`):** Post-beta commission settlement cadence locked as **Monthly** (specific grace period & overdue threshold to be finalized before exiting `0%` promotional beta).
- **`PQ-08` (`D-035`):** Closed Beta uses seeded tehsils (`Mianwali`, `Isakhel`, `Piplan`) and `6` starter categories (`apps/api/prisma/seed.ts`); sub-zone/category expansion post-beta.
- **`PQ-10` (`D-036`):** Service auto-completion locked at **7 days** after `DELIVERY_SUBMITTED`.

Remaining items before full public transactions beyond Closed Beta:
1. **`PQ-03` thresholds:** Grace period days & overdue listing-pause threshold (needed before enabling non-zero commissions).
2. **`PQ-14` (`D-019`):** Final buyer-facing copy & evidence/dispute rules for `REMOTE` manual offline service payments.
3. **`Gate F`:** Pakistani legal/tax/terms review (Terms of Service, Privacy Policy, Seller Terms).
