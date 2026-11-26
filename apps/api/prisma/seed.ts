import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLE_DEFINITIONS = [
  { code: "CUSTOMER", description: "Default marketplace buyer account" },
  { code: "SELLER", description: "Approved or applying local seller account" },
  { code: "MODERATOR", description: "Content, listing, and report moderation staff" },
  { code: "SUPPORT", description: "Customer/seller order support staff" },
  { code: "ADMIN", description: "Marketplace operations administrator" },
  { code: "SUPER_ADMIN", description: "Full system and commission governance administrator" }
] as const;

/**
 * PQ-08 approved initial geographical scope: Mianwali, Isakhel, Piplan.
 * Sub-locality / neighborhood AreaZone entries remain pending founder approval
 * and MUST NOT be invented in seed data.
 */
const MIANWALI_TEHSIL_PLACEHOLDERS = [
  {
    slug: "mianwali-tehsil",
    nameEn: "Mianwali",
    nameUr: "میانوالی",
    zoneType: "TEHSIL"
  },
  {
    slug: "isakhel-tehsil",
    nameEn: "Isakhel",
    nameUr: "عیسیٰ خیل",
    zoneType: "TEHSIL"
  },
  {
    slug: "piplan-tehsil",
    nameEn: "Piplan",
    nameUr: "پپلاں",
    zoneType: "TEHSIL"
  }
] as const;

/**
 * Minimal editable starter taxonomy pending final founder PQ-08 review before pilot launch.
 */
const STARTER_CATEGORIES = [
  {
    slug: "handicrafts-embroidery",
    applicableTo: "PRODUCT",
    nameEn: "Handicrafts & Embroidery",
    nameUr: "دستکاری اور کڑھائی",
    sortOrder: 10
  },
  {
    slug: "home-kitchen-goods",
    applicableTo: "PRODUCT",
    nameEn: "Home & Kitchen Goods",
    nameUr: "گھر اور کچن کا سامان",
    sortOrder: 20
  },
  {
    slug: "clothing-apparel",
    applicableTo: "PRODUCT",
    nameEn: "Clothing & Apparel",
    nameUr: "ملبوسات",
    sortOrder: 30
  },
  {
    slug: "design-digital-services",
    applicableTo: "SERVICE",
    nameEn: "Design & Digital Services",
    nameUr: "ڈیزائن اور ڈیجیٹل سروسز",
    sortOrder: 40
  },
  {
    slug: "home-repair-services",
    applicableTo: "SERVICE",
    nameEn: "Home & Technical Services",
    nameUr: "گھریلو اور ٹیکنیکل سروسز",
    sortOrder: 50
  },
  {
    slug: "tailoring-custom-work",
    applicableTo: "BOTH",
    nameEn: "Tailoring & Custom Work",
    nameUr: "سلائی اور کسٹم کام",
    sortOrder: 60
  }
] as const;

const SUBSCRIPTION_PLANS = [
  {
    code: "FREE_STARTER",
    nameEn: "Free Starter Store",
    nameUr: "مفت اسٹارٹر اسٹور",
    descriptionEn: "Launch free in Mianwali with up to 5 products, 2 services, and Saudavo Messenger custom offers.",
    descriptionUr: "میانوالی میں 5 مصنوعات، 2 سروسز اور سوداو میسنجر کسٹم آفرز کے ساتھ مفت شروعات۔",
    pricePaisa: 0n,
    durationDays: 30,
    maxActiveProducts: 5,
    maxActiveServices: 2,
    hasVerifiedBadge: false,
    hasPriorityPlacement: false,
    hasCustomOffers: true,
    sortOrder: 10
  },
  {
    code: "PRO_MONTHLY",
    nameEn: "Saudavo Pro Monthly",
    nameUr: "سوداو پرو ماہانہ",
    descriptionEn: "Up to 100 products, 25 services, Verified Pro Seller badge, and full messenger deal tools.",
    descriptionUr: "100 مصنوعات، 25 سروسز، تصدیق شدہ پرو بیج اور مکمل میسنجر ڈیل ٹولز۔",
    pricePaisa: 50_000n,
    durationDays: 30,
    maxActiveProducts: 100,
    maxActiveServices: 25,
    hasVerifiedBadge: true,
    hasPriorityPlacement: false,
    hasCustomOffers: true,
    sortOrder: 20
  },
  {
    code: "GROWTH_MONTHLY",
    nameEn: "Saudavo Growth Monthly",
    nameUr: "سوداو گروتھ ماہانہ",
    descriptionEn: "High-volume local shop tier: 500 products, 100 services, Verified Pro badge & priority storefront placement.",
    descriptionUr: "بڑے مقامی کاروبار کے لیے 500 مصنوعات، 100 سروسز، پرو بیج اور ترجیحی نمائش۔",
    pricePaisa: 120_000n,
    durationDays: 30,
    maxActiveProducts: 500,
    maxActiveServices: 100,
    hasVerifiedBadge: true,
    hasPriorityPlacement: true,
    hasCustomOffers: true,
    sortOrder: 30
  }
] as const;

