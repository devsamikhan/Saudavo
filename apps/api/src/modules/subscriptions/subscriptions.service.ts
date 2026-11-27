import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  type BillingInstructionsDto,
  type ReviewSubscriptionRenewalRequest,
  type RoleCode,
  STAFF_ROLES,
  type StoreSubscriptionSummaryDto,
  StoreSubscriptionSummaryDtoSchema,
  type SubmitSubscriptionRenewalRequest,
  type SubscriptionPlanDto,
  SubscriptionPlanDtoSchema,
  type SubscriptionRenewalRequestDto,
  SubscriptionRenewalRequestDtoSchema,
  type SubscriptionStatus
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { DomainException } from "../../common/errors/domain.exception";
import { bigIntToSafeNumber } from "../../common/money.util";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { ClientMetadata } from "../auth/auth.service";
import { FeatureFlagsService } from "../features/feature-flags.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OutboxService } from "../outbox/outbox.service";
import { SellerService } from "../seller/seller.service";

const STAFF_ROLE_SET = new Set<RoleCode>(STAFF_ROLES);
const GRACE_PERIOD_DAYS = 7;

const DEFAULT_STARTER_LIMITS = {
  code: "FREE_STARTER",
  nameEn: "Free Starter Store",
  nameUr: "مفت اسٹارٹر اسٹور",
  descriptionEn:
    "Launch free in Mianwali with up to 5 products, 2 services, and Saudavo Messenger custom offers.",
  descriptionUr:
    "میانوالی میں 5 مصنوعات، 2 سروسز اور سوداو میسنجر کسٹم آفرز کے ساتھ مفت شروعات۔",
  pricePaisa: 0n,
  durationDays: 30,
  maxActiveProducts: 5,
  maxActiveServices: 2,
  hasVerifiedBadge: false,
  hasPriorityPlacement: false,
  hasCustomOffers: true,
  sortOrder: 10
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sellerService: SellerService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly notificationsService: NotificationsService,
    private readonly featureFlags: FeatureFlagsService
  ) {}

  getBillingInstructions(): BillingInstructionsDto {
    return {
      accountTitle:
        process.env.SAUDAVO_BILLING_ACCOUNT_TITLE?.trim() || "Saudavo Marketplace",
      raastId:
        process.env.SAUDAVO_BILLING_RAAST_ID?.trim() ||
        "Configure SAUDAVO_BILLING_RAAST_ID in .env before public billing",
      walletNumber:
        process.env.SAUDAVO_BILLING_WALLET_NUMBER?.trim() ||
        "Configure JazzCash/Easypaisa wallet in .env",
      note:
        "Zero-gateway manual transfer: send your monthly plan fee via Raast, JazzCash, Easypaisa, or Bank Transfer and enter your Transaction Reference ID for Admin verification."
    };
  }

  async listPlans(
    requestId: string
  ): Promise<{ data: SubscriptionPlanDto[]; meta: { requestId: string } }> {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    });

    return {
      data: plans.map((p) => this.toPlanDto(p)),
      meta: { requestId }
    };
  }

  async getSellerSubscription(
    userId: string,
    requestId: string
  ): Promise<{ data: StoreSubscriptionSummaryDto; meta: { requestId: string } }> {
    await this.featureFlags.assertEnabled(
      "seller_subscriptions_enabled",
      "Monthly Seller Subscriptions"
    );
    const { store } = await this.sellerService.requireOwnStore(userId);
    const sub = await this.ensureStoreSubscription(store.id);
    const evaluatedStatus = await this.evaluateAndSyncSubscriptionStatus(sub);

    const [activeProductCount, activeServiceCount, renewals] = await Promise.all([
      this.prisma.product.count({
        where: {
          storeId: store.id,
          deletedAt: null,
          status: { not: "ARCHIVED" }
        }
      }),
      this.prisma.serviceListing.count({
        where: {
          storeId: store.id,
          deletedAt: null,
          status: { not: "ARCHIVED" }
        }
      }),
      this.prisma.subscriptionRenewalRequest.findMany({
        where: { storeId: store.id },
        include: {
          plan: true
        },
        orderBy: { createdAt: "desc" },
        take: 15
      })
    ]);

    return {
      data: StoreSubscriptionSummaryDtoSchema.parse({
        storeId: store.id,
        status: evaluatedStatus,
        currentPeriodStart: sub.currentPeriodStart.toISOString(),
        currentPeriodEnd: sub.currentPeriodEnd
          ? sub.currentPeriodEnd.toISOString()
          : null,
        graceEndsAt: sub.graceEndsAt ? sub.graceEndsAt.toISOString() : null,
        plan: this.toPlanDto(sub.plan),
        activeProductCount,
        activeServiceCount,
        billingInstructions: this.getBillingInstructions(),
        renewals: renewals.map((r) => this.toRenewalDto(r))
      }),
      meta: { requestId }
    };
  }

  async submitRenewalRequest(
    userId: string,
    dto: SubmitSubscriptionRenewalRequest,
    requestId: string
  ): Promise<{
    data: SubscriptionRenewalRequestDto;
    meta: { requestId: string };
  }> {
    await this.featureFlags.assertEnabled(
      "seller_subscriptions_enabled",
      "Monthly Seller Subscriptions"
    );
    const { store } = await this.sellerService.requireOwnStore(userId);

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: dto.planCode, isActive: true }
    });
    if (!plan || plan.pricePaisa <= 0n) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Selected paid monthly plan was not found."
      );
    }

    const existingPending =
      await this.prisma.subscriptionRenewalRequest.findFirst({
        where: {
          storeId: store.id,
          status: "PENDING"
        }
      });
    if (existingPending) {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        "A subscription renewal request is already awaiting admin review for your store."
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const reqRecord = await tx.subscriptionRenewalRequest.create({
        data: {
          storeId: store.id,
          planId: plan.id,
          submittedById: userId,
          amountPaisa: plan.pricePaisa,
          currency: "PKR",
          paymentMethod: dto.paymentMethod,
          transactionReference: dto.transactionReference,
          payerAccountNote: dto.payerAccountNote ?? null,
          status: "PENDING"
        },
        include: {
          plan: true,
          store: true
        }
      });

      await this.outboxService.enqueue(
        {
          eventType: "SUBSCRIPTION_RENEWAL_SUBMITTED",
          aggregateType: "SubscriptionRenewalRequest",
          aggregateId: reqRecord.id,
          payloadJson: {
            renewalId: reqRecord.id,
            storeId: store.id,
            planCode: plan.code
          }
        },
        tx
      );

      return reqRecord;
    });

    return {
      data: this.toRenewalDto(created),
      meta: { requestId }
    };
  }

  async listAdminRenewals(
    requestId: string
  ): Promise<{
    data: SubscriptionRenewalRequestDto[];
    meta: { requestId: string };
  }> {
    const rows = await this.prisma.subscriptionRenewalRequest.findMany({
      include: {
        store: true,
        plan: true
      },
      orderBy: [{ createdAt: "desc" }],
      take: 60
    });

    const sorted = [...rows].sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (a.status !== "PENDING" && b.status === "PENDING") return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return {
      data: sorted.map((r) => this.toRenewalDto(r)),
      meta: { requestId }
    };
  }

  async reviewAdminRenewal(
    renewalId: string,
    auth: AuthContext,
    dto: ReviewSubscriptionRenewalRequest,
    client: ClientMetadata,
    requestId: string
  ): Promise<{
    data: SubscriptionRenewalRequestDto;
    meta: { requestId: string };
  }> {
    const existing = await this.prisma.subscriptionRenewalRequest.findUnique({
      where: { id: renewalId },
      include: {
        store: {
          include: {
            sellerProfile: true
          }
        },
        plan: true
      }
    });

    if (!existing) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Subscription renewal request not found."
      );
    }

    if (existing.status !== "PENDING") {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        "This renewal request has already been reviewed."
      );
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const reviewed = await tx.subscriptionRenewalRequest.update({
        where: { id: existing.id },
        data: {
          status: dto.decision,
          reviewedById: auth.userId,
          reviewedAt: now,
          reviewNote: dto.reviewNote ?? null
        },
        include: {
          store: true,
          plan: true
        }
      });

      if (dto.decision === "APPROVED") {
        const currentSub = await tx.storeSubscription.findUnique({
          where: { storeId: existing.storeId }
        });

        const baseStart =
          currentSub?.currentPeriodEnd &&
          currentSub.planId === existing.planId &&
          currentSub.currentPeriodEnd.getTime() > now.getTime()
            ? currentSub.currentPeriodEnd
            : now;

        const nextPeriodEnd = new Date(
          baseStart.getTime() + existing.plan.durationDays * 24 * 60 * 60 * 1000
        );
        const nextGraceEnds = new Date(
          nextPeriodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
        );

        await tx.storeSubscription.upsert({
          where: { storeId: existing.storeId },
          update: {
            planId: existing.planId,
            status: "ACTIVE",
            currentPeriodStart: currentSub?.currentPeriodStart ?? now,
            currentPeriodEnd: nextPeriodEnd,
            graceEndsAt: nextGraceEnds
          },
          create: {
            storeId: existing.storeId,
            planId: existing.planId,
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: nextPeriodEnd,
            graceEndsAt: nextGraceEnds
          }
        });
      }

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: this.pickStaffRole(auth),
          action:
            dto.decision === "APPROVED"
              ? "SUBSCRIPTION_RENEWAL_APPROVED"
              : "SUBSCRIPTION_RENEWAL_REJECTED",
          targetType: "SubscriptionRenewalRequest",
          targetId: existing.id,
          reason:
            dto.reviewNote ??
            `Subscription renewal ${dto.decision.toLowerCase()} for ${existing.plan.code}.`,
          afterJson: {
            storeId: existing.storeId,
            planCode: existing.plan.code,
            decision: dto.decision
          },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );

      await this.notificationsService.notify(
        {
          userId: existing.store.sellerProfile.userId,
          eventType:
            dto.decision === "APPROVED"
              ? "SUBSCRIPTION_ACTIVATED"
              : "SUBSCRIPTION_RENEWAL_REJECTED",
          titleKey:
            dto.decision === "APPROVED"
              ? "notification.subscriptionActivated"
              : "notification.subscriptionRejected",
          payloadJson: {
            storeId: existing.storeId,
            planCode: existing.plan.code,
            decision: dto.decision
          }
        },
        tx
      );

      return reviewed;
    });

    return {
      data: this.toRenewalDto(updated),
      meta: { requestId }
    };
  }

  /**
   * Enforces starter vs paid monthly listing limits without blocking stores when plans are unseeded.
   */
  async assertCanCreateListing(
    storeId: string,
    kind: "PRODUCT" | "SERVICE",
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    if (!(await this.featureFlags.isEnabled("seller_subscriptions_enabled"))) {
      return;
    }
    const db = tx ?? this.prisma;
    const sub = await db.storeSubscription.findUnique({
      where: { storeId },
      include: { plan: true }
    });

    let maxProducts = DEFAULT_STARTER_LIMITS.maxActiveProducts;
    let maxServices = DEFAULT_STARTER_LIMITS.maxActiveServices;
    let planName = DEFAULT_STARTER_LIMITS.nameEn;

    if (sub) {
      const effectiveStatus = this.computeStatusAt(sub, new Date());
      if (effectiveStatus !== "EXPIRED" || sub.plan.pricePaisa === 0n) {
        maxProducts = sub.plan.maxActiveProducts;
        maxServices = sub.plan.maxActiveServices;
        planName = sub.plan.nameEn;
      }
    } else {
      const starter = await db.subscriptionPlan.findUnique({
        where: { code: "FREE_STARTER" }
      });
      if (starter) {
        maxProducts = starter.maxActiveProducts;
        maxServices = starter.maxActiveServices;
        planName = starter.nameEn;
      }
    }

    if (kind === "PRODUCT") {
      const count = await db.product.count({
        where: { storeId, deletedAt: null, status: { not: "ARCHIVED" } }
      });
      if (count >= maxProducts) {
        throw new DomainException(
          "PLAN_LIMIT_REACHED",
          HttpStatus.FORBIDDEN,
          `Your current plan (${planName}) allows up to ${String(maxProducts)} active products. Upgrade in Seller Studio -> Monthly Plan to add more listings.`
        );
      }
      return;
    }

    const serviceCount = await db.serviceListing.count({
      where: { storeId, deletedAt: null, status: { not: "ARCHIVED" } }
    });
    if (serviceCount >= maxServices) {
      throw new DomainException(
        "PLAN_LIMIT_REACHED",
        HttpStatus.FORBIDDEN,
        `Your current plan (${planName}) allows up to ${String(maxServices)} active services. Upgrade in Seller Studio -> Monthly Plan to add more services.`
      );
    }
  }

  async isStoreProVerified(storeId: string): Promise<boolean> {
    if (!(await this.featureFlags.isEnabled("seller_subscriptions_enabled"))) {
      return false;
    }
    const sub = await this.prisma.storeSubscription.findUnique({
      where: { storeId },
      include: { plan: true }
    });
    if (!sub || !sub.plan.hasVerifiedBadge) {
      return false;
    }
    return this.computeStatusAt(sub, new Date()) !== "EXPIRED";
  }

  async ensureStoreSubscription(storeId: string) {
    const existing = await this.prisma.storeSubscription.findUnique({
      where: { storeId },
      include: { plan: true }
    });
    if (existing) {
      return existing;
    }

    const starterPlan = await this.prisma.subscriptionPlan.upsert({
      where: { code: DEFAULT_STARTER_LIMITS.code },
      update: {},
      create: {
        ...DEFAULT_STARTER_LIMITS,
        currency: "PKR",
        isActive: true
      }
    });

    return this.prisma.storeSubscription.create({
      data: {
        storeId,
        planId: starterPlan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
        graceEndsAt: null
      },
      include: { plan: true }
    });
  }

  private computeStatusAt(
    sub: {
      status: string;
      currentPeriodEnd: Date | null;
      graceEndsAt: Date | null;
      plan: { pricePaisa: bigint };
    },
    now: Date
  ): SubscriptionStatus {
    if (sub.plan.pricePaisa === 0n || !sub.currentPeriodEnd) {
      return "ACTIVE";
    }
    if (now.getTime() <= sub.currentPeriodEnd.getTime()) {
      return "ACTIVE";
    }
    if (sub.graceEndsAt && now.getTime() <= sub.graceEndsAt.getTime()) {
      return "GRACE_PERIOD";
    }
    return "EXPIRED";
  }

  private async evaluateAndSyncSubscriptionStatus(sub: {
    id: string;
    status: string;
    currentPeriodEnd: Date | null;
    graceEndsAt: Date | null;
    plan: { pricePaisa: bigint };
  }): Promise<SubscriptionStatus> {
    const nextStatus = this.computeStatusAt(sub, new Date());
    if (nextStatus !== sub.status) {
      await this.prisma.storeSubscription.update({
        where: { id: sub.id },
        data: { status: nextStatus }
      });
    }
    return nextStatus;
  }

  private toPlanDto(plan: {
    id: string;
    code: string;
    nameEn: string;
    nameUr: string;
    descriptionEn: string;
    descriptionUr: string;
    pricePaisa: bigint;
    currency: string;
    durationDays: number;
    maxActiveProducts: number;
    maxActiveServices: number;
    hasVerifiedBadge: boolean;
    hasPriorityPlacement: boolean;
    hasCustomOffers: boolean;
    isActive: boolean;
    sortOrder: number;
  }): SubscriptionPlanDto {
    return SubscriptionPlanDtoSchema.parse({
      id: plan.id,
      code: plan.code,
      nameEn: plan.nameEn,
      nameUr: plan.nameUr,
      descriptionEn: plan.descriptionEn,
      descriptionUr: plan.descriptionUr,
      pricePaisa: bigIntToSafeNumber(plan.pricePaisa, "pricePaisa"),
      currency: plan.currency,
      durationDays: plan.durationDays,
      maxActiveProducts: plan.maxActiveProducts,
      maxActiveServices: plan.maxActiveServices,
      hasVerifiedBadge: plan.hasVerifiedBadge,
      hasPriorityPlacement: plan.hasPriorityPlacement,
      hasCustomOffers: plan.hasCustomOffers,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder
    });
  }

  private toRenewalDto(row: {
    id: string;
    storeId: string;
    planId: string;
    amountPaisa: bigint;
    currency: string;
    paymentMethod: string;
    transactionReference: string;
    payerAccountNote: string | null;
    status: string;
    reviewNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    store?: { displayName: string } | null;
    plan?: { code: string; nameEn: string } | null;
  }): SubscriptionRenewalRequestDto {
    return SubscriptionRenewalRequestDtoSchema.parse({
      id: row.id,
      storeId: row.storeId,
      ...(row.store ? { storeDisplayName: row.store.displayName } : {}),
      planId: row.planId,
      ...(row.plan ? { planCode: row.plan.code, planNameEn: row.plan.nameEn } : {}),
      amountPaisa: bigIntToSafeNumber(row.amountPaisa, "amountPaisa"),
      currency: row.currency,
      paymentMethod: row.paymentMethod,
      transactionReference: row.transactionReference,
      payerAccountNote: row.payerAccountNote,
      status: row.status,
      reviewNote: row.reviewNote,
      reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString()
    });
  }

  private pickStaffRole(auth: AuthContext): RoleCode {
    return auth.roles.find((r) => STAFF_ROLE_SET.has(r)) ?? "ADMIN";
  }
}
