-- Additive migration for Phase A & B: Privacy Contact Shield, Chat Blocking, Photo Reviews, and Store Following

ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "blocked_by_buyer_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "blocked_by_seller_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "block_reason" TEXT;

ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "media_asset_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_media_asset_id_fkey'
  ) THEN
    ALTER TABLE "reviews"
      ADD CONSTRAINT "reviews_media_asset_id_fkey"
      FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "store_followers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "store_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "store_followers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_followers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_followers_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_store_followers_user_store"
  ON "store_followers"("user_id", "store_id");

CREATE INDEX IF NOT EXISTS "idx_store_followers_store"
  ON "store_followers"("store_id");

-- Turn ON ready buyer-seller connection differentiators (Mujhy Chahiye Board & Urdu Voice Notes)
UPDATE "feature_flags"
SET "is_enabled" = true, "updated_at" = CURRENT_TIMESTAMP
WHERE "key" IN ('buyer_requests_board_enabled', 'messenger_voice_notes_enabled');
