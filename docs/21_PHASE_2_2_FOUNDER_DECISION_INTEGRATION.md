# Phase 2.2 — Founder Decision Integration & Sign-Off Report

> Date: 2026-11-17  
> Role: Senior Software Architect, Database Architect, Product Systems Analyst & Technical Documentation Lead  
> Target Launch Market: Mianwali District, Punjab, Pakistan  
> **Execution Boundary:** Documentation-only integration. No application code, Prisma schemas, database migrations, dependency installs, or deployments were executed.

---

## 1. Executive Summary

All 16 founder decisions (`PQ-01` through `PQ-16`) submitted for Phase 2.2 have been integrated consistently across the project's architecture, database design, ERD, order/COD workflows, commission model, authorization matrix, API contract, implementation plan, and decision log.

Three option-label mismatches in the source questionnaire (`PQ-03`, `PQ-09`, `PQ-14`) were resolved strictly in favor of the **founder's written choice descriptions**.

Technical architecture and schema consistency are now aligned. Seven operational/design details (`PQ-03` post-beta settlement cadence & thresholds, `PQ-08` exact Mianwali `AreaZone` & `Category` seed lists, `PQ-10` final 7-day service auto-completion confirmation, `PQ-11` final Urdu font, `PQ-14` remote-service customer wording/evidence/dispute rules, `Gate D` UI/UX frames, and `D-012` final product branding) remain **explicitly `OPEN`** and are assigned to their respective pre-build milestones.

---

## 2. Complete Summary of `PQ-01` Through `PQ-16`

| ID | Topic | Founder-Selected Policy | Status | Decision Log Ref |
|---|---|---|---|---|
| **PQ-01** | Initial Commission | **0% Promotional Commission** during the Mianwali Closed Beta (`0 bps`, zero-value `CommissionLedger` audit accruals retained; future rate configurable) | `APPROVED` | `D-017` |
| **PQ-02** | Delivery Fee Commission | **Exclude delivery fees** from commission calculation (`include_delivery_fee = false`) | `APPROVED` | `D-017` |
| **PQ-03** | COD Commission Settlement | **Monthly or biweekly settlement** post-beta (zero remittance due during 0% beta; monthly vs. biweekly, grace period & overdue thresholds remain `OPEN`) | `APPROVED` (Framework) / `OPEN` (Params) | `D-022` |
| **PQ-04** | Delivery Operator | **Seller-managed delivery and pickup only** (no platform rider fleet or `DELIVERY_OPERATOR` role in MVP) | `APPROVED` | `D-023` |
| **PQ-05** | Login Identifier | **Email OR Phone + Password** (do not require both; no mandatory paid SMS/WhatsApp OTP in initial beta) | `APPROVED` | `D-024` |
| **PQ-06** | Session Architecture | **PostgreSQL-backed server-managed opaque sessions** (`HttpOnly`, `Secure`, `SameSite=Lax` cookies + CSRF + staff MFA) | `APPROVED` | `D-016` |
| **PQ-07** | Seller Verification | **Basic verification without CNIC collection** (verified contact where feasible, store info, service area, sample listing/photo, Admin review) | `APPROVED` | `D-025` |
| **PQ-08** | Area Zones | **Curated tehsil-level zones and important localities** (`Mianwali`, `Isakhel`, `Piplan` + approved localities; exact seed lists `OPEN`) | `APPROVED` (Structure) / `OPEN` (Seed Lists) | `D-026` |
| **PQ-09** | Buyer–Seller Messaging | **Include order-scoped `order_messages`** (REST-only, text-only, no WebSockets, strict party ownership, audited staff access, terminal freeze) | `APPROVED` | `D-021` |
| **PQ-10** | Cancellation & Service Completion | **Option A:** Customer self-cancels in `PENDING_CONFIRMATION` only; post-confirm requires seller/Admin handling; 7-day service auto-completion pending final confirmation | `APPROVED` (Cancel) / `OPEN` (7-day) | `D-027` |
| **PQ-11** | Bilingual UI & Listing Content | **Bilingual UI (`en`/`ur`, RTL/LTR) with single-language seller listings** (`dir="auto"`; final Urdu font at `Gate D`) | `APPROVED` (Model) / `OPEN` (Font) | `D-028` |
| **PQ-12** | Women-Led Analytics | **Exclude women-led identification/consent fields from database** during initial beta (`women_led_self_id`, `women_led_consent` removed) | `APPROVED` | `D-029` |
| **PQ-13** | Delivery Fee Ownership | **Seller owns and retains delivery fee** under seller-managed delivery (`seller_net_entitlement_paisa = total_paisa - commission_amount_paisa`; accounting entitlement only) | `APPROVED` | `D-018` |
| **PQ-14** | Remote Services | **Include `REMOTE` services with manual offline payment confirmation** (plus `ON_SITE` & `HYBRID`; no `Delivery` row for `REMOTE`; exact copy/evidence/dispute rules `OPEN`) | `APPROVED` (Core) / `OPEN` (Rules/Copy) | `D-019` |
| **PQ-15** | Mixed-Category Commission | **Global or Order-Type flat commission rule** per order in MVP (no per-`OrderItem` category calculation; future extensibility preserved) | `APPROVED` | `D-020` |
| **PQ-16** | Slugs and Carts | **Globally unique active slugs** (auto-suffixed on collision) + **separate saved carts per store** (single-seller checkout) | `APPROVED` | `D-030` |

