import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  ApiErrorEnvelopeSchema,
  AuthSessionResponseSchema,
  CategoriesResponseSchema,
  ModerationQueueResponseSchema,
  SearchResponseSchema,
  SellerOnboardingResponseSchema
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

async function registerAndSession(
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

describe("OpenAPI, Seller Onboarding, Catalog, Public Discovery & Moderation (e2e)", () => {
  let app: INestApplication;
  let fakePrisma: InMemoryPrismaService;
  let rateLimitGuard: RateLimitGuard;
  let totpService: TotpService;

  beforeAll(async () => {
    fakePrisma = new InMemoryPrismaService();
    fakePrisma.seedDefaultLocations();
    fakePrisma.seedDefaultCategories();

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

  it("exposes OpenAPI 3.1 spec and public categories", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const specRes = await request(server).get("/api/v1/openapi.json").expect(200);
    expect(specRes.body.openapi).toBe("3.1.0");
    expect(specRes.body.paths["/seller/onboarding"]).toBeDefined();
    expect(specRes.body.paths["/admin/review-queue"]).toBeDefined();

    const catRes = await request(server)
      .get("/api/v1/categories?applicableTo=PRODUCT")
      .expect(200);
    const parsedCats = CategoriesResponseSchema.parse(catRes.body);
    expect(parsedCats.data.map((c) => c.slug)).toEqual([
      "handicrafts-embroidery",
      "tailoring-custom-work"
    ]);
  });

  it("runs complete seller onboarding, privacy projection, moderation approval, slug auto-suffix, IDOR protection, and suspension", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const district = fakePrisma.districts[0];
    const mianwaliZone = district?.areaZones.find(
      (z) => z.slug === "mianwali-tehsil"
    );
    const isakhelZone = district?.areaZones.find(
      (z) => z.slug === "isakhel-tehsil"
    );
    const productCategory = fakePrisma.categories.find(
      (c) => c.slug === "handicrafts-embroidery"
    );
    const serviceCategory = fakePrisma.categories.find(
      (c) => c.slug === "design-digital-services"
    );
    expect(district).toBeDefined();
    expect(mianwaliZone).toBeDefined();
    expect(isakhelZone).toBeDefined();
    expect(productCategory).toBeDefined();
    expect(serviceCategory).toBeDefined();

    const sellerA = await registerAndSession(
      server,
      "seller-a@saudavo.pk",
      "Ayesha Crafts"
    );
    const sellerB = await registerAndSession(
      server,
      "seller-b@saudavo.pk",
      "Bilal Studio"
    );
    const adminUser = await registerAndSession(
      server,
      "mod-admin@saudavo.pk",
      "Saudavo Admin"
    );

    // Grant ADMIN role & MFA to adminUser
    const totpSecret = totpService.generateBase32Secret();
    fakePrisma.grantRole(adminUser.userId, "ADMIN");
    fakePrisma.setMfaSecret(adminUser.userId, encryptMfaSecret(totpSecret));

    // Seller A submits onboarding with opt-out public contact defaults
    const onboardingRes = await request(server)
      .post("/api/v1/seller/onboarding")
      .set("Cookie", sellerA.cookie)
      .set("X-CSRF-Token", sellerA.csrfToken)
      .send({
        sellerType: "HOME_MAKER",
        store: {
          displayName: "Mianwali Handloom & Embroidery",
          slug: "mianwali-handloom",
          description: "Traditional hand-embroidered shawls in Mianwali.",
          districtId: district!.id,
          serviceAreaZoneIds: [mianwaliZone!.id, isakhelZone!.id],
          defaultDeliveryFeePaisa: 15000
        }
      })
      .expect(201);

    const parsedOnboard = SellerOnboardingResponseSchema.parse(onboardingRes.body);
    expect(parsedOnboard.data.verificationStatus).toBe("PENDING_REVIEW");
    expect(parsedOnboard.data.store.status).toBe("PENDING_REVIEW");

    // Store is NOT publicly visible before moderation approval
    await request(server)
      .get("/api/v1/stores/mianwali-handloom")
      .expect(404);

    // Unapproved Seller A cannot create catalog items -> 403 FORBIDDEN
    const unapprovedCreate = await request(server)
      .post("/api/v1/seller/products")
      .set("Cookie", sellerA.cookie)
      .set("X-CSRF-Token", sellerA.csrfToken)
      .send({
        categoryId: productCategory!.id,
        title: "Handmade Phulkari Shawl",
        description: "Authentic hand-stitched Phulkari shawl from Mianwali.",
        basePricePaisa: 350_000,
        stockQuantity: 10
      })
      .expect(403);
    expect(ApiErrorEnvelopeSchema.parse(unapprovedCreate.body).error.code).toBe(
      "FORBIDDEN"
    );

    // Admin without MFA cannot inspect review queue or approve seller -> 403 MFA_REQUIRED
    const mfaBlocked = await request(server)
      .get("/api/v1/admin/review-queue")
      .set("Cookie", adminUser.cookie)
      .expect(403);
    expect(ApiErrorEnvelopeSchema.parse(mfaBlocked.body).error.code).toBe(
      "MFA_REQUIRED"
    );

    // Admin verifies MFA
    await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", adminUser.cookie)
      .set("X-CSRF-Token", adminUser.csrfToken)
      .send({ code: totpService.generateCode(totpSecret) })
      .expect(200);

    // Review queue now returns Seller A pending
    const queueRes = await request(server)
      .get("/api/v1/admin/review-queue")
      .set("Cookie", adminUser.cookie)
      .expect(200);
    const parsedQueue = ModerationQueueResponseSchema.parse(queueRes.body);
    expect(
      parsedQueue.data.sellers.some(
        (s) => s.sellerProfileId === parsedOnboard.data.sellerProfileId
      )
    ).toBe(true);

    // Reject without proper reason fails validation -> 400
    await request(server)
      .post(`/api/v1/admin/sellers/${parsedOnboard.data.sellerProfileId}/reject`)
      .set("Cookie", adminUser.cookie)
      .set("X-CSRF-Token", adminUser.csrfToken)
      .send({ reason: "No" })
      .expect(400);

    // Admin approves Seller A & activates Store
    const approveSellerRes = await request(server)
      .post(`/api/v1/admin/sellers/${parsedOnboard.data.sellerProfileId}/approve`)
      .set("Cookie", adminUser.cookie)
      .set("X-CSRF-Token", adminUser.csrfToken)
      .send({ notes: "Verified Mianwali craft artisan" })
      .expect(200);
    expect(approveSellerRes.body.data.storeActivated).toBe(true);
    expect(
      fakePrisma.adminAuditLogs.some(
        (a) =>
          a.action === "SELLER_APPROVED" &&
          a.targetId === parsedOnboard.data.sellerProfileId
      )
    ).toBe(true);

    // Privacy check: Store public endpoint omits phone & address by default
    const publicStoreBeforeContact = await request(server)
      .get("/api/v1/stores/mianwali-handloom")
      .expect(200);
    expect(publicStoreBeforeContact.body.data.publicContactPhone).toBeNull();
    expect(publicStoreBeforeContact.body.data.publicBusinessAddress).toBeNull();
    expect(publicStoreBeforeContact.body.data.serviceAreas).toHaveLength(2);

    // Seller B also onboards & gets approved
    const onboardB = await request(server)
      .post("/api/v1/seller/onboarding")
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({
        sellerType: "SERVICE_PROVIDER",
        store: {
          displayName: "Bilal Studio",
          slug: "bilal-studio",
          districtId: district!.id,
          serviceAreaZoneIds: [mianwaliZone!.id]
        }
      })
      .expect(201);

    await request(server)
      .post(
        `/api/v1/admin/sellers/${onboardB.body.data.sellerProfileId}/approve`
      )
      .set("Cookie", adminUser.cookie)
      .set("X-CSRF-Token", adminUser.csrfToken)
      .send({})
      .expect(200);

    // Approved Seller A creates Product 1 & colliding Product 2 (PQ-16 auto-suffix)
    const prod1Res = await request(server)
      .post("/api/v1/seller/products")
      .set("Cookie", sellerA.cookie)
      .set("X-CSRF-Token", sellerA.csrfToken)
      .send({
        categoryId: productCategory!.id,
        title: "Handmade Phulkari Shawl",
        description: "Authentic hand-stitched Phulkari shawl from Mianwali.",
        basePricePaisa: 350_000,
        stockQuantity: 10,
        variants: [
          {
            sku: "PHUL-MAROON-M",
            title: "Maroon Medium",
            optionValuesJson: { color: "Maroon", size: "M" },
            pricePaisa: 350_000,
            stockQuantity: 5
          }
        ]
      })
      .expect(201);
    expect(prod1Res.body.data.slug).toBe("handmade-phulkari-shawl");

    const prod2Res = await request(server)
      .post("/api/v1/seller/products")
      .set("Cookie", sellerA.cookie)
      .set("X-CSRF-Token", sellerA.csrfToken)
      .send({
        categoryId: productCategory!.id,
        title: "Handmade Phulkari Shawl",
        description: "Second edition Phulkari shawl with gold thread embroidery.",
        basePricePaisa: 420_000,
        stockQuantity: 4
      })
      .expect(201);
    expect(prod2Res.body.data.slug).toBe("handmade-phulkari-shawl-2");

    // Seller B creates REMOTE service listing
    const svcRes = await request(server)
      .post("/api/v1/seller/services")
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({
        categoryId: serviceCategory!.id,
        title: "Shop Logo Design Package",
        description: "Bespoke bilingual brand identity for local businesses.",
        serviceMode: "REMOTE",
        requirementsPrompt: "Share your shop name and preferred colors.",
        packages: [
          {
            tierName: "Standard",
            description: "Logo + vector source files",
            pricePaisa: 500_000,
            deliveryEstimateDays: 3,
            maxRevisions: 2
          }
        ]
      })
      .expect(201);
    expect(svcRes.body.data.serviceMode).toBe("REMOTE");

    // Cross-seller IDOR protection: Seller B cannot update or delete Seller A's product
    await request(server)
      .patch(`/api/v1/seller/products/${prod1Res.body.data.id}`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({ basePricePaisa: 100 })
      .expect(404);

    await request(server)
      .delete(`/api/v1/seller/products/${prod1Res.body.data.id}`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .expect(404);

    // Unapproved listings are NOT exposed in public endpoints yet
    await request(server)
      .get("/api/v1/products/handmade-phulkari-shawl")
      .expect(404);

    // Admin approves Product 1 & Service 1
    await request(server)
      .post(`/api/v1/admin/listings/${prod1Res.body.data.id}/approve`)
      .set("Cookie", adminUser.cookie)
      .set("X-CSRF-Token", adminUser.csrfToken)
      .send({ listingType: "PRODUCT" })
      .expect(200);

    await request(server)
      .post(`/api/v1/admin/listings/${svcRes.body.data.id}/approve`)
      .set("Cookie", adminUser.cookie)
      .set("X-CSRF-Token", adminUser.csrfToken)
      .send({ listingType: "SERVICE" })
      .expect(200);

    // Public endpoints & search now expose approved listings cleanly
    const pubProduct = await request(server)
      .get("/api/v1/products/handmade-phulkari-shawl")
      .expect(200);
    expect(pubProduct.body.data.basePricePaisa).toBe(350_000);
    expect(pubProduct.body.data.store.publicBusinessAddress).toBeNull();

    const pubService = await request(server)
      .get(`/api/v1/services/${svcRes.body.data.slug}`)
      .expect(200);
    expect(pubService.body.data.serviceMode).toBe("REMOTE");

    const searchAll = await request(server)
      .get(`/api/v1/search?districtId=${district!.id}&areaZoneId=${isakhelZone!.id}&sort=PRICE_ASC&minPrice=100000`)
      .expect(200);
    const parsedSearch = SearchResponseSchema.parse(searchAll.body);
    // Only Seller A serves Isakhel; Seller B only serves Mianwali
    expect(parsedSearch.data).toHaveLength(1);
    expect(parsedSearch.data[0]?.slug).toBe("handmade-phulkari-shawl");
    expect(parsedSearch.data[0]?.store.privacyProtected).toBe(true);

    // Public Store Catalog endpoint returns store details + active products/services
    const storeCatalogRes = await request(server)
      .get("/api/v1/stores/mianwali-handloom/listings")
      .expect(200);
    expect(storeCatalogRes.body.data.store.slug).toBe("mianwali-handloom");
    expect(storeCatalogRes.body.data.products).toHaveLength(1);
    expect(storeCatalogRes.body.data.services).toHaveLength(0);

    const storeBCatalogRes = await request(server)
      .get(`/api/v1/stores/${pubService.body.data.store.slug as string}/listings`)
      .expect(200);
    expect(storeBCatalogRes.body.data.services).toHaveLength(1);

    // Seller A received real in-app notifications for approval events
    const sellerNotifs = await request(server)
      .get("/api/v1/notifications")
      .set("Cookie", sellerA.cookie)
      .expect(200);
    expect(sellerNotifs.body.meta.unreadCount).toBeGreaterThanOrEqual(2);

    // Admin suspends Seller A's store -> immediately disappears from public endpoints
    await request(server)
      .post(`/api/v1/admin/stores/${parsedOnboard.data.store.id}/suspend`)
      .set("Cookie", adminUser.cookie)
      .set("X-CSRF-Token", adminUser.csrfToken)
      .send({ reason: "Policy audit hold during verification check." })
      .expect(200);

    await request(server)
      .get("/api/v1/stores/mianwali-handloom")
      .expect(404);
    await request(server)
      .get("/api/v1/products/handmade-phulkari-shawl")
      .expect(404);

    const searchAfterSuspend = await request(server)
      .get(`/api/v1/search?districtId=${district!.id}&areaZoneId=${isakhelZone!.id}`)
      .expect(200);
    expect(SearchResponseSchema.parse(searchAfterSuspend.body).data).toHaveLength(0);
  });
});
