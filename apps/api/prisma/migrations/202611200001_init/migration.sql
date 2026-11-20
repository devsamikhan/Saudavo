-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255),
    "phone_e164" VARCHAR(20),
    "password_hash" TEXT NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ(6),
    "phone_verified_at" TIMESTAMPTZ(6),
    "mfa_secret_encrypted" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "csrf_token_hash" VARCHAR(128) NOT NULL,
    "mfa_verified_at" TIMESTAMPTZ(6),
    "ip_address" INET,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_type" VARCHAR(30) NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "preferred_locale" VARCHAR(5) NOT NULL DEFAULT 'en',
    "default_district_id" UUID,
    "default_area_zone_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "seller_type" VARCHAR(30) NOT NULL,
    "verification_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejection_reason" TEXT,
    "moderation_notes" TEXT,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seller_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "name_ur" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "province" VARCHAR(80) NOT NULL,
    "country_code" CHAR(2) NOT NULL DEFAULT 'PK',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area_zones" (
    "id" UUID NOT NULL,
    "district_id" UUID NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "name_ur" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "zone_type" VARCHAR(30) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "area_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL,
    "seller_profile_id" UUID NOT NULL,
    "district_id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "display_name" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "logo_asset_id" UUID,
    "banner_asset_id" UUID,
    "show_public_phone" BOOLEAN NOT NULL DEFAULT false,
    "public_contact_phone" VARCHAR(20),
    "show_public_address" BOOLEAN NOT NULL DEFAULT false,
    "public_business_address" TEXT,
    "default_delivery_fee_paisa" BIGINT NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_service_areas" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "area_zone_id" UUID NOT NULL,
    "delivery_fee_override_paisa" BIGINT,
    "pickup_supported" BOOLEAN NOT NULL DEFAULT true,
    "delivery_supported" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "store_service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "district_id" UUID NOT NULL,
    "area_zone_id" UUID,
    "label" VARCHAR(60),
    "recipient_name" VARCHAR(120) NOT NULL,
    "recipient_phone" VARCHAR(20) NOT NULL,
    "street_address" TEXT NOT NULL,
    "landmark" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "applicable_to" VARCHAR(20) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "name_ur" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "store_id" UUID,
    "object_key" VARCHAR(512) NOT NULL,
    "mime_type" VARCHAR(80) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "exif_stripped" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING_UPLOAD',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "base_price_paisa" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "has_variants" BOOLEAN NOT NULL DEFAULT false,
    "delivery_enabled" BOOLEAN NOT NULL DEFAULT true,
    "pickup_enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "rejection_reason" TEXT,
    "search_vector" tsvector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(80),
    "title" VARCHAR(120) NOT NULL,
    "option_values_json" JSONB NOT NULL,
    "price_paisa" BIGINT NOT NULL,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "alt_text" VARCHAR(200),

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_listings" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "service_mode" VARCHAR(20) NOT NULL,
    "requirements_prompt" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "rejection_reason" TEXT,
    "search_vector" tsvector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "service_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_packages" (
    "id" UUID NOT NULL,
    "service_listing_id" UUID NOT NULL,
    "tier_name" VARCHAR(60) NOT NULL,
    "description" TEXT NOT NULL,
    "price_paisa" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "delivery_estimate_days" INTEGER NOT NULL,
    "max_revisions" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_variant_id" UUID,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" VARCHAR(30) NOT NULL,
    "customer_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "district_id" UUID NOT NULL,
    "order_type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "payment_method" VARCHAR(20) NOT NULL DEFAULT 'COD',
    "cod_collection_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING_COLLECTION',
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "subtotal_paisa" BIGINT NOT NULL,
    "delivery_fee_paisa" BIGINT NOT NULL DEFAULT 0,
    "discount_paisa" BIGINT NOT NULL DEFAULT 0,
    "total_paisa" BIGINT NOT NULL,
    "commission_rule_id" UUID NOT NULL,
    "commission_rate_bps" INTEGER NOT NULL,
    "commission_amount_paisa" BIGINT NOT NULL,
    "seller_net_entitlement_paisa" BIGINT NOT NULL,
    "customer_note" TEXT,
    "cancelled_reason" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_variant_id" UUID,
    "title_snapshot" VARCHAR(200) NOT NULL,
    "variant_title_snapshot" VARCHAR(120),
    "sku_snapshot" VARCHAR(80),
    "unit_price_paisa" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total_paisa" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_details" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "service_listing_id" UUID NOT NULL,
    "service_package_id" UUID NOT NULL,
    "service_mode_snapshot" VARCHAR(20) NOT NULL,
    "service_title_snapshot" VARCHAR(200) NOT NULL,
    "package_name_snapshot" VARCHAR(60) NOT NULL,
    "package_price_paisa" BIGINT NOT NULL,
    "delivery_estimate_days_snapshot" INTEGER NOT NULL,
    "max_revisions_snapshot" INTEGER NOT NULL,
    "revisions_used" INTEGER NOT NULL DEFAULT 0,
    "area_zone_id" UUID,
    "service_address_snapshot_json" JSONB,
    "customer_requirements" TEXT NOT NULL,
    "delivery_summary" TEXT,
    "delivery_submitted_at" TIMESTAMPTZ(6),
    "customer_accepted_at" TIMESTAMPTZ(6),

    CONSTRAINT "service_order_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "fulfilment_mode" VARCHAR(30) NOT NULL,
    "delivery_status" VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',
    "area_zone_id" UUID,
    "shipping_address_snapshot_json" JSONB,
    "pickup_instructions" TEXT,
    "tracking_note" TEXT,
    "dispatched_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "failed_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from_status" VARCHAR(30),
    "to_status" VARCHAR(30) NOT NULL,
    "actor_id" UUID,
    "actor_role" VARCHAR(30) NOT NULL,
    "reason" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_messages" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "sender_role" VARCHAR(20) NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider_code" VARCHAR(40) NOT NULL DEFAULT 'COD_MANUAL',
    "payment_method" VARCHAR(20) NOT NULL DEFAULT 'COD',
    "status" VARCHAR(30) NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "manual_payment_method_desc" VARCHAR(100),
    "confirmation_note" TEXT,
    "provider_reference" VARCHAR(140),
    "confirmed_by_id" UUID,
    "collected_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "event_type" VARCHAR(60) NOT NULL,
    "idempotency_key" VARCHAR(120) NOT NULL,
    "raw_payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "approved_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "scope_type" VARCHAR(20) NOT NULL,
    "category_id" UUID,
    "order_type" VARCHAR(20),
    "rate_bps" INTEGER NOT NULL,
    "include_delivery_fee" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" TIMESTAMPTZ(6) NOT NULL,
    "effective_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_ledger" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "commission_rule_id" UUID NOT NULL,
    "entry_type" VARCHAR(30) NOT NULL,
    "gross_order_paisa" BIGINT NOT NULL,
    "commissionable_base_paisa" BIGINT NOT NULL,
    "rate_bps" INTEGER NOT NULL,
    "commission_paisa" BIGINT NOT NULL,
    "seller_net_entitlement_paisa" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "reference_entry_id" UUID,
    "reason" TEXT NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_settlement_records" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "direction" VARCHAR(30) NOT NULL,
    "settlement_method" VARCHAR(40) NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "external_reference" VARCHAR(140),
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "verified_by_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seller_settlement_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID,
    "store_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_type" VARCHAR(30) NOT NULL,
    "target_id" UUID NOT NULL,
    "reason_code" VARCHAR(40) NOT NULL,
    "details" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "resolved_by_id" UUID,
    "resolution_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "opened_by_id" UUID NOT NULL,
    "dispute_type" VARCHAR(40) NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    "resolution_outcome" VARCHAR(40),
    "resolved_by_id" UUID,
    "resolution_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" VARCHAR(60) NOT NULL,
    "title_key" VARCHAR(100) NOT NULL,
    "payload_json" JSONB NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "aggregate_type" VARCHAR(40),
    "aggregate_id" UUID,
    "payload_json" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" VARCHAR(120) NOT NULL,
    "key_value" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "response_status" INTEGER,
    "response_body_json" JSONB,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_role" VARCHAR(30) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "target_type" VARCHAR(40) NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_e164_key" ON "users"("phone_e164");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_sessions_expires_at" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_auth_tokens_user_type" ON "auth_tokens"("user_id", "token_type");

-- CreateIndex
CREATE INDEX "idx_auth_tokens_expires" ON "auth_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_user_id_key" ON "customer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_user_id_key" ON "seller_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "districts_slug_key" ON "districts"("slug");

-- CreateIndex
CREATE INDEX "idx_area_zones_district_active" ON "area_zones"("district_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "area_zones_district_id_slug_key" ON "area_zones"("district_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE INDEX "idx_stores_district_status" ON "stores"("district_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "store_service_areas_store_id_area_zone_id_key" ON "store_service_areas"("store_id", "area_zone_id");

-- CreateIndex
CREATE INDEX "idx_addresses_user_id" ON "addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_object_key_key" ON "media_assets"("object_key");

-- CreateIndex
CREATE INDEX "idx_products_store_status" ON "products"("store_id", "status");

-- CreateIndex
CREATE INDEX "idx_products_category_status" ON "products"("category_id", "status");

-- CreateIndex
CREATE INDEX "idx_services_store_status" ON "service_listings"("store_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "carts_customer_id_store_id_key" ON "carts"("customer_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "idx_orders_customer_created" ON "orders"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_store_status_created" ON "orders"("store_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_district_created" ON "orders"("district_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "service_order_details_order_id_key" ON "service_order_details"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_order_id_key" ON "deliveries"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_history_order_created" ON "order_status_history"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_order_messages_order_created" ON "order_messages"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_payments_order_id" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_idempotency_key_key" ON "payment_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_ledger_store_created" ON "commission_ledger"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_ledger_order" ON "commission_ledger"("order_id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_unread" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_outbox_pending" ON "outbox_events"("status", "next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_user_id_endpoint_key_value_key" ON "idempotency_keys"("user_id", "endpoint", "key_value");

-- CreateIndex
CREATE INDEX "idx_audit_target_created" ON "admin_audit_logs"("target_type", "target_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_default_district_id_fkey" FOREIGN KEY ("default_district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_default_area_zone_id_fkey" FOREIGN KEY ("default_area_zone_id") REFERENCES "area_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area_zones" ADD CONSTRAINT "area_zones_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_seller_profile_id_fkey" FOREIGN KEY ("seller_profile_id") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_logo_asset_id_fkey" FOREIGN KEY ("logo_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_banner_asset_id_fkey" FOREIGN KEY ("banner_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_service_areas" ADD CONSTRAINT "store_service_areas_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_service_areas" ADD CONSTRAINT "store_service_areas_area_zone_id_fkey" FOREIGN KEY ("area_zone_id") REFERENCES "area_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_area_zone_id_fkey" FOREIGN KEY ("area_zone_id") REFERENCES "area_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_listings" ADD CONSTRAINT "service_listings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_listings" ADD CONSTRAINT "service_listings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_service_listing_id_fkey" FOREIGN KEY ("service_listing_id") REFERENCES "service_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_commission_rule_id_fkey" FOREIGN KEY ("commission_rule_id") REFERENCES "commission_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_details" ADD CONSTRAINT "service_order_details_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_details" ADD CONSTRAINT "service_order_details_service_listing_id_fkey" FOREIGN KEY ("service_listing_id") REFERENCES "service_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_details" ADD CONSTRAINT "service_order_details_service_package_id_fkey" FOREIGN KEY ("service_package_id") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_details" ADD CONSTRAINT "service_order_details_area_zone_id_fkey" FOREIGN KEY ("area_zone_id") REFERENCES "area_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_area_zone_id_fkey" FOREIGN KEY ("area_zone_id") REFERENCES "area_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_commission_rule_id_fkey" FOREIGN KEY ("commission_rule_id") REFERENCES "commission_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_reference_entry_id_fkey" FOREIGN KEY ("reference_entry_id") REFERENCES "commission_ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_settlement_records" ADD CONSTRAINT "seller_settlement_records_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_settlement_records" ADD CONSTRAINT "seller_settlement_records_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =============================================================================
-- Custom PostgreSQL Extensions, CHECK Constraints, Partial Unique Indexes,
-- and Search Indexes (per docs/14_DATABASE_DESIGN.md & PQ-01..PQ-16)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users: Email OR Phone is required (PQ-05)
ALTER TABLE "users"
    ADD CONSTRAINT "chk_users_identifier_present"
    CHECK ("email" IS NOT NULL OR "phone_e164" IS NOT NULL);

-- Stores & Delivery Fees
ALTER TABLE "stores"
    ADD CONSTRAINT "chk_stores_delivery_fee_non_negative"
    CHECK ("default_delivery_fee_paisa" >= 0);

ALTER TABLE "store_service_areas"
    ADD CONSTRAINT "chk_store_service_areas_override_non_negative"
    CHECK ("delivery_fee_override_paisa" IS NULL OR "delivery_fee_override_paisa" >= 0);

-- Products & Variants (Integer paisa > 0)
ALTER TABLE "products"
    ADD CONSTRAINT "chk_products_price_positive" CHECK ("base_price_paisa" > 0),
    ADD CONSTRAINT "chk_products_stock_non_negative" CHECK ("stock_quantity" >= 0);

ALTER TABLE "product_variants"
    ADD CONSTRAINT "chk_product_variants_price_positive" CHECK ("price_paisa" > 0),
    ADD CONSTRAINT "chk_product_variants_stock_non_negative" CHECK ("stock_quantity" >= 0);

-- Service Packages
ALTER TABLE "service_packages"
    ADD CONSTRAINT "chk_service_packages_price_positive" CHECK ("price_paisa" > 0),
    ADD CONSTRAINT "chk_service_packages_delivery_days_positive" CHECK ("delivery_estimate_days" >= 1),
    ADD CONSTRAINT "chk_service_packages_revisions_non_negative" CHECK ("max_revisions" >= 0);

-- Cart Items
ALTER TABLE "cart_items"
    ADD CONSTRAINT "chk_cart_items_quantity_positive" CHECK ("quantity" >= 1);

-- Orders & Order Items (Integer paisa + PQ-13 entitlement invariant)
ALTER TABLE "orders"
    ADD CONSTRAINT "chk_orders_amounts_non_negative" CHECK (
        "subtotal_paisa" >= 0
        AND "delivery_fee_paisa" >= 0
        AND "discount_paisa" >= 0
        AND "total_paisa" >= 0
        AND "commission_rate_bps" >= 0
        AND "commission_rate_bps" <= 10000
        AND "commission_amount_paisa" >= 0
    ),
    ADD CONSTRAINT "chk_orders_total_formula" CHECK (
        "total_paisa" = "subtotal_paisa" + "delivery_fee_paisa" - "discount_paisa"
    ),
    ADD CONSTRAINT "chk_orders_entitlement_formula" CHECK (
        "seller_net_entitlement_paisa" = "total_paisa" - "commission_amount_paisa"
    );

ALTER TABLE "order_items"
    ADD CONSTRAINT "chk_order_items_values" CHECK (
        "unit_price_paisa" > 0
        AND "quantity" >= 1
        AND "line_total_paisa" = "unit_price_paisa" * "quantity"
    );

-- Order Messages (Text-only bounded length, PQ-09)
ALTER TABLE "order_messages"
    ADD CONSTRAINT "chk_order_messages_body_length" CHECK (
        char_length(btrim("body")) >= 1 AND char_length("body") <= 2000
    );

-- Payments & Refunds
ALTER TABLE "payments"
    ADD CONSTRAINT "chk_payments_amount_positive" CHECK ("amount_paisa" > 0);

ALTER TABLE "refunds"
    ADD CONSTRAINT "chk_refunds_amount_positive" CHECK ("amount_paisa" > 0);

-- Commission Rules (PQ-01, PQ-02, PQ-15)
ALTER TABLE "commission_rules"
    ADD CONSTRAINT "chk_commission_rules_rate_bps" CHECK ("rate_bps" >= 0 AND "rate_bps" <= 5000),
    ADD CONSTRAINT "chk_commission_rules_scope" CHECK (
        ("scope_type" = 'GLOBAL' AND "category_id" IS NULL AND "order_type" IS NULL)
        OR ("scope_type" = 'ORDER_TYPE' AND "order_type" IS NOT NULL AND "category_id" IS NULL)
        OR ("scope_type" = 'CATEGORY' AND "category_id" IS NOT NULL AND "order_type" IS NULL)
    ),
    ADD CONSTRAINT "chk_commission_rules_delivery_fee_excluded" CHECK ("include_delivery_fee" = false);

-- Seller Settlement Records
ALTER TABLE "seller_settlement_records"
    ADD CONSTRAINT "chk_seller_settlements_amount_positive" CHECK ("amount_paisa" > 0);

-- Reviews
ALTER TABLE "reviews"
    ADD CONSTRAINT "chk_reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);

-- Partial Unique Indexes
CREATE UNIQUE INDEX "uq_stores_one_active_per_seller"
    ON "stores"("seller_profile_id") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "uq_products_slug_active"
    ON "products"("slug") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "uq_service_listings_slug_active"
    ON "service_listings"("slug") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "uq_product_variants_sku_active"
    ON "product_variants"("product_id", "sku") WHERE "deleted_at" IS NULL AND "sku" IS NOT NULL;

CREATE UNIQUE INDEX "uq_cart_item_no_variant"
    ON "cart_items"("cart_id", "product_id") WHERE "product_variant_id" IS NULL;

CREATE UNIQUE INDEX "uq_cart_item_with_variant"
    ON "cart_items"("cart_id", "product_id", "product_variant_id") WHERE "product_variant_id" IS NOT NULL;

CREATE UNIQUE INDEX "uq_comm_rule_global_ver"
    ON "commission_rules"("scope_type", "version") WHERE "scope_type" = 'GLOBAL';

CREATE UNIQUE INDEX "uq_comm_rule_ordertype_ver"
    ON "commission_rules"("order_type", "version") WHERE "scope_type" = 'ORDER_TYPE';

CREATE UNIQUE INDEX "uq_comm_rule_cat_ver"
    ON "commission_rules"("category_id", "version") WHERE "scope_type" = 'CATEGORY';

CREATE UNIQUE INDEX "uq_comm_rule_global_active"
    ON "commission_rules"("scope_type") WHERE "scope_type" = 'GLOBAL' AND "is_active" = true;

CREATE UNIQUE INDEX "uq_comm_rule_ordertype_active"
    ON "commission_rules"("order_type") WHERE "scope_type" = 'ORDER_TYPE' AND "is_active" = true;

CREATE UNIQUE INDEX "uq_comm_rule_cat_active"
    ON "commission_rules"("category_id") WHERE "scope_type" = 'CATEGORY' AND "is_active" = true;

CREATE UNIQUE INDEX "uq_commission_ledger_one_accrual_per_order"
    ON "commission_ledger"("order_id") WHERE "entry_type" = 'COMMISSION_ACCRUAL';

CREATE UNIQUE INDEX "uq_payments_one_collected_per_order"
    ON "payments"("order_id") WHERE "status" = 'COLLECTED';

CREATE UNIQUE INDEX "uq_review_order_item"
    ON "reviews"("order_item_id") WHERE "order_item_id" IS NOT NULL;

CREATE UNIQUE INDEX "uq_review_service_order"
    ON "reviews"("order_id") WHERE "order_item_id" IS NULL;

CREATE UNIQUE INDEX "uq_addresses_one_default_per_user"
    ON "addresses"("user_id") WHERE "is_default" = true AND "deleted_at" IS NULL;

-- Full-Text & Trigram Search Indexes
CREATE INDEX "idx_products_search_vector"
    ON "products" USING GIN ("search_vector");

CREATE INDEX "idx_service_listings_search_vector"
    ON "service_listings" USING GIN ("search_vector");

CREATE INDEX "idx_products_title_trgm"
    ON "products" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "idx_service_listings_title_trgm"
    ON "service_listings" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "idx_stores_display_name_trgm"
    ON "stores" USING GIN ("display_name" gin_trgm_ops);
