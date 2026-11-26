import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  AuthSessionResponseSchema,
  BuyerRequestDtoSchema,
  FeatureFlagsMapSchema,
  PromoDealDtoSchema
} from "@saudavo/contracts";
import cookieParser from "cookie-parser";
import request, { type Response as SupertestResponse } from "supertest";
import { AppModule } from "../src/app.module";
import { encryptMfaSecret } from "../src/common/auth/crypto.util";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { RateLimitGuard } from "../src/common/rate-limit/rate-limit.guard";
import { TotpService } from "../src/modules/auth/totp.service";
import { InMemoryPrismaService } from "./helpers/in-memory-prisma.service";

function extractCookiePair(res: SupertestResponse, name: string): string {
  const raw = res.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  for (const item of list) {
    const firstPart = item.split(";")[0]?.trim();
    if (firstPart?.startsWith(`${name}=`)) {
      return firstPart;
    }
  }
  throw new Error(`Missing Set-Cookie header for ${name}`);
}

async function registerUser(
  server: Parameters<typeof request>[0],
  email: string,
  displayName: string
): Promise<{ userId: string; cookie: string; csrfToken: string }> {
  const res = await request(server)
    .post("/api/v1/auth/register")
    .send({
      email,
      password: "StrongPassword!123",
      displayName
    })
    .expect(201);

  const parsed = AuthSessionResponseSchema.parse(res.body);
  return {
    userId: parsed.data.user.id,
    cookie: extractCookiePair(res, "saudavo_sid"),
    csrfToken: parsed.data.csrfToken
  };
}

