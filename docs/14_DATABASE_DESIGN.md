# Database Design & Data Dictionary

> Status: Phase 2 Proposed Relational Database Design (PostgreSQL + Prisma).
> **Do not create Prisma migrations or modify any database until the founder approves this design.**

---

## 1. Foundational Database Standards

### 1.1 Primary Keys (`UUID`)
- Every table uses a `UUID` primary key (`uuid` in PostgreSQL).
- Application-generated **UUIDv7** (time-ordered) is recommended for high-insert tables (`Order`, `OrderStatusHistory`, `CommissionLedger`, `OutboxEvent`, `AdminAuditLog`) to preserve B-tree index locality and avoid UUIDv4 page fragmentation while remaining non-enumerable externally.

### 1.2 Money & Rates (Zero Floating-Point)
- All monetary columns use **`BIGINT` (`paisa`)** (1 PKR = 100 paisa) paired with an explicit `currency` (`CHAR(3)`, default `'PKR'`).
- Commission rates use **`INTEGER` basis points (`bps`)** (`0` to `10000`, where `500` = `5.00%`, `250` = `2.50%`), avoiding decimal/float rounding drift.

### 1.3 Timestamps & Soft-Delete Policy
- All timestamps use `TIMESTAMPTZ` stored in UTC.
- Mutable user/catalog entities (`User`, `Address`, `Store`, `Product`, `ProductVariant`, `ServiceListing`, `ServicePackage`) include `created_at`, `updated_at`, and `deleted_at` (nullable soft delete so historical orders and foreign keys remain intact).
- **Strictly Append-Only / Immutable Tables** (`OrderStatusHistory`, `PaymentEvent`, `CommissionLedger`, `AdminAuditLog`, `OutboxEvent`) **never** allow `deleted_at` or destructive updates. Corrections are recorded via new compensating entries.

### 1.4 Candidate Entity Justification
All candidate entities from the architecture brief are evaluated below:
- **Retained directly:** `User`, `Role`, `CustomerProfile`, `SellerProfile`, `Store`, `Address`, `District`, `Category`, `Product`, `ProductImage`, `ProductVariant`, `ServiceListing`, `ServicePackage`, `Cart`, `CartItem`, `Order`, `OrderItem`, `OrderStatusHistory`, `Delivery`, `Payment`, `CommissionRule`, `CommissionLedger`, `Review`, `Notification`, `AdminAuditLog`.
- **Refined for clarity & MVP correctness:**
  - `AreaZone` + `StoreServiceArea`: Added under `District` so Mianwali District's sub-district towns/localities can be selected for delivery coverage and filtering without exposing home-based sellers' residential addresses.
  - `ServiceOrderDetails`: Separates service package snapshots, requirements, and revision counters cleanly from physical `OrderItem` rows without bloating `Order`.
  - `SellerSettlementRecord` (refined from candidate `SellerPayoutRecord`): In COD, cash flows Buyer → Seller and commission owes Seller → Platform; in future online payments, funds flow Platform/Provider → Seller. Using `SellerSettlementRecord` with a `direction` (`SELLER_TO_PLATFORM` | `PLATFORM_TO_SELLER`) supports COD commission remittance and future payouts without creating a wallet.
  - `UserRole`: Join table allowing one `User` to hold both `CUSTOMER` and `SELLER` (or staff) roles.
  - `MediaAsset`, `PaymentEvent`, `Refund`, `Report`, `Dispute`, `IdempotencyKey`, `OutboxEvent`, `UserSession`: Included for upload security, payment auditability, dispute handling, duplicate-request protection, async outbox notifications, and session revocation.

### 1.5 Privacy Classification Legend
- `PUBLIC`: Safe for unauthenticated API responses (`ACTIVE` + `APPROVED` records only).
- `CUSTOMER_PRIVATE`: Visible only to owning customer and authorized Admin/Support.
- `SELLER_PRIVATE`: Visible only to owning seller and authorized Admin/Moderator.
- `FULFILMENT_RESTRICTED`: Visible only to the order's customer, the order's seller (`store_id`), and authorized Support/Admin (never public or other sellers).
- `ADMIN_ONLY`: Restricted to authorized staff roles (`MODERATOR`, `SUPPORT`, `ADMIN`, `SUPER_ADMIN`).
- `FINANCIAL_IMMUTABLE`: Append-only accounting records; visible to owning seller (read-only) and Admin/Super Admin.

---

## 2. Table-by-Table Data Dictionary

### 2.1 Identity, Roles & Profiles

