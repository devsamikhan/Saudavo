# Phase 2.3 — Final Technical Audit Report

> Date: 2026-11-17  
> Auditor Role: Principal Software Architect, Senior Backend Engineer, Database Architect, Application Security Reviewer & Technical Project Manager  
> Scope: Independent verification of repository state, database design, Prisma/PostgreSQL implementability, order/COD/remote-service workflows, financial model, API contracts, authorization, security/privacy controls, and cross-document consistency.  
> **Execution Boundary:** Documentation and repository inspection only. No application code, Prisma schema, migrations, package installs, or deployments were executed.

---

## 1. Executive Summary

An independent, line-by-line technical audit of the workspace and `docs/00`–`docs/21` confirmed that the architecture baseline (`Mianwali District` pilot, single-seller checkout, COD-only + `MANUAL_OFFLINE` remote service MVP, modular monolith, integer `paisa`, immutable ledger, and privacy-first seller controls) is structurally sound, while uncovering **9 technical documentation defects** (including 3 `HIGH`-severity workflow/schema/API gaps and 1 `HIGH`-severity Prisma implementation requirement).

All safe, unambiguous documentation corrections were applied and re-verified without altering any founder-approved business policy or decision ID. Seven business/design operational questions (`PQ-03`, `PQ-08`, `PQ-10`, `PQ-11`/`Gate D`, `PQ-14`, `D-012`, `Gate F`) remain explicitly `OPEN` and mapped to downstream milestones (`M3`–`M8`), with **zero unaddressed blockers remaining for Milestone 2 (`prompts/02_REPO_SCAFFOLD.md`)**.

---

## 2. Actual Repository State (Verified)

Inspected via workspace filesystem listing and `git status`:
- **Git Status:** `fatal: not a git repository` — `.git` is not initialized yet (must be initialized with `.gitignore` during Milestone 2 scaffold before committing files).
- **Application Code / Configs:** None exist (`package.json`, `pnpm-workspace.yaml`, `apps/`, `packages/`, `prisma/`, `.env`, `node_modules/` are all absent).
- **Present Files:**
  - Root: `README.md`, `START_HERE_ANTIGRAVITY.md`
  - Rules: `.agents/rules/00-project-guardrails.md`
  - Prompts: `prompts/00_DISCOVERY_AND_REPO_AUDIT.md` through `prompts/07_SECURITY_AND_RELEASE_AUDIT.md`
  - Docs: `docs/00_PROJECT_CHARTER.md` through `docs/08_ANTIGRAVITY_WORKING_AGREEMENT.md` and `docs/10_DECISION_LOG.md` through `docs/21_PHASE_2_2_FOUNDER_DECISION_INTEGRATION.md` (and this report `docs/22_PHASE_2_3_FINAL_TECHNICAL_AUDIT.md`).
- **Conclusion:** Workspace matches the expected pre-scaffold documentation-only state.

---

## 3. Documents Inspected

- `README.md`, `START_HERE_ANTIGRAVITY.md`, `.agents/rules/00-project-guardrails.md`
- `docs/00_PROJECT_CHARTER.md`, `docs/01_PRODUCT_REQUIREMENTS.md`, `docs/02_TECHNICAL_ARCHITECTURE.md`, `docs/03_DATA_MODEL.md`, `docs/04_API_CONTRACT.md`, `docs/05_UX_DESIGN_BRIEF.md`, `docs/06_DELIVERY_ROADMAP.md`, `docs/07_SECURITY_PRIVACY_QA.md`, `docs/08_ANTIGRAVITY_WORKING_AGREEMENT.md`
- `docs/10_DECISION_LOG.md` through `docs/21_PHASE_2_2_FOUNDER_DECISION_INTEGRATION.md`

---

## 4. Database Audit