const DEFAULT_FEATURE_FLAGS = [
  {
    key: "shopping_messenger_enabled",
    nameEn: "Saudavo Shopping Messenger",
    nameUr: "سوداو شاپنگ میسنجر",
    descriptionEn:
      "Privacy-safe in-app buyer-seller chat with Custom Deal Offers and direct COD checkout.",
    descriptionUr:
      "فون نمبر شیئر کیے بغیر ایپ کے اندر خریدار و دکاندار چیٹ اور کسٹم ڈیل آفرز۔",
    category: "CORE",
    isEnabled: true,
    sortOrder: 10
  },
  {
    key: "seller_subscriptions_enabled",
    nameEn: "Monthly Seller Subscriptions",
    nameUr: "ماہانہ سیلر سبسکرپشن پلانز",
    descriptionEn:
      "When OFF, every Mianwali seller enjoys unlimited free listings. Turn ON anytime to enable monthly Pro/Growth plans & quotas.",
    descriptionUr:
      "آف ہونے پر تمام دکاندار مفت اور لامحدود لسٹنگز لگا سکتے ہیں۔ آن کرنے پر ماہانہ پرو پلانز لاگو ہو جائیں گے۔",
    category: "MONETIZATION",
    isEnabled: false,
    sortOrder: 20
  },
  {
    key: "buyer_requests_board_enabled",
    nameEn: "Mujhy Chahiye Demand Board",
    nameUr: "مجھے چاہیے ڈیمانڈ بورڈ",
    descriptionEn:
      "Mianwali buyers post what they need with their PKR budget and verified local sellers send direct Saudavo Messenger offers.",
    descriptionUr:
      "خریدار اپنی ضرورت اور بجٹ پوسٹ کریں اور مقامی تصدیق شدہ دکاندار فوراً سوداو میسنجر میں آفر بھیجیں۔",
    category: "GROWTH",
    isEnabled: false,
    sortOrder: 30
  },
  {
    key: "messenger_voice_notes_enabled",
    nameEn: "Urdu Voice Notes in Messenger",
    nameUr: "میسنجر اردو وائس نوٹس",
    descriptionEn:
      "Allow buyers and shopkeepers to send short local voice notes privately inside Saudavo Messenger.",
    descriptionUr:
      "خریدار اور دکاندار سوداو میسنجر کے اندر نجی طور پر مختصر اردو/مقامی وائس پیغامات بھیج سکیں۔",
    category: "COMMUNICATION",
    isEnabled: false,
    sortOrder: 40
  },
  {
    key: "handover_pin_enabled",
    nameEn: "4-Digit COD Handover PIN",
    nameUr: "4 ہندسوں کا ہینڈ اوور پن",
    descriptionEn:
      "Zero-SMS delivery confirmation: generates a private 4-digit buyer PIN verified by seller/rider at parcel handover.",
    descriptionUr:
      "بغیر ایس ایم ایس خرچ کے محفوظ ڈلیوری: خریدار کو 4 ہندسوں کا خفیہ پن ملے گا جو پارسل دیتے وقت تصدیق ہوگا۔",
    category: "TRUST",
    isEnabled: false,
    sortOrder: 50
  },
  {
    key: "flash_deals_coupons_enabled",
    nameEn: "Store Flash Deals & Promo Coupons",
    nameUr: "اسٹور فلیش ڈیلز اور پرومو کوپنز",
    descriptionEn:
      "Let stores publish timed Mianwali flash deals and store promo codes validated in integer paisa on checkout.",
    descriptionUr:
      "دکاندار محدود وقت کی فلیش ڈیلز اور پرومو کوڈز بنا سکیں جو چیک آؤٹ پر درست ڈسکاؤنٹ دیں۔",
    category: "GROWTH",
    isEnabled: false,
    sortOrder: 60
  },
  {
    key: "cod_refusal_shield_enabled",
    nameEn: "Seller COD Refusal Shield",
    nameUr: "سیلر کیش آن ڈلیوری سیفٹی شیلڈ",
    descriptionEn:
      "Allows stores to restrict COD delivery for buyers with repeated refused deliveries, nudging pickup or clean history.",
    descriptionUr:
      "دکاندار بار بار پارسل واپس کرنے والے صارفین کے لیے کیش آن ڈلیوری محدود کر کے سیلف پک اپ کا آپشن دے سکیں۔",
    category: "TRUST",
    isEnabled: false,
    sortOrder: 70
  }
] as const;