#### `users`
| Column | Type | Constraints / Default | Privacy | Notes |
|---|---|---|---|---|
| `id` | `UUID` | PK | `CUSTOMER_PRIVATE` | Never leaked unnecessarily in public DTOs |
| `email` | `VARCHAR(255)` | UNIQUE, NULLABLE | `CUSTOMER_PRIVATE` | Normalized lowercase (`PQ-05`: Email OR Phone + Password; both not required) |
| `phone_e164` | `VARCHAR(20)` | UNIQUE, NULLABLE | `CUSTOMER_PRIVATE` | Canonical E.164 (`+92...`); `CHECK (email IS NOT NULL OR phone_e164 IS NOT NULL)` prevents missing/ambiguous identity |
| `password_hash` | `TEXT` | NOT NULL | `ADMIN_ONLY` | Argon2id hash |
| `display_name` | `VARCHAR(120)` | NOT NULL | `PUBLIC` | Public reviewer/account display name |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'ACTIVE'` | `ADMIN_ONLY` | `ACTIVE`, `SUSPENDED`, `DELETED` |
| `email_verified_at` | `TIMESTAMPTZ` | NULLABLE | `CUSTOMER_PRIVATE` | Automated email link/OTP when email is used |
| `phone_verified_at` | `TIMESTAMPTZ` | NULLABLE | `CUSTOMER_PRIVATE` | Optional/manual in initial beta (`PQ-05`: no mandatory paid SMS/WhatsApp OTP) |
| `mfa_secret_encrypted` | `TEXT` | NULLABLE | `ADMIN_ONLY` | Required for staff/admin roles |
| `mfa_enabled` | `BOOLEAN` | NOT NULL, DEFAULT `false` | `ADMIN_ONLY` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | `CUSTOMER_PRIVATE` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `CUSTOMER_PRIVATE` | |
| `deleted_at` | `TIMESTAMPTZ` | NULLABLE | `ADMIN_ONLY` | Soft delete |

Indexes: `idx_users_status` (`status`). Identity normalization (lowercase trimmed `email`, canonical E.164 `phone_e164`) prevents duplicate accounts and ambiguous login resolution.

#### `roles` & `user_roles`
- `roles`: `id` (`UUID` PK), `code` (`VARCHAR(30)` UNIQUE: `CUSTOMER`, `SELLER`, `MODERATOR`, `SUPPORT`, `ADMIN`, `SUPER_ADMIN`), `description` (`TEXT`).
- `user_roles`: `id` (`UUID` PK), `user_id` (`UUID` FK → `users.id`), `role_id` (`UUID` FK → `roles.id`), `assigned_by_id` (`UUID` FK nullable), `created_at` (`TIMESTAMPTZ`). Unique constraint: `UNIQUE(user_id, role_id)`.

#### `user_sessions` & `auth_tokens`
- `user_sessions`: `id` (`UUID` PK), `user_id` (`UUID` FK → `users.id`), `token_hash` (`VARCHAR(128)` UNIQUE NOT NULL), `csrf_token_hash` (`VARCHAR(128)` NOT NULL), `mfa_verified_at` (`TIMESTAMPTZ` nullable), `ip_address` (`INET`), `user_agent` (`TEXT`), `expires_at` (`TIMESTAMPTZ` NOT NULL), `revoked_at` (`TIMESTAMPTZ` nullable), `created_at` (`TIMESTAMPTZ`).
  - Indexes: `idx_user_sessions_user_id`, `idx_user_sessions_expires_at`.
- `auth_tokens`: `id` (`UUID` PK), `user_id` (`UUID` FK → `users.id` `ON DELETE CASCADE`), `token_type` (`VARCHAR(30)` NOT NULL: `'EMAIL_VERIFICATION'` | `'PASSWORD_RESET'`), `token_hash` (`VARCHAR(128)` UNIQUE NOT NULL), `expires_at` (`TIMESTAMPTZ` NOT NULL), `used_at` (`TIMESTAMPTZ` nullable), `created_at` (`TIMESTAMPTZ` NOT NULL DEFAULT `now()`).
  - Indexes: `idx_auth_tokens_user_type` (`user_id`, `token_type`), `idx_auth_tokens_expires` (`expires_at`). Privacy: `ADMIN_ONLY` (never returned in API responses). Note: while SMS/WhatsApp OTP is inactive (`PQ-05`), automated self-serve reset tokens apply to email-verified accounts; phone-only accounts require Support/Admin-assisted recovery (audited).

#### `customer_profiles`
- `id` (`UUID` PK), `user_id` (`UUID` UNIQUE FK → `users.id`), `preferred_locale` (`VARCHAR(5)` NOT NULL DEFAULT `'en'`: `'en'` | `'ur'`), `default_district_id` (`UUID` FK → `districts.id` nullable), `default_area_zone_id` (`UUID` FK → `area_zones.id` nullable), `created_at`, `updated_at`. Privacy: `CUSTOMER_PRIVATE`.

#### `seller_profiles`
| Column | Type | Constraints / Default | Privacy | Notes |
|---|---|---|---|---|
| `id` | `UUID` | PK | `SELLER_PRIVATE` | |
| `user_id` | `UUID` | UNIQUE, FK → `users.id` | `SELLER_PRIVATE` | 1:0..1 per user |
| `seller_type` | `VARCHAR(30)` | NOT NULL | `SELLER_PRIVATE` | `HOME_MAKER`, `ARTISAN`, `FREELANCER`, `LOCAL_SHOP` |
| `verification_status` | `VARCHAR(30)` | NOT NULL DEFAULT `'PENDING_REVIEW'` | `SELLER_PRIVATE` | `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `SUSPENDED` (basic verification; no CNIC storage per `PQ-07`) |
| `rejection_reason` | `TEXT` | NULLABLE | `SELLER_PRIVATE` | Shown to seller + Admin |
| `moderation_notes` | `TEXT` | NULLABLE | `ADMIN_ONLY` | Never exposed to seller or public |
| `verified_by_id` | `UUID` | FK → `users.id` NULLABLE | `ADMIN_ONLY` | |
| `verified_at` | `TIMESTAMPTZ` | NULLABLE | `SELLER_PRIVATE` | |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | NOT NULL | `SELLER_PRIVATE` | |

> **Privacy Note (`PQ-12`, `D-029`):** Women-led / demographic identification fields (`women_led_self_id`, `women_led_consent`) are **excluded from the database** during the initial closed beta. Never store CNIC numbers or ID document images in `seller_profiles` (`PQ-07`).

---

### 2.2 Geography, Stores & Addresses

#### `districts`
- `id` (`UUID` PK), `code` (`VARCHAR(30)` UNIQUE — e.g., `'PK-PB-MWL'`), `name_en` (`VARCHAR(100)` NOT NULL), `name_ur` (`VARCHAR(100)` NOT NULL), `slug` (`VARCHAR(100)` UNIQUE NOT NULL), `province` (`VARCHAR(80)` NOT NULL), `country_code` (`CHAR(2)` NOT NULL DEFAULT `'PK'`), `is_active` (`BOOLEAN` NOT NULL DEFAULT `false` — only `Mianwali District` active in MVP), `created_at`, `updated_at`. Privacy: `PUBLIC`.

#### `area_zones`
- `id` (`UUID` PK), `district_id` (`UUID` FK → `districts.id` NOT NULL), `name_en` (`VARCHAR(100)` NOT NULL), `name_ur` (`VARCHAR(100)` NOT NULL), `slug` (`VARCHAR(100)` NOT NULL), `zone_type` (`VARCHAR(30)` NOT NULL: `'TEHSIL'`, `'TOWN'`, `'LOCALITY'`), `is_active` (`BOOLEAN` NOT NULL DEFAULT `true`), `created_at`, `updated_at`.
- Unique: `UNIQUE(district_id, slug)`. Index: `idx_area_zones_district_active`. Privacy: `PUBLIC`.

