# Decision Log

Use this file to record decisions. Status values: `PROPOSED`, `APPROVED`, `REJECTED`, `DEFERRED`, `OPEN`.

| ID | Decision | Status | Owner | Notes |
|---|---|---|---|---|
| D-001 | Product is a hybrid marketplace for physical goods, services and local storefronts | APPROVED | Founder | Confirmed in Phase 2 scope |
| D-002 | Optional seller SaaS subscriptions are a future revenue stream | APPROVED | Founder | Keep free entry tier; validate willingness to pay post-MVP |
| D-003 | Launch market locked to **Mianwali District, Punjab, Pakistan** | APPROVED | Founder | Phase 2 lock; location model supports additional districts/cities later; do not expand MVP to all of Pakistan |
| D-004 | First release is responsive web app with PWA readiness | APPROVED | Founder | Native mobile apps deferred |
| D-005 | Founder owns UI/UX design; agent implements approved designs | APPROVED | Founder | Do not invent visual design or replace approved frames |
| D-006 | TypeScript pnpm monorepo, Next.js App Router, Tailwind, shadcn/ui, NestJS, PostgreSQL, Prisma | APPROVED | Founder | Confirmed technical direction |
| D-007 | Modular monolith for MVP (no microservices, Kubernetes, or Kafka) | APPROVED | Founder | Explicit module boundaries and service/outbox communication |
| D-008 | PostgreSQL search first; dedicated search engine (Meilisearch/OpenSearch) deferred | APPROVED | Founder | Measure before adding |
| D-009 | Redis deferred until a measured need exists; use DB outbox initially | APPROVED | Founder | Avoid early operations burden |
| D-010 | No platform wallet, escrow, or automated financial transfers in MVP | APPROVED | Founder | Accounting ledger + offline settlement records only |
| D-011 | Product and service order flows are distinct | APPROVED | Founder | Shared `Order` core with distinct workflows and state machines |
| D-012 | Product name finalized as **Saudavo** (replacing temporary codename `LocalLoop`) | APPROVED | Founder | Confirmed 2026-11-20; trademark/domain checks remain founder-managed |
| D-031 | Brand logo finalized as **Figma Concept A ("S-Ribbon & Market Handle")** + Starter Palette (`#0F6B52`, `#D96B27`) | APPROVED | Founder | Confirmed 2026-11-20 (`https://www.figma.com/design/TxXpq2005rV2oPNOejWgBW?node-id=2-2`); screen-level `Gate D` frames still pending for M3 |
| D-013 | **Single-seller checkout/order** in MVP (one seller per checkout/order) | APPROVED | Founder | Phase 2 lock; multi-seller purchases create separate orders with independent status, delivery, and financial records |
| D-014 | **COD-only active payment method** in MVP with payment-provider abstraction | APPROVED | Founder | Phase 2 lock; online gateway deferred; delivery confirmation does not imply COD cash collection |
| D-015 | Currency locked to `PKR` stored as integer minor units (`paisa`) | APPROVED | Founder | Confirmed via `D-003` (Mianwali, Pakistan) & `PQ-13` (`paisa` entitlement formula) |
| D-016 | Server-managed PostgreSQL opaque sessions (`HttpOnly`, `Secure`, `SameSite=Lax`) + CSRF + staff MFA + Zod contracts | APPROVED | Founder | Confirmed via `PQ-06` (2026-11-17) |
| D-017 | Initial `CommissionRule`: **0% promotional commission (`0 bps`)** during Mianwali closed beta; delivery fees excluded (`include_delivery_fee = false`) | APPROVED | Founder | Confirmed via `PQ-01` & `PQ-02` (2026-11-17); zero-value `CommissionLedger` audit accruals retained |
| D-018 | Seller owns and retains delivery fee under seller-managed delivery (`seller_net_entitlement_paisa = total_paisa - commission_amount_paisa`) | APPROVED | Founder | Confirmed via `PQ-13` (2026-11-17); accounting entitlement only, not a wallet or platform payout |
| D-019 | Support `ON_SITE`, `HYBRID`, and `REMOTE` services; `REMOTE` uses manual offline seller payment confirmation (no `Delivery` record) | APPROVED (Partial) | Founder | Core policy confirmed via `PQ-14` (2026-11-17, label correction); customer wording, evidence & dispute process remain `OPEN` |
| D-020 | Mixed-category commission uses a single `GLOBAL` or `ORDER_TYPE` flat rule per order in MVP (future schema extensibility preserved) | APPROVED | Founder | Confirmed via `PQ-15` (2026-11-17) |
| D-021 | Include `order_messages` (REST-only, text-only, no WebSockets, strict party ownership, audited support access, terminal freeze) | APPROVED | Founder | Confirmed via `PQ-09` (2026-11-17, label correction) |
| D-022 | Post-beta commission settlement cadence (Monthly vs. Biweekly), grace period, and overdue/listing-pause thresholds | APPROVED (Partial) | Founder | Cadence finalized as **Monthly** (`2026-11-21`, see `D-034`); zero remittance due during 0% beta (`PQ-01`); grace period & overdue threshold remain `OPEN` before non-zero commission activation (`M6`) |
| D-023 | Seller-managed delivery and pickup only in MVP (no platform rider fleet or `DELIVERY_OPERATOR` role) | APPROVED | Founder | Confirmed via `PQ-04` (2026-11-17) |
| D-024 | Account login via Email OR Phone + Password (avoiding mandatory paid SMS/WhatsApp OTP in initial beta) | APPROVED | Founder | Confirmed via `PQ-05` (2026-11-17) |
| D-025 | Basic seller verification without CNIC image or number storage in initial closed beta | APPROVED | Founder | Confirmed via `PQ-07` (2026-11-17) |
| D-026 | Curated `AreaZone` records (Mianwali, Isakhel, Piplan & key localities); exact zone and category seed lists pending | APPROVED | Founder | Finalized for Closed Beta (`2026-11-21`, see `D-035`): launch on existing seeded tehsils (`Mianwali`, `Isakhel`, `Piplan`) + 6 starter categories (`seed.ts`), extend later |
| D-027 | Customer self-cancellation in `PENDING_CONFIRMATION` only; **7-day service auto-completion** rule after `DELIVERY_SUBMITTED` | APPROVED | Founder | Self-cancel cutoff confirmed 2026-11-17; 7-day service auto-completion finalized 2026-11-21 (`D-036`) |
| D-028 | Bilingual UI (`en`/`ur`, RTL/LTR) with single-language seller listings (`dir="auto"`); Urdu UI font selected as **Noto Sans Arabic** | APPROVED | Founder | Content model confirmed via `PQ-11` (2026-11-17); Urdu font `Noto Sans Arabic` confirmed 2026-11-20 (`D-032`) |
| D-029 | Exclude women-led identification/consent fields (`women_led_self_id`, `women_led_consent`) from database during initial beta | APPROVED | Founder | Confirmed via `PQ-12` (2026-11-17) |
| D-030 | Globally unique active product/service slugs (auto-suffixed on collision) and separate saved carts per store (single-seller checkout) | APPROVED | Founder | Confirmed via `PQ-16` (2026-11-17) |
| D-032 | Urdu UI typography (`PQ-11`) locked to **Noto Sans Arabic**; backend Milestone 4 supply/moderation modules prioritized before Gate D UI frames | APPROVED | Founder | Confirmed 2026-11-20 via interactive founder prompt |
| D-033 | **Gate D Approved:** Saudavo Figma Design System (`Saudavo Tokens`, `Concept A`, `#0F6B52`/`#D96B27`, `Inter` + `Noto Sans Arabic`) & Core UI Screens approved for `apps/web` implementation | APPROVED | Founder | Confirmed 2026-11-20 (`https://www.figma.com/design/TxXpq2005rV2oPNOejWgBW`) |
| D-034 | Post-beta commission settlement cadence (`PQ-03`) finalized as **Monthly** (grace period/overdue threshold pending) | APPROVED (Partial) | Founder | Confirmed 2026-11-21; 0% promotional closed beta remains active first (`D-017`) |
| D-035 | Closed Beta geography & categories (`PQ-08`) finalized on initial seeded tehsils (`Mianwali`, `Isakhel`, `Piplan`) and 6 starter categories | APPROVED | Founder | Confirmed 2026-11-21; expand to sub-localities and additional categories post-beta |
| D-036 | Service auto-completion (`PQ-10`) locked at **7 days** after `DELIVERY_SUBMITTED` when payment is `COLLECTED` and no revision/dispute is raised | APPROVED | Founder | Confirmed 2026-11-21; implemented via `OrdersService.autoCompleteExpiredServiceOrders` |

