import "reflect-metadata";
import { Test } from "@nestjs/testing";
import {
  CreateAddressRequestSchema,
  CreateProductRequestSchema,
  CreateServiceListingRequestSchema,
  SellerOnboardingRequestSchema
} from "@saudavo/contracts";
import cookieParser from "cookie-parser";
import { AppModule } from "../../src/app.module";
import type { AuthContext } from "../../src/common/auth/auth.types";
import {
  applySecurityHeaders,
  resolveTrustProxy,
  resolveWebOrigin
} from "../../src/common/http/security.config";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import { AuthService } from "../../src/modules/auth/auth.service";
import { CatalogService } from "../../src/modules/catalog/catalog.service";
import { CustomerService } from "../../src/modules/customer/customer.service";
import { ModerationService } from "../../src/modules/moderation/moderation.service";
import { SellerService } from "../../src/modules/seller/seller.service";
import { InMemoryPrismaService } from "./in-memory-prisma.service";

async function seedPreviewCatalog(
  fakePrisma: InMemoryPrismaService,
  services: {
    authService: AuthService;
    customerService: CustomerService;
    sellerService: SellerService;
    catalogService: CatalogService;
    moderationService: ModerationService;
  }
): Promise<void> {
  fakePrisma.seedDefaultLocations();
  fakePrisma.seedDefaultCategories();
  fakePrisma.seedInitialCommissionRule();

  const district = fakePrisma.districts[0]!;
  const mianwaliZone = district.areaZones.find((z) => z.slug === "mianwali-tehsil")!;
  const isakhelZone = district.areaZones.find((z) => z.slug === "isakhel-tehsil")!;
  const craftCat = fakePrisma.categories.find((c) => c.slug === "handicrafts-embroidery")!;
  const tailoringCat = fakePrisma.categories.find((c) => c.slug === "tailoring-custom-work")!;
  const designCat = fakePrisma.categories.find((c) => c.slug === "design-digital-services")!;

  const clientMeta = { ipAddress: "127.0.0.1", userAgent: "saudavo-preview-seed" };

  // 1. Demo accounts (buyer, seller, admin)
  const buyerReg = await services.authService.register(
    {
      email: "buyer@saudavo.pk",
      password: "PreviewPass!123",
      displayName: "Tariq Mahmood (Mianwali)",
      preferredLocale: "en"
    },
    clientMeta,
    "req_preview_1"
  );
  await services.customerService.createAddress(
    buyerReg.response.data.user.id,
    CreateAddressRequestSchema.parse({
      label: "Home",
      districtId: district.id,
      areaZoneId: mianwaliZone.id,
      recipientName: "Tariq Mahmood",
      recipientPhone: "03001234567",
      streetAddress: "Street 4, Muslimabad, Mianwali",
      isDefault: true
    }),
    "req_preview_2"
  );

  const sellerReg = await services.authService.register(
    {
      email: "seller@saudavo.pk",
      password: "PreviewPass!123",
      displayName: "Sadia Crafts Studio",
      preferredLocale: "en"
    },
    clientMeta,
    "req_preview_3"
  );

  const adminReg = await services.authService.register(
    {
      email: "admin@saudavo.pk",
      password: "PreviewPass!123",
      displayName: "Saudavo Moderator",
      preferredLocale: "en"
    },
    clientMeta,
    "req_preview_4"
  );
  const adminUserId = adminReg.response.data.user.id;
  fakePrisma.grantRole(adminUserId, "ADMIN");
  fakePrisma.grantRole(adminUserId, "MODERATOR");

  const adminContext: AuthContext = {
    userId: adminUserId,
    sessionId: "preview-admin-session",
    csrfTokenHash: "preview",
    displayName: "Saudavo Moderator",
    preferredLocale: "en",
    roles: ["CUSTOMER", "ADMIN", "MODERATOR"],
    emailVerified: true,
    phoneVerified: false,
    mfaEnabled: true,
    mfaVerified: true
  };

  // 2. Seller onboarding + approval
  const onboard = await services.sellerService.onboard(
    sellerReg.response.data.user.id,
    SellerOnboardingRequestSchema.parse({
      sellerType: "HOME_MAKER",
      store: {
        displayName: "Mianwali Handloom & Crafts",
        slug: "mianwali-handloom",
        description:
          "Traditional handmade phulkari shawls, brassware crafts, and local Urdu/English branding from Mianwali District.",
        districtId: district.id,
        serviceAreaZoneIds: [mianwaliZone.id, isakhelZone.id],
        defaultDeliveryFeePaisa: 15_000
      }
    }),
    "req_preview_5"
  );

  await services.moderationService.approveSeller(
    onboard.data.sellerProfileId,
    adminContext,
    { notes: "Preview seed store approved." },
    clientMeta,
    "req_preview_6"
  );

  // 3. Approved Mianwali products & service listings
  const shawl = await services.catalogService.createProduct(
    sellerReg.response.data.user.id,
    CreateProductRequestSchema.parse({
      categoryId: craftCat.id,
      title: "Handmade Phulkari Shawl (ہاتھ کی کڑھائی والی شال)",
      description:
        "Warm winter cotton-wool shawl with hand-stitched Mianwali phulkari embroidery.",
      basePricePaisa: 350_000,
      stockQuantity: 12,
      deliveryEnabled: true,
      pickupEnabled: true
    }),
    "req_preview_7"
  );

  const brassTray = await services.catalogService.createProduct(
    sellerReg.response.data.user.id,
    CreateProductRequestSchema.parse({
      categoryId: tailoringCat.id,
      title: "Custom Hand-Stitched Cotton Kurta",
      description:
        "Tailored Mianwali cotton kurta with traditional embroidery collar and cuff finishing.",
      basePricePaisa: 220_000,
      stockQuantity: 8,
      deliveryEnabled: true,
      pickupEnabled: false
    }),
    "req_preview_8"
  );

  const posterService = await services.catalogService.createServiceListing(
    sellerReg.response.data.user.id,
    CreateServiceListingRequestSchema.parse({
      categoryId: designCat.id,
      title: "Urdu & English Shop Banner Design",
      description:
        "Custom print-ready bilingual shop signage and social banner design tailored for local stores.",
      serviceMode: "REMOTE",
      packages: [
        {
          tierName: "Standard",
          description: "High-res PDF + PNG files with 1 revision",
          pricePaisa: 250_000,
          deliveryEstimateDays: 2,
          maxRevisions: 1
        }
      ]
    }),
    "req_preview_9"
  );

  for (const [id, listingType] of [
    [shawl.data.id, "PRODUCT"],
    [brassTray.data.id, "PRODUCT"],
    [posterService.data.id, "SERVICE"]
  ] as const) {
    await services.moderationService.approveListing(
      id,
      adminContext,
      { listingType, notes: "Preview catalog item published." },
      clientMeta,
      "req_preview_10"
    );
  }
}