#### `stores`
| Column | Type | Constraints / Default | Privacy | Notes |
|---|---|---|---|---|
| `id` | `UUID` | PK | `PUBLIC` | Tenant isolation key |
| `seller_profile_id` | `UUID` | FK → `seller_profiles.id` NOT NULL | `SELLER_PRIVATE` | MVP partial unique index: 1 active store per seller |
| `district_id` | `UUID` | FK → `districts.id` NOT NULL | `PUBLIC` | Mianwali District in MVP |
| `slug` | `VARCHAR(120)` | UNIQUE NOT NULL | `PUBLIC` | |
| `display_name` | `VARCHAR(140)` | NOT NULL | `PUBLIC` | |
| `description` | `TEXT` | NULLABLE | `PUBLIC` | |
| `logo_asset_id` | `UUID` | FK → `media_assets.id` NULLABLE | `PUBLIC` | |
| `banner_asset_id` | `UUID` | FK → `media_assets.id` NULLABLE | `PUBLIC` | |
| `show_public_phone` | `BOOLEAN` | NOT NULL DEFAULT `false` | `SELLER_PRIVATE` | Privacy-first default `false` |
| `public_contact_phone` | `VARCHAR(20)` | NULLABLE | `PUBLIC` (only if `show_public_phone = true`) | Never fallback to user's private phone |
| `show_public_address` | `BOOLEAN` | NOT NULL DEFAULT `false` | `SELLER_PRIVATE` | Privacy-first default `false` |
| `public_business_address` | `TEXT` | NULLABLE | `PUBLIC` (only if `show_public_address = true`) | Commercial shops opt-in only |
| `default_delivery_fee_paisa` | `BIGINT` | NOT NULL DEFAULT `0`, `CHECK >= 0` | `PUBLIC` | |
| `currency` | `CHAR(3)` | NOT NULL DEFAULT `'PKR'` | `PUBLIC` | |
| `status` | `VARCHAR(30)` | NOT NULL DEFAULT `'DRAFT'` | `PUBLIC` (only `'ACTIVE'` returned publicly) | `DRAFT`, `PENDING_REVIEW`, `ACTIVE`, `SUSPENDED`, `REJECTED` |
| `created_at`, `updated_at`, `deleted_at` | `TIMESTAMPTZ` | | `SELLER_PRIVATE` | |

Indexes: `idx_stores_district_status` (`district_id`, `status`), `uq_stores_one_active_per_seller` (`seller_profile_id` WHERE `deleted_at IS NULL` — enforces 1 store per seller in MVP and prevents bypassing `SUSPENDED` status by creating a second store; `REJECTED` stores are edited in-place and re-submitted).

#### `store_service_areas`
- `id` (`UUID` PK), `store_id` (`UUID` FK → `stores.id`), `area_zone_id` (`UUID` FK → `area_zones.id`), `delivery_fee_override_paisa` (`BIGINT` nullable, `CHECK >= 0`), `pickup_supported` (`BOOLEAN` NOT NULL DEFAULT `true`), `delivery_supported` (`BOOLEAN` NOT NULL DEFAULT `true`).
- Unique: `UNIQUE(store_id, area_zone_id)`. Privacy: `PUBLIC`.

#### `addresses`
- `id` (`UUID` PK), `user_id` (`UUID` FK → `users.id`), `district_id` (`UUID` FK → `districts.id`), `area_zone_id` (`UUID` FK → `area_zones.id` nullable), `label` (`VARCHAR(60)`), `recipient_name` (`VARCHAR(120)` NOT NULL), `recipient_phone` (`VARCHAR(20)` NOT NULL), `street_address` (`TEXT` NOT NULL), `landmark` (`TEXT` nullable), `is_default` (`BOOLEAN` NOT NULL DEFAULT `false`), `created_at`, `updated_at`, `deleted_at`.
- Privacy: `CUSTOMER_PRIVATE` (copied into `Delivery.shipping_address_snapshot_json` at order time with `FULFILMENT_RESTRICTED` scope).

---

### 2.3 Catalog & Media

#### `categories`
- `id` (`UUID` PK), `parent_id` (`UUID` FK → `categories.id` nullable), `applicable_to` (`VARCHAR(20)` NOT NULL: `'PRODUCT'`, `'SERVICE'`, `'BOTH'`), `slug` (`VARCHAR(100)` UNIQUE NOT NULL), `name_en` (`VARCHAR(100)` NOT NULL), `name_ur` (`VARCHAR(100)` NOT NULL), `sort_order` (`INT` NOT NULL DEFAULT `0`), `is_active` (`BOOLEAN` NOT NULL DEFAULT `true`), `created_at`, `updated_at`. Privacy: `PUBLIC`.

#### `media_assets`
- `id` (`UUID` PK), `owner_user_id` (`UUID` FK → `users.id`), `store_id` (`UUID` FK → `stores.id` nullable), `object_key` (`VARCHAR(512)` UNIQUE NOT NULL), `mime_type` (`VARCHAR(80)` NOT NULL), `size_bytes` (`INT` NOT NULL), `exif_stripped` (`BOOLEAN` NOT NULL DEFAULT `false`), `status` (`VARCHAR(20)` NOT NULL DEFAULT `'PENDING_UPLOAD'`: `'PENDING_UPLOAD'`, `'READY'`, `'QUARANTINED'`, `'DELETED'`), `created_at`. Privacy: `SELLER_PRIVATE` until attached to an `ACTIVE` public listing.