---

## 3. Three Option-Label Corrections (`PQ-03`, `PQ-09`, `PQ-14`)

Per founder instruction, written choice descriptions overrode option labels where the source questionnaire had labeling ambiguity:

1. **`PQ-03` (COD Commission Settlement):**
   - *Source Document Labeling:* Option A described monthly/biweekly offline settlement (`SellerSettlementRecord`); Option B described 0% pilot commission.
   - *Founder's Written Intent:* **Monthly or biweekly settlement** (which corresponds to **Option A**).
   - *Harmonization:* Because `PQ-01` sets a `0%` promotional commission during the Mianwali closed beta, no remittance is due during beta; monthly/biweekly settlement (`Option A`) governs once non-zero commission rates are activated post-beta.

2. **`PQ-09` (Buyer–Seller Messaging):**
   - *Source Document Labeling:* Option A described including `order_messages` (text-only REST); Option B described checkout notes only.
   - *Founder's Written Intent:* **Include order-scoped messaging** (which corresponds to **Option A**).
   - *Integration:* `order_messages` is now promoted to the approved MVP schema and API contract (`GET`/`POST /orders/:id/messages`).

3. **`PQ-14` (Remote Services):**
   - *Source Document Labeling:* Option A described supporting `REMOTE` services with seller-confirmed offline/manual payment; Option B described deferring `REMOTE` services.
   - *Founder's Written Intent:* **Include `REMOTE` services with manual offline payment confirmation** (which corresponds to **Option A**).
   - *Integration:* `ON_SITE`, `HYBRID`, and `REMOTE` modes are all active in MVP; `REMOTE` skips physical `Delivery` rows and uses `Payment.payment_method = MANUAL_OFFLINE` with seller-reported confirmation metadata.

---

## 4. Technical Consequences Across Architecture & Schema

1. **Identity & Auth (`users`, `user_sessions`):**
   - `users` accepts either `email` (lowercased) or `phone_e164` (E.164 normalized) + Argon2id password without requiring both or paid SMS/WhatsApp OTP.
   - `UserSession` uses opaque PostgreSQL tokens, `HttpOnly`/`Secure`/`SameSite=Lax` cookies, CSRF protection, revocation on suspension/reset, and TOTP MFA for staff.
2. **Seller Profiles (`seller_profiles`):**
   - `women_led_consent`, `women_led_self_id`, and `women_led_consent_updated_at` were **removed** from `seller_profiles` (`docs/14_DATABASE_DESIGN.md`, `docs/15_ENTITY_RELATIONSHIP_DIAGRAM.md`, `docs/04_API_CONTRACT.md`, `docs/13_SYSTEM_ARCHITECTURE.md`).
   - No CNIC numbers or ID documents are collected or stored.
3. **Messaging (`order_messages`):**
   - Added as a core MVP table (`orders` module) with REST endpoints (`GET`/`POST /orders/:id/messages`), text-only constraint (`1..1000` chars), zero WebSockets, `customer_id`/`store_id` ownership isolation, audited Support/Admin access, terminal closure freeze (with dispute/support exceptions), and PII warnings.
4. **Services & Manual Offline Payment (`service_order_details`, `payments`):**
   - `service_order_details` adds `service_mode_snapshot`, `area_zone_id`, and `service_address_snapshot_json` (`NULL` for `REMOTE`). `deliveries` is strictly omitted for all service orders.
   - `payments` adds `MANUAL_OFFLINE` method support, `manual_payment_method_desc`, `confirmation_note`, `confirmed_by_id`, `collected_at`, and `PaymentEvent` audit logs—explicitly marked `SELLER_REPORTED` (not platform-verified).
