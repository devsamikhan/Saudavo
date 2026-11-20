---
trigger: always_on
---

# Project Guardrails

- Read `README.md` and the relevant files in `docs/` before acting.
- Treat `docs/00_PROJECT_CHARTER.md`, `docs/01_PRODUCT_REQUIREMENTS.md` and `docs/02_TECHNICAL_ARCHITECTURE.md` as the current source of truth.
- The founder owns UI/UX design. Implement approved Figma/screenshots/specifications; do not invent a new visual direction.
- Use a modular monolith. Do not introduce microservices without explicit approval.
- Do not add Redis, Meilisearch, native mobile apps, AI recommendations or a wallet to MVP without evidence and approval.
- Enforce ownership and roles on the server for every protected operation.
- Never expose a home address or private phone number publicly by default.
- Never create an unlicensed wallet/escrow or claim payment settlement is supported without provider confirmation.
- Never use floating-point arithmetic for money.
- Never deploy, migrate production data, delete files, reset databases or execute irreversible actions without explicit human approval.
- Never commit secrets, tokens, credentials or `.env` files.
- Every feature requires tests, validation, error states and documentation.