#### `products`, `product_variants`, `product_images`
- `products`:
  - `id` (`UUID` PK), `store_id` (`UUID` FK → `stores.id` `ON DELETE RESTRICT` NOT NULL), `category_id` (`UUID` FK → `categories.id` `ON DELETE RESTRICT` NOT NULL), `slug` (`VARCHAR(160)` NOT NULL), `title` (`VARCHAR(200)` NOT NULL), `description` (`TEXT` NOT NULL), `base_price_paisa` (`BIGINT` NOT NULL, `CHECK >= 0`), `currency` (`CHAR(3)` NOT NULL DEFAULT `'PKR'`), `stock_quantity` (`INT` NOT NULL DEFAULT `0`, `CHECK >= 0`), `has_variants` (`BOOLEAN` NOT NULL DEFAULT `false`), `delivery_enabled` (`BOOLEAN` NOT NULL DEFAULT `true`), `pickup_enabled` (`BOOLEAN` NOT NULL DEFAULT `true`), `status` (`VARCHAR(30)` NOT NULL DEFAULT `'DRAFT'`: `DRAFT`, `PENDING_REVIEW`, `ACTIVE`, `REJECTED`, `ARCHIVED`), `rejection_reason` (`TEXT` nullable), `search_vector` (`TSVECTOR` generated/indexed), `created_at`, `updated_at`, `deleted_at`.
  - Indexes & Uniqueness: `uq_products_slug_active` (`slug` WHERE `deleted_at IS NULL` — globally unique via automatic short-code suffixing on collision per approved `PQ-16`, `D-030`), `idx_products_store_status`, `idx_products_category_status`, GIN index on `search_vector`, `pg_trgm` GIN index on `title`.
- `product_variants`:
  - `id` (`UUID` PK), `product_id` (`UUID` FK → `products.id`), `sku` (`VARCHAR(80)` nullable), `title` (`VARCHAR(120)` NOT NULL), `option_values_json` (`JSONB` NOT NULL), `price_paisa` (`BIGINT` NOT NULL, `CHECK >= 0`), `stock_quantity` (`INT` NOT NULL DEFAULT `0`, `CHECK >= 0`), `is_active` (`BOOLEAN` NOT NULL DEFAULT `true`), `created_at`, `updated_at`, `deleted_at`.
  - Uniqueness: `uq_product_variants_sku_active` (`product_id`, `sku` WHERE `sku IS NOT NULL AND deleted_at IS NULL`) — prevents duplicate non-null SKUs within a product without blocking other stores.
- `product_images`:
  - `id` (`UUID` PK), `product_id` (`UUID` FK → `products.id`), `media_asset_id` (`UUID` FK → `media_assets.id`), `sort_order` (`INT` NOT NULL DEFAULT `0`), `is_primary` (`BOOLEAN` NOT NULL DEFAULT `false`), `alt_text` (`VARCHAR(200)` nullable).

#### `service_listings` & `service_packages`
- `service_listings`:
  - `id` (`UUID` PK), `store_id` (`UUID` FK → `stores.id` `ON DELETE RESTRICT` NOT NULL), `category_id` (`UUID` FK → `categories.id` `ON DELETE RESTRICT` NOT NULL), `slug` (`VARCHAR(160)` NOT NULL), `title` (`VARCHAR(200)` NOT NULL), `description` (`TEXT` NOT NULL), `service_mode` (`VARCHAR(20)` NOT NULL: `'ON_SITE'`, `'REMOTE'`, `'HYBRID'`), `requirements_prompt` (`TEXT` nullable), `status` (`VARCHAR(30)` NOT NULL DEFAULT `'DRAFT'`), `rejection_reason` (`TEXT` nullable), `search_vector` (`TSVECTOR`), `created_at`, `updated_at`, `deleted_at`.
  - Uniqueness: `uq_service_listings_slug_active` (`slug` WHERE `deleted_at IS NULL` — auto-suffixed on collision).
- `service_packages`:
  - `id` (`UUID` PK), `service_listing_id` (`UUID` FK → `service_listings.id`), `tier_name` (`VARCHAR(60)` NOT NULL), `description` (`TEXT` NOT NULL), `price_paisa` (`BIGINT` NOT NULL, `CHECK > 0`), `currency` (`CHAR(3)` NOT NULL DEFAULT `'PKR'`), `delivery_estimate_days` (`INT` NOT NULL, `CHECK >= 1`), `max_revisions` (`INT` NOT NULL DEFAULT `0`, `CHECK >= 0`), `is_active` (`BOOLEAN` NOT NULL DEFAULT `true`), `created_at`, `updated_at`, `deleted_at`.

---

### 2.4 Cart, Orders, Delivery & Workflow History

#### `carts` & `cart_items`
- `carts`: `id` (`UUID` PK), `customer_id` (`UUID` FK → `users.id` NOT NULL), `store_id` (`UUID` FK → `stores.id` NOT NULL), `currency` (`CHAR(3)` NOT NULL DEFAULT `'PKR'`), `created_at`, `updated_at`.
  - Unique: `UNIQUE(customer_id, store_id)` — enforces **one store per cart/checkout** while allowing customers to maintain separate carts for different Mianwali stores without losing items.
- `cart_items`: `id` (`UUID` PK), `cart_id` (`UUID` FK → `carts.id` `ON DELETE CASCADE`), `product_id` (`UUID` FK → `products.id` `ON DELETE RESTRICT`), `product_variant_id` (`UUID` FK → `product_variants.id` nullable), `quantity` (`INT` NOT NULL, `CHECK > 0`), `created_at`, `updated_at`.
  - Partial Unique Indexes (required because PostgreSQL treats `NULL != NULL` in standard `UNIQUE` constraints):
    - `uq_cart_item_no_variant`: `UNIQUE(cart_id, product_id) WHERE product_variant_id IS NULL`
    - `uq_cart_item_with_variant`: `UNIQUE(cart_id, product_id, product_variant_id) WHERE product_variant_id IS NOT NULL`
  - Privacy: `CUSTOMER_PRIVATE`.

