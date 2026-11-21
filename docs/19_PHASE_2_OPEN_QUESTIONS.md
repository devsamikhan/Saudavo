# Phase 2 Open Questions & Founder Decision Integration

> Status: Phase 2.2 Updated — Founder Decisions Recorded for `PQ-01` through `PQ-16` (2026-11-17).
> Locked Phase 2 Baseline: **Mianwali District pilot (`D-003`)**, **Single-seller checkout (`D-013`)**, **COD-only MVP (`D-014`)**, **Modular monolith (`D-007`)**.
>
> **Precedence Rule:** Where the founder's written choice description conflicted with an Option A/B label in the source document (`PQ-03`, `PQ-09`, `PQ-14`), the **founder's written intent takes precedence** and is explicitly noted below.

---

## 1. Commission & Financial Policy Decisions

### PQ-01: Commission Rate Structure & Pilot Rate (`D-017`) — **APPROVED**
- **Question:** What configurable commission rate (`rate_bps`) will be seeded in the initial `CommissionRule` for Mianwali District?
- **Founder Selected Policy:** **0% Promotional Commission during the Mianwali Closed Beta.**
- **Technical Implications:**
  - Initial `CommissionRule` supports `0 bps` (`CHECK rate_bps BETWEEN 0 AND 10000`).
  - Immutable zero-value `COMMISSION_ACCRUAL` records continue to be logged in `commission_ledger` for audit and reconciliation continuity.
  - Sellers are not charged during the promotional beta; future configurable rate activation remains supported via versioned `CommissionRule` rows.

### PQ-02: Commission Calculation Base (Delivery Fee Inclusion) (`D-017`) — **APPROVED**
- **Question:** Should platform commission be calculated on subtotal minus discounts only, or include delivery fee?
- **Founder Selected Policy:** **Exclude delivery fees from platform commission calculation (`include_delivery_fee = false`).**
- **Technical Implications:** `commissionable_base_paisa = subtotal_paisa - discount_paisa`; delivery fee is excluded from commission across checkout quotes, order snapshots, and `commission_ledger`.

### PQ-03: COD Commission Collection & Remittance Cadence (`D-022`, `D-034`) — **APPROVED (Monthly Cadence) / OPEN (Grace Period)**
- **Question:** How and how often will sellers remit owed platform commissions after COD collection, and what overdue rules apply?
- **Founder Selected Policy (`2026-11-21`, `D-034`):** **Monthly** settlement cadence after 0% promotional beta ends.
- **Technical Implications:**
  - During the 0% promotional closed beta (`PQ-01`), **no commission remittance is due**.
  - After non-zero commission activation, the platform uses **Monthly** seller statements and offline `SellerSettlementRecord` recording (`SELLER_TO_PLATFORM`).
- **Remaining `OPEN` Details (Must resolve before non-zero commission activation post-beta):**
  - **Grace period**, **overdue balance threshold**, and **listing-pause enforcement rules**.

### PQ-04: COD Confirmation Authority & Delivery Operator Role (`D-023`) — **APPROVED**
- **Question:** In MVP, does the Seller confirm delivery and COD collection, or will the platform operate a `DELIVERY_OPERATOR` role?
- **Founder Selected Policy:** **Seller-managed delivery and pickup only (Option A).**
- **Technical Implications:** No platform rider fleet and no `DELIVERY_OPERATOR` role in MVP. `SELLER` confirms dispatch, delivery, and COD collection; `ADMIN` may override disputed records with `AdminAuditLog` entries.

---

## 2. Authentication, Verification & Trust Decisions

### PQ-05: Primary Login Identifier & Verification Channel (`D-024`) — **APPROVED**
- **Question:** Should users register/login with Email + Password, Phone + Password, or Phone OTP?
- **Founder Selected Policy:** **Email OR Phone + Password.**
- **Technical Implications:**
  - Support either `email` (normalized lowercase) or `phone_e164` (normalized E.164) + password; **do not require both**.
  - No mandatory paid SMS/WhatsApp OTP integration in initial beta.
  - Automated email verification when email is provided; optional/manual phone verification during seller review; canonical normalization and unique constraints prevent duplicate accounts and ambiguous identity resolution.

