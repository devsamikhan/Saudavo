# Phase 2.1 Architecture Review Report

> Date: 2026-11-17  
> Reviewer Role: Senior Software Architect & Database Reviewer  
> **Phase 2.2 Update Note:** The founder subsequently submitted decisions for `PQ-01`–`PQ-16`. See [`docs/21_PHASE_2_2_FOUNDER_DECISION_INTEGRATION.md`](./21_PHASE_2_2_FOUNDER_DECISION_INTEGRATION.md) for the integrated decisions, option-label corrections (`PQ-03`, `PQ-09`, `PQ-14`), remaining operational questions, and updated Milestone 2 readiness status.
> Scope: Full consistency, financial formula, service-payment, PostgreSQL constraint, privacy/consent, and decision-gate audit across `README.md`, `.agents/rules/`, and `docs/00`–`docs/19`.  
> **Execution Boundary:** Documentation-only review. No application code, packages, Prisma files, database migrations, or deployments were created.

---

## 1. Issues Discovered

### 1.1 Documentation Version Drift
- `docs/11_OPEN_QUESTIONS.md` still presented Discovery Phase questions (`Q1`, `Q4.1`, `Q5.1`, and `D-001`–`D-012` as `PROPOSED`) despite Mianwali District (`D-003`), Single-Seller Checkout (`D-013`), and COD-Only MVP (`D-014`) being locked in Phase 2.
- `docs/12_IMPLEMENTATION_PLAN.md` still bore a Discovery Draft status and legacy entity names (`CommissionPolicy`, `CommissionLedgerEntry`, `AuditLog`) instead of `CommissionRule`, `CommissionLedger`, `SellerSettlementRecord`, and `AdminAuditLog`.

### 1.2 Financial Formula Contradiction
- `docs/14_DATABASE_DESIGN.md` defined `orders.seller_net_payable_paisa` as `commissionable_base - commission_amount`, whereas `docs/17_COMMISSION_AND_FINANCIAL_MODEL.md` defined it as `total_paisa - commission_amount_paisa`.
- Whenever `delivery_fee_paisa > 0` and `include_delivery_fee = false`, those two formulas diverge. Moreover, calling the column `net_payable` is misleading under COD because the seller collects cash directly and owes commission to the platform.

### 1.3 Service COD Payment & Fulfilment Gap
- `service_listings.service_mode` supports `ON_SITE`, `REMOTE`, and `HYBRID`, yet `docs/16_ORDER_AND_COD_WORKFLOWS.md` and `docs/14_DATABASE_DESIGN.md` lacked:
  - A service location snapshot (`area_zone_id`, `service_address_snapshot_json`) on `service_order_details` for `ON_SITE`/`HYBRID` services (since `deliveries` is for physical goods).
  - Clarity on how `REMOTE` digital services work under a COD-only MVP without an active online payment gateway.
  - Alignment in the 7-stage COD table between physical `Delivery.delivery_status` and service `DELIVERY_SUBMITTED` + customer acceptance.

### 1.4 Mixed-Category Commission Ambiguity
- A single-seller checkout (`D-013`) can include multiple physical items across different categories, yet `docs/17_COMMISSION_AND_FINANCIAL_MODEL.md` previously referenced a "primary category" without defining how mixed-category orders resolve or how discounts/delivery fees are handled if category rates are enabled.

### 1.5 PostgreSQL Constraint & Referential Integrity Bugs
- **`commission_rules` NULL-in-UNIQUE bug:** `UNIQUE(scope_type, category_id, order_type, version)` would allow duplicate `GLOBAL` or `ORDER_TYPE` rules in PostgreSQL because default `UNIQUE` treats `NULL != NULL`.
- **`cart_items` NULL-in-UNIQUE bug:** `UNIQUE(cart_id, product_id, product_variant_id)` would allow duplicate rows in a cart for products without variants (`product_variant_id IS NULL`).
- **Missing uniqueness protections:**
  - `commission_ledger` lacked a partial unique index preventing duplicate `COMMISSION_ACCRUAL` rows for the same `order_id`.
  - `payments` lacked a partial unique index preventing multiple `COLLECTED` records per `order_id`, and `payment_events.idempotency_key` was nullable.
  - `product_variants.sku` lacked uniqueness within a product.
  - `products.slug` and `service_listings.slug` did not exclude soft-deleted records (`WHERE deleted_at IS NULL`) or explain cross-store collision handling.