#### `orders`
| Column | Type | Constraints / Default | Privacy | Notes |
|---|---|---|---|---|
| `id` | `UUID` | PK | `FULFILMENT_RESTRICTED` | |
| `order_number` | `VARCHAR(30)` | UNIQUE NOT NULL | `FULFILMENT_RESTRICTED` | Human-readable e.g. `MWL-20261117-00042` |
| `customer_id` | `UUID` | FK → `users.id` (`ON DELETE RESTRICT`) NOT NULL | `FULFILMENT_RESTRICTED` | |
| `store_id` | `UUID` | FK → `stores.id` (`ON DELETE RESTRICT`) NOT NULL | `FULFILMENT_RESTRICTED` | **Strictly ONE seller/store per order** |
| `district_id` | `UUID` | FK → `districts.id` (`ON DELETE RESTRICT`) NOT NULL | `FULFILMENT_RESTRICTED` | Mianwali District in MVP |
| `order_type` | `VARCHAR(20)` | NOT NULL (`'PHYSICAL'` \| `'SERVICE'`) | `FULFILMENT_RESTRICTED` | Enforces physical vs service workflow |
| `status` | `VARCHAR(30)` | NOT NULL | `FULFILMENT_RESTRICTED` | See `docs/16_ORDER_AND_COD_WORKFLOWS.md` |
| `payment_method` | `VARCHAR(20)` | NOT NULL DEFAULT `'COD'` | `FULFILMENT_RESTRICTED` | `'COD'` (physical/`ON_SITE`/`HYBRID`) \| `'MANUAL_OFFLINE'` (`REMOTE` services per `PQ-14`) |
| `cod_collection_status` | `VARCHAR(30)` | NOT NULL DEFAULT `'PENDING_COLLECTION'` | `FULFILMENT_RESTRICTED` | `'PENDING_COLLECTION'` \| `'COLLECTED'` \| `'FAILED_REFUSED'` \| `'REFUNDED'` (separate from delivery/completion status) |
| `currency` | `CHAR(3)` | NOT NULL DEFAULT `'PKR'` | `FULFILMENT_RESTRICTED` | |
| `subtotal_paisa` | `BIGINT` | NOT NULL, `CHECK >= 0` | `FULFILMENT_RESTRICTED` | Server-calculated |
| `delivery_fee_paisa` | `BIGINT` | NOT NULL DEFAULT `0`, `CHECK >= 0` | `FULFILMENT_RESTRICTED` | Server-calculated |
| `discount_paisa` | `BIGINT` | NOT NULL DEFAULT `0`, `CHECK >= 0` | `FULFILMENT_RESTRICTED` | `CHECK (discount_paisa <= subtotal_paisa)` |
| `total_paisa` | `BIGINT` | NOT NULL, `CHECK >= 0` | `FULFILMENT_RESTRICTED` | `CHECK (total_paisa = subtotal_paisa + delivery_fee_paisa - discount_paisa)` |
| `commission_rule_id` | `UUID` | FK → `commission_rules.id` (`ON DELETE RESTRICT`) NOT NULL | `SELLER_PRIVATE` | Rule snapshotted at order time |
| `commission_rate_bps` | `INT` | NOT NULL, `CHECK BETWEEN 0 AND 10000` | `SELLER_PRIVATE` | Snapshot at order time |
| `commission_amount_paisa` | `BIGINT` | NOT NULL, `CHECK >= 0` | `SELLER_PRIVATE` | Snapshot estimate; realized in `CommissionLedger` |
| `seller_net_entitlement_paisa` | `BIGINT` | NOT NULL | `SELLER_PRIVATE` | `total_paisa - commission_amount_paisa` (seller economic entitlement under seller-managed delivery per approved `PQ-13`, `D-018`; not a wallet or platform payout) |
| `customer_note` | `TEXT` | NULLABLE | `FULFILMENT_RESTRICTED` | |
| `cancelled_reason` | `TEXT` | NULLABLE | `FULFILMENT_RESTRICTED` | |
| `completed_at` | `TIMESTAMPTZ` | NULLABLE | `FULFILMENT_RESTRICTED` | |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | NOT NULL | `FULFILMENT_RESTRICTED` | |

Indexes: `idx_orders_customer_created` (`customer_id`, `created_at` DESC), `idx_orders_store_status_created` (`store_id`, `status`, `created_at` DESC), `idx_orders_district_created` (`district_id`, `created_at`).

#### `order_items` (Physical Orders — Immutable Snapshot)
- `id` (`UUID` PK), `order_id` (`UUID` FK → `orders.id` `ON DELETE RESTRICT`), `product_id` (`UUID` FK → `products.id` `ON DELETE RESTRICT`), `product_variant_id` (`UUID` FK → `product_variants.id` nullable), `title_snapshot` (`VARCHAR(200)` NOT NULL), `variant_title_snapshot` (`VARCHAR(120)` nullable), `sku_snapshot` (`VARCHAR(80)` nullable), `unit_price_paisa` (`BIGINT` NOT NULL, `CHECK >= 0`), `quantity` (`INT` NOT NULL, `CHECK > 0`), `line_total_paisa` (`BIGINT` NOT NULL, `CHECK (line_total_paisa = unit_price_paisa * quantity)`), `currency` (`CHAR(3)` NOT NULL DEFAULT `'PKR'`).
- *Future-proofing for mixed-category commissions (`PQ-15`):* May carry nullable `commission_rule_id`, `commission_rate_bps`, and `commission_amount_paisa` columns if per-item category commission rules are enabled.

#### `service_order_details` (Service Orders — Immutable Package Snapshot)
- `id` (`UUID` PK), `order_id` (`UUID` UNIQUE FK → `orders.id` `ON DELETE RESTRICT`), `service_listing_id` (`UUID` FK → `service_listings.id` `ON DELETE RESTRICT`), `service_package_id` (`UUID` FK → `service_packages.id` `ON DELETE RESTRICT`), `service_mode_snapshot` (`VARCHAR(20)` NOT NULL: `'ON_SITE'`, `'REMOTE'`, `'HYBRID'`), `service_title_snapshot` (`VARCHAR(200)` NOT NULL), `package_name_snapshot` (`VARCHAR(60)` NOT NULL), `package_price_paisa` (`BIGINT` NOT NULL), `delivery_estimate_days_snapshot` (`INT` NOT NULL), `max_revisions_snapshot` (`INT` NOT NULL), `revisions_used` (`INT` NOT NULL DEFAULT `0`), `area_zone_id` (`UUID` FK → `area_zones.id` nullable — required for `ON_SITE`/`HYBRID` services in Mianwali), `service_address_snapshot_json` (`JSONB` nullable — `FULFILMENT_RESTRICTED`, populated for `ON_SITE`/`HYBRID`, `NULL` for `REMOTE`), `customer_requirements` (`TEXT` NOT NULL), `delivery_summary` (`TEXT` nullable), `delivery_submitted_at` (`TIMESTAMPTZ` nullable), `customer_accepted_at` (`TIMESTAMPTZ` nullable — tracks customer service acceptance independently from manual payment confirmation).

