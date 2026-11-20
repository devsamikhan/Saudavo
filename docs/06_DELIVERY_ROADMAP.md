# Delivery Roadmap

This roadmap is outcome-based. Dates are estimated only after scope and capacity are confirmed.

## Phase 0 — Discovery
Deliverables:
- Pilot area decision (**Locked for MVP: Mianwali District, Punjab, Pakistan**).
- 15–25 seller/customer interviews in Mianwali District.
- Competitor and alternatives map.
- Seller workflow observations.
- Pricing and commission hypotheses.
- Risk register and open questions (`docs/11_OPEN_QUESTIONS.md`).
Exit gate: evidence supports a narrow pilot.

## Phase 1 — Product definition
Deliverables:
- Approved project charter (`docs/00_PROJECT_CHARTER.md`).
- PRD and user stories (`docs/01_PRODUCT_REQUIREMENTS.md`).
- User journey maps (single-seller checkout, physical & service COD flows).
- Acceptance criteria.
- MVP cut line.
Exit gate: founder signs off on scope.

## Phase 2 — UX and architecture *(Current Architecture Phase)*
Deliverables:
- Founder-approved design system and screen prototypes (Founder-owned; pending handoff).
- System architecture & module boundaries (`docs/13_SYSTEM_ARCHITECTURE.md`).
- Database design & Mermaid ERD (`docs/14_DATABASE_DESIGN.md`, `docs/15_ENTITY_RELATIONSHIP_DIAGRAM.md`).
- Order & COD lifecycle specification (`docs/16_ORDER_AND_COD_WORKFLOWS.md`).
- Configurable commission & financial ledger model (`docs/17_COMMISSION_AND_FINANCIAL_MODEL.md`).
- Authorization & role-permission matrix (`docs/18_AUTHORIZATION_AND_ROLE_MATRIX.md`).
- API contract (`docs/04_API_CONTRACT.md`).
- Threat model, privacy review & Phase 2 open questions (`docs/19_PHASE_2_OPEN_QUESTIONS.md`).
Exit gate: design and technical baseline approved (`Gate C` & `Gate D`).

## Phase 3 — Foundation
Deliverables:
- Monorepo.
- CI checks.
- Web and API skeletons.
- Database connection and migrations.
- Authentication and role authorization.
- Logging and error handling.
Exit gate: clean build and tests in CI.

## Phase 4 — Seller supply
Deliverables:
- Seller onboarding.
- Store profile.
- Product/service listing CRUD.
- Media upload.
- Admin review queues.
Exit gate: approved seller can publish approved listings.

## Phase 5 — Customer demand and orders
Deliverables:
- Discovery/search (Mianwali District & AreaZones).
- Product/service details.
- Store-scoped single-seller cart and checkout (multi-seller purchases create separate orders).
- Product order workflow (COD only).
- Service order workflow (COD / manual collection).
- Separate delivery confirmation vs. COD cash collection confirmation.
- Status history and notifications.
Exit gate: end-to-end test order succeeds in staging.

## Phase 6 — Financial records and operations
Deliverables:
- Configurable, versioned `CommissionRule` policies.
- Immutable `CommissionLedger` & compensating reversal entries.
- COD cash collection confirmation and offline `SellerSettlementRecord` tracking.
- Payment provider abstraction (`PaymentProviderAdapter`) — **no live gateway integration in MVP**.
- Refund/return review and dispute workflows.
Exit gate: finance scenarios reconciled and reviewed.

## Phase 7 — Hardening
Deliverables:
- Authorization tests.
- OWASP-aligned security review.
- Accessibility and RTL review.
- Performance checks.
- Backup/restore drill.
- Monitoring and alerting.
Exit gate: no unresolved critical/high-risk issues.

## Phase 8 — Closed beta
- Small invited seller cohort.
- Test orders with clear test labels or legally approved live operations.
- Daily issue review.
- Measure activation, first sale, completion, cancellation and support burden.
Exit gate: pilot metrics meet founder-approved thresholds.

## Phase 9 — Public pilot launch
- Launch in **Mianwali District, Punjab, Pakistan** only.
- Support process staffed.
- Seller onboarding playbook.
- Incident response contact.
- Weekly business review.

## Release discipline
Every phase must end with:
1. Changed files summary.
2. Tests run and results.
3. Known issues.
4. Security/privacy implications.
5. Updated docs.
6. Founder approval before next phase.