### PQ-06: Session Architecture Confirmation (`D-016`) — **APPROVED**
- **Question:** Approve server-managed PostgreSQL sessions (`HttpOnly`, `Secure`, `SameSite=Lax` cookies + CSRF) vs. JWT + refresh tokens?
- **Founder Selected Policy:** **PostgreSQL-backed server-managed opaque sessions (`Option A`).**
- **Technical Implications:** Immediate session revocation on suspension/password reset, CSRF protection on cookie state changes, and TOTP MFA for privileged staff roles (`MODERATOR`, `SUPPORT`, `ADMIN`, `SUPER_ADMIN`).

### PQ-07: Seller Verification Criteria Without Premature ID Storage (`D-025`) — **APPROVED**
- **Question:** What minimum evidence must a seller submit for Admin approval in Mianwali District?
- **Founder Selected Policy:** **Basic verification without CNIC collection (`Option A`).**
- **Technical Implications:** Require verified contact details where feasible, store description, Mianwali `AreaZone` service area, and at least one sample listing/photo for Admin review prior to publication. **No CNIC image or CNIC number storage** in initial closed beta.

---

## 3. Order, Catalog & Communication Policy Decisions

### PQ-08: Mianwali District Sub-Zones & Initial Categories (`D-026`, `D-035`) — **APPROVED**
- **Question:** Use curated `AreaZone` records vs. free-text neighbourhoods, and what exact zones/categories should be seeded?
- **Founder Selected Policy (`2026-11-21`, `D-035`):** Launch Closed Beta using the existing seeded tehsil `AreaZone` records (`Mianwali`, `Isakhel`, `Piplan`) and starter categories in `apps/api/prisma/seed.ts`; expand sub-localities and additional categories after initial rollout.
- **Technical Implications:** Structured `AreaZone` (`Mianwali`, `Isakhel`, `Piplan`) and 6 starter `Category` rows remain the locked Closed Beta baseline; never use unrestricted free-text neighbourhoods as the primary delivery/service-area filter.

### PQ-09: Buyer–Seller Pre-Order / Active-Order Communication Without Real-Time Chat (`D-021`) — **APPROVED**
- **Question:** Is an order-scoped REST message thread (`order_messages`) needed in the first pilot?
- **Founder's Written Intent:** **Include order-scoped messaging.**
- **Option-Label Correction:** The source document labeled including `order_messages` as **Option A** (and notes-only as Option B). The founder's written intent (**Option A**) is adopted:
  - Include `order_messages` table using **REST-based polling only** (no WebSockets or real-time chat).
  - Text-only in MVP (no attachments); strict `customer_id`/`store_id` ownership checks; audited `SUPPORT`/`ADMIN` access.
  - Freeze messaging after terminal order closure (`COMPLETED` or `CANCELLED`), subject to documented Support/Dispute exceptions; display PII warnings against sharing residential addresses or private phone numbers; apply retention rules.

### PQ-10: Customer Cancellation Window & Service Auto-Completion Rules (`D-027`, `D-036`) — **APPROVED**
- **Question:** Up to which status can a customer self-cancel, and should services auto-complete after 7 days?
- **Founder Selected Policy (`2026-11-21`, `D-036`):** **Option A (Approved — 7-day auto-completion finalized).**
- **Technical Implications:**
  - Customer may self-cancel freely **only while `status = PENDING_CONFIRMATION`**. After `CONFIRMED`, cancellation requires seller approval or Admin dispute handling.
  - Service orders in `DELIVERY_SUBMITTED` with `Payment.status = COLLECTED` and no open revision or dispute **auto-complete 7 days after `delivery_submitted_at`**, enforced by `OrdersService.autoCompleteExpiredServiceOrders` and `POST /api/v1/admin/orders/auto-complete-services`.

### PQ-11: Bilingual Listing Content Model & Urdu Typography (`D-028`) — **APPROVED (Content Model) / OPEN (Final Font at Gate D)**
- **Question:** Single-language seller listings vs. dual Urdu/English fields, and which Urdu font?
- **Founder Selected Policy:** **Bilingual UI with single-language seller listings (`Option A`).**
- **Technical Implications:** App interface (`en`/`ur`, RTL/LTR) and system `districts`/`area_zones`/`categories` are bilingual; sellers enter title/description in one chosen language rendered with `dir="auto"`.
- **Remaining `OPEN` Detail (Required at `Gate D` / Milestone 3):** Final Urdu font family and typography scale.