describe("Admin 1-Click Feature Control & 5 Saudavo Differentiators (e2e)", () => {
  let app: INestApplication;
  let fakePrisma: InMemoryPrismaService;
  let rateLimitGuard: RateLimitGuard;
  let totpService: TotpService;

  beforeAll(async () => {
    fakePrisma = new InMemoryPrismaService();
    fakePrisma.seedDefaultLocations();
    fakePrisma.seedDefaultCategories();
    fakePrisma.seedInitialCommissionRule();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    await app.init();

    rateLimitGuard = moduleRef.get(RateLimitGuard);
    totpService = moduleRef.get(TotpService);
  });

  beforeEach(() => {
    rateLimitGuard.clearAll();
  });

  afterAll(async () => {
    await app.close();
  });

  it("keeps Subscriptions & 5 differentiators OFF by default, toggles via Admin, and verifies Demand Board, Flash Coupons, Voice Notes, Handover PIN & COD Shield", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const district = fakePrisma.districts[0]!;
    const zone = district.areaZones[0]!;
    const productCat = fakePrisma.categories.find((c) => c.applicableTo === "PRODUCT")!;

    // 1. Default Feature Flags Check
    const initialFlagsRes = await request(server)
      .get("/api/v1/features")
      .expect(200);
    const initialFlags = FeatureFlagsMapSchema.parse(initialFlagsRes.body.data);
    expect(initialFlags.shopping_messenger_enabled).toBe(true);
    expect(initialFlags.seller_subscriptions_enabled).toBe(false);
    expect(initialFlags.buyer_requests_board_enabled).toBe(false);
    expect(initialFlags.handover_pin_enabled).toBe(false);
    expect(initialFlags.flash_deals_coupons_enabled).toBe(false);
    expect(initialFlags.messenger_voice_notes_enabled).toBe(false);
    expect(initialFlags.cod_refusal_shield_enabled).toBe(false);

    // Register actors
    const admin = await registerUser(server, "ffadmin@saudavo.pk", "Saudavo Admin");
    fakePrisma.grantRole(admin.userId, "ADMIN");
    const mfaSecret = totpService.generateBase32Secret();
    fakePrisma.setMfaSecret(admin.userId, encryptMfaSecret(mfaSecret));
    await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", [admin.cookie])
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ code: totpService.generateCode(mfaSecret) })
      .expect(200);

    const seller = await registerUser(server, "ffseller@saudavo.pk", "Khan Store");
    const buyer = await registerUser(server, "ffbuyer@saudavo.pk", "Bilal Buyer");

    const onboardRes = await request(server)
      .post("/api/v1/seller/onboarding")
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        sellerType: "LOCAL_SHOP",
        store: {
          displayName: "Khan Electronics Mianwali",
          slug: "khan-electronics-ff",
          districtId: district.id,
          serviceAreaZoneIds: [zone.id],
          defaultDeliveryFeePaisa: 10_000
        }
      })
      .expect(201);
    const sellerProfileId = onboardRes.body.data.sellerProfileId as string;
    const storeId = onboardRes.body.data.store.id as string;

    await request(server)
      .post(`/api/v1/admin/sellers/${sellerProfileId}/approve`)
      .set("Cookie", [admin.cookie])
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ decisionNote: "Approved store" })
      .expect(200);

    // 2. While seller_subscriptions_enabled === false, seller can create 6+ products with ZERO plan limit block
    let createdProductId = "";
    for (let i = 1; i <= 6; i += 1) {
      const pRes = await request(server)
        .post("/api/v1/seller/products")
        .set("Cookie", [seller.cookie])
        .set("X-CSRF-Token", seller.csrfToken)
        .send({
          categoryId: productCat.id,
          title: `Unlimited Beta Product #${i}`,
          description: "Free launch mode in Mianwali without subscription cap.",
          basePricePaisa: 200_000,
          stockQuantity: 10,
          deliveryEnabled: true,
          pickupEnabled: true
        })
        .expect(201);
      createdProductId = pRes.body.data.id as string;
      await request(server)
        .post(`/api/v1/admin/listings/${createdProductId}/approve`)
        .set("Cookie", [admin.cookie])
        .set("X-CSRF-Token", admin.csrfToken)
        .send({ listingType: "PRODUCT", notes: "Live" })
        .expect(200);
    }

    // 3. Disabled differentiator endpoints cleanly fail with FEATURE_DISABLED (403)
    const disabledDemandRes = await request(server)
      .get("/api/v1/demands")
      .expect(403);
    expect(disabledDemandRes.body.error.code).toBe("FEATURE_DISABLED");

    // 4. Admin enables all 5 differentiators via 1-Click PATCH endpoint
    for (const flagKey of [
      "buyer_requests_board_enabled",
      "messenger_voice_notes_enabled",
      "handover_pin_enabled",
      "flash_deals_coupons_enabled",
      "cod_refusal_shield_enabled"
    ] as const) {
      await request(server)
        .patch(`/api/v1/admin/features/${flagKey}`)
        .set("Cookie", [admin.cookie])
        .set("X-CSRF-Token", admin.csrfToken)
        .send({ isEnabled: true, reason: `Rollout ${flagKey}` })
        .expect(200);
    }
    expect(
      fakePrisma.adminAuditLogs.some((a) => a.action === "FEATURE_FLAG_UPDATED")
    ).toBe(true);

    // 5. Buyer Demand Board -> Seller replies in Messenger -> Buyer marks Fulfilled
    const demandRes = await request(server)
      .post("/api/v1/demands")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        districtId: district.id,
        areaZoneId: zone.id,
        categoryId: productCat.id,
        title: "Need 12V Tubular Solar Battery in Mianwali",
        description: "Looking for original brand with local delivery.",
        budgetMaxPaisa: 4_500_000
      })
      .expect(201);
    const demand = BuyerRequestDtoSchema.parse(demandRes.body.data);

    const respondRes = await request(server)
      .post(`/api/v1/demands/${demand.id}/respond`)
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        message: "Available in stock at Rs. 42,500 delivered today.",
        productId: createdProductId
      })
      .expect(200);
    const convId = respondRes.body.data.conversation.id as string;
    expect(respondRes.body.data.demand.responsesCount).toBe(1);

    await request(server)
      .patch(`/api/v1/demands/${demand.id}/close`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({ status: "FULFILLED" })
      .expect(200);

    // 6. Voice Note in Messenger (audio/webm magic bytes 1a45dfa3)
    const voicePresign = await request(server)
      .post("/api/v1/media/upload-url")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        purpose: "CHAT_VOICE_NOTE",
        mimeType: "audio/webm",
        sizeBytes: 12000,
        fileName: "urdu-note.webm"
      })
      .expect(201);
    const voiceAssetId = voicePresign.body.data.asset.id as string;

    await request(server)
      .post(`/api/v1/media/${voiceAssetId}/confirm`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        exifStripped: true,
        magicBytesHex: "1a45dfa39f428681"
      })
      .expect(200);

    const voiceMsgRes = await request(server)
      .post(`/api/v1/messenger/conversations/${convId}/messages`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        body: "Urdu voice note",
        mediaAssetId: voiceAssetId,
        voiceDurationSec: 7
      })
      .expect(201);
    expect(voiceMsgRes.body.data.messageType).toBe("VOICE_NOTE");
    expect(voiceMsgRes.body.data.voiceDurationSec).toBe(7);
    expect(voiceMsgRes.body.data.voiceReadUrl).toContain("voice/");

    // 7. Store Flash Deal & Coupon (10% off = 1000 bps) -> integer paisa checkout quote + order
    const dealRes = await request(server)
      .post("/api/v1/seller/deals")
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        title: "Mianwali Winter Promo",
        code: "MIANWALI10",
        discountType: "PERCENT_BPS",
        discountValue: 1000,
        minOrderPaisa: 50_000,
        isFlashDeal: true,
        durationHours: 24
      })
      .expect(201);
    PromoDealDtoSchema.parse(dealRes.body.data);

    const addrRes = await request(server)
      .post("/api/v1/customer/addresses")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        label: "Home",
        districtId: district.id,
        areaZoneId: zone.id,
        recipientName: "Bilal",
        recipientPhone: "03001234567",
        streetAddress: "Mohallah Muslim Bazar, Mianwali",
        isDefault: true
      })
      .expect(201);
    const addressId = addrRes.body.data.id as string;

    await request(server)
      .post("/api/v1/cart/items")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({ productId: createdProductId, quantity: 1 })
      .expect(201);

    const quoteRes = await request(server)
      .post("/api/v1/checkout/quote")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        storeId,
        fulfilmentMode: "SELLER_DELIVERY",
        addressId,
        couponCode: "MIANWALI10"
      })
      .expect(200);
    // 200_000 * 10% = 20_000 discount + 10_000 delivery = 190_000 total
    expect(quoteRes.body.data.discountPaisa).toBe(20_000);
    expect(quoteRes.body.data.totalPaisa).toBe(190_000);

    const orderRes = await request(server)
      .post("/api/v1/orders")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .set("Idempotency-Key", "idem_ff_order_1")
      .send({
        storeId,
        fulfilmentMode: "SELLER_DELIVERY",
        addressId,
        paymentMethod: "COD",
        couponCode: "MIANWALI10"
      })
      .expect(201);
    const orderId = orderRes.body.data.orderId as string;

    // 8. 4-Digit Handover PIN flow (generated on READY_FOR_DISPATCH, visible ONLY to buyer, enforced on DELIVERED)
    await request(server)
      .post(`/api/v1/seller/orders/${orderId}/confirm`)
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({})
      .expect(200);

    const readySellerRes = await request(server)
      .post(`/api/v1/seller/orders/${orderId}/status`)
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({ toStatus: "READY_FOR_DISPATCH" })
      .expect(200);
    // Security: Seller must NEVER receive the buyer's handover PIN
    expect(readySellerRes.body.data.delivery.handoverPin).toBeNull();

    const buyerOrderRes = await request(server)
      .get(`/api/v1/orders/${orderId}`)
      .set("Cookie", [buyer.cookie])
      .expect(200);
    const handoverPin = buyerOrderRes.body.data.delivery.handoverPin as string;
    expect(handoverPin).toMatch(/^\d{4}$/);

    // Wrong PIN fails
    await request(server)
      .post(`/api/v1/seller/orders/${orderId}/status`)
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({ toStatus: "DELIVERED", handoverPin: "0000" })
      .expect(400);

    // Exact Buyer PIN succeeds
    const deliveredRes = await request(server)
      .post(`/api/v1/seller/orders/${orderId}/status`)
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({ toStatus: "DELIVERED", handoverPin })
      .expect(200);
    expect(deliveredRes.body.data.status).toBe("DELIVERED");
    expect(deliveredRes.body.data.delivery.handoverPinVerifiedAt).toBeTruthy();

    // 9. COD Refusal Shield: Seller enables requireCleanCodHistory; buyer with 2 refused CODs is blocked on SELLER_DELIVERY but allowed CUSTOMER_PICKUP
    await request(server)
      .patch("/api/v1/seller/store")
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({ requireCleanCodHistory: true })
      .expect(200);

    fakePrisma.orders.push(
      {
        ...fakePrisma.orders[0]!,
        id: "0193a8b2-0000-7000-8000-999999999901",
        orderNumber: "ORD-REF-1",
        customerId: buyer.userId,
        paymentMethod: "COD",
        codCollectionStatus: "FAILED_REFUSED"
      },
      {
        ...fakePrisma.orders[0]!,
        id: "0193a8b2-0000-7000-8000-999999999902",
        orderNumber: "ORD-REF-2",
        customerId: buyer.userId,
        paymentMethod: "COD",
        codCollectionStatus: "FAILED_REFUSED"
      }
    );

    await request(server)
      .post("/api/v1/cart/items")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({ productId: createdProductId, quantity: 1 })
      .expect(201);

    await request(server)
      .post("/api/v1/orders")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .set("Idempotency-Key", "idem_shield_delivery_blocked")
      .send({
        storeId,
        fulfilmentMode: "SELLER_DELIVERY",
        addressId,
        paymentMethod: "COD"
      })
      .expect(403);

    await request(server)
      .post("/api/v1/orders")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .set("Idempotency-Key", "idem_shield_pickup_ok")
      .send({
        storeId,
        fulfilmentMode: "CUSTOMER_PICKUP",
        paymentMethod: "COD"
      })
      .expect(201);
  });
});
