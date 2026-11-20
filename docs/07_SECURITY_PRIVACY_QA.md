# Security, Privacy and Quality Plan

## Security baseline
- Passwords hashed with Argon2id (or framework-supported equivalent).
- Secure, `HttpOnly`, `SameSite=Lax` cookies for server-managed browser sessions (`UserSession`).
- CSRF protection for cookie-authenticated state-changing requests.
- Rate limiting for login, password reset, OTP (if enabled), search, and order creation.
- Server-side authorization and strict seller/customer ownership isolation on every protected resource (see `docs/18_AUTHORIZATION_AND_ROLE_MATRIX.md`).
- Strict input validation (Zod contracts) and output encoding.
- Parameterized database access through Prisma ORM.
- File upload MIME/magic-byte, size and extension validation; EXIF metadata stripping (e.g. GPS coordinates from home-based sellers' photos); malware scanning where available.
- Private object storage by default; short-lived signed URLs.
- Secrets stored outside source control; structured logs and error reports (Sentry) must redact passwords, session/CSRF/reset tokens, and unnecessary PII.
- MFA required for privileged admin accounts (`MODERATOR`, `SUPPORT`, `ADMIN`, `SUPER_ADMIN`).
- Immutable `AdminAuditLog` records for admin, moderation, commission rule, and settlement actions.
- Dependency and secret scanning in CI.
- Backups encrypted and restore-tested.

## Women/home-based seller privacy
- Never publish a residential/home address publicly by default.
- Show District (`Mianwali District` in MVP) and service area zones (`AreaZone`) only; any public business address requires explicit opt-in for commercial shops.
- Phone number visibility is opt-in (`false` by default) and clearly explained.
- Provide platform-mediated order communication where practical instead of exposing personal phone numbers.
- Seller can report/block abusive users.
- Restrict customer delivery address visibility strictly to the order's seller/fulfilment party only while active, and never expose customer addresses to other sellers or the public.
- Avoid collecting identity documents (e.g., CNIC) until a justified, secure verification and retention process exists.

## Payments and finance
- **MVP Active Payment Method:** Cash on Delivery (COD) only. No online payment gateway is integrated in MVP.
- **No Wallet / No Escrow:** Never create an unlicensed wallet, escrow, or automated fund transfers.
- **Delivery vs. Collection Separation:** Never mark a COD order as paid merely because `delivery_status = DELIVERED`; record cash collection explicitly and idempotently.
- Never store card credentials.
- For future online payments (post-MVP, provider-approved): verify webhook signatures and event timestamps, make webhook handlers idempotent, reconcile provider events against internal records, and never treat a browser redirect as proof of payment.
- Keep immutable `CommissionLedger` entries and compensating adjustment/reversal entries.
- Obtain qualified legal/accounting advice for Pakistani tax, marketplace settlement, consumer protection and seller terms before public live transactions.

## Quality gates
- Unit tests for domain rules.
- Integration tests for database transactions.
- E2E tests for signup, seller approval, listing, checkout and order completion.
- Negative tests for cross-seller data access.
- Tests for stock races and duplicate orders.
- Tests for commission rounding and refund adjustments.
- RTL/LTR visual checks.
- Accessibility checks.
- Load tests for critical endpoints before scale-up.

## Incident readiness
- Error monitoring.
- Backup/restore runbook.
- Admin account recovery procedure.
- Payment incident procedure.
- Data breach escalation procedure.
- Support and dispute escalation.