- **Missing arithmetic & FK protections:** `orders` and `order_items` lacked arithmetic `CHECK` constraints (`total = subtotal + delivery - discount`, `line_total = unit_price * quantity`), and historical/financial FKs lacked explicit `ON DELETE RESTRICT`.

### 1.6 Order-Scoped Messaging & Women-Led Consent Safeguards
- `PQ-09` (`order_messages`) lacked explicit ownership, text-only/attachment policy, terminal closure freeze, and anti-PII-leakage rules in the authorization/database specs.
- `seller_profiles.women_led_consent` / `women_led_self_id` lacked an explicit withdrawal timestamp, immediate clearing rule on consent withdrawal, explicit prohibition on search/moderation/commission discrimination, and an honest closed-beta necessity assessment.

---

## 2. Documents Updated and Created

### Updated Documents
1. [11_OPEN_QUESTIONS.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/11_OPEN_QUESTIONS.md)
2. [12_IMPLEMENTATION_PLAN.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/12_IMPLEMENTATION_PLAN.md)
3. [14_DATABASE_DESIGN.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/14_DATABASE_DESIGN.md)
4. [15_ENTITY_RELATIONSHIP_DIAGRAM.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/15_ENTITY_RELATIONSHIP_DIAGRAM.md)
5. [16_ORDER_AND_COD_WORKFLOWS.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/16_ORDER_AND_COD_WORKFLOWS.md)
6. [17_COMMISSION_AND_FINANCIAL_MODEL.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/17_COMMISSION_AND_FINANCIAL_MODEL.md)
7. [18_AUTHORIZATION_AND_ROLE_MATRIX.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/18_AUTHORIZATION_AND_ROLE_MATRIX.md)
8. [04_API_CONTRACT.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/04_API_CONTRACT.md)
9. [10_DECISION_LOG.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/10_DECISION_LOG.md)
10. [19_PHASE_2_OPEN_QUESTIONS.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/19_PHASE_2_OPEN_QUESTIONS.md)

### Created Document
11. [20_PHASE_2_1_REVIEW_REPORT.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/20_PHASE_2_1_REVIEW_REPORT.md) *(this report)*

---

## 3. Exact Changes Made

- **`docs/11_OPEN_QUESTIONS.md`:** Marked **`SUPERSEDED BY docs/19_PHASE_2_OPEN_QUESTIONS.md`** with a complete mapping table from Discovery `Q1`–`Q14` to approved Phase 2 decisions and active `PQ-01`–`PQ-16` items.
- **`docs/12_IMPLEMENTATION_PLAN.md`:** Updated status to Phase 2.1 Architecture Baseline, aligned module/table terminology (`CommissionRule`, `CommissionLedger`, `SellerSettlementRecord`, `AdminAuditLog`, `District`/`AreaZone`, `Delivery`), and locked Mianwali District, single-seller checkout, and COD-only MVP.
- **`docs/14_DATABASE_DESIGN.md` & `docs/15_ENTITY_RELATIONSHIP_DIAGRAM.md`:**
  - Unified financial column naming and definition to `seller_net_entitlement_paisa = total_paisa - commission_amount_paisa` (explicitly marked as seller economic entitlement under seller-managed delivery pending `PQ-13`).
  - Added `service_mode_snapshot`, `area_zone_id`, and `service_address_snapshot_json` to `service_order_details`; explicitly restricted `deliveries` to physical orders.
  - Replaced `commission_rules` and `cart_items` nullable `UNIQUE` constraints with PostgreSQL partial unique indexes and `chk_commission_rule_scope`.
  - Added `uq_commission_ledger_one_accrual_per_order`, `uq_payments_one_collected_per_order`, `payment_events.idempotency_key NOT NULL`, `uq_product_variants_sku_active`, `uq_products_slug_active` / `uq_service_listings_slug_active`, `uq_review_order_item` / `uq_review_service_order`, arithmetic `CHECK` constraints, and `ON DELETE RESTRICT` on historical/financial foreign keys.
  - Added `women_led_consent_updated_at` and withdrawal rules on `seller_profiles`, plus conditional `order_messages` spec (`PQ-09`).
