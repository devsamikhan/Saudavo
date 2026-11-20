# Prompt 07 — Security, Quality and Release Audit

Perform a read-only audit first. Do not change files until findings are presented.

Review:
- Authentication and session security.
- Role and resource-level authorization.
- Cross-seller data isolation.
- Input validation and output encoding.
- File upload security.
- Rate limiting and abuse controls.
- CSRF/CORS/cookie configuration.
- Payment webhook security.
- Secrets and dependency vulnerabilities.
- PII exposure, especially seller home addresses and phone numbers.
- Logging and audit trails.
- Database backup and restore process.
- Accessibility, RTL and mobile behavior.
- Unit/integration/E2E test coverage.

Classify findings as Critical, High, Medium or Low with evidence and remediation. After founder approval, fix in small batches and rerun tests. Do not deploy to production.