### 4.1 Verified Strengths
- **Money & Rates:** `BIGINT` (`paisa`) + `CHAR(3)` `'PKR'` and `INT` basis points (`rate_bps`) consistently used across `orders`, `order_items`, `service_order_details`, `commission_rules`, `commission_ledger`, and `seller_settlement_records`.
- **Single-Seller & Cart Isolation:** `orders.store_id` (`NOT NULL`, `ON DELETE RESTRICT`) and `carts` `UNIQUE(customer_id, store_id)` enforce single-seller orders without deleting saved carts from other stores (`PQ-16`).
- **Partial Unique Indexes (`NULL`-Safe):** `cart_items` (`uq_cart_item_no_variant`, `uq_cart_item_with_variant`), `commission_rules` (`uq_comm_rule_*_ver`, `uq_comm_rule_*_active` + `chk_commission_rule_scope`), `reviews` (`uq_review_order_item`, `uq_review_service_order`), `payments` (`uq_payments_one_collected_per_order`), and `commission_ledger` (`uq_commission_ledger_one_accrual_per_order`) correctly avoid PostgreSQL `NULL != NULL` uniqueness bypasses.
- **Demographic & CNIC Exclusion:** `seller_profiles` excludes `women_led_*` fields (`PQ-12`) and stores no CNIC numbers or images (`PQ-07`).
- **Remote Services & Messaging:** `service_order_details` captures `service_mode_snapshot` and keeps `service_address_snapshot_json = NULL` for `REMOTE` (no `deliveries` row); `order_messages` captures text-only REST messages (`PQ-09`).

### 4.2 Database Defects Found & Corrected
| # | Severity | Finding & Location | Correction Applied |
|---|---|---|---|
| **DB-01** | **HIGH** | **Prisma Declarative Limitations (`docs/14_DATABASE_DESIGN.md` §4):** Prisma `schema.prisma` cannot natively declare partial unique indexes (`WHERE ...`), `CHECK` constraints, `TSVECTOR` generated columns/GIN indexes, `pg_trgm`, or append-only immutability constraints. Running `prisma migrate dev` naively would silently omit these critical constraints. | Updated `docs/14_DATABASE_DESIGN.md` §4 to mandate `prisma migrate dev --create-only` custom SQL inside versioned migrations + real-PostgreSQL CI tests. |
| **DB-02** | **HIGH** | **Missing `auth_tokens` Table (`docs/14_DATABASE_DESIGN.md` §2.1, `docs/13` line 93, `docs/15`):** `docs/04` specifies `POST /auth/password-reset/*` and `PQ-05` requires email verification, and `docs/13` referenced `PasswordResetToken`, yet no token table existed in `14` or `15`. | Added `auth_tokens` (`EMAIL_VERIFICATION` / `PASSWORD_RESET`, hashed single-use token, expiry) to `docs/14`, `docs/15`, `docs/13`, and `docs/03`. |
| **DB-03** | **HIGH** | **Missing `customer_accepted_at` on `service_order_details` (`docs/14` line 208, `docs/15` line 152):** Without tracking customer acceptance separately from `Payment.status = COLLECTED`, upfront `MANUAL_OFFLINE` payment confirmation on a `REMOTE` service could not be cleanly separated from service completion. | Added `customer_accepted_at` (`TIMESTAMPTZ` nullable) to `service_order_details` in `docs/14` and `docs/15`. |
| **DB-04** | **MEDIUM** | **Undefined Enum Values & Deferred `StoreMember` (`docs/14` line 186, `docs/13` line 97, `docs/03` line 13):** `orders.cod_collection_status` lacked its explicit finite value list in `docs/14`, and `StoreMember` appeared in `03`/`13` without a table in `14`. | Documented `cod_collection_status` values (`PENDING_COLLECTION`, `COLLECTED`, `FAILED_REFUSED`, `REFUNDED`) in `docs/14` and marked `StoreMember` explicitly deferred post-MVP in `03` and `13`. |

---

## 5. Order & COD Workflow Audit

### 5.1 Findings Found & Corrected
| # | Severity | Finding & Location | Correction Applied |
|---|---|---|---|
| **WF-01** | **HIGH** | **Contradictory Cancellation Transition in Service State Diagram (`docs/16_ORDER_AND_COD_WORKFLOWS.md` line 135):** Mermaid diagram allowed `CONFIRMED --> CANCELLED : "Customer cancels (before work starts) / Admin cancels"`, violating `PQ-10` (customer self-cancellation allowed **only** in `PENDING_CONFIRMATION`). | Fixed transition labels in `docs/16` §3.2 & §4 diagrams and §3.3 matrix to enforce seller agreement or Admin handling after `CONFIRMED`. |
| **WF-02** | **HIGH** | **Missing Post-Completion Return / Dispute Transitions (`docs/16` lines 83–91, 111–113):** `docs/17` §5.2 covers post-completion COD returns/refunds, but `docs/16` physical state diagram and actor matrix omitted transitions from `COMPLETED` → `RETURN_REFUND_REVIEW` / `DISPUTED`. | Added `COMPLETED --> RETURN_REFUND_REVIEW` and `COMPLETED --> DISPUTED` in `docs/16` §3.2, §3.3, and §4 (`COMPLETED --> DISPUTED`). |