- **`docs/16_ORDER_AND_COD_WORKFLOWS.md`:** Clarified `ON_SITE`, `HYBRID`, and `REMOTE` service fulfilment and COD/manual collection behavior; aligned the 7-stage COD separation table across physical and service orders.
- **`docs/17_COMMISSION_AND_FINANCIAL_MODEL.md`:** Unified `seller_net_entitlement_paisa`, stated the seller-managed delivery fee ownership assumption (`PQ-13`), and documented the 3 mixed-category commission resolution models (`PQ-15`).
- **`docs/18_AUTHORIZATION_AND_ROLE_MATRIX.md` & `docs/04_API_CONTRACT.md`:** Added order-scoped messaging & pickup privacy rules, women-led consent withdrawal & non-ranking rules, `ON_SITE`/`HYBRID` service address handling on `POST /orders/services`, and commission summary terminology alignment.
- **`docs/10_DECISION_LOG.md` & `docs/19_PHASE_2_OPEN_QUESTIONS.md`:** Added `D-018`–`D-021` and new founder questions `PQ-13`, `PQ-14`, `PQ-15`, `PQ-16` while preserving `PQ-01`–`PQ-12` identifiers and updating `PQ-09` & `PQ-12`.

---

## 4. Unresolved Founder Decisions

All genuine founder decisions remain consolidated in [19_PHASE_2_OPEN_QUESTIONS.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/19_PHASE_2_OPEN_QUESTIONS.md):

| Blocking Scope | Open Questions & Decision IDs |
|---|---|
| **Pre-Milestone 2 (Scaffold, Auth, Schema)** | `PQ-04` (Seller vs rider confirmation), `PQ-05` (Login ID & verification channel), `PQ-06` (`D-016` session cookies + CSRF), `PQ-08` (Mianwali `AreaZone`s & categories), `PQ-09` (`D-021` order-scoped messages vs notes-only), `PQ-11` (Single-language vs dual listing text & Urdu font), `PQ-12` (Women-led DB field vs closed-beta offline tracking), `PQ-14` (`D-019` `REMOTE` vs `ON_SITE`/`HYBRID` service rules), `PQ-15` (`D-020` mixed-category commission), `PQ-16` (Slug & cart UX), `D-015` (`PKR`/`paisa`) |
| **Pre-Milestone 3 (UI Build)** | `Gate D` Founder Figma frames, tokens, RTL/mobile specs; `D-012` Final product name/branding |
| **Pre-Milestone 4–6 (Catalog, Orders, Finance)** | `PQ-01` (`D-017` initial commission rate), `PQ-02` (Delivery fee in commissionable base), `PQ-03` (COD commission remittance cadence), `PQ-07` (Minimum seller verification evidence without CNIC), `PQ-10` (Cancellation cutoff & service auto-complete), `PQ-13` (`D-018` delivery fee ownership & seller net formula) |

---

## 5. Recommended Implementation Sequence