5. **Commission & Financial Accounting (`commission_rules`, `commission_ledger`):**
   - Seeded at `0 bps` (`PQ-01`) with `include_delivery_fee = false` (`PQ-02`), `GLOBAL`/`ORDER_TYPE` flat rule per order (`PQ-15`), `seller_net_entitlement_paisa = total_paisa - commission_amount_paisa` (`PQ-13`), and immutable zero-value `COMMISSION_ACCRUAL` records on completed+collected orders.

---

## 5. Remaining Founder Decisions

| Item | Open Detail | Status | Reason & Impact | Milestone Required By |
|---|---|---|---|---|
| **PQ-03** (`D-022`) | Choose **monthly vs. biweekly** settlement post-beta; define **grace period**, **overdue threshold**, and **listing-pause policy** | `OPEN` | Beta is 0% (`PQ-01`), so no remittance occurs now; required before charging non-zero commissions | **Milestone 6** (before post-beta rate activation) |
| **PQ-08** (`D-026`) | Exact **Mianwali `AreaZone` locality names** and **initial `Category` taxonomy** | `OPEN` | Curated zone model is approved; specific local names are product data | **Milestone 4 / 8** (placeholder dev seeds safe for M2) |
| **PQ-10** (`D-027`) | Confirm **7-day service auto-completion** rule after `DELIVERY_SUBMITTED` | `OPEN` | Cancellation rule is locked; auto-complete timer needs explicit sign-off | **Milestone 5** |
| **PQ-11** (`D-028`) | Final **Urdu font family** and typography scale | `OPEN` | Part of founder-owned design tokens | **Milestone 3 (`Gate D`)** |
| **PQ-14** (`D-019`) | Exact **customer-facing wording**, **evidence handling**, and **dispute process** for `REMOTE` manual offline payments | `OPEN` | Prevents consumer confusion about off-platform settlement & dispute resolution | **Milestone 5** |
| **Gate D** (`D-005`) | Founder Figma frames, tokens, RTL mirroring, mobile/desktop specs | `OPEN` | Founder owns UI/UX; agents must not invent designs | **Milestone 3** |
| **D-012** | Final **product name and branding** (`LocalLoop` is temporary codename) | `OPEN` | Needed for domain/trademark/public launch | **Milestone 8** |
| **Gate F** | Legal/tax policy review (Terms, Privacy Policy, retention schedule) | `DEFERRED` | Required before live public transactions | **Milestone 7 / Gate F** |

---

## 6. Updated Decision Log References