#### `deliveries` (Physical Orders Only — Decoupled from Payment Collection)
- `id` (`UUID` PK), `order_id` (`UUID` UNIQUE FK → `orders.id` `ON DELETE RESTRICT`), `fulfilment_mode` (`VARCHAR(30)` NOT NULL: `'SELLER_DELIVERY'`, `'CUSTOMER_PICKUP'`, `'COURIER'`), `delivery_status` (`VARCHAR(30)` NOT NULL DEFAULT `'NOT_STARTED'`), `area_zone_id` (`UUID` FK → `area_zones.id` nullable), `shipping_address_snapshot_json` (`JSONB` nullable — `FULFILMENT_RESTRICTED`), `pickup_instructions` (`TEXT` nullable — shared only after `CONFIRMED`), `tracking_note` (`TEXT` nullable), `dispatched_at` (`TIMESTAMPTZ` nullable), `delivered_at` (`TIMESTAMPTZ` nullable), `failed_reason` (`TEXT` nullable), `created_at`, `updated_at`.
- **Service Order Separation (`PQ-14`):** Service orders (`ON_SITE`, `HYBRID`, and especially `REMOTE`) do **not** create a `deliveries` row; `ON_SITE`/`HYBRID` service locations live on `service_order_details.service_address_snapshot_json`, and `REMOTE` services have `service_address_snapshot_json = NULL` and no physical delivery record.

#### `order_status_history` (Immutable Append-Only)
- `id` (`UUID` PK), `order_id` (`UUID` FK → `orders.id` `ON DELETE RESTRICT`), `from_status` (`VARCHAR(30)` nullable), `to_status` (`VARCHAR(30)` NOT NULL), `actor_id` (`UUID` FK → `users.id` nullable), `actor_role` (`VARCHAR(30)` NOT NULL), `reason` (`TEXT` nullable), `metadata_json` (`JSONB` nullable), `created_at` (`TIMESTAMPTZ` NOT NULL DEFAULT `now()`).
- Index: `idx_order_history_order_created` (`order_id`, `created_at`).

---

### 2.5 Payments, Commission Ledger & Settlements

#### `payments`, `payment_events`, `refunds`
- `payments`: `id` (`UUID` PK), `order_id` (`UUID` FK → `orders.id` `ON DELETE RESTRICT`), `provider_code` (`VARCHAR(40)` NOT NULL DEFAULT `'COD_MANUAL'`), `payment_method` (`VARCHAR(20)` NOT NULL DEFAULT `'COD'`: `'COD'` for physical/`ON_SITE`/`HYBRID` | `'MANUAL_OFFLINE'` for `REMOTE` services arranged directly with seller), `status` (`VARCHAR(30)` NOT NULL: `'PENDING'`, `'COLLECTED'`, `'FAILED'`, `'CANCELLED'`, `'REFUND_PENDING'`, `'REFUNDED'`), `amount_paisa` (`BIGINT` NOT NULL, `CHECK >= 0`), `currency` (`CHAR(3)` NOT NULL DEFAULT `'PKR'`), `manual_payment_method_desc` (`VARCHAR(100)` nullable — e.g. direct bank/cash note for `REMOTE` offline confirmation), `confirmation_note` (`TEXT` nullable), `provider_reference` (`VARCHAR(140)` nullable), `confirmed_by_id` (`UUID` FK → `users.id` nullable), `collected_at` (`TIMESTAMPTZ` nullable), `created_at`, `updated_at`.
  - Partial Unique Index: `uq_payments_one_collected_per_order` (`order_id` WHERE `status = 'COLLECTED'`) — prevents duplicate collected payment records for the same order.
  - **Audit & Representation Rule (`PQ-14`):** `confirmed_by_id` + `collected_at` + `PaymentEvent` log seller-reported manual confirmation of offline payment; this is never represented as independent platform verification or an online payment gateway.
- `payment_events` (append-only): `id` (`UUID` PK), `payment_id` (`UUID` FK → `payments.id` `ON DELETE RESTRICT`), `event_type` (`VARCHAR(60)` NOT NULL), `idempotency_key` (`VARCHAR(120)` UNIQUE NOT NULL — deterministic key such as `cod_collect:<order_id>` or `<provider>:<event_id>`), `raw_payload_json` (`JSONB` — sanitized, never stores card data), `created_at`.
- `refunds`: `id` (`UUID` PK), `order_id` (`UUID` FK → `orders.id` `ON DELETE RESTRICT`), `payment_id` (`UUID` FK → `payments.id` `ON DELETE RESTRICT`), `amount_paisa` (`BIGINT` NOT NULL, `CHECK > 0`), `reason` (`TEXT` NOT NULL), `status` (`VARCHAR(30)` NOT NULL: `'REQUESTED'`, `'APPROVED'`, `'REJECTED'`, `'RECORDED'`), `approved_by_id` (`UUID` FK → `users.id` nullable), `created_at`, `updated_at`.