### PQ-12: Women-Led Seller Analytics Consent (`D-029`) — **APPROVED**
- **Question:** Store optional `women_led_self_id` in DB during initial closed beta or exclude it?
- **Founder Selected Policy:** **Exclude women-led identification fields from the database during the initial beta (`Option A`).**
- **Technical Implications:** Removed `women_led_self_id`, `women_led_consent`, and `women_led_consent_updated_at` from `seller_profiles`. No demographic attributes are exposed publicly or used for ranking, moderation, or commissions. Any future addition requires explicit founder approval and a privacy review.

---

## 4. Phase 2.1 Architecture & Financial Consistency Decisions

### PQ-13: Delivery Fee Ownership & Seller Net Entitlement Definition (`D-018`) — **APPROVED**
- **Question:** Does the Seller own/retain `delivery_fee_paisa` under seller-managed delivery?
- **Founder Selected Policy:** **Seller owns and retains the delivery fee under seller-managed delivery (`Option A`).**
- **Technical Implications:**
  - Seller sets and collects `delivery_fee_paisa`; delivery fee is excluded from `commissionable_base_paisa` (`PQ-02`).
  - `seller_net_entitlement_paisa = total_paisa - commission_amount_paisa` represents an accounting entitlement only—**not** a platform wallet, escrow, or guaranteed platform payout.

### PQ-14: Service Payment & Fulfilment Rules (`REMOTE` vs. `ON_SITE` vs. `HYBRID`, `D-019`) — **APPROVED (Core Scope) / OPEN (Copy, Evidence & Dispute Rules)**
- **Question:** How should `REMOTE` digital services be handled under COD-only MVP?
- **Founder's Written Intent:** **Include `REMOTE` services with manual offline payment confirmation.**
- **Option-Label Correction:** The source document labeled including `REMOTE` services with seller-confirmed offline settlement as **Option A** (and deferring `REMOTE` as Option B). The founder's written intent (**Option A**) governs:
  - Support `ON_SITE`, `HYBRID`, and `REMOTE` service modes.
  - `REMOTE` services **must not** create physical `Delivery` records (`service_address_snapshot_json = NULL`).
  - Seller manually confirms offline payment receipt (`Payment.payment_method = MANUAL_OFFLINE`), storing confirmation timestamp (`collected_at`), confirming user (`confirmed_by_id`), optional `manual_payment_method_desc`, and `PaymentEvent` audit metadata.
  - Payment confirmation is strictly separate from service delivery/completion and must **never** be represented as independent platform verification (no online gateway, wallet, or escrow).
- **Remaining `OPEN` Details (Required before Milestone 5 service checkout/disputes):**
  - Exact customer-facing wording explaining payment is arranged directly with the seller.
  - Evidence handling and dispute resolution process for manual remote-service payment confirmations.

### PQ-15: Mixed-Category Commission Resolution in Single-Seller Orders (`D-020`) — **APPROVED**
- **Question:** How is commission resolved when a single-seller order contains multiple categories?
- **Founder Selected Policy:** **Global or Order-Type flat commission rule (`Option A`).**
- **Technical Implications:** One applicable `GLOBAL` or `ORDER_TYPE` rule is snapshotted per order (`orders.commission_rule_id`); no per-`OrderItem` category calculation in MVP; schema preserves `category_id` and item-level extensibility for future use.

### PQ-16: Slug Scoping & Store-Scoped Cart UX (`D-030`) — **APPROVED**
- **Question:** Confirm global auto-suffixed slugs + separate saved carts per store vs. store-scoped slugs + single cart?
- **Founder Selected Policy:** **Globally unique active slugs and separate saved carts per store (`Option A`).**
- **Technical Implications:** Active product/service slugs are globally unique (`WHERE deleted_at IS NULL`) with automatic short-code suffixing on collision; `carts` uses `UNIQUE(customer_id, store_id)` so adding from another store preserves existing carts while checkout remains strictly single-seller.