Updated [10_DECISION_LOG.md](file:///c:/Users/Latif%20Ullah%20Khan/local_marketplace_antigravity_blueprint/docs/10_DECISION_LOG.md):
- `D-015` (`PKR`/`paisa`), `D-016` (`PQ-06`), `D-017` (`PQ-01`/`PQ-02`), `D-018` (`PQ-13`), `D-020` (`PQ-15`), `D-021` (`PQ-09`) → **`APPROVED`**.
- Added `D-022` (`PQ-03` `OPEN`), `D-023` (`PQ-04` `APPROVED`), `D-024` (`PQ-05` `APPROVED`), `D-025` (`PQ-07` `APPROVED`), `D-026` (`PQ-08` `APPROVED (Partial)`), `D-027` (`PQ-10` `APPROVED (Partial)`), `D-028` (`PQ-11` `APPROVED (Partial)`), `D-029` (`PQ-12` `APPROVED`), `D-030` (`PQ-16` `APPROVED`).
- `D-019` (`PQ-14`) marked **`APPROVED (Partial)`** (`OPEN` wording/evidence/dispute rules).
- `D-012` remains **`OPEN`**.

---

## 7. Documentation Consistency Audit (All 15 Checks)

| # | Audit Check | Status | Verification Summary |
|---|---|---|---|
| 1 | `PQ-01` & `PQ-03` alignment | **PASS** | 0% promotional beta (`PQ-01`) entails zero remittance due in beta; monthly/biweekly settlement (`PQ-03`) applies post-beta (`docs/17`, `docs/19`). |
| 2 | `PQ-02` & `PQ-13` alignment | **PASS** | Seller retains `delivery_fee_paisa`, excluded from `commissionable_base_paisa`; `seller_net_entitlement_paisa = total_paisa - commission_paisa` (`docs/14`, `docs/17`). |
| 3 | `PQ-04` & `PQ-14` alignment | **PASS** | Seller-managed physical delivery (`PQ-04`) is strictly separate from `REMOTE` service fulfilment (`PQ-14`) (`docs/16`). |
| 4 | `PQ-09` ownership & privacy | **PASS** | REST-only, text-only, strict `customer_id`/`store_id` ownership, audited staff access, terminal freeze, PII warnings (`docs/04`, `docs/14`, `docs/18`). |
| 5 | `PQ-10` state transitions | **PASS** | Customer self-cancel restricted to `PENDING_CONFIRMATION` across physical & service workflows (`docs/16`). |
| 6 | `PQ-11` single-language listings | **PASS** | UI/categories bilingual (`en`/`ur`); seller listings single-language with `dir="auto"` (`docs/12`, `docs/19`). |
| 7 | `PQ-12` demographic exclusion | **PASS** | `women_led_self_id` and `women_led_consent` removed from `docs/13`, `docs/14`, `docs/15`, and `docs/04`. |
| 8 | `PQ-14` no `Delivery` for `REMOTE` | **PASS** | `deliveries` restricted to physical orders; `REMOTE` has `service_address_snapshot_json = NULL` (`docs/14`, `docs/15`, `docs/16`). |
| 9 | `PQ-15` single commission rule per order | **PASS** | MVP resolves one `GLOBAL` or `ORDER_TYPE` rule per order (`docs/14`, `docs/17`). |
| 10 | `PQ-16` global slugs & store carts | **PASS** | `uq_products_slug_active` / `uq_service_listings_slug_active` + `UNIQUE(customer_id, store_id)` on `carts` (`docs/14`, `docs/15`). |
| 11 | No wallet, escrow, or online gateway | **PASS** | Confirmed across `docs/00`, `01`, `02`, `07`, `10`, `13`, `14`, `17`. |
| 12 | Integer `paisa` only | **PASS** | All monetary fields are `BIGINT` (`paisa`) + `CHAR(3)` `'PKR'`; rates in `INT` `bps` (`docs/14`, `docs/17`). |
| 13 | COD delivery vs. cash collection | **PASS** | `Delivery.delivery_status` decoupled from `Order.cod_collection_status` & `Payment.status` (`docs/04`, `14`, `16`, `17`). |
| 14 | Seller private address/phone protected | **PASS** | `show_public_phone = false` & `show_public_address = false` defaults + EXIF stripping (`docs/07`, `14`, `18`). |
| 15 | Server-side auth & audit logs | **PASS** | NestJS guards, RBAC matrix, staff MFA, and immutable `AdminAuditLog` mandatory (`docs/13`, `18`). |

---

## 8. Implementation Blockers & Safe Deferrals

### Does Anything Block Milestone 2 (Repository Scaffold & Core Prisma Schema)?
- **No technical documentation blockers remain for Milestone 2**, **provided the founder signs off on this Phase 2.2 package (`Gate C`)**.
- Safe handling of open items in Milestone 2:
  - **`PQ-08` (Exact `AreaZone` & `Category` names):** Schema (`districts`, `area_zones`, `categories`) is fully defined; Milestone 2 can use sample Mianwali dev fixtures (`Mianwali`, `Isakhel`, `Piplan`) while locking the final curated pilot seed list before Milestone 4/8.
  - **`PQ-14` (Remote-service copy, evidence, dispute rules):** Core `payments` (`MANUAL_OFFLINE`, `manual_payment_method_desc`, `confirmation_note`) and `disputes` tables already support audit metadata; if founder-approved dispute evidence later requires image proof on `Dispute`, that can be added cleanly via an additive nullable column or join table before Milestone 5/6.
  - **`PQ-10` (7-day auto-complete), `PQ-03` (post-beta settlement cadence), `PQ-11` (Urdu font), `Gate D` (Figma frames), `D-012` (final name):** None alter Milestone 2's core scaffold or baseline schema; each gates its respective downstream milestone (`M3`, `M5`, `M6`, `M8`).

---

## 9. Recommended Next Milestone

**Milestone 2 — Safe Repository Scaffold (`prompts/02_REPO_SCAFFOLD.md`)**, *only after explicit founder sign-off on Phase 2.2*:
- Create the `pnpm` workspace (`apps/web`, `apps/api`, `packages/contracts`, `packages/config`), CI workflow, `.env.example`, `/api/v1/health`, and baseline Prisma schema + initial migration.

---

## 10. Final Readiness Verdict

**READY FOR FOUNDER SIGN-OFF**

*All 16 founder decisions (`PQ-01`–`PQ-16`) and all 3 option-label corrections (`PQ-03`, `PQ-09`, `PQ-14`) are consistently integrated across the documentation set, and all 15 consistency checks pass. Seven operational/design details remain explicitly `OPEN` and mapped to downstream milestones (`M3`–`M8`). Repository scaffolding (`Milestone 2`) awaits explicit founder authorization.*
