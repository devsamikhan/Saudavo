# Discovery Open Questions (SUPERSEDED)

> **STATUS: SUPERSEDED BY [`docs/19_PHASE_2_OPEN_QUESTIONS.md`](./19_PHASE_2_OPEN_QUESTIONS.md) AND [`docs/10_DECISION_LOG.md`](./10_DECISION_LOG.md)**
>
> This document was created during Phase 0/1 Discovery. In Phase 2 and Phase 2.2, the founder submitted decisions for `D-001`–`D-014` and `PQ-01`–`PQ-16` (see [`docs/10_DECISION_LOG.md`](./10_DECISION_LOG.md) and [`docs/21_PHASE_2_2_FOUNDER_DECISION_INTEGRATION.md`](./21_PHASE_2_2_FOUNDER_DECISION_INTEGRATION.md)).
>
> **Do not treat questions in this file as active requirements.** Use [`docs/19_PHASE_2_OPEN_QUESTIONS.md`](./19_PHASE_2_OPEN_QUESTIONS.md) §6 for the exact remaining open operational/design items.

---

## Resolution & Mapping Summary

| Discovery Question | Phase 2.2 Status | Current Location / Approved Decision |
|---|---|---|
| **Q1.1** Pilot city/district | **APPROVED** | Locked to **Mianwali District, Punjab, Pakistan** (`D-003`); exact `AreaZone` seed list `OPEN` in `PQ-08` |
| **Q1.2** Currency scope | **APPROVED** | `PKR` stored in integer `paisa` (`D-015`) |
| **Q1.3** Service geography / mode | **APPROVED (Partial)** | `ON_SITE`, `HYBRID`, and `REMOTE` supported via `PQ-14` (`D-019`); wording/evidence/dispute rules `OPEN` |
| **Q2** Auth, verification & admin MFA | **APPROVED** | Email OR Phone + Password (`PQ-05`, `D-024`) + PostgreSQL `HttpOnly` sessions/CSRF/staff MFA (`PQ-06`, `D-016`) |
| **Q3** Seller verification & store count | **APPROVED** | 1 store per seller (`docs/14`); basic verification without CNIC in initial beta (`PQ-07`, `D-025`) |
| **Q4.1** COD-only vs online payment | **APPROVED** | **COD only** in MVP; online gateway deferred behind `PaymentProviderAdapter` (`D-014`) |
| **Q4.2** COD commission collection | **PARTIAL (`OPEN` details)** | Zero remittance during 0% beta (`PQ-01`); post-beta monthly/biweekly cadence & thresholds `OPEN` (`PQ-03`, `D-022`) |
| **Q4.3** Service payment rules | **APPROVED (Partial)** | `REMOTE` uses manual offline seller confirmation (`PQ-14`, `D-019`); copy/evidence/dispute rules `OPEN` |
| **Q5.1** Single-seller checkout | **APPROVED** | **One seller (`Store`) per checkout/order** (`D-013`) with separate saved carts per store (`PQ-16`, `D-030`) |
| **Q5.2** Services vs physical cart | **APPROVED** | Services use direct booking (`POST /orders/services`); physical goods use store-scoped `Cart` |
| **Q6** Buyer–seller communication & pickup privacy | **APPROVED** | Text-only REST `order_messages` (`PQ-09`, `D-021`) + post-confirm `pickup_instructions` |
| **Q7** Physical fulfilment, delivery fee, cancellation | **APPROVED** | Seller-managed delivery (`PQ-04`, `D-023`), seller keeps delivery fee (`PQ-13`, `D-018`), self-cancel in `PENDING_CONFIRMATION` (`PQ-10`, `D-027`) |
| **Q8** Service order workflow rules | **APPROVED (Partial)** | `PQ-14` (`D-019`) & `PQ-10`; 7-day auto-complete confirmation `OPEN` |
| **Q9** Commission rate, base, mixed-category | **APPROVED** | 0% promotional beta (`PQ-01`), exclude delivery fee (`PQ-02`), flat `GLOBAL`/`ORDER_TYPE` rule (`PQ-15`, `D-017`, `D-020`) |
| **Q10** Women-led seller analytics consent | **APPROVED (Excluded)** | Excluded from initial beta database (`PQ-12`, `D-029`) |
| **Q11** Data retention & legal readiness | **DEFERRED TO GATE F** | Required before Closed Beta public launch (`Gate F`); baseline rules in `docs/14_DATABASE_DESIGN.md` |
| **Q12** Brand name (`Saudavo`) | **APPROVED (`D-012`)** | Finalized as **Saudavo** (2026-11-20); visual brand assets tracked under `Gate D` |
| **Q13** Bilingual listing model & Urdu font | **APPROVED (Partial)** | Bilingual UI + single-language listings (`PQ-11`, `D-028`); final Urdu font `OPEN` at `Gate D` |
| **Q14** PWA scope & UI/UX handoff | **OPEN (`Gate D`)** | Founder Figma frames, tokens, RTL/mobile specs required before `M3` |
