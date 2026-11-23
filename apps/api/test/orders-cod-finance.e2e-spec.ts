import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  ApiErrorEnvelopeSchema,
  AuthSessionResponseSchema,
  CartsResponseSchema,
  CommissionSummaryDtoSchema,
  OrderCreatedSummarySchema
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

describe("Cart, Single-Seller COD Checkout, Service Orders, Messaging & Commission Ledger (e2e)", () => {
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

  it("enforces store-scoped carts, self-dealing prevention, idempotent COD checkout, PQ-10 cancellation, PQ-14 remote services, PQ-09 messaging, and PQ-01/02/13/15 commission ledger", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const district = fakePrisma.districts[0]!;
    const mianwaliZone = district.areaZones.find(
      (z) => z.slug === "mianwali-tehsil"
    )!;
    const productCat = fakePrisma.categories.find(
      (c) => c.slug === "handicrafts-embroidery"
    )!;
    const serviceCat = fakePrisma.categories.find(
      (c) => c.slug === "design-digital-services"
    )!;

    // 1. Setup Users: Customer, Seller A, Seller B, Regular Admin, Super Admin, Outsider
    const customer = await registerUser(
      server,
      "buyer-m5@saudavo.pk",
      "Tariq Mahmood"
    );
    const sellerA = await registerUser(
      server,
      "sellera-m5@saudavo.pk",
      "Mianwali Crafts"
    );
    const sellerB = await registerUser(
      server,
      "sellerb-m5@saudavo.pk",
      "Isakhel Digital"
    );
    const outsider = await registerUser(
      server,
      "outsider-m5@saudavo.pk",
      "Random Outsider"
    );
    const admin = await registerUser(
      server,
      "admin-m5@saudavo.pk",
      "Ops Admin"
    );
    const superAdmin = await registerUser(
      server,
      "super-m5@saudavo.pk",
      "Super Admin"
    );

    const adminSecret = totpService.generateBase32Secret();
    fakePrisma.grantRole(admin.userId, "ADMIN");
    fakePrisma.setMfaSecret(admin.userId, encryptMfaSecret(adminSecret));

    const superSecret = totpService.generateBase32Secret();
    fakePrisma.grantRole(superAdmin.userId, "SUPER_ADMIN");
    fakePrisma.setMfaSecret(superAdmin.userId, encryptMfaSecret(superSecret));

    // Verify Admin & SuperAdmin MFA
    await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ code: totpService.generateCode(adminSecret) })
      .expect(200);

    await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", superAdmin.cookie)
      .set("X-CSRF-Token", superAdmin.csrfToken)
      .send({ code: totpService.generateCode(superSecret) })
      .expect(200);

    // 2. Onboard & Approve Seller A + Seller B
    const onboardA = await request(server)
      .post("/api/v1/seller/onboarding")
      .set("Cookie", sellerA.cookie)
      .set("X-CSRF-Token", sellerA.csrfToken)
      .send({
        sellerType: "LOCAL_SHOP",
        store: {
          displayName: "Mianwali Crafts Store",
          slug: "mianwali-crafts-m5",
          districtId: district.id,
          serviceAreaZoneIds: [mianwaliZone.id],
          defaultDeliveryFeePaisa: 15_000
        }
      })
      .expect(201);

    const onboardB = await request(server)
      .post("/api/v1/seller/onboarding")
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({
        sellerType: "SERVICE_PROVIDER",
        store: {
          displayName: "Isakhel Digital Studio",
          slug: "isakhel-digital-m5",
          districtId: district.id,
          serviceAreaZoneIds: [mianwaliZone.id],
          defaultDeliveryFeePaisa: 10_000
        }
      })
      .expect(201);

    await request(server)
      .post(`/api/v1/admin/sellers/${onboardA.body.data.sellerProfileId}/approve`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({})
      .expect(200);

    await request(server)
      .post(`/api/v1/admin/sellers/${onboardB.body.data.sellerProfileId}/approve`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({})
      .expect(200);

    // 3. Create & Approve Products (Seller A & B) + REMOTE Service (Seller B)
    const prodA = await request(server)
      .post("/api/v1/seller/products")
      .set("Cookie", sellerA.cookie)
      .set("X-CSRF-Token", sellerA.csrfToken)
      .send({
        categoryId: productCat.id,
        title: "Mianwali Embroidered Shawl",
        description: "Warm handmade wool shawl crafted in Mianwali.",
        basePricePaisa: 100_000,
        stockQuantity: 10
      })
      .expect(201);

    const prodB = await request(server)
      .post("/api/v1/seller/products")
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({
        categoryId: productCat.id,
        title: "Brass Craft Tray",
        description: "Traditional carved brass serving tray.",
        basePricePaisa: 200_000,
        stockQuantity: 5
      })
      .expect(201);

    const svcRemote = await request(server)
      .post("/api/v1/seller/services")
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({
        categoryId: serviceCat.id,
        title: "Shop Poster Design",
        description: "Bilingual Urdu & English promotional poster design.",
        serviceMode: "REMOTE",
        packages: [
          {
            tierName: "Standard",
            description: "Print-ready PDF + PNG files",
            pricePaisa: 250_000,
            deliveryEstimateDays: 2,
            maxRevisions: 1
          }
        ]
      })
      .expect(201);

    for (const [id, listingType] of [
      [prodA.body.data.id, "PRODUCT"],
      [prodB.body.data.id, "PRODUCT"],
      [svcRemote.body.data.id, "SERVICE"]
    ] as const) {
      await request(server)
        .post(`/api/v1/admin/listings/${id}/approve`)
        .set("Cookie", admin.cookie)
        .set("X-CSRF-Token", admin.csrfToken)
        .send({ listingType })
        .expect(200);
    }

    // 4. Customer creates Mianwali delivery address & tests store-scoped carts (PQ-16)
    const addrRes = await request(server)
      .post("/api/v1/customer/addresses")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({
        label: "Home",
        districtId: district.id,
        areaZoneId: mianwaliZone.id,
        recipientName: "Tariq Mahmood",
        recipientPhone: "0300-7654321",
        streetAddress: "Street 2, Muslimabad, Mianwali",
        isDefault: true
      })
      .expect(201);
    const addressId = addrRes.body.data.id as string;

    // Self-dealing guard: Seller A cannot add own product to cart -> 403
    await request(server)
      .post("/api/v1/cart/items")
      .set("Cookie", sellerA.cookie)
      .set("X-CSRF-Token", sellerA.csrfToken)
      .send({ productId: prodA.body.data.id, quantity: 1 })
      .expect(403);

    // Customer adds Product A (Store A) + Product B (Store B) -> separate carts!
    await request(server)
      .post("/api/v1/cart/items")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({ productId: prodA.body.data.id, quantity: 2 })
      .expect(201);

    await request(server)
      .post("/api/v1/cart/items")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({ productId: prodB.body.data.id, quantity: 1 })
      .expect(201);

    const cartsRes = await request(server)
      .get("/api/v1/cart")
      .set("Cookie", customer.cookie)
      .expect(200);
    const parsedCarts = CartsResponseSchema.parse(cartsRes.body);
    expect(parsedCarts.data).toHaveLength(2);

    // 5. Quote & Idempotent Physical Checkout (Order 1 -> Cancel & Restore)
    const quoteRes = await request(server)
      .post("/api/v1/checkout/quote")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({
        storeId: onboardA.body.data.store.id,
        fulfilmentMode: "SELLER_DELIVERY",
        addressId
      })
      .expect(200);
    expect(quoteRes.body.data.subtotalPaisa).toBe(200_000);
    expect(quoteRes.body.data.deliveryFeePaisa).toBe(15_000);
    expect(quoteRes.body.data.totalPaisa).toBe(215_000);

    // Missing Idempotency-Key -> 400 VALIDATION_ERROR
    await request(server)
      .post("/api/v1/orders")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({
        storeId: onboardA.body.data.store.id,
        fulfilmentMode: "SELLER_DELIVERY",
        addressId
      })
      .expect(400);

    // Create Order 1 with Idempotency-Key
    const order1Payload = {
      storeId: onboardA.body.data.store.id,
      fulfilmentMode: "SELLER_DELIVERY",
      addressId,
      customerNote: "Call on arrival."
    };
    const order1Res = await request(server)
      .post("/api/v1/orders")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .set("Idempotency-Key", "idem_order1_0001")
      .send(order1Payload)
      .expect(201);
    const order1 = OrderCreatedSummarySchema.parse(order1Res.body.data);
    expect(order1.totalPaisa).toBe(215_000);

    // Stock decremented 10 -> 8
    expect(
      fakePrisma.products.find((p) => p.id === prodA.body.data.id)?.stockQuantity
    ).toBe(8);

    // Store A cart cleared; Store B cart intact
    const cartsAfterCheckout = await request(server)
      .get("/api/v1/cart")
      .set("Cookie", customer.cookie)
      .expect(200);
    expect(CartsResponseSchema.parse(cartsAfterCheckout.body).data).toHaveLength(1);

    // Replay same Idempotency-Key -> returns same orderId, does NOT fail on empty cart
    const order1Replay = await request(server)
      .post("/api/v1/orders")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .set("Idempotency-Key", "idem_order1_0001")
      .send(order1Payload)
      .expect(201);
    expect(order1Replay.body.data.orderId).toBe(order1.orderId);

    // Reusing same Idempotency-Key with different payload -> 409 CONFLICT
    await request(server)
      .post("/api/v1/orders")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .set("Idempotency-Key", "idem_order1_0001")
      .send({
        storeId: onboardA.body.data.store.id,
        fulfilmentMode: "CUSTOMER_PICKUP"
      })
      .expect(409);

    // Customer cancels Order 1 while PENDING_CONFIRMATION -> stock restored 8 -> 10
    await request(server)
      .post(`/api/v1/orders/${order1.orderId}/cancel`)
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({ reason: "Ordered wrong size." })
      .expect(200);
    expect(
      fakePrisma.products.find((p) => p.id === prodA.body.data.id)?.stockQuantity
    ).toBe(10);

    // 6. Create Order 2 -> Confirm -> PQ-10 Cancel Block -> Deliver -> COD Collection -> 0% Ledger
    await request(server)
      .post("/api/v1/cart/items")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({ productId: prodA.body.data.id, quantity: 1 })
      .expect(201);

    const order2Res = await request(server)
      .post("/api/v1/orders")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .set("Idempotency-Key", "idem_order2_0002")
      .send({
        storeId: onboardA.body.data.store.id,
        fulfilmentMode: "SELLER_DELIVERY",
        addressId
      })
      .expect(201);
    const order2Id = order2Res.body.data.orderId as string;

    // Cross-seller isolation: Seller B cannot view or confirm Seller A's order
    await request(server)
      .get(`/api/v1/seller/orders/${order2Id}`)
      .set("Cookie", sellerB.cookie)
      .expect(404);

    // Seller A confirms Order 2 -> Customer self-cancel now blocked (PQ-10)
    await request(server)
      .post(`/api/v1/seller/orders/${order2Id}/confirm`)
      .set("Cookie", sellerA.cookie)
      .set("X-CSRF-Token", sellerA.csrfToken)
      .send({})
      .expect(200);

    const lateCancel = await request(server)
      .post(`/api/v1/orders/${order2Id}/cancel`)
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({ reason: "Too late" })
      .expect(409);
    expect(ApiErrorEnvelopeSchema.parse(lateCancel.body).error.code).toBe(
      "INVALID_STATE_TRANSITION"
    );

    // Cannot collect COD before DELIVERED -> 409 INVALID_STATE_TRANSITION
    await request(server)
      .post(`/api/v1/seller/orders/${order2Id}/cod-collection`)
      .set("Cookie", sellerA.cookie)
      .set("X-CSRF-Token", sellerA.csrfToken)
      .set("Idempotency-Key", "idem_cod_early_1")
      .send({
        collectionStatus: "COLLECTED",
        collectedAmountPaisa: 115_000
      })
      .expect(409);

    // Advance physical workflow to DELIVERED
    for (const toStatus of [
      "READY_FOR_DISPATCH",
      "OUT_FOR_DELIVERY",
      "DELIVERED"
    ] as const) {
      await request(server)
        .post(`/api/v1/seller/orders/${order2Id}/status`)
        .set("Cookie", sellerA.cookie)
        .set("X-CSRF-Token", sellerA.csrfToken)
        .send({ toStatus })
        .expect(200);
    }

    // Delivery != Collection check: ledger still empty!
    expect(
      fakePrisma.commissionLedgers.filter((l) => l.orderId === order2Id)
    ).toHaveLength(0);

    // Explicit COD collection confirmation -> COMPLETED + 0 bps COMMISSION_ACCRUAL
    const codRes = await request(server)
      .post(`/api/v1/seller/orders/${order2Id}/cod-collection`)
      .set("Cookie", sellerA.cookie)
      .set("X-CSRF-Token", sellerA.csrfToken)
      .set("Idempotency-Key", "idem_cod_order2_1")
      .send({
        collectionStatus: "COLLECTED",
        collectedAmountPaisa: 115_000,
        note: "Cash received on doorstep."
      })
      .expect(200);
    expect(codRes.body.data.orderStatus).toBe("COMPLETED");
    expect(codRes.body.data.verificationSource).toBe("SELLER_REPORTED");

    const order2Ledger = fakePrisma.commissionLedgers.filter(
      (l) => l.orderId === order2Id
    );
    expect(order2Ledger).toHaveLength(1);
    expect(order2Ledger[0]?.commissionPaisa).toBe(0n);

    // 7. REMOTE Service Order (PQ-14) + Text-Only Order Messages (PQ-09)
    const svcOrderRes = await request(server)
      .post("/api/v1/orders/services")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .set("Idempotency-Key", "idem_svc_remote_1")
      .send({
        serviceListingId: svcRemote.body.data.id,
        servicePackageId: svcRemote.body.data.packages[0].id,
        customerRequirements: "Need Eid Mubarak shop banner in Urdu and English."
      })
      .expect(201);
    const svcOrderId = svcOrderRes.body.data.orderId as string;
    expect(svcOrderRes.body.data.paymentMethod).toBe("MANUAL_OFFLINE");
    expect(
      fakePrisma.deliveries.find((d) => d.orderId === svcOrderId)
    ).toBeUndefined();

    // Seller B confirms service order & records upfront manual offline payment
    await request(server)
      .post(`/api/v1/seller/orders/${svcOrderId}/confirm`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({})
      .expect(200);

    const manualPay = await request(server)
      .post(`/api/v1/seller/orders/${svcOrderId}/manual-payment-confirmation`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .set("Idempotency-Key", "idem_manual_pay_1")
      .send({
        collectionStatus: "COLLECTED",
        collectedAmountPaisa: 250_000,
        manualPaymentMethodDesc: "Direct bank transfer",
        note: "Advance received."
      })
      .expect(200);
    // CRITICAL PQ-14 check: stays CONFIRMED (NOT COMPLETED) until delivered & accepted
    expect(manualPay.body.data.orderStatus).toBe("CONFIRMED");
    expect(manualPay.body.data.paymentStatus).toBe("COLLECTED");
    expect(manualPay.body.data.verificationSource).toBe("SELLER_REPORTED");

    // Repeating manual-payment-confirmation with a new Idempotency-Key must be rejected (409)
    const repeatManualPay = await request(server)
      .post(`/api/v1/seller/orders/${svcOrderId}/manual-payment-confirmation`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .set("Idempotency-Key", "idem_manual_pay_duplicate")
      .send({
        collectionStatus: "COLLECTED",
        collectedAmountPaisa: 250_000,
        manualPaymentMethodDesc: "Direct bank transfer"
      })
      .expect(409);
    expect(ApiErrorEnvelopeSchema.parse(repeatManualPay.body).error.code).toBe(
      "INVALID_STATE_TRANSITION"
    );

    // PQ-09: Messaging between parties & outsider rejection
    await request(server)
      .post(`/api/v1/orders/${svcOrderId}/messages`)
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({ body: "Please share draft colors when ready." })
      .expect(201);

    await request(server)
      .get(`/api/v1/orders/${svcOrderId}/messages`)
      .set("Cookie", outsider.cookie)
      .expect(403);

    // Service delivery -> revision -> resubmit -> customer accept -> auto-COMPLETED!
    await request(server)
      .post(`/api/v1/seller/orders/${svcOrderId}/status`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({ toStatus: "IN_PROGRESS" })
      .expect(200);

    await request(server)
      .post(`/api/v1/seller/orders/${svcOrderId}/status`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({
        toStatus: "DELIVERY_SUBMITTED",
        deliverySummary: "Draft 1 delivered."
      })
      .expect(200);

    await request(server)
      .post(`/api/v1/orders/${svcOrderId}/service/request-revision`)
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({ reason: "Make the Urdu heading larger please." })
      .expect(200);

    await request(server)
      .post(`/api/v1/seller/orders/${svcOrderId}/status`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({
        toStatus: "DELIVERY_SUBMITTED",
        deliverySummary: "Revised final artwork delivered."
      })
      .expect(200);

    const acceptedSvc = await request(server)
      .post(`/api/v1/orders/${svcOrderId}/service/accept-delivery`)
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({})
      .expect(200);
    expect(acceptedSvc.body.data.status).toBe("COMPLETED");

    // Terminal freeze on order_messages for customer/seller; admin can inspect + gets audited
    await request(server)
      .post(`/api/v1/orders/${svcOrderId}/messages`)
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .send({ body: "One more thing" })
      .expect(409);

    const adminMsgs = await request(server)
      .get(`/api/v1/orders/${svcOrderId}/messages`)
      .set("Cookie", admin.cookie)
      .expect(200);
    expect(adminMsgs.body.data).toHaveLength(1);
    expect(
      fakePrisma.adminAuditLogs.some(
        (a) => a.action === "ORDER_MESSAGES_VIEWED" && a.targetId === svcOrderId
      )
    ).toBe(true);

    // 8. Post-Beta Configurable 5% PHYSICAL Rule + Delivery Fee Exclusion (PQ-02, PQ-13, PQ-15)
    // Regular ADMIN cannot create CommissionRule -> 403
    await request(server)
      .post("/api/v1/admin/commission-rules")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        name: "Post-Beta 5% Physical",
        scopeType: "ORDER_TYPE",
        orderType: "PHYSICAL",
        rateBps: 500
      })
      .expect(403);

    // SUPER_ADMIN activates 5% (500 bps) rule for PHYSICAL orders
    await request(server)
      .post("/api/v1/admin/commission-rules")
      .set("Cookie", superAdmin.cookie)
      .set("X-CSRF-Token", superAdmin.csrfToken)
      .send({
        name: "Post-Beta 5% Physical",
        scopeType: "ORDER_TYPE",
        orderType: "PHYSICAL",
        rateBps: 500
      })
      .expect(201);

    // Customer checks out Store B cart (1 x 200_000 + 10_000 delivery = 210_000 total)
    const order3Res = await request(server)
      .post("/api/v1/orders")
      .set("Cookie", customer.cookie)
      .set("X-CSRF-Token", customer.csrfToken)
      .set("Idempotency-Key", "idem_order3_postbeta")
      .send({
        storeId: onboardB.body.data.store.id,
        fulfilmentMode: "SELLER_DELIVERY",
        addressId
      })
      .expect(201);
    const order3Id = order3Res.body.data.orderId as string;

    await request(server)
      .post(`/api/v1/seller/orders/${order3Id}/confirm`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({})
      .expect(200);
    await request(server)
      .post(`/api/v1/seller/orders/${order3Id}/status`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({ toStatus: "READY_FOR_DISPATCH" })
      .expect(200);
    await request(server)
      .post(`/api/v1/seller/orders/${order3Id}/status`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .send({ toStatus: "DELIVERED" })
      .expect(200);
    await request(server)
      .post(`/api/v1/seller/orders/${order3Id}/cod-collection`)
      .set("Cookie", sellerB.cookie)
      .set("X-CSRF-Token", sellerB.csrfToken)
      .set("Idempotency-Key", "idem_cod_order3_1")
      .send({
        collectionStatus: "COLLECTED",
        collectedAmountPaisa: 210_000
      })
      .expect(200);

    // Commission MUST be 5% of 200_000 = 10_000 (delivery fee 10_000 excluded per PQ-02!)
    // Record offline settlement of 6_000 -> outstandingCommissionOwedPaisa = 4_000
    await request(server)
      .post("/api/v1/admin/settlements")
      .set("Cookie", superAdmin.cookie)
      .set("X-CSRF-Token", superAdmin.csrfToken)
      .send({
        storeId: onboardB.body.data.store.id,
        direction: "SELLER_TO_PLATFORM",
        settlementMethod: "BANK_TRANSFER",
        amountPaisa: 6_000,
        externalReference: "MCB-MWL-9981",
        periodStart: "2026-11-01T00:00:00.000Z",
        periodEnd: "2026-11-30T23:59:59.000Z"
      })
      .expect(201);

    const summaryRes = await request(server)
      .get("/api/v1/seller/commission-summary")
      .set("Cookie", sellerB.cookie)
      .expect(200);
    const summary = CommissionSummaryDtoSchema.parse(summaryRes.body.data);
    expect(summary.completedGrossPaisa).toBe(460_000); // 250_000 service + 210_000 physical
    expect(summary.accruedCommissionPaisa).toBe(10_000); // 0 on service + 10_000 on physical
    expect(summary.settledCommissionPaisa).toBe(6_000);
    expect(summary.outstandingCommissionOwedPaisa).toBe(4_000);
    expect(summary.accountingDisclaimer).toContain("not a withdrawable wallet");
  });

  it("PQ-10 (D-036): auto-completes DELIVERY_SUBMITTED service orders after 7 days when payment is COLLECTED", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const district = fakePrisma.districts[0]!;
    const zone = district.areaZones[0]!;
    const serviceCat = fakePrisma.categories.find(
      (c) => c.slug === "design-digital-services"
    )!;

    const autoBuyer = await registerUser(
      server,
      "autobuyer@saudavo.pk",
      "Auto Buyer"
    );
    const autoSeller = await registerUser(
      server,
      "autoseller@saudavo.pk",
      "Auto Seller"
    );
    const opsAdmin = await registerUser(
      server,
      "opsadmin@saudavo.pk",
      "Ops Admin"
    );

    const adminSecret = totpService.generateBase32Secret();
    fakePrisma.grantRole(opsAdmin.userId, "ADMIN");
    fakePrisma.setMfaSecret(opsAdmin.userId, encryptMfaSecret(adminSecret));
    await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", opsAdmin.cookie)
      .set("X-CSRF-Token", opsAdmin.csrfToken)
      .send({ code: totpService.generateCode(adminSecret) })
      .expect(200);

    const onboardRes = await request(server)
      .post("/api/v1/seller/onboarding")
      .set("Cookie", autoSeller.cookie)
      .set("X-CSRF-Token", autoSeller.csrfToken)
      .send({
        sellerType: "SERVICE_PROVIDER",
        store: {
          displayName: "Mianwali Auto Studio",
          slug: "mianwali-auto-studio",
          districtId: district.id,
          serviceAreaZoneIds: [zone.id],
          defaultDeliveryFeePaisa: 0
        }
      })
      .expect(201);

    await request(server)
      .post(`/api/v1/admin/sellers/${onboardRes.body.data.sellerProfileId}/approve`)
      .set("Cookie", opsAdmin.cookie)
      .set("X-CSRF-Token", opsAdmin.csrfToken)
      .send({})
      .expect(200);

    const svcRes = await request(server)
      .post("/api/v1/seller/services")
      .set("Cookie", autoSeller.cookie)
      .set("X-CSRF-Token", autoSeller.csrfToken)
      .send({
        categoryId: serviceCat.id,
        title: "Shop Banner Design",
        description: "Bilingual shop signage banner design for Mianwali stores.",
        serviceMode: "REMOTE",
        packages: [
          {
            tierName: "Standard",
            description: "Print-ready bilingual signage banner",
            pricePaisa: 120_000,
            deliveryEstimateDays: 2,
            maxRevisions: 1
          }
        ]
      })
      .expect(201);
    const listingId = svcRes.body.data.id as string;
    const pkgId = svcRes.body.data.packages[0].id as string;

    await request(server)
      .post(`/api/v1/admin/listings/${listingId}/approve`)
      .set("Cookie", opsAdmin.cookie)
      .set("X-CSRF-Token", opsAdmin.csrfToken)
      .send({ listingType: "SERVICE" })
      .expect(200);

    const orderRes = await request(server)
      .post("/api/v1/orders/services")
      .set("Cookie", autoBuyer.cookie)
      .set("X-CSRF-Token", autoBuyer.csrfToken)
      .set("Idempotency-Key", "idem_autocomplete_svc_1")
      .send({
        serviceListingId: listingId,
        servicePackageId: pkgId,
        customerRequirements: "Need Urdu + English banner design."
      })
      .expect(201);
    const orderId = orderRes.body.data.orderId as string;

    await request(server)
      .post(`/api/v1/seller/orders/${orderId}/confirm`)
      .set("Cookie", autoSeller.cookie)
      .set("X-CSRF-Token", autoSeller.csrfToken)
      .send({})
      .expect(200);

    await request(server)
      .post(`/api/v1/seller/orders/${orderId}/manual-payment-confirmation`)
      .set("Cookie", autoSeller.cookie)
      .set("X-CSRF-Token", autoSeller.csrfToken)
      .set("Idempotency-Key", "idem_autocomplete_pay_1")
      .send({
        collectionStatus: "COLLECTED",
        collectedAmountPaisa: 120_000,
        manualPaymentMethodDesc: "JazzCash manual transfer"
      })
      .expect(200);

    await request(server)
      .post(`/api/v1/seller/orders/${orderId}/status`)
      .set("Cookie", autoSeller.cookie)
      .set("X-CSRF-Token", autoSeller.csrfToken)
      .send({ toStatus: "IN_PROGRESS" })
      .expect(200);

    await request(server)
      .post(`/api/v1/seller/orders/${orderId}/status`)
      .set("Cookie", autoSeller.cookie)
      .set("X-CSRF-Token", autoSeller.csrfToken)
      .send({
        toStatus: "DELIVERY_SUBMITTED",
        deliverySummary: "Final PNG & PDF delivered."
      })
      .expect(200);

    // 1. Freshly delivered (< 7 days) must NOT auto-complete
    const sweepTooEarly = await request(server)
      .post("/api/v1/admin/orders/auto-complete-services")
      .set("Cookie", opsAdmin.cookie)
      .set("X-CSRF-Token", opsAdmin.csrfToken)
      .send({})
      .expect(200);
    expect(sweepTooEarly.body.data.completedOrderIds).not.toContain(orderId);

    // 2. Backdate deliverySubmittedAt to 8 days ago -> sweep auto-completes it
    const details = fakePrisma.serviceOrderDetailsList.find(
      (d) => d.orderId === orderId
    )!;
    details.deliverySubmittedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

    const sweepMature = await request(server)
      .post("/api/v1/admin/orders/auto-complete-services")
      .set("Cookie", opsAdmin.cookie)
      .set("X-CSRF-Token", opsAdmin.csrfToken)
      .send({})
      .expect(200);
    expect(sweepMature.body.data.completedOrderIds).toEqual([orderId]);

    const orderAfter = await request(server)
      .get(`/api/v1/orders/${orderId}`)
      .set("Cookie", autoBuyer.cookie)
      .expect(200);
    expect(orderAfter.body.data.status).toBe("COMPLETED");
    expect(orderAfter.body.data.serviceOrderDetails.customerAcceptedAt).not.toBeNull();

    // 3. Re-running sweep is idempotent
    const sweepAgain = await request(server)
      .post("/api/v1/admin/orders/auto-complete-services")
      .set("Cookie", opsAdmin.cookie)
      .set("X-CSRF-Token", opsAdmin.csrfToken)
      .send({})
      .expect(200);
    expect(sweepAgain.body.data.completedOrderIds).toEqual([]);

    // Seller receives buyerCodStats on seller orders + in-app notifications with strict IDOR isolation
    const sellerOrdersRes = await request(server)
      .get("/api/v1/seller/orders")
      .set("Cookie", autoSeller.cookie)
      .expect(200);
    expect(sellerOrdersRes.body.data[0].buyerCodStats).toEqual({
      completedCodCount: 0,
      refusedCodCount: 0
    });

    const buyerNotifs = await request(server)
      .get("/api/v1/notifications")
      .set("Cookie", autoBuyer.cookie)
      .expect(200);
    expect(buyerNotifs.body.data.length).toBeGreaterThanOrEqual(1);
    const notifId = buyerNotifs.body.data[0].id as string;

    // Another user cannot mark autoBuyer's notification as read
    await request(server)
      .post(`/api/v1/notifications/${notifId}/read`)
      .set("Cookie", autoSeller.cookie)
      .set("X-CSRF-Token", autoSeller.csrfToken)
      .send({})
      .expect(404);

    await request(server)
      .post(`/api/v1/notifications/${notifId}/read`)
      .set("Cookie", autoBuyer.cookie)
      .set("X-CSRF-Token", autoBuyer.csrfToken)
      .send({})
      .expect(201);
  });
});