## Change process
When a decision changes, add a new row with date, rationale, impact and approver. Do not erase decision history.

### Decision History Updates
- **2026-11-20 (`D-012`):** Founder finalized marketplace name as **Saudavo** (previously temporary codename `LocalLoop`). Visual logo/brand tokens remain gated under `Gate D`; domain/trademark checks remain founder responsibility.
- **2026-11-20 (`D-031`):** Founder approved **Concept A ("The S-Ribbon & Market Handle")** in Figma (`TxXpq2005rV2oPNOejWgBW`, node `2:2`) and authorized starting Milestone 2 (`prompts/02_REPO_SCAFFOLD.md`) phase by phase.
- **2026-11-20 (`D-032`):** Founder selected **Noto Sans Arabic** for Urdu UI typography (`PQ-11`) and prioritized building Milestone 2 OpenAPI 3.1 + Milestone 4 backend modules (Seller Onboarding, Stores, Products, Services, Moderation) while UI screens wait for Gate D design frames.
- **2026-11-20 (`D-033`):** Founder approved Gate D (`TxXpq2005rV2oPNOejWgBW` tokens, Storefront EN LTR / UR RTL, Checkout, Seller Workspace, and Admin Moderation designs), unlocking Milestone 3 + Frontend Core (`apps/web`).
- **2026-11-21 (`D-034`, `D-035`):** Founder locked post-beta settlement cadence as **Monthly** (`PQ-03`) and approved launching Closed Beta on the existing seeded tehsils (`Mianwali`, `Isakhel`, `Piplan`) and starter categories (`PQ-08`), expanding sub-zones after initial rollout.
- **2026-11-21 (`D-036`):** Founder finalized **7-day service auto-completion** (`PQ-10`, Option 1) after `DELIVERY_SUBMITTED` when no revision or dispute is opened.