async function main(): Promise<void> {
  for (const role of ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { description: role.description },
      create: {
        code: role.code,
        description: role.description
      }
    });
  }

  const mianwaliDistrict = await prisma.district.upsert({
    where: { code: "MIANWALI" },
    update: {
      nameEn: "Mianwali",
      nameUr: "میانوالی",
      slug: "mianwali",
      province: "Punjab",
      countryCode: "PK",
      isActive: true
    },
    create: {
      code: "MIANWALI",
      nameEn: "Mianwali",
      nameUr: "میانوالی",
      slug: "mianwali",
      province: "Punjab",
      countryCode: "PK",
      isActive: true
    }
  });

  for (const zone of MIANWALI_TEHSIL_PLACEHOLDERS) {
    await prisma.areaZone.upsert({
      where: {
        districtId_slug: {
          districtId: mianwaliDistrict.id,
          slug: zone.slug
        }
      },
      update: {
        nameEn: zone.nameEn,
        nameUr: zone.nameUr,
        zoneType: zone.zoneType,
        isActive: true
      },
      create: {
        districtId: mianwaliDistrict.id,
        slug: zone.slug,
        nameEn: zone.nameEn,
        nameUr: zone.nameUr,
        zoneType: zone.zoneType,
        isActive: true
      }
    });
  }

  for (const cat of STARTER_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        applicableTo: cat.applicableTo,
        nameEn: cat.nameEn,
        nameUr: cat.nameUr,
        sortOrder: cat.sortOrder,
        isActive: true
      },
      create: {
        slug: cat.slug,
        applicableTo: cat.applicableTo,
        nameEn: cat.nameEn,
        nameUr: cat.nameUr,
        sortOrder: cat.sortOrder,
        isActive: true
      }
    });
  }

  // Non-login suspended system user solely to own initial CommissionRule FK
  const systemUser = await prisma.user.upsert({
    where: { email: "system-seed@saudavo.internal" },
    update: {},
    create: {
      email: "system-seed@saudavo.internal",
      passwordHash: "!DISABLED_SYSTEM_ACCOUNT!",
      displayName: "Saudavo System Seed",
      status: "SUSPENDED"
    }
  });

  const existingGlobalRule = await prisma.commissionRule.findFirst({
    where: {
      scopeType: "GLOBAL",
      isActive: true
    }
  });

  if (!existingGlobalRule) {
    await prisma.commissionRule.create({
      data: {
        version: 1,
        name: "Mianwali Closed Beta 0% Promotional Rate (PQ-01)",
        scopeType: "GLOBAL",
        rateBps: 0,
        includeDeliveryFee: false,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        isActive: true,
        createdById: systemUser.id
      }
    });
  }

  for (const plan of SUBSCRIPTION_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        nameEn: plan.nameEn,
        nameUr: plan.nameUr,
        descriptionEn: plan.descriptionEn,
        descriptionUr: plan.descriptionUr,
        pricePaisa: plan.pricePaisa,
        durationDays: plan.durationDays,
        maxActiveProducts: plan.maxActiveProducts,
        maxActiveServices: plan.maxActiveServices,
        hasVerifiedBadge: plan.hasVerifiedBadge,
        hasPriorityPlacement: plan.hasPriorityPlacement,
        hasCustomOffers: plan.hasCustomOffers,
        isActive: true,
        sortOrder: plan.sortOrder
      },
      create: {
        code: plan.code,
        nameEn: plan.nameEn,
        nameUr: plan.nameUr,
        descriptionEn: plan.descriptionEn,
        descriptionUr: plan.descriptionUr,
        pricePaisa: plan.pricePaisa,
        currency: "PKR",
        durationDays: plan.durationDays,
        maxActiveProducts: plan.maxActiveProducts,
        maxActiveServices: plan.maxActiveServices,
        hasVerifiedBadge: plan.hasVerifiedBadge,
        hasPriorityPlacement: plan.hasPriorityPlacement,
        hasCustomOffers: plan.hasCustomOffers,
        isActive: true,
        sortOrder: plan.sortOrder
      }
    });
  }

  for (const flag of DEFAULT_FEATURE_FLAGS) {
    await prisma.platformFeatureFlag.upsert({
      where: { key: flag.key },
      update: {
        nameEn: flag.nameEn,
        nameUr: flag.nameUr,
        descriptionEn: flag.descriptionEn,
        descriptionUr: flag.descriptionUr,
        category: flag.category,
        sortOrder: flag.sortOrder
      },
      create: {
        key: flag.key,
        nameEn: flag.nameEn,
        nameUr: flag.nameUr,
        descriptionEn: flag.descriptionEn,
        descriptionUr: flag.descriptionUr,
        category: flag.category,
        isEnabled: flag.isEnabled,
        sortOrder: flag.sortOrder
      }
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