1. **Founder Decision Gate (Current):** Founder reviews `docs/19_PHASE_2_OPEN_QUESTIONS.md` and updates `docs/10_DECISION_LOG.md` (`Gate C`).
2. **Milestone 2 (`prompts/02_REPO_SCAFFOLD.md`):** Scaffold `pnpm` monorepo (`apps/web`, `apps/api`, `packages/contracts`, `packages/config`), CI workflow, `/api/v1/health`, approved Prisma schema + baseline migration, `auth`/`users`/`locations` (`Mianwali District`), `audit`, and `OutboxEvent`.
3. **Milestone 3 (`prompts/03_FOUNDER_DESIGN_IMPLEMENTATION.md`):** Implement founder-approved design system and English LTR / Urdu RTL shells once `Gate D` Figma frames are provided.
4. **Milestone 4 (`prompts/04_SELLER_CATALOG.md`):** Seller onboarding, privacy-safe `Store` + `StoreServiceArea`, `Product`/`ServiceListing` CRUD, private S3 upload + EXIF stripping, Admin moderation queues.
5. **Milestone 5 (`prompts/05_ORDERS_AND_CHECKOUT.md`):** PostgreSQL FTS search, store-scoped cart, idempotent single-seller COD checkout, physical & service workflows, notifications, reviews.
6. **Milestone 6 (`prompts/06_PAYMENTS_LEDGER_REVIEW.md`):** Configurable `CommissionRule`, immutable `CommissionLedger`, explicit COD collection confirmation, offline `SellerSettlementRecord`, disputes, reconciliation checks.
7. **Milestone 7 (`prompts/07_SECURITY_AND_RELEASE_AUDIT.md`) & Milestone 8:** Security/IDOR/RTL/accessibility audit, backup/restore drill (`Gate E`/`F`), Mianwali closed beta (`Gate G`).

---

## 6. Risks That Remain

1. **Unresolved Business Policy Risk:** Until `PQ-01`–`PQ-03`, `PQ-13`–`PQ-15` are decided by the founder, initial `CommissionRule` seeds and service payment rules remain unconfirmed.
2. **COD Commission Collection Leakage:** Sellers collect 100% of COD cash directly; operational enforcement of seller remittance (`SellerSettlementRecord`) and overdue-balance thresholds must be defined before charging commissions.
3. **Remote Service Payment Disputes Under COD-Only MVP:** Without an online gateway, `REMOTE` services carry higher non-payment or off-platform dispute risk unless restricted/scoped carefully (`PQ-14`).
4. **Auth Verification Cost vs. Friction:** SMS/WhatsApp OTP (`PQ-05`) incurs third-party messaging costs and abuse-protection requirements; email-only reduces cost but may add friction for non-email local sellers.
5. **Privacy / EXIF & PII Exposure:** Home-based women sellers rely on strict server-side EXIF stripping, private S3 URLs, and public DTO projections; every endpoint will require automated negative tests in Milestones 4–7.
6. **UI/UX Design Dependency (`Gate D`):** Milestone 3 frontend implementation cannot begin without founder-supplied Figma frames/tokens.

---

## 7. Final Consistency Audit & Readiness Verdict

### Consistency Matrix Check
- Mianwali District pilot (extensible multi-district schema): **Consistent** across `00`, `01`, `03`, `04`, `06`, `07`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `18`, `19`.
- Single-seller checkout/order (`D-013`): **Consistent** across all docs.
- COD-only active MVP & `PaymentProviderAdapter` deferral (`D-014`): **Consistent** across all docs.
- No wallet, escrow, or automated transfers (`D-010`): **Consistent** across all docs.
- Separate delivery and cash-collection statuses: **Consistent** across `01`, `02`, `03`, `04`, `07`, `13`, `14`, `15`, `16`, `17`.
- Unified financial formula (`seller_net_entitlement_paisa = total_paisa - commission_paisa`) & ledger timing: **Consistent** across `14`, `15`, `17`, `19`.
- Seller privacy, role-based server authorization, founder-owned UI/UX, modular monolith: **Consistent** across all docs.

### Readiness Verdict

**NOT READY — FOUNDER DECISIONS REQUIRED**

*Technical architecture and database design consistency issues discovered in Phase 2 have been resolved in documentation. Repository scaffolding and Prisma migrations remain gated on founder sign-off of the open decisions in [`docs/19_PHASE_2_OPEN_QUESTIONS.md`](./19_PHASE_2_OPEN_QUESTIONS.md) (`PQ-01`–`PQ-16`, `D-015`–`D-021`, and `Gate D` design handoff).*
