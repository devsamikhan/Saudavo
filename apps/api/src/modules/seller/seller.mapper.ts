import { Prisma } from "@prisma/client";
import {
  type PrivateStoreDto,
  PrivateStoreDtoSchema,
  type PublicStoreDto,
  PublicStoreDtoSchema,
  type SellerProfileDto,
  SellerProfileDtoSchema
} from "@saudavo/contracts";
import { bigIntToSafeNumber } from "../../common/money.util";

export const STORE_WITH_RELATIONS_INCLUDE = {
  district: true,
  serviceAreas: {
    include: {
      areaZone: true
    }
  }
} satisfies Prisma.StoreInclude;

export type StoreWithRelations = Prisma.StoreGetPayload<{
  include: typeof STORE_WITH_RELATIONS_INCLUDE;
}>;

export type SellerProfileRecord = Prisma.SellerProfileGetPayload<Record<string, never>>;

export function toSellerProfileDto(profile: SellerProfileRecord): SellerProfileDto {
  return SellerProfileDtoSchema.parse({
    id: profile.id,
    userId: profile.userId,
    sellerType: profile.sellerType,
    verificationStatus: profile.verificationStatus,
    rejectionReason: profile.rejectionReason,
    verifiedAt: profile.verifiedAt ? profile.verifiedAt.toISOString() : null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  });
}

export function toPrivateStoreDto(store: StoreWithRelations): PrivateStoreDto {
  return PrivateStoreDtoSchema.parse({
    id: store.id,
    sellerProfileId: store.sellerProfileId,
    districtId: store.districtId,
    districtNameEn: store.district.nameEn,
    slug: store.slug,
    displayName: store.displayName,
    description: store.description,
    showPublicPhone: store.showPublicPhone,
    publicContactPhone: store.publicContactPhone,
    showPublicAddress: store.showPublicAddress,
    publicBusinessAddress: store.publicBusinessAddress,
    defaultDeliveryFeePaisa: bigIntToSafeNumber(
      store.defaultDeliveryFeePaisa,
      "defaultDeliveryFeePaisa"
    ),
    requireCleanCodHistory: store.requireCleanCodHistory,
    currency: store.currency,
    status: store.status,
    serviceAreas: store.serviceAreas.map((sa) => ({
      id: sa.id,
      areaZoneId: sa.areaZoneId,
      areaZoneNameEn: sa.areaZone.nameEn,
      areaZoneNameUr: sa.areaZone.nameUr,
      areaZoneSlug: sa.areaZone.slug,
      deliveryFeeOverridePaisa:
        sa.deliveryFeeOverridePaisa !== null
          ? bigIntToSafeNumber(
              sa.deliveryFeeOverridePaisa,
              "deliveryFeeOverridePaisa"
            )
          : null,
      pickupSupported: sa.pickupSupported,
      deliverySupported: sa.deliverySupported
    })),
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString()
  });
}

/**
 * Privacy-by-projection mapper for public store views.
 * Never returns residential/business address or phone unless seller explicitly opted in.
 */
export function toPublicStoreDto(
  store: StoreWithRelations,
  extras?: {
    completedOrdersCount?: number;
    avgResponseMinutes?: number | null;
    responseRatePercent?: number | null;
    followerCount?: number;
    isFollowing?: boolean;
  }
): PublicStoreDto {
  return PublicStoreDtoSchema.parse({
    id: store.id,
    slug: store.slug,
    displayName: store.displayName,
    description: store.description,
    districtId: store.districtId,
    districtNameEn: store.district.nameEn,
    districtNameUr: store.district.nameUr,
    defaultDeliveryFeePaisa: bigIntToSafeNumber(
      store.defaultDeliveryFeePaisa,
      "defaultDeliveryFeePaisa"
    ),
    currency: store.currency,
    // Saudavo privacy shield: personal phones are never exposed publicly; all chats happen in Messenger.
    publicContactPhone: null,
    publicBusinessAddress: store.showPublicAddress
      ? store.publicBusinessAddress
      : null,
    serviceAreas: store.serviceAreas.map((sa) => ({
      id: sa.id,
      areaZoneId: sa.areaZoneId,
      areaZoneNameEn: sa.areaZone.nameEn,
      areaZoneNameUr: sa.areaZone.nameUr,
      areaZoneSlug: sa.areaZone.slug,
      deliveryFeeOverridePaisa:
        sa.deliveryFeeOverridePaisa !== null
          ? bigIntToSafeNumber(
              sa.deliveryFeeOverridePaisa,
              "deliveryFeeOverridePaisa"
            )
          : null,
      pickupSupported: sa.pickupSupported,
      deliverySupported: sa.deliverySupported
    })),
    completedOrdersCount: extras?.completedOrdersCount ?? 0,
    avgResponseMinutes: extras?.avgResponseMinutes ?? null,
    responseRatePercent: extras?.responseRatePercent ?? null,
    followerCount: extras?.followerCount ?? 0,
    ...(extras?.isFollowing !== undefined
      ? { isFollowing: extras.isFollowing }
      : {})
  });
}