async function main(): Promise<void> {
  const fakePrisma = new InMemoryPrismaService();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  })
    .overrideProvider(PrismaService)
    .useValue(fakePrisma)
    .compile();

  const app = moduleRef.createNestApplication();
  const expressApp = app.getHttpAdapter().getInstance() as {
    disable?: (setting: string) => void;
    set?: (setting: string, val: unknown) => void;
  };
  expressApp.disable?.("x-powered-by");
  expressApp.set?.("trust proxy", resolveTrustProxy());

  app.use(applySecurityHeaders(false));
  app.use(cookieParser());
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: resolveWebOrigin(),
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "X-CSRF-Token",
      "X-CSRF-Sync",
      "Idempotency-Key"
    ]
  });

  await app.init();
  await seedPreviewCatalog(fakePrisma, {
    authService: moduleRef.get(AuthService),
    customerService: moduleRef.get(CustomerService),
    sellerService: moduleRef.get(SellerService),
    catalogService: moduleRef.get(CatalogService),
    moderationService: moduleRef.get(ModerationService)
  });

  const port = Number(process.env.API_PORT ?? "4000");
  await app.listen(port);
  process.stdout.write(
    `[Saudavo Preview API] Running on http://localhost:${String(port)}/api/v1 (Zero-Docker InMemory Mode)\n` +
      `[Demo Buyer]  buyer@saudavo.pk / PreviewPass!123\n` +
      `[Demo Seller] seller@saudavo.pk / PreviewPass!123\n`
  );
}

void main();
