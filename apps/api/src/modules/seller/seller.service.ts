import { HttpStatus, Injectable } from "@nestjs/common";
import {
  PrivateStoreDto,
  SellerOnboardingRequest,
  SellerOnboardingResponse,
  SellerOnboardingResponseSchema,
  SellerProfileDto,
  UpdateSellerProfileRequest,
  UpdateStoreRequest
} from "@saudavo/contracts";
import { DomainException } from "../../common/errors/domain.exception";
import { PrismaService } from "../../common/prisma/prisma.service";
import { OutboxService } from "../outbox/outbox.service";
import {
  STORE_WITH_RELATIONS_INCLUDE,
  type StoreWithRelations,
  toPrivateStoreDto,
  toSellerProfileDto
} from "./seller.mapper";

@Injectable()
export class SellerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService
  ) {}

  async onboard(
    userId: string,
    dto: SellerOnboardingRequest,
    requestId: string
  ): Promise<SellerOnboardingResponse> {
    const existingProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId }
    });
    if (existingProfile) {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        "A seller profile already exists for this account."
      );
    }

    const district = await this.prisma.district.findFirst({
      where: { id: dto.store.districtId, isActive: true }
    });
    if (!district) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Selected district is invalid or inactive."
      );
    }

    const uniqueZoneIds = [...new Set(dto.store.serviceAreaZoneIds)];
    const validZones = await this.prisma.areaZone.findMany({
      where: {
        id: { in: uniqueZoneIds },
        districtId: district.id,
        isActive: true
      }
    });
    if (validZones.length !== uniqueZoneIds.length) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "One or more selected service area zones do not belong to the active district."
      );
    }

    const slugTaken = await this.prisma.store.findUnique({
      where: { slug: dto.store.slug }
    });
    if (slugTaken) {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        "This store slug is already taken."
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const sellerProfile = await tx.sellerProfile.create({
        data: {
          userId,
          sellerType: dto.sellerType,
          verificationStatus: "PENDING_REVIEW"
        }
      });

      const store = await tx.store.create({
        data: {
          sellerProfileId: sellerProfile.id,
          districtId: district.id,
          slug: dto.store.slug,
          displayName: dto.store.displayName,
          description: dto.store.description ?? null,
          showPublicPhone: dto.store.showPublicPhone,
          publicContactPhone: dto.store.showPublicPhone
            ? (dto.store.publicContactPhone ?? null)
            : null,
          showPublicAddress: dto.store.showPublicAddress,
          publicBusinessAddress: dto.store.showPublicAddress
            ? (dto.store.publicBusinessAddress ?? null)
            : null,
          defaultDeliveryFeePaisa: BigInt(dto.store.defaultDeliveryFeePaisa),
          currency: "PKR",
          status: "PENDING_REVIEW",
          serviceAreas: {
            create: uniqueZoneIds.map((areaZoneId) => ({
              areaZoneId,
              pickupSupported: true,
              deliverySupported: true
            }))
          }
        }
      });

      const sellerRole = await tx.role.upsert({
        where: { code: "SELLER" },
        update: {},
        create: {
          code: "SELLER",
          description: "Local seller account"
        }
      });

      const existingRole = await tx.userRole.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId: sellerRole.id
          }
        }
      });
      if (!existingRole) {
        await tx.userRole.create({
          data: {
            userId,
            roleId: sellerRole.id
          }
        });
      }

      await this.outboxService.enqueue(
        {
          eventType: "SELLER_ONBOARDING_SUBMITTED",
          aggregateType: "SellerProfile",
          aggregateId: sellerProfile.id,
          payloadJson: {
            sellerProfileId: sellerProfile.id,
            storeId: store.id,
            districtId: district.id
          }
        },
        tx
      );

      return { sellerProfile, store };
    });

    return SellerOnboardingResponseSchema.parse({
      data: {
        sellerProfileId: created.sellerProfile.id,
        verificationStatus: created.sellerProfile.verificationStatus,
        store: {
          id: created.store.id,
          slug: created.store.slug,
          status: created.store.status
        }
      },
      meta: { requestId }
    });
  }

  async getOwnProfile(
    userId: string,
    requestId: string
  ): Promise<{ data: SellerProfileDto; meta: { requestId: string } }> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId }
    });
    if (!profile) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Seller profile not found."
      );
    }
    return {
      data: toSellerProfileDto(profile),
      meta: { requestId }
    };
  }

  async updateOwnProfile(
    userId: string,
    dto: UpdateSellerProfileRequest,
    requestId: string
  ): Promise<{ data: SellerProfileDto; meta: { requestId: string } }> {
    const existing = await this.prisma.sellerProfile.findUnique({
      where: { userId }
    });
    if (!existing) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Seller profile not found."
      );
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { id: existing.id },
      data: {
        ...(dto.sellerType !== undefined ? { sellerType: dto.sellerType } : {})
      }
    });

    return {
      data: toSellerProfileDto(updated),
      meta: { requestId }
    };
  }

  async getOwnStore(
    userId: string,
    requestId: string
  ): Promise<{ data: PrivateStoreDto; meta: { requestId: string } }> {
    const { store } = await this.requireOwnStore(userId);
    return {
      data: toPrivateStoreDto(store),
      meta: { requestId }
    };
  }

  async updateOwnStore(
    userId: string,
    dto: UpdateStoreRequest,
    requestId: string
  ): Promise<{ data: PrivateStoreDto; meta: { requestId: string } }> {
    const { store } = await this.requireOwnStore(userId);

    if (store.status === "SUSPENDED") {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Suspended stores cannot be modified."
      );
    }

    if (dto.serviceAreas) {
      const zoneIds = [...new Set(dto.serviceAreas.map((s) => s.areaZoneId))];
      const validZones = await this.prisma.areaZone.findMany({
        where: {
          id: { in: zoneIds },
          districtId: store.districtId,
          isActive: true
        }
      });
      if (validZones.length !== zoneIds.length) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "All service area zones must belong to your store's district."
        );
      }
    }

    const nextShowPhone = dto.showPublicPhone ?? store.showPublicPhone;
    const nextShowAddress = dto.showPublicAddress ?? store.showPublicAddress;
    const nextStatus =
      dto.submitForReview &&
      (store.status === "DRAFT" || store.status === "REJECTED")
        ? "PENDING_REVIEW"
        : store.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.serviceAreas) {
        await tx.storeServiceArea.deleteMany({
          where: { storeId: store.id }
        });

        await tx.storeServiceArea.createMany({
          data: dto.serviceAreas.map((area) => ({
            storeId: store.id,
            areaZoneId: area.areaZoneId,
            deliveryFeeOverridePaisa:
              area.deliveryFeeOverridePaisa !== undefined &&
              area.deliveryFeeOverridePaisa !== null
                ? BigInt(area.deliveryFeeOverridePaisa)
                : null,
            pickupSupported: area.pickupSupported,
            deliverySupported: area.deliverySupported
          }))
        });
      }

      return tx.store.update({
        where: { id: store.id },
        data: {
          ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.defaultDeliveryFeePaisa !== undefined
            ? { defaultDeliveryFeePaisa: BigInt(dto.defaultDeliveryFeePaisa) }
            : {}),
          ...(dto.requireCleanCodHistory !== undefined
            ? { requireCleanCodHistory: dto.requireCleanCodHistory }
            : {}),
          showPublicPhone: nextShowPhone,
          publicContactPhone: nextShowPhone
            ? dto.publicContactPhone !== undefined
              ? dto.publicContactPhone
              : store.publicContactPhone
            : null,
          showPublicAddress: nextShowAddress,
          publicBusinessAddress: nextShowAddress
            ? dto.publicBusinessAddress !== undefined
              ? dto.publicBusinessAddress
              : store.publicBusinessAddress
            : null,
          status: nextStatus
        },
        include: STORE_WITH_RELATIONS_INCLUDE
      });
    });

    return {
      data: toPrivateStoreDto(updated),
      meta: { requestId }
    };
  }

  /**
   * Server-side ownership resolver for seller store access. Never accepts untrusted storeId.
   */
  async requireOwnStore(userId: string): Promise<{
    sellerProfileId: string;
    verificationStatus: string;
    store: StoreWithRelations;
  }> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId }
    });
    if (!profile) {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Seller onboarding is required before accessing store resources."
      );
    }

    const store = await this.prisma.store.findFirst({
      where: {
        sellerProfileId: profile.id,
        deletedAt: null
      },
      include: STORE_WITH_RELATIONS_INCLUDE
    });
    if (!store) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Active store record not found for this seller."
      );
    }

    return {
      sellerProfileId: profile.id,
      verificationStatus: profile.verificationStatus,
      store
    };
  }

  /**
   * Ensures both SellerProfile and Store are verified/active before publishing catalog supply.
   */
  async requireApprovedOwnStore(userId: string): Promise<StoreWithRelations> {
    const { verificationStatus, store } = await this.requireOwnStore(userId);
    if (verificationStatus !== "APPROVED" || store.status !== "ACTIVE") {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Your seller profile and store must be approved before creating catalog listings."
      );
    }
    return store;
  }
}
