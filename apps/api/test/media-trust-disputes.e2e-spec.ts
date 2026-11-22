import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  AuthSessionResponseSchema,
  CommissionSummaryDtoSchema,
  DisputeDtoSchema,
  PresignedUploadDtoSchema,
  ReviewDtoSchema
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

describe("Media Presigned Upload, Reviews, Reports, Disputes & Commission Reversal (e2e)", () => {
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

  it("validates S3 media presigned uploads, magic bytes & EXIF stripping, verified reviews, reports, and dispute refunds with commission reversal", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const district = fakePrisma.districts[0]!;
    const zone = district.areaZones[0]!;
    const productCat = fakePrisma.categories.find(
      (c) => c.slug === "handicrafts-embroidery"
    )!;

    const customer = await registerUser(
      server,
      "buyer-m6@saudavo.pk",
      "Nadia Buyer"
    );
    const seller = await registerUser(
      server,
      "seller-m6@saudavo.pk",
      "Kamran Weaver"
    );
    const otherSeller = await registerUser(
      server,
      "other-seller-m6@saudavo.pk",
      "Other Seller"
    );
    const moderator = await registerUser(
      server,
      "mod-m6@saudavo.pk",
      "Mod Staff"
    );
    const superAdmin = await registerUser(
      server,
      "super-m6@saudavo.pk",
      "Super Admin"
    );

    const modSecret = totpService.generateBase32Secret();
    fakePrisma.grantRole(moderator.userId, "MODERATOR");
    fakePrisma.setMfaSecret(moderator.userId, encryptMfaSecret(modSecret));

    const superSecret = totpService.generateBase32Secret();
    fakePrisma.grantRole(superAdmin.userId, "SUPER_ADMIN");
    fakePrisma.setMfaSecret(superAdmin.userId, encryptMfaSecret(superSecret));

    await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", moderator.cookie)
      .set("X-CSRF-Token", moderator.csrfToken)
      .send({ code: totpService.generateCode(modSecret) })
      .expect(200);

    await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", superAdmin.cookie)
      .set("X-CSRF-Token", superAdmin.csrfToken)
      .send({ code: totpService.generateCode(superSecret) })
      .expect(200);

    // 1. Onboard & approve Seller + Other Seller
    const onboardSeller = await request(server)
      .post("/api/v1/seller/onboarding")
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        sellerType: "LOCAL_SHOP",
        store: {
          displayName: "Mianwali Loom Craft",
          slug: "mianwali-loom-m6",
          districtId: district.id,
          serviceAreaZoneIds: [zone.id],
          defaultDeliveryFeePaisa: 10_000
        }
      })
      .expect(201);

    const onboardOther = await request(server)
      .post("/api/v1/seller/onboarding")
      .set("Cookie", otherSeller.cookie)
      .set("X-CSRF-Token", otherSeller.csrfToken)
      .send({
        sellerType: "LOCAL_SHOP",
        store: {
          displayName: "Other Craft",
          slug: "other-craft-m6",
          districtId: district.id,
          serviceAreaZoneIds: [zone.id]
        }
      })
      .expect(201);

    await request(server)
      .post(`/api/v1/admin/sellers/${onboardSeller.body.data.sellerProfileId}/approve`)
      .set("Cookie", moderator.cookie)
      .set("X-CSRF-Token", moderator.csrfToken)
      .send({})
      .expect(200);

    await request(server)
      .post(`/api/v1/admin/sellers/${onboardOther.body.data.sellerProfileId}/approve`)
      .set("Cookie", moderator.cookie)
      .set("X-CSRF-Token", moderator.csrfToken)
      .send({})
      .expect(200);

    // 2. Media Presigned Upload Flow + Magic Byte & EXIF Guard
    // Reject non-image MIME type
    await request(server)
      .post("/api/v1/media/upload-url")
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        purpose: "PRODUCT_IMAGE",
        mimeType: "image/svg+xml",
        sizeBytes: 1024
      })
      .expect(400);

    const presignRes = await request(server)
      .post("/api/v1/media/upload-url")
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        purpose: "PRODUCT_IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 250_000
      })
      .expect(201);

    const uploadPayload = PresignedUploadDtoSchema.parse(presignRes.body.data);
    expect(uploadPayload.uploadUrl).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");

    // Reject if exifStripped=false
    await request(server)
      .post(`/api/v1/media/${uploadPayload.asset.id}/confirm`)
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .send({ exifStripped: false, magicBytesHex: "ffd8ffe00010" })
      .expect(400);

    // Reject spoofed magic bytes (PNG signature for declared JPEG)
    await request(server)
      .post(`/api/v1/media/${uploadPayload.asset.id}/confirm`)
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .send({ exifStripped: true, magicBytesHex: "89504e470d0a1a0a" })
      .expect(400);

    // Valid JPEG confirm -> READY
    const confirmedMedia = await request(server)
      .post(`/api/v1/media/${uploadPayload.asset.id}/confirm`)
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .send({ exifStripped: true, magicBytesHex: "ffd8ffe00010" })
      .expect(200);
    expect(confirmedMedia.body.data.status).toBe("READY");

    // Cross-seller cannot read Seller's private asset URL -> 404
    await request(server)
      .get(`/api/v1/media/${uploadPayload.asset.id}/signed-url`)
      .set("Cookie", otherSeller.cookie)
      .expect(404);

    const readUrlRes = await request(server)
      .get(`/api/v1/media/${uploadPayload.asset.id}/signed-url`)
      .set("Cookie", seller.cookie)
      .expect(200);
    expect(readUrlRes.body.data.readUrl).toContain("X-Amz-Signature=");

    // 3. Configure 5% commission rule & complete a COD order for review + dispute reversal tests
    await request(server)
      .post("/api/v1/admin/commission-rules")
      .set("Cookie", superAdmin.cookie)
      .set("X-CSRF-Token", superAdmin.csrfToken)
      .send({
        name: "5% Physical Rule",
        scopeType: "ORDER_TYPE",
        orderType: "PHYSICAL",
        rateBps: 500
      })
      .expect(201);

    // Other seller cannot attach Seller's READY mediaAsset -> 400
    await request(server)
      .post("/api/v1/seller/products")
      .set("Cookie", otherSeller.cookie)
      .set("X-CSRF-Token", otherSeller.csrfToken)
      .send({
        categoryId: productCat.id,
        title: "Hijacked Image Item",
        description: "Attempt to link another store asset.",
        basePricePaisa: 100_000,
        stockQuantity: 1,
        mediaAssetIds: [uploadPayload.asset.id]
      })
      .expect(400);

    const prodRes = await request(server)
      .post("/api/v1/seller/products")
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        categoryId: productCat.id,
        title: "Embroidered Cotton Rug",
        description: "Handwoven local rug from Mianwali weavers.",
        basePricePaisa: 200_000,
        stockQuantity: 5,
        mediaAssetIds: [uploadPayload.asset.id]
      })
      .expect(201);
    expect(prodRes.body.data.images).toHaveLength(1);
    expect(prodRes.body.data.images[0].mediaAssetId).toBe(uploadPayload.asset.id);
    expect(prodRes.body.data.images[0].isPrimary).toBe(true);

    // Public image URL blocked while product is still PENDING_REVIEW -> 404
    await request(server)
      .get(
        `/api/v1/products/${prodRes.body.data.slug}/images/${uploadPayload.asset.id}/signed-url`
      )
      .expect(404);

    await request(server)
      .post(`/api/v1/admin/listings/${prodRes.body.data.id}/approve`)
      .set("Cookie", moderator.cookie)
      .set("X-CSRF-Token", moderator.csrfToken)
      .send({ listingType: "PRODUCT" })
      .expect(200);

    // Public image URL succeeds once approved ACTIVE -> 200
    const publicImgRes = await request(server)
      .get(
        `/api/v1/products/${prodRes.body.data.slug}/images/${uploadPayload.asset.id}/signed-url`
      )
      .expect(200);
    expect(publicImgRes.body.data.readUrl).toContain("X-Amz-Signature=");

    const addrRes = await request(server)
      .post("/api/v1/customer/addresses")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({
        districtId: district.id,
        areaZoneId: zone.id,
        recipientName: "Nadia Buyer",
        recipientPhone: "03009998877",
        streetAddress: "Street 9, Mianwali"
      })
      .expect(201);

    await request(server)
      .post("/api/v1/cart/items")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({ productId: prodRes.body.data.id, quantity: 1 })
      .expect(201);

    const orderRes = await request(server)
      .post("/api/v1/orders")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .set("Idempotency-Key", "idem_m6_order_1")
      .send({
        storeId: onboardSeller.body.data.store.id,
        fulfilmentMode: "SELLER_DELIVERY",
        addressId: addrRes.body.data.id
      })
      .expect(201);
    const orderId = orderRes.body.data.orderId as string;

    await request(server)
      .post(`/api/v1/seller/orders/${orderId}/confirm`)
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .send({})
      .expect(200);
    await request(server)
      .post(`/api/v1/seller/orders/${orderId}/status`)
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .send({ toStatus: "READY_FOR_DISPATCH" })
      .expect(200);
    await request(server)
      .post(`/api/v1/seller/orders/${orderId}/status`)
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .send({ toStatus: "DELIVERED" })
      .expect(200);
    await request(server)
      .post(`/api/v1/seller/orders/${orderId}/cod-collection`)
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .set("Idempotency-Key", "idem_m6_cod_1")
      .send({
        collectionStatus: "COLLECTED",
        collectedAmountPaisa: 210_000
      })
      .expect(200);

    const orderDetail = await request(server)
      .get(`/api/v1/orders/${orderId}`)
      .set("Cookie", customer.cookie)
      .expect(200);
    const orderItemId = orderDetail.body.data.items[0].id as string;

    // 4. Verified Review + Duplicate Guard + Report & Moderation Hiding
    const reviewRes = await request(server)
      .post(`/api/v1/orders/${orderId}/reviews`)
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({
        orderItemId,
        rating: 5,
        comment: "Excellent craftsmanship and fast delivery!"
      })
      .expect(201);
    const review = ReviewDtoSchema.parse(reviewRes.body.data);

    // Duplicate review on same item rejected -> 409 CONFLICT
    await request(server)
      .post(`/api/v1/orders/${orderId}/reviews`)
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({ orderItemId, rating: 4 })
      .expect(409);

    const pubReviewsBefore = await request(server)
      .get("/api/v1/stores/mianwali-loom-m6/reviews")
      .expect(200);
    expect(pubReviewsBefore.body.data).toHaveLength(1);

    // Report review -> Moderator resolves CONTENT_HIDDEN -> hidden from public reviews
    const reportRes = await request(server)
      .post("/api/v1/reports")
      .set("Cookie", seller.cookie)
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        targetType: "REVIEW",
        targetId: review.id,
        reasonCode: "PRIVACY_VIOLATION",
        details: "Contains customer private landmark details."
      })
      .expect(201);

    await request(server)
      .post(`/api/v1/admin/reports/${reportRes.body.data.id}/resolve`)
      .set("Cookie", moderator.cookie)
      .set("X-CSRF-Token", moderator.csrfToken)
      .send({
        action: "CONTENT_HIDDEN",
        resolutionNote: "Review hidden due to privacy leak."
      })
      .expect(200);

    const pubReviewsAfter = await request(server)
      .get("/api/v1/stores/mianwali-loom-m6/reviews")
      .expect(200);
    expect(pubReviewsAfter.body.data).toHaveLength(0);

    // 5. Dispute + Full Refund Resolution + Immutable COMMISSION_REVERSAL
    const disputeRes = await request(server)
      .post(`/api/v1/orders/${orderId}/disputes`)
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({
        disputeType: "DAMAGED_OR_DEFECTIVE",
        description: "Rug arrived torn along the woven border edge."
      })
      .expect(201);
    const dispute = DisputeDtoSchema.parse(disputeRes.body.data);

    await request(server)
      .post(`/api/v1/admin/disputes/${dispute.id}/resolve`)
      .set("Cookie", moderator.cookie)
      .set("X-CSRF-Token", moderator.csrfToken)
      .send({
        resolutionOutcome: "CANCEL_WITH_FULL_REFUND",
        resolutionNote: "Full offline refund confirmed between parties."
      })
      .expect(200);

    expect(fakePrisma.refunds.some((r) => r.orderId === orderId)).toBe(true);
    const orderLedgers = fakePrisma.commissionLedgers.filter(
      (l) => l.orderId === orderId
    );
    expect(orderLedgers).toHaveLength(2);
    expect(orderLedgers.map((l) => l.entryType)).toEqual([
      "COMMISSION_ACCRUAL",
      "COMMISSION_REVERSAL"
    ]);
    expect(orderLedgers[1]?.commissionPaisa).toBe(-10_000n);
    expect(orderLedgers[1]?.referenceEntryId).toBe(orderLedgers[0]?.id);

    // Seller commission summary balances net out cleanly to 0 accrued
    const summaryRes = await request(server)
      .get("/api/v1/seller/commission-summary")
      .set("Cookie", seller.cookie)
      .expect(200);
    const summary = CommissionSummaryDtoSchema.parse(summaryRes.body.data);
    expect(summary.accruedCommissionPaisa).toBe(0);
    expect(summary.outstandingCommissionOwedPaisa).toBe(0);
  });
});