### 5.2 Confirmed Separation of Lifecycles
- **Physical Product Flow:** `PENDING_CONFIRMATION` → `CONFIRMED` → `PREPARING` → `READY_FOR_DISPATCH` → `OUT_FOR_DELIVERY` (skipped for `CUSTOMER_PICKUP`) → `DELIVERED` → `COMPLETED` (only after COD `COLLECTED`), with `DELIVERY_FAILED`, `CANCELLED`, `RETURN_REFUND_REVIEW`, `DISPUTED`.
- **COD Collection Flow:** `Delivery.delivery_status = DELIVERED` never sets `cod_collection_status = COLLECTED`; cash collection requires explicit idempotent confirmation + `PaymentEvent`.
- **Idempotency & Concurrency:** `Idempotency-Key` (`idempotency_keys`) + optimistic `from_status` check / row locking inside PostgreSQL transactions prevent duplicate submissions and conflicting transitions.

---

## 6. Remote Services & Payment Security Audit (`PQ-14`)

- **No Delivery Row:** `REMOTE` services keep `service_address_snapshot_json = NULL` and create **no `deliveries` row**.
- **Independent States:**
  1. **Payment Notification (Optional/Customer):** Customer may coordinate/notify payment via `order_messages` (text-only REST); exact UI notice & dispute evidence upload rules remain `OPEN` (`PQ-14`).
  2. **Seller-Reported Payment Confirmation:** Only the owning `SELLER` (or audited `ADMIN` override) calls `POST /seller/orders/:id/manual-payment-confirmation`, storing `Payment.status = COLLECTED`, `payment_method = MANUAL_OFFLINE`, `manual_payment_method_desc`, `confirmed_by_id`, `collected_at`, and immutable `PaymentEvent`. Response explicitly returns `verificationSource: "SELLER_REPORTED"` (never represented as independent platform verification).
  3. **Service Completion Independence:** Upfront payment confirmation does **not** complete the order; `COMPLETED` requires **both** `ServiceOrderDetails.customer_accepted_at IS NOT NULL` AND `Payment.status = COLLECTED`.
  4. **Duplicate Prevention & Immutability:** `uq_payments_one_collected_per_order` (`WHERE status = 'COLLECTED'`) + `payment_events.idempotency_key NOT NULL UNIQUE` prevent double confirmation; `payment_events` is append-only.
  5. **Evidence & Dispute Handling:** Customers can open `Dispute` from `IN_PROGRESS`, `DELIVERY_SUBMITTED`, or `COMPLETED`; `MODERATOR`/`ADMIN` actions write `AdminAuditLog`. Whether proof-of-payment attachments are supported in `Dispute` remains `OPEN` under `PQ-14` (deferred safely without blocking M2).

---

## 7. Financial Model Audit

- **0% Beta & Post-Beta Continuity (`PQ-01`, `PQ-03`):** `0 bps` `CommissionRule` during Mianwali closed beta results in `0 paisa` commission and zero remittance due in beta—fully consistent with post-beta monthly/biweekly settlement (`PQ-03`). Zero-value `COMMISSION_ACCRUAL` rows maintain reconciliation completeness.
- **Delivery Fee Exclusion & Seller Entitlement (`PQ-02`, `PQ-13`):** `include_delivery_fee = false`; seller retains `delivery_fee_paisa`; `seller_net_entitlement_paisa = total_paisa - commission_amount_paisa` is consistently defined across `14`, `15`, `17`, and `19` as an accounting entitlement only (not a wallet or automated payout).
- **Mixed-Category Rule (`PQ-15`):** Single `GLOBAL` or `ORDER_TYPE` rule per order in MVP eliminates cart-splitting ambiguity while preserving future `CATEGORY` extensibility.
- **Ledger Immutability & Reversals:** `commission_ledger` is append-only with `uq_commission_ledger_one_accrual_per_order`, supporting compensating `COMMISSION_REVERSAL` and `ADJUSTMENT` entries.

