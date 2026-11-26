import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  AuthSessionResponseSchema,
  ChatMessageDtoSchema,
  ConversationSummaryDtoSchema,
  OrderCreatedSummarySchema,
  StoreSubscriptionSummaryDtoSchema
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

describe("Saudavo Messenger & Monthly Seller Subscriptions (e2e)", () => {
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

  it("enforces Free Starter limits, approves 30-day PRO_MONTHLY renewal, runs privacy-safe Messenger chat, and converts Custom Offer into COD Order", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const district = fakePrisma.districts[0]!;
    const mianwaliZone = district.areaZones.find((z) => z.slug === "mianwali-tehsil")!;
    const productCat = fakePrisma.categories.find((c) => c.applicableTo === "PRODUCT")!;

    // 1. Public plans endpoint returns seeded plans
    const plansRes = await request(server)
      .get("/api/v1/subscriptions/plans")
      .expect(200);
    expect(plansRes.body.data.length).toBeGreaterThanOrEqual(3);

    // 2. Register Seller, Buyer, Intruder, and Admin
    const seller = await registerUser(server, "subseller@saudavo.pk", "Zainab Crafts");
    const buyer = await registerUser(server, "subbuyer@saudavo.pk", "Hamza Buyer");
    const intruder = await registerUser(server, "intruder@saudavo.pk", "Intruder User");
    const admin = await registerUser(server, "subadmin@saudavo.pk", "Admin Staff");
    fakePrisma.grantRole(admin.userId, "ADMIN");
    const mfaSecret = totpService.generateBase32Secret();
    fakePrisma.setMfaSecret(admin.userId, encryptMfaSecret(mfaSecret));

    await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", [admin.cookie])
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ code: totpService.generateCode(mfaSecret) })
      .expect(200);

    // 3. Onboard & Approve Seller Store
    const onboardRes = await request(server)
      .post("/api/v1/seller/onboarding")
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        sellerType: "HOME_MAKER",
        store: {
          displayName: "Zainab Embroidery Mianwali",
          slug: "zainab-embroidery",
          districtId: district.id,
          serviceAreaZoneIds: [mianwaliZone.id],
          defaultDeliveryFeePaisa: 15000
        }
      })
      .expect(201);

    const sellerProfileId = onboardRes.body.data.sellerProfileId as string;
    const storeId = onboardRes.body.data.store.id as string;

    await request(server)
      .post(`/api/v1/admin/sellers/${sellerProfileId}/approve`)
      .set("Cookie", [admin.cookie])
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ decisionNote: "Approved for beta" })
      .expect(200);

    // 4. Subscriptions start OFF by default; Admin enables them in 1 click, then Seller gets FREE_STARTER (max 5 products)
    const defaultFeaturesRes = await request(server)
      .get("/api/v1/features")
      .expect(200);
    expect(defaultFeaturesRes.body.data.seller_subscriptions_enabled).toBe(false);

    const disabledSubRes = await request(server)
      .get("/api/v1/seller/subscription")
      .set("Cookie", [seller.cookie])
      .expect(403);
    expect(disabledSubRes.body.error.code).toBe("FEATURE_DISABLED");

    await request(server)
      .patch("/api/v1/admin/features/seller_subscriptions_enabled")
      .set("Cookie", [admin.cookie])
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ isEnabled: true, reason: "Enable monthly plans for subscription E2E test" })
      .expect(200);

    const initialSubRes = await request(server)
      .get("/api/v1/seller/subscription")
      .set("Cookie", [seller.cookie])
      .expect(200);
    const initialSub = StoreSubscriptionSummaryDtoSchema.parse(initialSubRes.body.data);
    expect(initialSub.plan.code).toBe("FREE_STARTER");

    let firstProductId = "";
    for (let i = 1; i <= 5; i += 1) {
      const pRes = await request(server)
        .post("/api/v1/seller/products")
        .set("Cookie", [seller.cookie])
        .set("X-CSRF-Token", seller.csrfToken)
        .send({
          categoryId: productCat.id,
          title: `Handcrafted Item ${String(i)}`,
          description: "Authentic handmade Mianwali item crafted cleanly.",
          basePricePaisa: 200_000,
          stockQuantity: 10,
          initialStatus: "PENDING_REVIEW"
        })
        .expect(201);
      if (i === 1) {
        firstProductId = pRes.body.data.id as string;
      }
    }

    // 6th product blocked on FREE_STARTER
    const limitRes = await request(server)
      .post("/api/v1/seller/products")
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        categoryId: productCat.id,
        title: "Blocked Sixth Item",
        description: "Should fail because free tier limit of 5 is reached.",
        basePricePaisa: 200_000,
        stockQuantity: 10
      })
      .expect(403);
    expect(limitRes.body.error.code).toBe("PLAN_LIMIT_REACHED");

    // 5. Submit manual Raast renewal -> Admin approves -> Seller creates 6th product
    const renewRes = await request(server)
      .post("/api/v1/seller/subscription/renewals")
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        planCode: "PRO_MONTHLY",
        paymentMethod: "RAAST_MANUAL",
        transactionReference: "RAAST-MWL-998877",
        payerAccountNote: "Sent from Meezan Bank"
      })
      .expect(201);

    const renewalId = renewRes.body.data.id as string;
    await request(server)
      .post(`/api/v1/admin/subscriptions/renewals/${renewalId}/review`)
      .set("Cookie", [admin.cookie])
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ decision: "APPROVED", reviewNote: "Verified in bank app" })
      .expect(200);

    const upgradedSubRes = await request(server)
      .get("/api/v1/seller/subscription")
      .set("Cookie", [seller.cookie])
      .expect(200);
    expect(upgradedSubRes.body.data.plan.code).toBe("PRO_MONTHLY");

    await request(server)
      .post("/api/v1/seller/products")
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        categoryId: productCat.id,
        title: "Unlocked Sixth Item",
        description: "Now permitted under PRO_MONTHLY 100-product limit.",
        basePricePaisa: 250_000,
        stockQuantity: 10
      })
      .expect(201);

    // Approve first product so buyer can inquire and order it via Messenger
    await request(server)
      .post(`/api/v1/admin/listings/${firstProductId}/approve`)
      .set("Cookie", [admin.cookie])
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ listingType: "PRODUCT" })
      .expect(200);

    // 6. Buyer saves Mianwali address and starts Messenger chat with Seller
    const addrRes = await request(server)
      .post("/api/v1/customer/addresses")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        label: "Home",
        districtId: district.id,
        areaZoneId: mianwaliZone.id,
        recipientName: "Hamza Buyer",
        recipientPhone: "03001112233",
        streetAddress: "Mohallah Mianwali House 7",
        isDefault: true
      })
      .expect(201);
    const addressId = addrRes.body.data.id as string;

    const convRes = await request(server)
      .post("/api/v1/messenger/conversations")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        storeId,
        productId: firstProductId,
        initialMessage: "Assalam-o-Alaikum, kya 2 pieces par thori discount mil sakti hai?"
      })
      .expect(201);

    const conv = ConversationSummaryDtoSchema.parse(convRes.body.data);
    expect(conv.storeVerifiedPro).toBe(true);
    expect(JSON.stringify(conv)).not.toContain("subseller@saudavo.pk");

    // 3rd party intruder blocked from reading messages
    await request(server)
      .get(`/api/v1/messenger/conversations/${conv.id}/messages`)
      .set("Cookie", [intruder.cookie])
      .expect(403);

    // 7. Seller sends Custom COD Offer inside Messenger
    const offerRes = await request(server)
      .post(`/api/v1/messenger/conversations/${conv.id}/offers`)
      .set("Cookie", [seller.cookie])
      .set("X-CSRF-Token", seller.csrfToken)
      .send({
        productId: firstProductId,
        quantity: 2,
        unitPricePaisa: 180_000,
        deliveryFeePaisa: 10_000,
        fulfilmentMode: "SELLER_DELIVERY",
        note: "Special bundle price Rs. 1,800 each"
      })
      .expect(201);
    const offerMsg = ChatMessageDtoSchema.parse(offerRes.body.data);
    expect(offerMsg.offerTotalPaisa).toBe(370_000);

    // 8. Buyer accepts Custom Offer -> COD Order created & stock decremented
    const acceptRes = await request(server)
      .post(`/api/v1/messenger/conversations/${conv.id}/offers/${offerMsg.id}/accept`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .set("Idempotency-Key", "offer-accept-e2e-1")
      .send({ addressId })
      .expect(201);

    const createdOrder = OrderCreatedSummarySchema.parse(acceptRes.body.data);
    expect(createdOrder.status).toBe("CONFIRMED");
    expect(createdOrder.paymentMethod).toBe("COD");
    expect(createdOrder.totalPaisa).toBe(370_000);

    const updatedProduct = fakePrisma.products.find((p) => p.id === firstProductId)!;
    expect(updatedProduct.stockQuantity).toBe(8);

    // Duplicate accept with new idempotency key fails safely (409 CONFLICT)
    await request(server)
      .post(`/api/v1/messenger/conversations/${conv.id}/offers/${offerMsg.id}/accept`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .set("Idempotency-Key", "offer-accept-e2e-2")
      .send({ addressId })
      .expect(409);
  });
});
