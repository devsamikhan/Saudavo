# Data Model and ERD Notes

> Status: Phase 2 Logical & Normalized Schema Baseline. See `docs/14_DATABASE_DESIGN.md` for the full table-by-table data dictionary, constraints, indexes, privacy classification, and migration strategy, and `docs/15_ENTITY_RELATIONSHIP_DIAGRAM.md` for the Mermaid ERD.

Do not generate Prisma migrations or modify any database until the founder approves the Phase 2 database design.

## Core entities
- `User`, `UserSession`, `AuthToken`
- `Role`, `UserRole`
- `CustomerProfile`
- `SellerProfile`
- `District`, `AreaZone`, `StoreServiceArea`
- `Store` (`StoreMember` deferred post-MVP)
- `Address`
- `Category`
- `MediaAsset`
- `Product`, `ProductImage`, `ProductVariant`
- `ServiceListing`, `ServicePackage`
- `Cart`, `CartItem` (store-scoped for single-seller checkout)
- `Order`, `OrderItem`, `ServiceOrderDetails`, `OrderStatusHistory`, `OrderMessage`
- `Delivery`
- `Payment`, `PaymentEvent`, `Refund`
- `CommissionRule`, `CommissionLedger`, `SellerSettlementRecord`
- `Review`
- `Notification`, `OutboxEvent`
- `Report`, `Dispute`
- `IdempotencyKey`
- `AdminAuditLog`

## Key relationships
- `User` 1—0..1 `CustomerProfile`
- `User` 1—0..1 `SellerProfile`
- `User` M—N `Role` (via `UserRole`)
- `District` 1—N `AreaZone` (Mianwali District active for MVP; extensible to other districts)
- `SellerProfile` 1—1..N `Store` (MVP constrains to 1 active store per seller)
- `Store` M—N `AreaZone` (via `StoreServiceArea`)
- `Store` 1—N `Product` and `Store` 1—N `ServiceListing`
- `Product` 1—N `ProductImage` and `Product` 1—N `ProductVariant`
- `User` 1—N `Address`
- `User` + `Store` 1—0..1 `Cart` (one store per cart/checkout; multi-seller purchases create separate orders)
- `User` (customer) 1—N `Order`; `Store` (seller) 1—N `Order` (strictly one `Store` per `Order`)
- `Order` 1—N `OrderItem` (physical) or 1—0..1 `ServiceOrderDetails` (service)
- `Order` 1—0..1 `Delivery` (delivery status tracked separately from payment collection)
- `Order` 1—N `OrderStatusHistory`
- `Order` 1—N `Payment` (`COD` only in MVP; future online methods via adapter)
- `Completed/Eligible Order` 1—0..N `Review`
- `Order` 1—N immutable `CommissionLedger` (calculated from versioned `CommissionRule`)
- `Store` 1—N `SellerSettlementRecord` (manual/offline settlement tracking; no wallet/escrow)

## Data rules
- Use UUID v4/v7 primary keys consistently across all tables.
- Store money as integer minor units (`paisa`, `BigInt` or `Int` as appropriate for PKR) plus explicit ISO currency code (`PKR`); never use floating-point money.
- Store commission rates in integer basis points (`bps`, e.g., `100` bps = `1.00%`) and snapshot rate/base/commission on the order and ledger at transaction time.
- Snapshot product title, SKU, unit price, selected variant, and seller/store public details on order items (`OrderItem` / `ServiceOrderDetails`) so later catalog edits never rewrite historical orders.
- Store all timestamps in UTC; render `Asia/Karachi` (`PKT`) local time in UI.
- Add `created_at`, `updated_at` and justified `deleted_at`/status fields (financial ledger, audit logs, and order history are strictly append-only and never soft-deleted).
- Use database constraints for uniqueness and valid relationships.
- Add indexes for foreign keys, status, `created_at`, `store_id`, `district_id`, and common search/filter columns.
- Do not store card numbers, CVV or sensitive payment credentials.
- Avoid collecting home addresses unless fulfilment requires it; restrict access and retention, and never expose private seller residential addresses publicly.
- Add immutable `AdminAuditLog` records for privileged, moderation, and financial actions.
- Define retention/deletion policy before public launch.

## Phase 2 & Phase 3 deliverables
1. Mermaid ERD — delivered in `docs/15_ENTITY_RELATIONSHIP_DIAGRAM.md`.
2. Table-by-table field dictionary, index/constraint proposal, privacy classification, and migration strategy — delivered in `docs/14_DATABASE_DESIGN.md`.
3. Prisma schema draft and baseline migration — deferred to Milestone 2 (`prompts/02_REPO_SCAFFOLD.md`) after founder approves `docs/14_DATABASE_DESIGN.md` and `docs/15_ENTITY_RELATIONSHIP_DIAGRAM.md`.
Do not generate migrations until the founder approves the Phase 2 model.
