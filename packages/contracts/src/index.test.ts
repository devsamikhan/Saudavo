import { describe, expect, it } from "vitest";
import {
  ApiErrorEnvelopeSchema,
  calculateCommissionPaisa,
  calculateSellerNetEntitlementPaisa,
  CodCollectionStatusSchema,
  CreateCommissionRuleRequestSchema,
  CreateOrderMessageRequestSchema,
  CreatePhysicalOrderRequestSchema,
  CreateProductRequestSchema,
  CreateServiceListingRequestSchema,
  detectContactLeak,
  HealthResponseSchema,
  normalizeEmail,
  normalizePakistanPhoneE164,
  RegisterRequestSchema,
  RejectDecisionRequestSchema,
  RoleCodeSchema,
  SellerOnboardingRequestSchema,
  SendCustomOfferRequestSchema,
  slugifyTitle
} from "./index";

describe("@saudavo/contracts", () => {
  it("validates a conforming health response payload", () => {
    const parsed = HealthResponseSchema.parse({
      data: {
        status: "ok",
        service: "saudavo-api",
        environment: "test",
        timestamp: new Date().toISOString()
      },
      meta: {
        requestId: "req_test_001"
      }
    });

    expect(parsed.data.status).toBe("ok");
  });

  it("rejects unsupported role codes such as DELIVERY_OPERATOR in MVP", () => {
    const result = RoleCodeSchema.safeParse("DELIVERY_OPERATOR");
    expect(result.success).toBe(false);
  });

  it("validates standard error envelopes and COD statuses", () => {
    expect(CodCollectionStatusSchema.options).toEqual([
      "PENDING_COLLECTION",
      "COLLECTED",
      "FAILED_REFUSED",
      "REFUNDED"
    ]);

    const err = ApiErrorEnvelopeSchema.parse({
      error: {
        code: "ORDER_SINGLE_SELLER_VIOLATION",
        message: "One seller store per order.",
        requestId: "req_test_002"
      }
    });
    expect(err.error.code).toBe("ORDER_SINGLE_SELLER_VIOLATION");
  });

  it("normalizes email and Pakistani phone numbers consistently (PQ-05)", () => {
    expect(normalizeEmail("  Ayesha@Example.COM ")).toBe("ayesha@example.com");
    expect(normalizePakistanPhoneE164("0300-1234567")).toBe("+923001234567");
    expect(normalizePakistanPhoneE164("0092 300 1234567")).toBe("+923001234567");
    expect(normalizePakistanPhoneE164("+923001234567")).toBe("+923001234567");
    expect(normalizePakistanPhoneE164("12345")).toBeNull();
  });

  it("allows registration with email OR phone without requiring both (PQ-05)", () => {
    expect(
      RegisterRequestSchema.safeParse({
        email: "seller@example.com",
        password: "StrongPassword123",
        displayName: "Mianwali Maker"
      }).success
    ).toBe(true);

    expect(
      RegisterRequestSchema.safeParse({
        phone: "03001234567",
        password: "StrongPassword123",
        displayName: "Mianwali Maker"
      }).success
    ).toBe(true);

    expect(
      RegisterRequestSchema.safeParse({
        password: "StrongPassword123",
        displayName: "No Contact"
      }).success
    ).toBe(false);
  });

  it("calculates integer paisa commission with half-up rounding and 0 bps beta support", () => {
    expect(calculateCommissionPaisa(350_000n, 0)).toBe(0n);
    expect(calculateCommissionPaisa(10_000n, 250)).toBe(250n); // 2.50%
    expect(calculateCommissionPaisa(101n, 500)).toBe(5n); // 5.05 -> 5
    expect(calculateCommissionPaisa(110n, 500)).toBe(6n); // 5.50 -> 6 (half-up)
    expect(calculateSellerNetEntitlementPaisa(365_000n, 0n)).toBe(365_000n);
    expect(calculateSellerNetEntitlementPaisa(365_000n, 17_500n)).toBe(347_500n);
  });

  it("enforces seller onboarding privacy defaults, catalog paisa constraints, and mandatory rejection reasons", () => {
    const onboarding = SellerOnboardingRequestSchema.parse({
      sellerType: "HOME_MAKER",
      store: {
        displayName: "Mianwali Looms",
        slug: "mianwali-looms",
        districtId: "0193a8b2-2000-7000-8000-000000000001",
        serviceAreaZoneIds: ["0193a8b2-2001-7000-8000-000000000010"]
      }
    });
    expect(onboarding.store.showPublicPhone).toBe(false);
    expect(onboarding.store.showPublicAddress).toBe(false);
    expect(onboarding.store.defaultDeliveryFeePaisa).toBe(0);

    expect(
      CreateProductRequestSchema.safeParse({
        categoryId: "0193a8b2-2000-7000-8000-000000000002",
        title: "Phulkari Shawl",
        description: "Handcrafted traditional shawl from Mianwali.",
        basePricePaisa: 0
      }).success
    ).toBe(false);

    expect(
      CreateServiceListingRequestSchema.safeParse({
        categoryId: "0193a8b2-2000-7000-8000-000000000003",
        title: "Logo & Graphic Design",
        description: "Remote branding and vector artwork.",
        serviceMode: "REMOTE",
        packages: [
          {
            tierName: "Basic",
            description: "2 concepts in vector format.",
            pricePaisa: 500_000,
            deliveryEstimateDays: 3
          }
        ]
      }).success
    ).toBe(true);

    expect(RejectDecisionRequestSchema.safeParse({ reason: "No" }).success).toBe(
      false
    );
    expect(slugifyTitle("Handmade Phulkari Shawl (Mianwali)!")).toBe(
      "handmade-phulkari-shawl-mianwali"
    );

    expect(
      CreatePhysicalOrderRequestSchema.safeParse({
        storeId: "0193a8b2-4100-7000-8000-000000000001",
        fulfilmentMode: "SELLER_DELIVERY"
      }).success
    ).toBe(true);

    expect(
      CreateCommissionRuleRequestSchema.safeParse({
        name: "Invalid Category OrderType mismatch",
        scopeType: "ORDER_TYPE",
        rateBps: 500
      }).success
    ).toBe(false);

    expect(
      CreateOrderMessageRequestSchema.safeParse({ body: "   " }).success
    ).toBe(false);
  });

  it("detects phone, email, IBAN, and external chat leaks while allowing normal prices and addresses", () => {
    expect(detectContactLeak("Call me at 03001234567 please")?.kind).toBe("PHONE");
    expect(detectContactLeak("WhatsApp +92 321 7654321")?.kind).toBe("PHONE");
    expect(detectContactLeak("Email: seller.khan@gmail.com")?.kind).toBe("EMAIL");
    expect(detectContactLeak("https://wa.me/923001234567")?.kind).toBe(
      "EXTERNAL_LINK"
    );
    expect(detectContactLeak("Send to PK36SCBL0000001123456702")?.kind).toBe(
      "BANK_IBAN"
    );
    expect(
      detectContactLeak(
        "Handmade Phulkari Shawl Rs. 3,500 — 2 pieces delivered in 3 days inside Mianwali."
      )
    ).toBeNull();
    expect(detectContactLeak("https://saudavo-web.vercel.app/stores/loom")).toBeNull();

    expect(
      SendCustomOfferRequestSchema.safeParse({
        serviceListingId: "0193a8b2-4100-7000-8000-000000000009",
        unitPricePaisa: 150_000,
        fulfilmentMode: "CUSTOMER_PICKUP"
      }).success
    ).toBe(true);
  });
});
