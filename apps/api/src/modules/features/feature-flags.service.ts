import { HttpStatus, Injectable } from "@nestjs/common";
import {
  DEFAULT_FEATURE_FLAGS_MAP,
  type FeatureFlagDto,
  FeatureFlagDtoSchema,
  type FeatureFlagKey,
  FeatureFlagKeySchema,
  type FeatureFlagsMap,
  FeatureFlagsMapSchema,
  type RoleCode,
  STAFF_ROLES,
  type UpdateFeatureFlagRequest
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { DomainException } from "../../common/errors/domain.exception";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { ClientMetadata } from "../auth/auth.service";

const STAFF_ROLE_SET = new Set<RoleCode>(STAFF_ROLES);

const BUILTIN_FLAG_DEFINITIONS: Array<{
  key: FeatureFlagKey;
  nameEn: string;
  nameUr: string;
  descriptionEn: string;
  descriptionUr: string;
  category: "CORE" | "MONETIZATION" | "GROWTH" | "COMMUNICATION" | "TRUST";
  isEnabled: boolean;
  sortOrder: number;
}> = [
  {
    key: "shopping_messenger_enabled",
    nameEn: "Saudavo Shopping Messenger",
    nameUr: "سوداو شاپنگ میسنجر",
    descriptionEn:
      "Privacy-safe in-app buyer-seller chat with Custom Deal Offers and direct COD checkout.",
    descriptionUr:
      "فون نمبر شیئر کیے بغیر ایپ کے اندر خریدار و دکاندار چیٹ اور کسٹم ڈیل آفرز۔",
    category: "CORE",
    isEnabled: DEFAULT_FEATURE_FLAGS_MAP.shopping_messenger_enabled,
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
    isEnabled: DEFAULT_FEATURE_FLAGS_MAP.seller_subscriptions_enabled,
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
    isEnabled: DEFAULT_FEATURE_FLAGS_MAP.buyer_requests_board_enabled,
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
    isEnabled: DEFAULT_FEATURE_FLAGS_MAP.messenger_voice_notes_enabled,
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
    isEnabled: DEFAULT_FEATURE_FLAGS_MAP.handover_pin_enabled,
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
    isEnabled: DEFAULT_FEATURE_FLAGS_MAP.flash_deals_coupons_enabled,
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
    isEnabled: DEFAULT_FEATURE_FLAGS_MAP.cod_refusal_shield_enabled,
    sortOrder: 70
  }
];

@Injectable()
export class FeatureFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private async ensureFlagsExist(): Promise<void> {
    const existing = await this.prisma.platformFeatureFlag.findMany();
    const existingKeys = new Set(existing.map((f) => f.key));
    for (const def of BUILTIN_FLAG_DEFINITIONS) {
      if (!existingKeys.has(def.key)) {
        await this.prisma.platformFeatureFlag.create({
          data: {
            key: def.key,
            nameEn: def.nameEn,
            nameUr: def.nameUr,
            descriptionEn: def.descriptionEn,
            descriptionUr: def.descriptionUr,
            category: def.category,
            isEnabled: def.isEnabled,
            sortOrder: def.sortOrder
          }
        });
      }
    }
  }

  async getPublicMap(
    requestId: string
  ): Promise<{ data: FeatureFlagsMap; meta: { requestId: string } }> {
    await this.ensureFlagsExist();
    const rows = await this.prisma.platformFeatureFlag.findMany({
      orderBy: { sortOrder: "asc" }
    });
    const map: FeatureFlagsMap = { ...DEFAULT_FEATURE_FLAGS_MAP };
    for (const row of rows) {
      const parsedKey = FeatureFlagKeySchema.safeParse(row.key);
      if (parsedKey.success) {
        map[parsedKey.data] = row.isEnabled;
      }
    }
    return {
      data: FeatureFlagsMapSchema.parse(map),
      meta: { requestId }
    };
  }

  async isEnabled(key: FeatureFlagKey): Promise<boolean> {
    const row = await this.prisma.platformFeatureFlag.findUnique({
      where: { key }
    });
    if (row) {
      return row.isEnabled;
    }
    return DEFAULT_FEATURE_FLAGS_MAP[key];
  }

  async assertEnabled(key: FeatureFlagKey, label?: string): Promise<void> {
    const enabled = await this.isEnabled(key);
    if (!enabled) {
      throw new DomainException(
        "FEATURE_DISABLED",
        HttpStatus.FORBIDDEN,
        `${label ?? key} is currently turned off by platform administration.`
      );
    }
  }

  async listAdminFlags(
    requestId: string
  ): Promise<{ data: FeatureFlagDto[]; meta: { requestId: string } }> {
    await this.ensureFlagsExist();
    const rows = await this.prisma.platformFeatureFlag.findMany({
      orderBy: { sortOrder: "asc" }
    });
    return {
      data: rows
        .filter((r) => FeatureFlagKeySchema.safeParse(r.key).success)
        .map((r) =>
          FeatureFlagDtoSchema.parse({
            key: r.key,
            nameEn: r.nameEn,
            nameUr: r.nameUr,
            descriptionEn: r.descriptionEn,
            descriptionUr: r.descriptionUr,
            category: r.category,
            isEnabled: r.isEnabled,
            sortOrder: r.sortOrder,
            updatedAt: r.updatedAt.toISOString()
          })
        ),
      meta: { requestId }
    };
  }

  async updateFlag(
    auth: AuthContext,
    keyInput: string,
    dto: UpdateFeatureFlagRequest,
    metadata: ClientMetadata,
    requestId: string
  ): Promise<{ data: FeatureFlagDto; meta: { requestId: string } }> {
    const parsedKey = FeatureFlagKeySchema.safeParse(keyInput);
    if (!parsedKey.success) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        `Unknown platform feature flag "${keyInput}".`
      );
    }

    await this.ensureFlagsExist();
    const existing = await this.prisma.platformFeatureFlag.findUnique({
      where: { key: parsedKey.data }
    });
    if (!existing) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        `Feature flag "${parsedKey.data}" not found.`
      );
    }

    const actorRole = auth.roles.find((r) => STAFF_ROLE_SET.has(r)) ?? "ADMIN";

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.platformFeatureFlag.update({
        where: { key: parsedKey.data },
        data: {
          isEnabled: dto.isEnabled,
          updatedById: auth.userId
        }
      });

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole,
          action: "FEATURE_FLAG_UPDATED",
          targetType: "PlatformFeatureFlag",
          targetId: next.id,
          reason: dto.reason ?? null,
          beforeJson: {
            key: parsedKey.data,
            isEnabled: existing.isEnabled
          },
          afterJson: {
            key: parsedKey.data,
            isEnabled: dto.isEnabled
          },
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        },
        tx
      );

      return next;
    });

    return {
      data: FeatureFlagDtoSchema.parse({
        key: updated.key,
        nameEn: updated.nameEn,
        nameUr: updated.nameUr,
        descriptionEn: updated.descriptionEn,
        descriptionUr: updated.descriptionUr,
        category: updated.category,
        isEnabled: updated.isEnabled,
        sortOrder: updated.sortOrder,
        updatedAt: updated.updatedAt.toISOString()
      }),
      meta: { requestId }
    };
  }
}
