-- Additive migration for Admin 1-Click Feature Control & Saudavo Differentiators
-- Safe additive ALTER TABLE & CREATE TABLE statements only.

ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "require_clean_cod_history" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "applied_promo_code" VARCHAR(40);

ALTER TABLE "deliveries"
  ADD COLUMN IF NOT EXISTS "handover_pin" VARCHAR(6),
  ADD COLUMN IF NOT EXISTS "handover_pin_verified_at" TIMESTAMPTZ(6);

ALTER TABLE "chat_messages"
  ADD COLUMN IF NOT EXISTS "voice_duration_sec" INTEGER;

CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(80) NOT NULL,
  "name_en" VARCHAR(100) NOT NULL,
  "name_ur" VARCHAR(100) NOT NULL,
  "description_en" TEXT NOT NULL,
  "description_ur" TEXT NOT NULL,
  "category" VARCHAR(40) NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "updated_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "feature_flags_key_key" UNIQUE ("key"),
  CONSTRAINT "feature_flags_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "buyer_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "buyer_id" UUID NOT NULL,
  "district_id" UUID NOT NULL,
  "area_zone_id" UUID,
  "category_id" UUID,
  "title" VARCHAR(180) NOT NULL,
  "description" TEXT NOT NULL,
  "budget_max_paisa" BIGINT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  "responses_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "buyer_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "buyer_requests_buyer_id_fkey"
    FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "buyer_requests_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "buyer_requests_area_zone_id_fkey"
    FOREIGN KEY ("area_zone_id") REFERENCES "area_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "buyer_requests_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_buyer_requests_district_status"
  ON "buyer_requests"("district_id", "status", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "store_promo_deals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "store_id" UUID NOT NULL,
  "code" VARCHAR(40),
  "title" VARCHAR(140) NOT NULL,
  "discount_type" VARCHAR(20) NOT NULL,
  "discount_value" BIGINT NOT NULL,
  "min_order_paisa" BIGINT NOT NULL DEFAULT 0,
  "is_flash_deal" BOOLEAN NOT NULL DEFAULT false,
  "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ends_at" TIMESTAMPTZ(6) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "store_promo_deals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_promo_deals_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_store_promo_code"
  ON "store_promo_deals"("store_id", "code");

CREATE INDEX IF NOT EXISTS "idx_store_promo_active_ends"
  ON "store_promo_deals"("is_active", "ends_at");
