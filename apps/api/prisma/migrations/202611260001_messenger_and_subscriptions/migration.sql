-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "product_id" UUID,
    "service_listing_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyer_last_read_at" TIMESTAMPTZ(6),
    "seller_last_read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "sender_role" VARCHAR(20) NOT NULL,
    "message_type" VARCHAR(30) NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "product_id" UUID,
    "service_listing_id" UUID,
    "media_asset_id" UUID,
    "offer_title" VARCHAR(200),
    "offer_quantity" INTEGER,
    "offer_unit_price_paisa" BIGINT,
    "offer_delivery_fee_paisa" BIGINT,
    "offer_fulfilment_mode" VARCHAR(30),
    "offer_status" VARCHAR(20),
    "offer_order_id" UUID,
    "offer_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name_en" VARCHAR(80) NOT NULL,
    "name_ur" VARCHAR(80) NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_ur" TEXT NOT NULL,
    "price_paisa" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "duration_days" INTEGER NOT NULL DEFAULT 30,
    "max_active_products" INTEGER NOT NULL,
    "max_active_services" INTEGER NOT NULL,
    "has_verified_badge" BOOLEAN NOT NULL DEFAULT false,
    "has_priority_placement" BOOLEAN NOT NULL DEFAULT false,
    "has_custom_offers" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_subscriptions" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMPTZ(6),
    "grace_ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "store_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_renewal_requests" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "submitted_by_id" UUID NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "payment_method" VARCHAR(40) NOT NULL,
    "transaction_reference" VARCHAR(140) NOT NULL,
    "payer_account_note" VARCHAR(200),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_renewal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_buyer_id_store_id_key" ON "conversations"("buyer_id", "store_id");

-- CreateIndex
CREATE INDEX "idx_conversations_buyer_last" ON "conversations"("buyer_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "idx_conversations_store_last" ON "conversations"("store_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "idx_chat_messages_conv_created" ON "chat_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "store_subscriptions_store_id_key" ON "store_subscriptions"("store_id");

-- CreateIndex
CREATE INDEX "idx_sub_renewals_store_status" ON "subscription_renewal_requests"("store_id", "status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_service_listing_id_fkey" FOREIGN KEY ("service_listing_id") REFERENCES "service_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_service_listing_id_fkey" FOREIGN KEY ("service_listing_id") REFERENCES "service_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_offer_order_id_fkey" FOREIGN KEY ("offer_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_renewal_requests" ADD CONSTRAINT "subscription_renewal_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_renewal_requests" ADD CONSTRAINT "subscription_renewal_requests_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_renewal_requests" ADD CONSTRAINT "subscription_renewal_requests_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_renewal_requests" ADD CONSTRAINT "subscription_renewal_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