---

## 8. API & Authorization Audit

### 8.1 Endpoint Naming Defect Found & Corrected
| # | Severity | Finding & Location | Correction Applied |
|---|---|---|---|
| **API-01** | **HIGH** | **Misleading Endpoint Name (`docs/04_API_CONTRACT.md` lines 294–320, `docs/16`, `docs/12`):** Using `POST /seller/orders/:id/cod-collection` for both physical COD cash collection and `REMOTE` digital `MANUAL_OFFLINE` payments conflates doorstep COD with remote offline transfers. | Split into two explicit routes in `docs/04`, `docs/12`, and `docs/16`: `POST /seller/orders/:id/cod-collection` (COD cash) and `POST /seller/orders/:id/manual-payment-confirmation` (`REMOTE` `MANUAL_OFFLINE`, returning `verificationSource: "SELLER_REPORTED"`). |

### 8.2 Authorization & Isolation Check
- **Server-Side Tenant Isolation:** Seller `store_id` is always resolved from authenticated `user_id` → `SellerProfile` → `Store`; self-dealing (ordering/reviewing own store) is blocked.
- **Session & CSRF:** PostgreSQL opaque `UserSession`, `HttpOnly`, `Secure`, `SameSite=Lax` cookies, CSRF protection, Argon2id hashing, and mandatory TOTP MFA for `MODERATOR`/`SUPPORT`/`ADMIN`/`SUPER_ADMIN`.
- **Messaging Ownership (`PQ-09`):** `order_messages` restricted strictly to `customer_id`, `store_id` seller, and audited `SUPPORT`/`MODERATOR`/`ADMIN` staff; frozen on terminal closure except Support/Dispute exceptions.

---

## 9. Cross-Document Consistency Summary

