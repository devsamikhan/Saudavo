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
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