#### `commission_rules` (Configurable, Versioned — `0 bps` Promotional Beta Approved)
- `id` (`UUID` PK), `version` (`INT` NOT NULL, `CHECK > 0`), `name` (`VARCHAR(100)` NOT NULL), `scope_type` (`VARCHAR(20)` NOT NULL: `'GLOBAL'`, `'CATEGORY'`, `'ORDER_TYPE'`), `category_id` (`UUID` FK → `categories.id` nullable), `order_type` (`VARCHAR(20)` nullable), `rate_bps` (`INT` NOT NULL, `CHECK BETWEEN 0 AND 10000` — seeded at `0` for Mianwali closed beta per `PQ-01`), `include_delivery_fee` (`BOOLEAN` NOT NULL DEFAULT `false` — locked `false` per `PQ-02`), `effective_from` (`TIMESTAMPTZ` NOT NULL), `effective_to` (`TIMESTAMPTZ` nullable), `is_active` (`BOOLEAN` NOT NULL DEFAULT `true`), `created_by_id` (`UUID` FK → `users.id`), `created_at`.
- **MVP Resolution (`PQ-15`, `D-020`):** MVP enforces `GLOBAL` or `ORDER_TYPE` flat commission rules (one rule per order); `CATEGORY` scope and partial unique indexes are preserved in schema for future expansion without breaking historical orders.
- **PostgreSQL `NULL`-Safe Constraints & Partial Unique Indexes** (standard `UNIQUE(scope_type, category_id, order_type, version)` would allow duplicate `GLOBAL` rows because PostgreSQL treats `NULL != NULL` by default):
  - `CHECK` constraint `chk_commission_rule_scope`:
    - `(scope_type = 'GLOBAL' AND category_id IS NULL AND order_type IS NULL)` OR
    - `(scope_type = 'ORDER_TYPE' AND order_type IS NOT NULL AND category_id IS NULL)` OR
    - `(scope_type = 'CATEGORY' AND category_id IS NOT NULL AND order_type IS NULL)`
  - Version uniqueness partial indexes:
    - `uq_comm_rule_global_ver`: `UNIQUE(version) WHERE scope_type = 'GLOBAL'`
    - `uq_comm_rule_order_type_ver`: `UNIQUE(order_type, version) WHERE scope_type = 'ORDER_TYPE'`
    - `uq_comm_rule_category_ver`: `UNIQUE(category_id, version) WHERE scope_type = 'CATEGORY'`
  - Active-rule uniqueness partial indexes (at most one active rule per target):
    - `uq_comm_rule_global_active`: `UNIQUE(scope_type) WHERE scope_type = 'GLOBAL' AND is_active = true`
    - `uq_comm_rule_order_type_active`: `UNIQUE(order_type) WHERE scope_type = 'ORDER_TYPE' AND is_active = true`
    - `uq_comm_rule_category_active`: `UNIQUE(category_id) WHERE scope_type = 'CATEGORY' AND is_active = true`
- Privacy: `ADMIN_ONLY` (effective rate displayed transparently to sellers).

#### `commission_ledger` (Strictly Append-Only / `FINANCIAL_IMMUTABLE`)
| Column | Type | Constraints / Default | Notes |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `order_id` | `UUID` | FK → `orders.id` (`ON DELETE RESTRICT`) NOT NULL | |
| `store_id` | `UUID` | FK → `stores.id` (`ON DELETE RESTRICT`) NOT NULL | |
| `commission_rule_id` | `UUID` | FK → `commission_rules.id` (`ON DELETE RESTRICT`) NOT NULL | |
| `entry_type` | `VARCHAR(30)` | NOT NULL | `COMMISSION_ACCRUAL`, `COMMISSION_REVERSAL`, `ADJUSTMENT`, `SETTLEMENT_OFFSET` |
| `gross_order_paisa` | `BIGINT` | NOT NULL | Signed for reversals |
| `commissionable_base_paisa` | `BIGINT` | NOT NULL | Signed for reversals |
| `rate_bps` | `INT` | NOT NULL | |
| `commission_paisa` | `BIGINT` | NOT NULL | Positive = accrued to platform; negative = reversal |
| `seller_net_entitlement_paisa` | `BIGINT` | NOT NULL | Matches `orders.seller_net_entitlement_paisa` (signed for reversals) |
| `currency` | `CHAR(3)` | NOT NULL DEFAULT `'PKR'` | |
| `reference_entry_id` | `UUID` | FK → `commission_ledger.id` NULLABLE | Links reversal/adjustment to original entry |
| `reason` | `TEXT` | NOT NULL | |
| `created_by_id` | `UUID` | FK → `users.id` NULLABLE | System or Admin ID |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Never updated/deleted |

Indexes & Uniqueness:
- `uq_commission_ledger_one_accrual_per_order`: `UNIQUE(order_id) WHERE entry_type = 'COMMISSION_ACCRUAL'` — prevents duplicate commission accruals on the same order.
- `idx_ledger_store_created` (`store_id`, `created_at`), `idx_ledger_order` (`order_id`).

#### `seller_settlement_records` (Offline/Manual Tracking — No Wallet)
- `id` (`UUID` PK), `store_id` (`UUID` FK → `stores.id` `ON DELETE RESTRICT` NOT NULL), `direction` (`VARCHAR(30)` NOT NULL: `'SELLER_TO_PLATFORM'` for COD commission remittance | `'PLATFORM_TO_SELLER'` for future online payouts), `settlement_method` (`VARCHAR(40)` NOT NULL: `'BANK_TRANSFER'`, `'CASH_OFFICE'`, `'MOBILE_ACCOUNT_MANUAL'`), `amount_paisa` (`BIGINT` NOT NULL, `CHECK > 0`), `currency` (`CHAR(3)` NOT NULL DEFAULT `'PKR'`), `external_reference` (`VARCHAR(140)` nullable), `period_start` (`TIMESTAMPTZ` NOT NULL), `period_end` (`TIMESTAMPTZ` NOT NULL), `status` (`VARCHAR(20)` NOT NULL: `'RECORDED'`, `'VERIFIED'`, `'DISPUTED'`), `verified_by_id` (`UUID` FK → `users.id` nullable), `notes` (`TEXT` nullable), `created_at`, `updated_at`.

---

### 2.6 Reviews, Moderation, Notifications, Idempotency & Audit

- **`reviews`**: `id` (`UUID` PK), `order_id` (`UUID` FK → `orders.id` `ON DELETE RESTRICT`), `order_item_id` (`UUID` FK nullable), `store_id` (`UUID` FK → `stores.id`), `customer_id` (`UUID` FK → `users.id`), `rating` (`SMALLINT` `CHECK 1..5`), `comment` (`TEXT` nullable), `status` (`VARCHAR(20)` DEFAULT `'PUBLISHED'`), `created_at`, `updated_at`.
  - Partial Unique Indexes (`NULL`-safe): `uq_review_order_item` (`order_id`, `order_item_id` WHERE `order_item_id IS NOT NULL`) and `uq_review_service_order` (`order_id` WHERE `order_item_id IS NULL`).
