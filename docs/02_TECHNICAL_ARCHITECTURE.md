# Technical Architecture

Status: Phase 2 Baseline — Modular Monolith Specification (see `docs/13_SYSTEM_ARCHITECTURE.md` for detailed module boundaries, diagrams, and dependencies).

## 1. Architecture decision
Use a TypeScript monorepo (`pnpm` workspaces) with a NestJS modular-monolith API and Next.js App Router frontend. Do not introduce microservices, Kubernetes, Kafka, Redis, or Meilisearch in the MVP.

## 2. Proposed stack
- Web: Next.js App Router + TypeScript.
- Styling: Tailwind CSS.
- UI primitives: shadcn/ui, adapted to the founder-approved design system.
- API: NestJS REST API.
- Database: PostgreSQL.
- ORM/migrations: Prisma.
- Validation/contracts: `packages/contracts` using Zod as the single source of truth for shared API DTOs, schemas, error codes, and state-transition enums across `apps/web` and `apps/api` (do not duplicate conflicting `class-validator` schemas).
- Authentication: server-managed opaque sessions in PostgreSQL with `HttpOnly`, `Secure`, `SameSite=Lax` cookies and CSRF protection (preferred baseline; see `docs/13_SYSTEM_ARCHITECTURE.md` and `docs/19_PHASE_2_OPEN_QUESTIONS.md`).
- File storage: S3-compatible object storage with signed uploads.
- Testing: Vitest/Jest (choose according to framework), Supertest and Playwright.
- Observability: structured logs and Sentry or equivalent.
- Package manager: pnpm workspaces.

## 3. Monorepo layout
```text
apps/
  web/
  api/
packages/
  contracts/
  config/
docs/
prompts/
.agents/
  rules/
  skills/
```

## 4. Backend modules
- `auth`
- `users`
- `locations` (`District` / `AreaZone` — seeded with Mianwali District for MVP)
- `seller-profiles`
- `stores`
- `categories`
- `products`
- `services`
- `media`
- `search`
- `cart` (store-scoped single-seller carts)
- `checkout` (enforces one seller per order)
- `orders` (physical & service state machines + `OrderStatusHistory`)
- `delivery` (fulfilment & delivery status lifecycle, decoupled from payment collection)
- `payments` (`COD` active provider + `PaymentProviderAdapter` abstraction for future gateways)
- `commission-ledger` (configurable `CommissionRule`, immutable `CommissionLedger`, `SellerSettlementRecord`)
- `reviews`
- `notifications` (via DB-backed `OutboxEvent`)
- `moderation`
- `disputes`
- `admin`
- `analytics`
- `audit`

Keep modules internally cohesive. Modules communicate through explicit exported services or the DB-backed `OutboxEvent` bus, never by querying another module's database tables directly. See `docs/13_SYSTEM_ARCHITECTURE.md` for dependency rules.

## 5. Data ownership
- Every seller-owned entity has seller_id or store_id.
- Every query must be scoped to the authenticated principal and tenant/store ownership.
- Public queries return only approved, active records.
- Admin access is permission-scoped and audited.

## 6. API conventions
- Prefix: `/api/v1`.
- JSON request/response.
- Consistent error envelope.
- Pagination: cursor-based for feeds where practical; limit/offset acceptable for simple admin tables initially.
- Idempotency keys for order creation and payment initiation.
- OpenAPI/Swagger generated from API contracts.
- Never expose internal database IDs or private fields unnecessarily.

## 7. Search strategy
MVP: PostgreSQL full-text search and indexed filters. Add Meilisearch/OpenSearch only after search latency, typo tolerance or relevance needs justify operational complexity.

## 8. Cache and queues
Do not add Redis until there is a measured requirement. Use a database-backed job/outbox pattern for reliable notifications and asynchronous tasks initially. Add Redis/BullMQ later if throughput requires it.

## 9. Payments
- **MVP Active Payment Method:** Cash on Delivery (COD) only (`CodManualProvider`).
- **Abstraction:** Define a clean `PaymentProviderAdapter` interface so online gateways can be plugged in post-MVP without refactoring `orders` or `commission-ledger`.
- **Delivery vs. Cash Collection:** Delivery confirmation and COD cash collection confirmation are strictly separate state transitions and records.
- **No Gateway / No Wallet:** Do not integrate any live payment gateway, platform wallet, or escrow in the MVP. Online payment implementation remains gated until a qualified adult/business owner and licensed payment provider confirm merchant eligibility, marketplace/sub-merchant policy, settlement/payout mechanics, refund/chargeback handling, webhook verification, and sandbox/production credentials.

## 10. Deployment
Keep environments separate: local, staging, production.
- Web and API deploy independently.
- Managed PostgreSQL with automated backups.
- Object storage with private buckets and signed URLs.
- Secrets only in deployment secret manager/environment; never commit `.env`.
- CI runs lint, typecheck, tests, migration validation and build.
- Production deploy requires human approval.

## 11. Architecture principles
- Simplicity over novelty.
- Modular monolith before microservices.
- Explicit contracts.
- Server-side validation and authorization.
- Transactional order creation and stock reservation.
- Immutable financial audit trail.
- Feature flags for staged rollout.
