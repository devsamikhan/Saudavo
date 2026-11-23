import { HttpStatus, Injectable } from "@nestjs/common";
import {
  ApproveDecisionRequest,
  ApproveListingRequest,
  ModerationQueueResponse,
  ModerationQueueResponseSchema,
  RejectDecisionRequest,
  RejectListingRequest,
  RoleCode,
  STAFF_ROLES,
  SuspendEntityRequest
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { DomainException } from "../../common/errors/domain.exception";
import { bigIntToSafeNumber } from "../../common/money.util";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { ClientMetadata } from "../auth/auth.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OutboxService } from "../outbox/outbox.service";

const STAFF_ROLE_SET = new Set<RoleCode>(STAFF_ROLES);

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly notificationsService: NotificationsService
  ) {}

  async getReviewQueue(requestId: string): Promise<ModerationQueueResponse> {
    const [pendingSellers, pendingProducts, pendingServices] =
      await Promise.all([
        this.prisma.sellerProfile.findMany({
          where: { verificationStatus: "PENDING_REVIEW" },
          include: {
            stores: {
              where: { deletedAt: null },
              take: 1
            }
          },
          orderBy: { createdAt: "asc" }
        }),
        this.prisma.product.findMany({
          where: { status: "PENDING_REVIEW", deletedAt: null },
          orderBy: { createdAt: "asc" }
        }),
        this.prisma.serviceListing.findMany({
          where: { status: "PENDING_REVIEW", deletedAt: null },
          orderBy: { createdAt: "asc" }
        })
      ]);

    return ModerationQueueResponseSchema.parse({
      data: {
        sellers: pendingSellers.map((sp) => {
          const store = sp.stores[0] ?? null;
          return {
            sellerProfileId: sp.id,
            userId: sp.userId,
            sellerType: sp.sellerType,
            verificationStatus: sp.verificationStatus,
            store: store
              ? {
                  id: store.id,
                  slug: store.slug,
                  displayName: store.displayName,
                  status: store.status
                }
              : null,
            createdAt: sp.createdAt.toISOString()
          };
        }),
        products: pendingProducts.map((p) => ({
          id: p.id,
          storeId: p.storeId,
          slug: p.slug,
          title: p.title,
          basePricePaisa: bigIntToSafeNumber(p.basePricePaisa, "basePricePaisa"),
          status: p.status,
          createdAt: p.createdAt.toISOString()
        })),
        services: pendingServices.map((s) => ({
          id: s.id,
          storeId: s.storeId,
          slug: s.slug,
          title: s.title,
          serviceMode: s.serviceMode,
          status: s.status,
          createdAt: s.createdAt.toISOString()
        }))
      },
      meta: { requestId }
    });
  }

  async approveSeller(
    sellerProfileId: string,
    auth: AuthContext,
    dto: ApproveDecisionRequest,
    client: ClientMetadata,
    requestId: string
  ): Promise<{
    data: {
      sellerProfileId: string;
      verificationStatus: "APPROVED";
      storeActivated: boolean;
    };
    meta: { requestId: string };
  }> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      include: {
        stores: {
          where: { deletedAt: null },
          take: 1
        }
      }
    });
    if (!profile) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Seller profile not found."
      );
    }
    if (profile.verificationStatus === "SUSPENDED") {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        "Suspended seller profiles cannot be directly approved."
      );
    }

    const now = new Date();
    const store = profile.stores[0] ?? null;
    const shouldActivateStore =
      store !== null &&
      (store.status === "PENDING_REVIEW" || store.status === "DRAFT");

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerProfile.update({
        where: { id: profile.id },
        data: {
          verificationStatus: "APPROVED",
          rejectionReason: null,
          ...(dto.notes !== undefined ? { moderationNotes: dto.notes } : {}),
          verifiedById: auth.userId,
          verifiedAt: now
        }
      });

      if (store && shouldActivateStore) {
        await tx.store.update({
          where: { id: store.id },
          data: { status: "ACTIVE" }
        });
      }

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: this.pickStaffRole(auth),
          action: "SELLER_APPROVED",
          targetType: "SellerProfile",
          targetId: profile.id,
          reason: dto.notes ?? null,
          beforeJson: {
            verificationStatus: profile.verificationStatus,
            storeStatus: store?.status ?? null
          },
          afterJson: {
            verificationStatus: "APPROVED",
            storeStatus: shouldActivateStore ? "ACTIVE" : (store?.status ?? null)
          },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );

      await this.outboxService.enqueue(
        {
          eventType: "SELLER_APPROVED",
          aggregateType: "SellerProfile",
          aggregateId: profile.id,
          payloadJson: {
            sellerProfileId: profile.id,
            storeId: store?.id ?? null
          }
        },
        tx
      );

      await this.notificationsService.notify(
        {
          userId: profile.userId,
          eventType: "SELLER_APPROVED",
          titleKey: "notification.sellerApproved",
          payloadJson: {
            sellerProfileId: profile.id,
            storeId: store?.id ?? null
          }
        },
        tx
      );
    });

    return {
      data: {
        sellerProfileId: profile.id,
        verificationStatus: "APPROVED",
        storeActivated: shouldActivateStore
      },
      meta: { requestId }
    };
  }

  async rejectSeller(
    sellerProfileId: string,
    auth: AuthContext,
    dto: RejectDecisionRequest,
    client: ClientMetadata,
    requestId: string
  ): Promise<{
    data: { sellerProfileId: string; verificationStatus: "REJECTED" };
    meta: { requestId: string };
  }> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      include: {
        stores: {
          where: { deletedAt: null },
          take: 1
        }
      }
    });
    if (!profile) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Seller profile not found."
      );
    }

    const store = profile.stores[0] ?? null;

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerProfile.update({
        where: { id: profile.id },
        data: {
          verificationStatus: "REJECTED",
          rejectionReason: dto.reason
        }
      });

      if (store && store.status === "PENDING_REVIEW") {
        await tx.store.update({
          where: { id: store.id },
          data: { status: "REJECTED" }
        });
      }

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: this.pickStaffRole(auth),
          action: "SELLER_REJECTED",
          targetType: "SellerProfile",
          targetId: profile.id,
          reason: dto.reason,
          beforeJson: { verificationStatus: profile.verificationStatus },
          afterJson: { verificationStatus: "REJECTED" },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );

      await this.outboxService.enqueue(
        {
          eventType: "SELLER_REJECTED",
          aggregateType: "SellerProfile",
          aggregateId: profile.id,
          payloadJson: { sellerProfileId: profile.id, reason: dto.reason }
        },
        tx
      );

      await this.notificationsService.notify(
        {
          userId: profile.userId,
          eventType: "SELLER_REJECTED",
          titleKey: "notification.sellerRejected",
          payloadJson: {
            sellerProfileId: profile.id,
            reason: dto.reason
          }
        },
        tx
      );
    });

    return {
      data: {
        sellerProfileId: profile.id,
        verificationStatus: "REJECTED"
      },
      meta: { requestId }
    };
  }

  async approveListing(
    listingId: string,
    auth: AuthContext,
    dto: ApproveListingRequest,
    client: ClientMetadata,
    requestId: string
  ): Promise<{
    data: { id: string; listingType: "PRODUCT" | "SERVICE"; status: "ACTIVE" };
    meta: { requestId: string };
  }> {
    const target = await this.resolveListingTarget(listingId, dto.listingType);

    await this.prisma.$transaction(async (tx) => {
      if (target.listingType === "PRODUCT") {
        await tx.product.update({
          where: { id: target.id },
          data: { status: "ACTIVE", rejectionReason: null }
        });
      } else {
        await tx.serviceListing.update({
          where: { id: target.id },
          data: { status: "ACTIVE", rejectionReason: null }
        });
      }

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: this.pickStaffRole(auth),
          action: "LISTING_APPROVED",
          targetType: target.listingType === "PRODUCT" ? "Product" : "ServiceListing",
          targetId: target.id,
          reason: dto.notes ?? null,
          beforeJson: { status: target.status },
          afterJson: { status: "ACTIVE" },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );

      await this.outboxService.enqueue(
        {
          eventType: "LISTING_APPROVED",
          aggregateType:
            target.listingType === "PRODUCT" ? "Product" : "ServiceListing",
          aggregateId: target.id,
          payloadJson: { listingType: target.listingType, storeId: target.storeId }
        },
        tx
      );

      const ownerStore = await tx.store.findUnique({
        where: { id: target.storeId },
        select: { sellerProfile: { select: { userId: true } } }
      });
      if (ownerStore?.sellerProfile.userId) {
        await this.notificationsService.notify(
          {
            userId: ownerStore.sellerProfile.userId,
            eventType: "LISTING_APPROVED",
            titleKey: "notification.listingApproved",
            payloadJson: {
              listingId: target.id,
              listingType: target.listingType
            }
          },
          tx
        );
      }
    });

    return {
      data: {
        id: target.id,
        listingType: target.listingType,
        status: "ACTIVE"
      },
      meta: { requestId }
    };
  }

  async rejectListing(
    listingId: string,
    auth: AuthContext,
    dto: RejectListingRequest,
    client: ClientMetadata,
    requestId: string
  ): Promise<{
    data: { id: string; listingType: "PRODUCT" | "SERVICE"; status: "REJECTED" };
    meta: { requestId: string };
  }> {
    const target = await this.resolveListingTarget(listingId, dto.listingType);

    await this.prisma.$transaction(async (tx) => {
      if (target.listingType === "PRODUCT") {
        await tx.product.update({
          where: { id: target.id },
          data: { status: "REJECTED", rejectionReason: dto.reason }
        });
      } else {
        await tx.serviceListing.update({
          where: { id: target.id },
          data: { status: "REJECTED", rejectionReason: dto.reason }
        });
      }

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: this.pickStaffRole(auth),
          action: "LISTING_REJECTED",
          targetType: target.listingType === "PRODUCT" ? "Product" : "ServiceListing",
          targetId: target.id,
          reason: dto.reason,
          beforeJson: { status: target.status },
          afterJson: { status: "REJECTED", rejectionReason: dto.reason },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );

      await this.outboxService.enqueue(
        {
          eventType: "LISTING_REJECTED",
          aggregateType:
            target.listingType === "PRODUCT" ? "Product" : "ServiceListing",
          aggregateId: target.id,
          payloadJson: {
            listingType: target.listingType,
            storeId: target.storeId,
            reason: dto.reason
          }
        },
        tx
      );

      const ownerStore = await tx.store.findUnique({
        where: { id: target.storeId },
        select: { sellerProfile: { select: { userId: true } } }
      });
      if (ownerStore?.sellerProfile.userId) {
        await this.notificationsService.notify(
          {
            userId: ownerStore.sellerProfile.userId,
            eventType: "LISTING_REJECTED",
            titleKey: "notification.listingRejected",
            payloadJson: {
              listingId: target.id,
              listingType: target.listingType,
              reason: dto.reason
            }
          },
          tx
        );
      }
    });

    return {
      data: {
        id: target.id,
        listingType: target.listingType,
        status: "REJECTED"
      },
      meta: { requestId }
    };
  }

  async suspendStore(
    storeId: string,
    auth: AuthContext,
    dto: SuspendEntityRequest,
    client: ClientMetadata,
    requestId: string
  ): Promise<{
    data: { storeId: string; status: "SUSPENDED" };
    meta: { requestId: string };
  }> {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, deletedAt: null }
    });
    if (!store) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Store not found."
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.store.update({
        where: { id: store.id },
        data: { status: "SUSPENDED" }
      });

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: this.pickStaffRole(auth),
          action: "STORE_SUSPENDED",
          targetType: "Store",
          targetId: store.id,
          reason: dto.reason,
          beforeJson: { status: store.status },
          afterJson: { status: "SUSPENDED" },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );

      await this.outboxService.enqueue(
        {
          eventType: "STORE_SUSPENDED",
          aggregateType: "Store",
          aggregateId: store.id,
          payloadJson: { storeId: store.id, reason: dto.reason }
        },
        tx
      );
    });

    return {
      data: { storeId: store.id, status: "SUSPENDED" },
      meta: { requestId }
    };
  }

  private async resolveListingTarget(
    listingId: string,
    preferredType?: "PRODUCT" | "SERVICE"
  ): Promise<{
    id: string;
    storeId: string;
    status: string;
    listingType: "PRODUCT" | "SERVICE";
  }> {
    if (preferredType === "PRODUCT" || preferredType === undefined) {
      const product = await this.prisma.product.findFirst({
        where: { id: listingId, deletedAt: null },
        select: { id: true, storeId: true, status: true }
      });
      if (product) {
        return { ...product, listingType: "PRODUCT" };
      }
      if (preferredType === "PRODUCT") {
        throw new DomainException(
          "NOT_FOUND",
          HttpStatus.NOT_FOUND,
          "Product listing not found."
        );
      }
    }

    const service = await this.prisma.serviceListing.findFirst({
      where: { id: listingId, deletedAt: null },
      select: { id: true, storeId: true, status: true }
    });
    if (service) {
      return { ...service, listingType: "SERVICE" };
    }

    throw new DomainException(
      "NOT_FOUND",
      HttpStatus.NOT_FOUND,
      "Listing not found."
    );
  }

  private pickStaffRole(auth: AuthContext): RoleCode {
    return auth.roles.find((r) => STAFF_ROLE_SET.has(r)) ?? "ADMIN";
  }
}