- **`order_messages`** *(Included in MVP per `PQ-09`, `D-021`)*: `id` (`UUID` PK), `order_id` (`UUID` FK → `orders.id` `ON DELETE RESTRICT`), `sender_id` (`UUID` FK → `users.id`), `sender_role` (`VARCHAR(20)` NOT NULL: `'CUSTOMER'`, `'SELLER'`, `'SUPPORT'`, `'ADMIN'`), `body` (`TEXT` NOT NULL, `CHECK char_length(body) BETWEEN 1 AND 1000`), `created_at` (`TIMESTAMPTZ` NOT NULL DEFAULT `now()`).
  - Index: `idx_order_messages_order_created` (`order_id`, `created_at`).
  - Rules: REST-only (no WebSockets), text-only (no attachments), strict `customer_id`/`store_id` ownership, audited Support/Admin access, frozen after terminal order closure (subject to documented dispute/support exceptions), PII warnings & retention policy. Privacy: `FULFILMENT_RESTRICTED`.
- **`reports`**: `id` (`UUID` PK), `reporter_id` (`UUID` FK → `users.id`), `target_type` (`VARCHAR(30)`), `target_id` (`UUID`), `reason_code` (`VARCHAR(40)`), `details` (`TEXT`), `status` (`VARCHAR(20)` DEFAULT `'OPEN'`), `resolved_by_id` (`UUID` nullable), `resolution_note` (`TEXT` nullable), `created_at`, `updated_at`.
- **`disputes`**: `id` (`UUID` PK), `order_id` (`UUID` FK → `orders.id` `ON DELETE RESTRICT`), `opened_by_id` (`UUID` FK → `users.id`), `dispute_type` (`VARCHAR(40)`), `description` (`TEXT`), `status` (`VARCHAR(30)` DEFAULT `'OPEN'`), `resolution_outcome` (`VARCHAR(40)` nullable), `resolved_by_id` (`UUID` nullable), `resolution_note` (`TEXT` nullable), `created_at`, `updated_at`.
- **`notifications`**: `id` (`UUID` PK), `user_id` (`UUID` FK → `users.id`), `event_type` (`VARCHAR(60)`), `title_key` (`VARCHAR(100)`), `payload_json` (`JSONB` — privacy-filtered), `read_at` (`TIMESTAMPTZ` nullable), `created_at`. Index: `idx_notifications_user_unread` (`user_id`, `read_at`, `created_at` DESC).
- **`outbox_events`**: `id` (`UUID` PK), `event_type` (`VARCHAR(80)` NOT NULL), `aggregate_type` (`VARCHAR(40)`), `aggregate_id` (`UUID`), `payload_json` (`JSONB` NOT NULL), `status` (`VARCHAR(20)` DEFAULT `'PENDING'`), `attempts` (`INT` DEFAULT `0`), `next_attempt_at` (`TIMESTAMPTZ` DEFAULT `now()`), `processed_at` (`TIMESTAMPTZ` nullable), `created_at`.
- **`idempotency_keys`**: `id` (`UUID` PK), `user_id` (`UUID` FK → `users.id`), `endpoint` (`VARCHAR(120)` NOT NULL), `key_value` (`VARCHAR(128)` NOT NULL), `request_hash` (`VARCHAR(64)` NOT NULL), `response_status` (`INT` nullable), `response_body_json` (`JSONB` nullable), `expires_at` (`TIMESTAMPTZ` NOT NULL), `created_at`. Unique: `UNIQUE(user_id, endpoint, key_value)`.
- **`admin_audit_logs`** (immutable `ADMIN_ONLY`): `id` (`UUID` PK), `actor_id` (`UUID` FK → `users.id` NOT NULL), `actor_role` (`VARCHAR(30)` NOT NULL), `action` (`VARCHAR(80)` NOT NULL), `target_type` (`VARCHAR(40)` NOT NULL), `target_id` (`UUID` NOT NULL), `reason` (`TEXT` nullable), `before_json` (`JSONB` nullable), `after_json` (`JSONB` nullable), `ip_address` (`INET`), `user_agent` (`TEXT`), `created_at` (`TIMESTAMPTZ` NOT NULL DEFAULT `now()`).

---

## 3. Seller Data Isolation & Multi-Tenant Enforcement

1. Every seller-owned table carries `store_id` (`products`, `service_listings`, `orders`, `commission_ledger`, `seller_settlement_records`, `store_service_areas`) or `seller_profile_id` (`stores`).
2. Every seller API route resolves the authenticated `user_id` → `seller_profile_id` → owned `store_id` on the server and binds `WHERE store_id = :authenticatedSellerStoreId`.
3. Client-supplied `storeId` on seller write/read endpoints is **never trusted**; cross-seller queries return `403 Forbidden` or `404 Not Found` (prefer `404` or uniform `403` without leaking existence).
4. Customer `Address` and `Delivery.shipping_address_snapshot_json` are strictly restricted to the order's `customer_id`, the order's `store_id`, and authorized Admin/Support. Seller `users.phone_e164` is never exposed on orders or public store DTOs when `stores.show_public_phone = false`.

---

## 4. Migration Management Strategy & Prisma Constraints

- **Tooling:** Prisma Migrate (`apps/api/prisma/migrations/`), tracked in Git alongside `schema.prisma`.
- **Phase 2 Rule:** **No Prisma schema file or SQL migration is generated during Phase 2.** Migrations begin only in Milestone 2 after founder approval.
- **PostgreSQL Features Beyond Declarative Prisma (`--create-only` Custom SQL Rule):**
  Prisma's `schema.prisma` DSL cannot declaratively express PostgreSQL partial unique indexes (`WHERE ...`), `CHECK` constraints, `TSVECTOR` generated columns/GIN indexes, `pg_trgm` extension setup, or append-only immutability protections (`commission_ledger`, `order_status_history`, `payment_events`, `admin_audit_logs`). Therefore, Milestone 2+ migrations **must** author those constraints as explicit custom SQL inside versioned Prisma migration files (`prisma migrate dev --create-only`) and verify them with integration tests against a real PostgreSQL instance. Never silently omit integrity constraints because of ORM DSL limits.
- **Change Discipline:**
  - Use expand-and-contract migrations for backward-compatible schema changes (add nullable column → backfill → enforce `NOT NULL`).
  - Never run `prisma migrate reset` or `prisma db push --force-reset` on staging or production.
  - Every migration PR requires forward SQL review, an explicit rollback/remediation note, and CI validation against a clean PostgreSQL container.
  - Automated encrypted PostgreSQL backups and restore drills are mandatory before Closed Beta (`Gate F`).
