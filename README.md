# Saudavo — Local Marketplace SaaS

> Approved Product Name: **Saudavo** (`D-012`, 2026-11-20; Mianwali District, Punjab, Pakistan closed-beta pilot).
> Status: Core Backend (`apps/api`), Shared Contracts (`packages/contracts`), Gate D Design System (`TxXpq2005rV2oPNOejWgBW`), and Bilingual Next.js Frontend (`apps/web`) implemented and verified cleanly via unit & integration suites.

## Purpose
A local-first multi-vendor marketplace connecting:
1. Home-based makers selling physical products (`HOME_MAKER`)
2. Local shops (`LOCAL_SHOP`) and individual sellers (`INDIVIDUAL_SELLER`)
3. Service providers offering `ON_SITE`, `HYBRID`, and `REMOTE` services (`SERVICE_PROVIDER`)

## Non-negotiable product & architecture principles
- **Modular Monolith:** `apps/web` (Next.js App Router) + `apps/api` (NestJS REST `/api/v1`) + `packages/contracts` (Zod) + PostgreSQL + Prisma (`pnpm` monorepo; no microservices, Redis, or Kafka in MVP).
- **Bilingual EN (`LTR`) / UR (`RTL`):** `Inter` + `Noto Sans Arabic`, `dir="auto"` on seller-authored content (`PQ-11`, `D-032`).
- **Privacy First:** No CNIC storage during closed beta (`PQ-07`); no women-led demographic DB columns (`PQ-12`); seller home addresses and opt-out phone numbers are never returned publicly (`showPublicPhone`, `showPublicAddress`).
- **Money & Financial Integrity:** All currency is `PKR` stored as integer `paisa` (`BIGINT`), rates as basis points (`rate_bps`), `0%` promotional closed-beta commission (`PQ-01`), delivery fees excluded from commission (`PQ-02`, `PQ-13`), single-seller checkout (`D-013`), COD + `MANUAL_OFFLINE` (`D-014`, `PQ-14`), no improvised wallet/escrow (`D-010`), and immutable append-only `CommissionLedger`.
- **Security:** Email OR Pakistani phone (`+923XXXXXXXXX`) + Argon2id password (`PQ-05`), PostgreSQL-backed opaque `HttpOnly` `SameSite=Lax` sessions, CSRF protection, Staff TOTP MFA (`PQ-06`), rate limiting, and `AdminAuditLog`.

## Repository map
```text
.
├── apps/
│   ├── web/                 # Next.js App Router UI (Storefront, Cart, Orders, Seller Studio, Admin)
│   └── api/                 # NestJS modular-monolith REST API (/api/v1) + Prisma + PostgreSQL migrations
├── packages/
│   ├── contracts/           # Single source of truth: Zod schemas, enums, integer money helpers
│   └── config/              # Shared TypeScript & ESLint configs
├── docs/                    # Charter, PRD, Architecture, ERD, Financial/Auth Specs, Decision Log
├── prompts/                 # Phase-by-phase build prompts
├── .github/workflows/ci.yml # CI pipeline (PostgreSQL 16 + migrate deploy + seed + lint + typecheck + test + build)
├── docker-compose.yml       # Local PostgreSQL 16 service
└── .env.example             # Safe placeholder env vars (never commit .env)
```

## Quick Start (Local Development)

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` (and set local values; never commit `.env`).

3. **Start PostgreSQL 16 & run migrations + seed:**
   ```bash
   docker compose up -d postgres
   pnpm --filter @saudavo/api prisma:validate
   pnpm --filter @saudavo/api prisma:generate
   pnpm --filter @saudavo/api exec prisma migrate deploy
   pnpm --filter @saudavo/api prisma:seed
   ```

4. **Start dev servers:**
   ```bash
   pnpm dev
   ```
   - Web App: `http://localhost:3000`
   - REST API: `http://localhost:4000/api/v1`
   - OpenAPI 3.1 Spec: `http://localhost:4000/api/v1/openapi.json`

## Verification Commands
```bash
pnpm lint       # ESLint across all packages (no explicit `any`)
pnpm typecheck  # TypeScript + Next.js typegen checks
pnpm test       # Contracts Vitest + Web Vitest + API Jest/Supertest suites
pnpm build      # Production NestJS + Next.js builds
```

## Source of Truth
`docs/00_PROJECT_CHARTER.md` → `docs/01_PRODUCT_REQUIREMENTS.md` → `docs/02_TECHNICAL_ARCHITECTURE.md` → `docs/10_DECISION_LOG.md`.