All 15 Phase 2.2 checks and Phase 2.3 cross-references were re-verified after our edits:
- `PQ-01`–`PQ-16` policies match identically across `04`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`, `19`, `21`, and `22`.
- All stale `PasswordResetToken`, `StoreMember` (MVP), `Customer cancels (before work starts)`, and single `/cod-collection` references were cleaned up and re-verified via text search across `docs/*.md`.

---

## 10. Security & Privacy Findings

| Control Area | Status in Documentation | Residual Gap / Finding |
|---|---|---|
| Seller home-address & personal phone privacy | **Covered** (`show_public_address/phone = false`, `AreaZone` only, EXIF GPS stripping, post-confirm `pickup_instructions`, seller `phone_e164` never leaked) | None for Phase 2.3 |
| Password hashing, sessions, CSRF, MFA, audit logs | **Covered** (Argon2id, PG `UserSession`, `HttpOnly`/`Secure`/`SameSite=Lax`, CSRF, staff TOTP MFA, immutable `AdminAuditLog`) | None for Phase 2.3 |
| **Account Recovery for Phone-Only Users (`PQ-05`)** | **MEDIUM Finding:** `POST /auth/password-reset/*` works automatically for email-verified users via `auth_tokens`, **but phone-only users (`email = NULL`) cannot receive automated reset links/OTPs while SMS/WhatsApp OTP is inactive in beta.** | Documented in `docs/04` & `docs/14`: phone-only accounts require Support/Admin-assisted identity recovery (audited) or adding an email address. |
| **Log Redaction & File Upload Scanning** | **LOW/MEDIUM:** Added explicit password/token/PII redaction requirement in `docs/07_SECURITY_PRIVACY_QA.md`; malware scanning remains `"where available"` (MIME/magic-byte, size limits, EXIF stripping, and `QUARANTINED` status are mandatory baseline). | Confirm chosen S3 scanning hook or strict image re-encoding in Milestone 4. |
| Data retention, backups, secret management | **Covered conceptually** (encrypted backups + restore drill before `Gate F`; secrets outside Git); **exact data-retention schedule deferred to `Gate F`** | Tracked in `Gate F` before public transactions. |

---

## 11. Remaining Founder Decisions & Classification

| Decision | Remaining Open Scope | Classification | Target Milestone |
|---|---|---|---|
| **PQ-03** (`D-022`) | Monthly vs. biweekly settlement cadence; grace period, overdue threshold, listing-pause policy | **Blocker for Milestone 6** (post-beta non-zero commission activation) | Milestone 6 |
| **PQ-08** (`D-026`) | Exact Mianwali `AreaZone` locality records & initial `Category` taxonomy | **Safely deferrable for M2** (`districts`/`area_zones`/`categories` schema complete; dev fixtures in M2); **Blocker for M4/M8 pilot seeding** | Milestone 4 / 8 |
| **PQ-10** (`D-027`) | Confirm 7-day service auto-completion after `DELIVERY_SUBMITTED` | **Blocker for Milestone 5** (`orders` scheduler) | Milestone 5 |
| **PQ-11 / Gate D** (`D-005`, `D-028`) | Final Urdu font, Figma frames, design tokens, RTL mirroring, mobile/desktop specs | **Blocker for Milestone 3** (UI implementation) | Milestone 3 |
| **PQ-14** (`D-019`) | Customer-facing remote-service payment wording, dispute evidence attachments & dispute process | **Blocker for Milestone 5/6** (service checkout UI & disputes); does not block M2 core schema | Milestone 5 / 6 |
| **D-012** | Product name finalized as **Saudavo** (2026-11-20); logo/brand assets & domain/trademark checks remain open | **Safely deferrable** (name ready for M2 package naming; logo under `Gate D` / M3; domain before M8) | Milestone 3 / 8 |
| **Gate F** | Legal/tax review (Terms, Privacy Policy, exact data-retention schedule) | **Blocker for Closed Beta / Launch (`Gate F`)** | Milestone 7 / Gate F |

---

## 12. Milestone 2 Readiness Assessment

- **Can Milestone 2 (`prompts/02_REPO_SCAFFOLD.md`) begin upon founder authorization?** **YES.**
  - Monorepo structure (`pnpm`, `apps/web`, `apps/api`, `packages/contracts`, `packages/config`), CI checks, `/api/v1/health`, and the baseline Prisma schema + custom SQL migrations (`--create-only` for partial unique indexes, `CHECK` constraints, `TSVECTOR`/`pg_trgm`) have zero unresolved structural blockers.
  - Reminder: Initialize Git (`git init`) and `.gitignore` (excluding `.env`, secrets, build artifacts) as the first step of Milestone 2.

---

## 13. Corrections Recorded in Phase 2.3

1. `docs/14_DATABASE_DESIGN.md`: Added `auth_tokens`, `service_order_details.customer_accepted_at`, `cod_collection_status` enum values, seller `phone_e164` protection note, and Prisma `--create-only` custom SQL migration rule.
2. `docs/15_ENTITY_RELATIONSHIP_DIAGRAM.md`: Added `AUTH_TOKENS` and `SERVICE_ORDER_DETAILS.customer_accepted_at`.
3. `docs/13_SYSTEM_ARCHITECTURE.md`: Updated `auth` owned tables (`UserSession`, `AuthToken`) and marked `StoreMember` deferred post-MVP.
4. `docs/03_DATA_MODEL.md`: Added `AuthToken`, `OrderMessage` and marked `StoreMember` deferred post-MVP.
5. `docs/16_ORDER_AND_COD_WORKFLOWS.md`: Fixed `CONFIRMED --> CANCELLED` stale customer-cancel label, added `COMPLETED --> RETURN_REFUND_REVIEW / DISPUTED`, enforced `customer_accepted_at` + `Payment = COLLECTED` independence on `REMOTE` services, and aligned `/manual-payment-confirmation`.
6. `docs/04_API_CONTRACT.md` & `docs/12_IMPLEMENTATION_PLAN.md`: Split `POST /seller/orders/:id/cod-collection` vs. `POST /seller/orders/:id/manual-payment-confirmation` and documented phone-only password-reset recovery behavior.
7. `docs/07_SECURITY_PRIVACY_QA.md`: Added explicit log/Sentry token & PII redaction requirement.

---

## 14. Final Verdict

**A. READY FOR MILESTONE 2 AUTHORIZATION**

All critical and high-severity technical, database, workflow, and API consistency issues identified in Phase 2.3 have been resolved in documentation, and all 7 remaining founder business/design questions are safely isolated to Milestones 3–8 without blocking Milestone 2 scaffolding or the baseline Prisma schema. **Milestone 2 will not start until the founder gives explicit authorization.**