---

## 5. Founder-Owned UI/UX Design Handoff Checklist (`Gate D`)

Per `docs/05_UX_DESIGN_BRIEF.md` and `D-005`, the founder owns all visual design. Engineering will **not** invent colors, typography, or layouts. Before Milestone 3 UI implementation begins, design input (Figma frames, screenshots, tokens, and final Urdu font) is needed for:
1. **Design Foundations:** Color tokens, English & Urdu typography scale (including final Urdu font from `PQ-11`), spacing/radius/elevation tokens, RTL mirroring rules, and `shadcn/ui` states.
2. **Public & Customer Flows:** Home (Mianwali District), Search/Results, Category browse, Store Profile, Product Detail, Service Detail (`ON_SITE`/`HYBRID`/`REMOTE` copy), Store-Scoped Carts, Single-Seller Checkout, Order Confirmation, Orders & Detail (separate delivery/collection states + `order_messages`), Reviews/Disputes.
3. **Seller Workspace Flows:** Seller Onboarding (no CNIC, no women-led fields) & Store Setup, Dashboard Overview, Product/Variant CRUD, Service/Package CRUD, Order Inbox & Detail (status updates, `order_messages`, COD / `REMOTE` manual offline payment confirmation), Accounting Commission Statement (0% beta / non-wallet).
4. **Admin Console Flows:** Admin Overview, Seller Verification Queue, Listing Moderation Queue, Order/Message/Dispute Lookup, Commission Rule Management, Manual Seller Settlement Recording, Audit Log Viewer.

---

## 6. Remaining Open Founder Questions (Consolidated)

| ID / Gate | Remaining Open Question | Status | Why Still Open / Reason | Milestone Required By |
|---|---|---|---|---|
| **PQ-03** (`D-022`, `D-034`) | **Monthly** cadence finalized; define post-beta **grace period** and **overdue/listing-pause threshold** | `APPROVED (Cadence) / OPEN (Thresholds)` | Monthly cadence finalized 2026-11-21; `0%` promotional beta active now, thresholds needed before non-zero commission activation | Before non-zero commission activation |
| **PQ-08** (`D-026`, `D-035`) | Closed Beta Mianwali `AreaZone` tehsils (`Mianwali`, `Isakhel`, `Piplan`) and 6 starter categories | `APPROVED` | Founder finalized starter tehsils & categories (`seed.ts`) for Closed Beta on 2026-11-21; expand later | Resolved |
| **PQ-10** (`D-027`, `D-036`) | **7-day service auto-completion** after `DELIVERY_SUBMITTED` | `APPROVED` | Founder finalized 7-day auto-completion on 2026-11-21 (`D-036`) when no revision/dispute is open | Resolved |
| **PQ-11** (`D-028`) | Final **Urdu font family** and typography scale | `OPEN` | Content model is locked; visual typography belongs to founder-owned design tokens | **Milestone 3 (`Gate D`)** |
| **PQ-14** (`D-019`) | Exact **customer-facing wording**, **evidence handling**, and **dispute process** for `REMOTE` manual offline payment confirmation | `OPEN` | Core `REMOTE` support is approved; consumer expectations and dispute evidence rules require founder product sign-off | **Milestone 5** (before service checkout & disputes UI/rules) |
| **Gate D** (`D-005`) | Founder-provided **Figma frames, design tokens, RTL mirroring rules, and mobile/desktop specs** | `OPEN` | Founder owns UI/UX; agents must not invent visual design | **Milestone 3** |
| **D-012** | Product name finalized as **Saudavo** (2026-11-20); visual branding/logo assets & domain/trademark checks remain open | `APPROVED` (Name) / `OPEN` (Assets) | Name finalized as **Saudavo**; logo/brand tokens belong to `Gate D` and domain/trademark checks remain founder-managed | **Milestone 3 (`Gate D`) / Milestone 8** |
| **Gate F** | Legal/tax review (Terms, Privacy Policy, Seller Terms, data retention) | `DEFERRED` | Required before live public transactions (`docs/07_SECURITY_PRIVACY_QA.md`) | **Milestone 7 / Gate F** |
