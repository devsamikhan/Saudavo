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

### A. Admin MFA Loss / Account Recovery (`PQ-06`)
1. Staff member must contact a `SUPER_ADMIN` out-of-band (verified identity check).
2. `SUPER_ADMIN` temporarily revokes active sessions (`user_sessions.revoked_at = NOW()`), resets `mfa_enabled = false` / `mfa_secret_encrypted = NULL` inside an audited administrative maintenance window, and rotates credentials.
3. Staff re-enrolls TOTP immediately and verifies via `POST /api/v1/auth/admin/mfa/verify` (`STAFF_MFA_VERIFIED` written to `admin_audit_logs`).

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

## 7. Open Founder Sign-Offs Required Before Public Transactions
Per `docs/19_PHASE_2_OPEN_QUESTIONS.md`, engineering will **not** assume business rules without explicit founder confirmation:
1. **`PQ-03` (`D-022`):** Post-beta commission settlement cadence (**Monthly vs. Biweekly**), grace period, and overdue listing-pause threshold (currently `0%` promotional beta active per `PQ-01`).
2. **`PQ-08` (`D-026`):** Final founder-approved Mianwali `AreaZone` locality list & `Category` taxonomy beyond the starter tehsil/category seed in `apps/api/prisma/seed.ts`.
3. **`PQ-10` (`D-027`):** Explicit founder confirmation of **7 days** as the final service `DELIVERY_SUBMITTED -> COMPLETED` auto-completion window.
4. **`PQ-14` (`D-019`):** Final buyer-facing copy & evidence/dispute rules for `REMOTE` manual offline service payments.
5. **`Gate F`:** Pakistani legal/tax/terms review (Terms of Service, Privacy Policy, Seller Terms).
