import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  AuthSessionResponseSchema,
  ConversationSummaryDtoSchema,
  OrderCreatedSummarySchema,
  PublicStoreDtoSchema,
  ReportDtoSchema,
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

describe("Phase A & B: Privacy Contact Shield, Chat Safety, Service Quotes, Photo Reviews & Store Follow (e2e)", () => {
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

  it("enforces privacy shield, conversation block/report, service quotes, trust metrics, store follow, and photo reviews", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const district = fakePrisma.districts[0]!;
    const zone = district.areaZones[0]!;
    const svcCat = fakePrisma.categories.find(
      (c) => c.applicableTo === "SERVICE"
    )!;

    const admin = await registerUser(server, "padmin@saudavo.pk", "Admin");
    fakePrisma.grantRole(admin.userId, "ADMIN");
    const mfaSecret = totpService.generateBase32Secret();
    fakePrisma.setMfaSecret(admin.userId, encryptMfaSecret(mfaSecret));
    await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", [admin.cookie])
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ code: totpService.generateCode(mfaSecret) })
      .expect(200);

    const seller = await registerUser(server, "pseller@saudavo.pk", "Ali Tailor");
    const buyer = await registerUser(server, "pbuyer@saudavo.pk", "Sana Buyer");

    // 1. Seller onboarding blocks contact leaks & never exposes phone publicly
    await request(server)
      .post("/api/v1/seller/onboarding")
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        sellerType: "SERVICE_PROVIDER",
        store: {
          displayName: "Ali Tailor Studio",
          slug: "ali-tailor-studio",
          description: "Call 03001234567 for fast orders.",
          districtId: district.id,
          serviceAreaZoneIds: [zone.id]
        }
      })
      .expect(400);

    const onboardRes = await request(server)
      .post("/api/v1/seller/onboarding")
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        sellerType: "SERVICE_PROVIDER",
        store: {
          displayName: "Ali Tailor Studio",
          slug: "ali-tailor-studio",
          description: "Custom ladies and gents stitching in Mianwali.",
          districtId: district.id,
          serviceAreaZoneIds: [zone.id],
          showPublicPhone: true,
          publicContactPhone: "+923001234567"
        }
      })
      .expect(201);
    const storeId = onboardRes.body.data.store.id as string;

    const sp = fakePrisma.sellerProfiles.find((s) => s.userId === seller.userId)!;
    await request(server)
      .post(`/api/v1/admin/sellers/${sp.id}/approve`)
      .set("Cookie", [admin.cookie])
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ notes: "Approved" })
      .expect(200);

    // Public store never returns publicContactPhone
    const pubStoreRes = await request(server)
      .get("/api/v1/stores/ali-tailor-studio")
      .expect(200);
    const pubStore = PublicStoreDtoSchema.parse(pubStoreRes.body.data);
    expect(pubStore.publicContactPhone).toBeNull();

    // 2. Customer follows store -> seller listing approval notifies follower
    const followRes = await request(server)
      .post(`/api/v1/stores/${storeId}/follow`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .expect(201);
    expect(followRes.body.data.followerCount).toBe(1);
    expect(followRes.body.data.isFollowing).toBe(true);

    const svcRes = await request(server)
      .post("/api/v1/seller/services")
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        categoryId: svcCat.id,
        title: "Custom Bridal & Eid Stitching",
        description: "Delivered cleanly in Mianwali without delays.",
        serviceMode: "REMOTE",
        packages: [
          {
            tierName: "Standard",
            description: "Full stitching package.",
            pricePaisa: 250_000,
            deliveryEstimateDays: 4,
            maxRevisions: 1
          }
        ]
      })
      .expect(201);
    const serviceListingId = svcRes.body.data.id as string;

    await request(server)
      .post(`/api/v1/admin/listings/${serviceListingId}/approve`)
      .set("Cookie", [admin.cookie])
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ listingType: "SERVICE", notes: "OK" })
      .expect(200);

    const notifRes = await request(server)
      .get("/api/v1/notifications")
      .set("Cookie", [buyer.cookie])
      .expect(200);
    expect(
      (notifRes.body.data as Array<{ eventType: string }>).some(
        (n) => n.eventType === "NEW_LISTING_FROM_FOLLOWED_STORE"
      )
    ).toBe(true);

    // 3. Messenger conversation: blocks phone/email/wa.me leaks, allows clean chat + service custom quote
    const convRes = await request(server)
      .post("/api/v1/messenger/conversations")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        storeId,
        serviceListingId,
        initialMessage: "Assalam-o-Alaikum, what is your stitching turnaround?"
      })
      .expect(201);
    const conv = ConversationSummaryDtoSchema.parse(convRes.body.data);

    for (const leakText of [
      "Call me at 0300-1234567",
      "Email me at test@gmail.com",
      "Message https://wa.me/923001234567",
      "Transfer to PK36SCBL0000001123456702"
    ]) {
      const leakRes = await request(server)
        .post(`/api/v1/messenger/conversations/${conv.id}/messages`)
        .set("Cookie", [buyer.cookie])
        .set("X-CSRF-Token", buyer.csrfToken)
        .send({ body: leakText })
        .expect(400);
      expect(leakRes.body.error.code).toBe("PRIVACY_CONTACT_SHIELD");
    }

    // Seller sends service custom quote -> Buyer accepts -> SERVICE order confirmed
    const quoteRes = await request(server)
      .post(`/api/v1/messenger/conversations/${conv.id}/offers`)
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        serviceListingId,
        unitPricePaisa: 220_000,
        deliveryFeePaisa: 0,
        fulfilmentMode: "CUSTOMER_PICKUP",
        note: "Special Eid discount quote inside Saudavo"
      })
      .expect(201);
    const quoteMsgId = quoteRes.body.data.id as string;

    const acceptRes = await request(server)
      .post(`/api/v1/messenger/conversations/${conv.id}/offers/${quoteMsgId}/accept`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .set("Idempotency-Key", "idem-phase-ab-offer-accept-001")
      .send({ customerNote: "Please stitch with neat piping." })
      .expect(201);
    const createdOrder = OrderCreatedSummarySchema.parse(acceptRes.body.data);
    expect(createdOrder.orderType).toBe("SERVICE");
    expect(createdOrder.status).toBe("CONFIRMED");

    // 4. Seller completes service order & Buyer submits Photo Review
    await request(server)
      .post(`/api/v1/seller/orders/${createdOrder.orderId}/status`)
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({ toStatus: "IN_PROGRESS" })
      .expect(200);
    await request(server)
      .post(`/api/v1/seller/orders/${createdOrder.orderId}/status`)
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        toStatus: "DELIVERY_SUBMITTED",
        deliverySummary: "Ready and stitched cleanly."
      })
      .expect(200);
    await request(server)
      .post(`/api/v1/orders/${createdOrder.orderId}/service/accept-delivery`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .expect(200);
    await request(server)
      .post(`/api/v1/seller/orders/${createdOrder.orderId}/manual-payment-confirmation`)
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .set("Idempotency-Key", "idem-phase-ab-svc-pay-001")
      .send({
        collectionStatus: "COLLECTED",
        collectedAmountPaisa: 220_000,
        manualPaymentMethodDesc: "Cash / direct settlement",
        note: "Manual payment settled"
      })
      .expect(200);

    const fakeReviewPhoto = await fakePrisma.mediaAsset.create({
      data: {
        ownerUserId: buyer.userId,
        storeId: null,
        objectKey: `reviews/${buyer.userId}/photo.webp`,
        mimeType: "image/webp",
        sizeBytes: 12345,
        exifStripped: true,
        status: "READY"
      }
    });

    const revRes = await request(server)
      .post(`/api/v1/orders/${createdOrder.orderId}/reviews`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        rating: 5,
        comment: "Bahut achi stitching hui!",
        mediaAssetId: fakeReviewPhoto.id
      })
      .expect(201);
    const review = ReviewDtoSchema.parse(revRes.body.data);
    expect(review.mediaAssetId).toBe(fakeReviewPhoto.id);

    // Public store now reflects completedOrdersCount >= 1, followerCount >= 1, avgResponseMinutes
    const pubStoreAfter = await request(server)
      .get("/api/v1/stores/ali-tailor-studio")
      .expect(200);
    const storeAfter = PublicStoreDtoSchema.parse(pubStoreAfter.body.data);
    expect(storeAfter.completedOrdersCount).toBe(1);
    expect(storeAfter.followerCount).toBe(1);

    // 5. Block & Report Conversation
    const blockRes = await request(server)
      .post(`/api/v1/messenger/conversations/${conv.id}/block`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({ reason: "Spam messages" })
      .expect(200);
    expect(blockRes.body.data.blockedByBuyer).toBe(true);

    await request(server)
      .post(`/api/v1/messenger/conversations/${conv.id}/messages`)
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({ body: "Hello?" })
      .expect(403);

    const reportRes = await request(server)
      .post(`/api/v1/messenger/conversations/${conv.id}/report`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        reasonCode: "PRIVACY_VIOLATION",
        details: "Asked for off-platform contact details."
      })
      .expect(201);
    const rep = ReportDtoSchema.parse(reportRes.body.data);
    expect(rep.targetType).toBe("CONVERSATION");

    await request(server)
      .post(`/api/v1/messenger/conversations/${conv.id}/unblock`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .expect(200);
  });
});
