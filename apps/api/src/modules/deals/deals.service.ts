import { HttpStatus, Injectable } from "@nestjs/common";
import {
  type CreatePromoDealRequest,
  type PromoDealDto,
  PromoDealDtoSchema
} from "@saudavo/contracts";
import { DomainException } from "../../common/errors/domain.exception";
import { bigIntToSafeNumber } from "../../common/money.util";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FeatureFlagsService } from "../features/feature-flags.service";
import { SellerService } from "../seller/seller.service";

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly sellerService: SellerService
  ) {}

  async listPublicFlashDeals(
    storeId: string | undefined,
    requestId: string
  ): Promise<{ data: PromoDealDto[]; meta: { requestId: string } }> {
    const enabled = await this.featureFlags.isEnabled("flash_deals_coupons_enabled");
    if (!enabled) {
      return { data: [], meta: { requestId } };
    }

    const now = new Date();
    const rows = await this.prisma.storePromoDeal.findMany({
      where: {
        isActive: true,
        isFlashDeal: true,
        startsAt: { lte: now },
        endsAt: { gt: now },
        ...(storeId ? { storeId } : {}),
        store: {
          status: "ACTIVE",
          deletedAt: null,
          sellerProfile: { verificationStatus: "APPROVED" }
        }
      },
      include: {
        store: {
          select: { slug: true, displayName: true }
        }
      },
      orderBy: { endsAt: "asc" },
      take: 24
    });

    return {
      data: rows.map((r) => this.toDto(r)),
      meta: { requestId }
    };
  }

  async listSellerDeals(
    userId: string,
    requestId: string
  ): Promise<{ data: PromoDealDto[]; meta: { requestId: string } }> {
    await this.featureFlags.assertEnabled(
      "flash_deals_coupons_enabled",
      "Store Flash Deals & Promo Coupons"
    );

    const { store } = await this.sellerService.requireOwnStore(userId);
    const rows = await this.prisma.storePromoDeal.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" }
    });

    return {
      data: rows.map((r) => this.toDto(r)),
      meta: { requestId }
    };
  }

  async createSellerDeal(
    userId: string,
    dto: CreatePromoDealRequest,
    requestId: string
  ): Promise<{ data: PromoDealDto; meta: { requestId: string } }> {
    await this.featureFlags.assertEnabled(
      "flash_deals_coupons_enabled",
      "Store Flash Deals & Promo Coupons"
    );

    const { store } = await this.sellerService.requireOwnStore(userId);
    const normalizedCode = dto.code ? dto.code.trim().toUpperCase() : null;

    if (normalizedCode) {
      const existing = await this.prisma.storePromoDeal.findFirst({
        where: { storeId: store.id, code: normalizedCode }
      });
      if (existing) {
        throw new DomainException(
          "CONFLICT",
          HttpStatus.CONFLICT,
          `Promo code "${normalizedCode}" already exists in your store.`
        );
      }
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + dto.durationHours * 3600 * 1000);

    const created = await this.prisma.storePromoDeal.create({
      data: {
        storeId: store.id,
        code: normalizedCode,
        title: dto.title,
        discountType: dto.discountType,
        discountValue: BigInt(dto.discountValue),
        minOrderPaisa: BigInt(dto.minOrderPaisa ?? 0),
        isFlashDeal: dto.isFlashDeal,
        startsAt: now,
        endsAt,
        isActive: true
      }
    });

    return {
      data: this.toDto(created),
      meta: { requestId }
    };
  }

  async toggleSellerDeal(
    userId: string,
    dealId: string,
    isActive: boolean,
    requestId: string
  ): Promise<{ data: PromoDealDto; meta: { requestId: string } }> {
    await this.featureFlags.assertEnabled(
      "flash_deals_coupons_enabled",
      "Store Flash Deals & Promo Coupons"
    );

    const { store } = await this.sellerService.requireOwnStore(userId);
    const existing = await this.prisma.storePromoDeal.findFirst({
      where: { id: dealId, storeId: store.id }
    });
    if (!existing) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Promo deal not found in your store."
      );
    }

    const updated = await this.prisma.storePromoDeal.update({
      where: { id: dealId },
      data: { isActive }
    });

    return {
      data: this.toDto(updated),
      meta: { requestId }
    };
  }

  /**
   * Resolves & computes integer-paisa promo discount for checkout quote & order creation.
   */
  async computeCouponDiscountPaisa(
    storeId: string,
    subtotalPaisa: bigint,
    couponCode: string | undefined
  ): Promise<{ discountPaisa: bigint; appliedPromoCode: string | null }> {
    const cleanCode = couponCode?.trim().toUpperCase();
    if (!cleanCode) {
      return { discountPaisa: 0n, appliedPromoCode: null };
    }

    const enabled = await this.featureFlags.isEnabled("flash_deals_coupons_enabled");
    if (!enabled) {
      throw new DomainException(
        "FEATURE_DISABLED",
        HttpStatus.FORBIDDEN,
        "Promo coupons are currently turned off."
      );
    }

    const now = new Date();
    const deal = await this.prisma.storePromoDeal.findFirst({
      where: {
        storeId,
        code: cleanCode,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gt: now }
      }
    });
    if (!deal) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        `Promo code "${cleanCode}" is invalid or expired for this store.`
      );
    }
    if (subtotalPaisa < deal.minOrderPaisa) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        `Order subtotal must be at least PKR ${Number(deal.minOrderPaisa) / 100} to use promo "${cleanCode}".`
      );
    }

    let rawDiscount = 0n;
    if (deal.discountType === "PERCENT_BPS") {
      rawDiscount = (subtotalPaisa * deal.discountValue) / 10_000n;
    } else {
      rawDiscount = deal.discountValue;
    }

    const cappedDiscount =
      rawDiscount > subtotalPaisa ? subtotalPaisa : rawDiscount;

    return {
      discountPaisa: cappedDiscount,
      appliedPromoCode: cleanCode
    };
  }

  private toDto(row: {
    id: string;
    storeId: string;
    code: string | null;
    title: string;
    discountType: string;
    discountValue: bigint;
    minOrderPaisa: bigint;
    isFlashDeal: boolean;
    startsAt: Date;
    endsAt: Date;
    isActive: boolean;
    createdAt: Date;
    store?: { slug: string; displayName: string } | null;
  }): PromoDealDto {
    return PromoDealDtoSchema.parse({
      id: row.id,
      storeId: row.storeId,
      ...(row.store
        ? { storeSlug: row.store.slug, storeDisplayName: row.store.displayName }
        : {}),
      code: row.code,
      title: row.title,
      discountType: row.discountType,
      discountValue: bigIntToSafeNumber(row.discountValue, "discountValue"),
      minOrderPaisa: bigIntToSafeNumber(row.minOrderPaisa, "minOrderPaisa"),
      isFlashDeal: row.isFlashDeal,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString()
    });
  }
}
