import { HttpStatus, Injectable } from "@nestjs/common";
import {
  CreateDisputeRequest,
  CreateReportRequest,
  CreateReviewRequest,
  DisputeDto,
  DisputeDtoSchema,
  ReportDto,
  ReportDtoSchema,
  ResolveDisputeRequest,
  ResolveReportRequest,
  ReviewDto,
  ReviewDtoSchema,
  RoleCode,
  STAFF_ROLES
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { DomainException } from "../../common/errors/domain.exception";
import { bigIntToSafeNumber } from "../../common/money.util";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { ClientMetadata } from "../auth/auth.service";
import { FinanceService } from "../finance/finance.service";
import { OutboxService } from "../outbox/outbox.service";

const STAFF_ROLE_SET = new Set<RoleCode>(STAFF_ROLES);

@Injectable()
export class TrustService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService
  ) {}

  async createReview(
    userId: string,
    orderId: string,
    dto: CreateReviewRequest,
    requestId: string
  ): Promise<{ data: ReviewDto; meta: { requestId: string } }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: {
        items: true,
        store: {
          include: {
            sellerProfile: true
          }
        }
      }
    });

    if (!order) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Order not found."
      );
    }

    if (order.store.sellerProfile.userId === userId) {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Sellers cannot review their own store."
      );
    }

    if (order.status !== "COMPLETED") {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        "Reviews can only be submitted after an order reaches COMPLETED."
      );
    }

    let targetOrderItemId: string | null = null;
    if (order.orderType === "PHYSICAL") {
      if (!dto.orderItemId) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "orderItemId is required when reviewing a physical product order."
        );
      }
      const matchedItem = order.items.find((i) => i.id === dto.orderItemId);
      if (!matchedItem) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "Selected orderItemId does not belong to this order."
        );
      }
      targetOrderItemId = matchedItem.id;
    }

    const existing = await this.prisma.review.findFirst({
      where:
        targetOrderItemId !== null
          ? { orderItemId: targetOrderItemId }
          : { orderId: order.id, orderItemId: null }
    });
    if (existing) {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        "A review has already been submitted for this order item."
      );
    }

    const created = await this.prisma.review.create({
      data: {
        orderId: order.id,
        orderItemId: targetOrderItemId,
        storeId: order.storeId,
        customerId: userId,
        rating: dto.rating,
        comment: dto.comment ?? null,
        status: "PUBLISHED"
      },
      include: {
        customer: true
      }
    });

    return {
      data: ReviewDtoSchema.parse({
        id: created.id,
        orderId: created.orderId,
        orderItemId: created.orderItemId,
        storeId: created.storeId,
        rating: created.rating,
        comment: created.comment,
        status: created.status,
        reviewerDisplayName: created.customer.displayName,
        createdAt: created.createdAt.toISOString()
      }),
      meta: { requestId }
    };
  }

  async listStoreReviews(
    slug: string,
    requestId: string
  ): Promise<{ data: ReviewDto[]; meta: { requestId: string } }> {
    const store = await this.prisma.store.findFirst({
      where: {
        slug,
        status: "ACTIVE",
        deletedAt: null,
        sellerProfile: { verificationStatus: "APPROVED" }
      }
    });
    if (!store) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Store not found."
      );
    }

    const reviews = await this.prisma.review.findMany({
      where: { storeId: store.id, status: "PUBLISHED" },
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });

    return {
      data: reviews.map((r) =>
        ReviewDtoSchema.parse({
          id: r.id,
          orderId: r.orderId,
          orderItemId: r.orderItemId,
          storeId: r.storeId,
          rating: r.rating,
          comment: r.comment,
          status: r.status,
          reviewerDisplayName: r.customer.displayName,
          createdAt: r.createdAt.toISOString()
        })
      ),
      meta: { requestId }
    };
  }

  async createReport(
    userId: string,
    dto: CreateReportRequest,
    requestId: string
  ): Promise<{ data: ReportDto; meta: { requestId: string } }> {
    const created = await this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          reporterId: userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          reasonCode: dto.reasonCode,
          details: dto.details,
          status: "OPEN"
        }
      });

      await this.outboxService.enqueue(
        {
          eventType: "ABUSE_REPORT_SUBMITTED",
          aggregateType: "Report",
          aggregateId: report.id,
          payloadJson: {
            reportId: report.id,
            targetType: report.targetType,
            targetId: report.targetId,
            reasonCode: report.reasonCode
          }
        },
        tx
      );

      return report;
    });

    return {
      data: this.toReportDto(created),
      meta: { requestId }
    };
  }

  async listAdminReports(
    requestId: string
  ): Promise<{ data: ReportDto[]; meta: { requestId: string } }> {
    const reports = await this.prisma.report.findMany({
      orderBy: { createdAt: "desc" }
    });
    return {
      data: reports.map((r) => this.toReportDto(r)),
      meta: { requestId }
    };
  }

  async resolveReport(
    reportId: string,
    auth: AuthContext,
    dto: ResolveReportRequest,
    client: ClientMetadata,
    requestId: string
  ): Promise<{ data: ReportDto; meta: { requestId: string } }> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId }
    });
    if (!report) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Report not found."
      );
    }

    const nextStatus = dto.action === "DISMISSED" ? "DISMISSED" : "RESOLVED";

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.report.update({
        where: { id: report.id },
        data: {
          status: nextStatus,
          resolvedById: auth.userId,
          resolutionNote: dto.resolutionNote
        }
      });

      if (dto.action === "CONTENT_HIDDEN" && report.targetType === "REVIEW") {
        await tx.review.updateMany({
          where: { id: report.targetId },
          data: { status: "HIDDEN" }
        });
      }

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: this.pickStaffRole(auth),
          action: "REPORT_RESOLVED",
          targetType: "Report",
          targetId: report.id,
          reason: dto.resolutionNote,
          beforeJson: { status: report.status },
          afterJson: { status: nextStatus, action: dto.action },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );

      return saved;
    });

    return {
      data: this.toReportDto(updated),
      meta: { requestId }
    };
  }

  async createDispute(
    userId: string,
    orderId: string,
    dto: CreateDisputeRequest,
    requestId: string
  ): Promise<{ data: DisputeDto; meta: { requestId: string } }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      include: {
        store: {
          include: { sellerProfile: true }
        }
      }
    });

    if (!order) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Order not found."
      );
    }

    let openerRole: "CUSTOMER" | "SELLER";
    if (order.customerId === userId) {
      openerRole = "CUSTOMER";
    } else if (order.store.sellerProfile.userId === userId) {
      openerRole = "SELLER";
    } else {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Only the customer or seller party can open a dispute."
      );
    }

    if (
      order.status === "PENDING_CONFIRMATION" ||
      order.status === "CANCELLED"
    ) {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        `Cannot open a dispute while order is ${order.status}.`
      );
    }

    const activeDispute = await this.prisma.dispute.findFirst({
      where: {
        orderId: order.id,
        status: { in: ["OPEN", "UNDER_REVIEW"] }
      }
    });
    if (activeDispute) {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        "An active dispute already exists for this order."
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.create({
        data: {
          orderId: order.id,
          openedById: userId,
          disputeType: dto.disputeType,
          description: dto.description,
          status: "OPEN"
        }
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "DISPUTED" }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "DISPUTED",
          actorId: userId,
          actorRole: openerRole,
          reason: `${dto.disputeType}: ${dto.description}`
        }
      });

      await this.outboxService.enqueue(
        {
          eventType: "ORDER_DISPUTE_OPENED",
          aggregateType: "Dispute",
          aggregateId: dispute.id,
          payloadJson: {
            disputeId: dispute.id,
            orderId: order.id,
            disputeType: dispute.disputeType
          }
        },
        tx
      );

      return dispute;
    });

    return {
      data: this.toDisputeDto(created),
      meta: { requestId }
    };
  }

  async listAdminDisputes(
    requestId: string
  ): Promise<{ data: DisputeDto[]; meta: { requestId: string } }> {
    const disputes = await this.prisma.dispute.findMany({
      orderBy: { createdAt: "desc" }
    });
    return {
      data: disputes.map((d) => this.toDisputeDto(d)),
      meta: { requestId }
    };
  }

  async resolveDispute(
    disputeId: string,
    auth: AuthContext,
    dto: ResolveDisputeRequest,
    client: ClientMetadata,
    requestId: string
  ): Promise<{ data: DisputeDto; meta: { requestId: string } }> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId }
    });
    if (!dispute) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Dispute not found."
      );
    }
    if (dispute.status === "RESOLVED") {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        "This dispute is already resolved."
      );
    }

    const order = await this.prisma.order.findFirst({
      where: { id: dispute.orderId },
      include: { payments: true }
    });
    if (!order) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Associated order not found."
      );
    }

    const orderTotalNum = bigIntToSafeNumber(order.totalPaisa, "totalPaisa");
    const isRefundOutcome =
      dto.resolutionOutcome === "CANCEL_WITH_FULL_REFUND" ||
      dto.resolutionOutcome === "PARTIAL_REFUND";

    const refundAmountPaisa =
      dto.resolutionOutcome === "CANCEL_WITH_FULL_REFUND"
        ? order.totalPaisa
        : dto.resolutionOutcome === "PARTIAL_REFUND"
          ? BigInt(dto.refundAmountPaisa ?? 0)
          : 0n;

    if (
      isRefundOutcome &&
      (refundAmountPaisa <= 0n || refundAmountPaisa > order.totalPaisa)
    ) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        `Refund amount must be between 1 and ${String(orderTotalNum)} paisa.`
      );
    }

    const staffRole = this.pickStaffRole(auth);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const savedDispute = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: "RESOLVED",
          resolutionOutcome: dto.resolutionOutcome,
          resolvedById: auth.userId,
          resolutionNote: dto.resolutionNote
        }
      });

      const isFullRefund = dto.resolutionOutcome === "CANCEL_WITH_FULL_REFUND";
      const nextOrderStatus = isFullRefund ? "CANCELLED" : "COMPLETED";

      if (isRefundOutcome) {
        const payment = order.payments[0];
        if (!payment) {
          throw new DomainException(
            "INTERNAL_SERVER_ERROR",
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Payment record missing for disputed order."
          );
        }

        await tx.refund.create({
          data: {
            orderId: order.id,
            paymentId: payment.id,
            amountPaisa: refundAmountPaisa,
            reason: dto.resolutionNote,
            status: "RECORDED",
            approvedById: auth.userId
          }
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: nextOrderStatus,
            ...(isFullRefund
              ? {
                  codCollectionStatus: "REFUNDED",
                  cancelledReason: dto.resolutionNote
                }
              : { completedAt: order.completedAt ?? now })
          }
        });

        await this.financeService.postCommissionAdjustmentOnRefund(
          {
            order: {
              id: order.id,
              storeId: order.storeId,
              totalPaisa: order.totalPaisa,
              subtotalPaisa: order.subtotalPaisa,
              discountPaisa: order.discountPaisa,
              commissionRuleId: order.commissionRuleId,
              commissionRateBps: order.commissionRateBps,
              commissionAmountPaisa: order.commissionAmountPaisa,
              sellerNetEntitlementPaisa: order.sellerNetEntitlementPaisa
            },
            refundAmountPaisa,
            isFullRefund,
            reason: `Dispute ${dispute.id} (${dto.resolutionOutcome}): ${dto.resolutionNote}`,
            actorId: auth.userId
          },
          tx
        );
      } else {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "COMPLETED",
            completedAt: order.completedAt ?? now
          }
        });

        await this.financeService.postCommissionAccrualIfEligible(
          {
            id: order.id,
            storeId: order.storeId,
            status: "COMPLETED",
            codCollectionStatus: order.codCollectionStatus,
            subtotalPaisa: order.subtotalPaisa,
            discountPaisa: order.discountPaisa,
            totalPaisa: order.totalPaisa,
            commissionRuleId: order.commissionRuleId,
            commissionRateBps: order.commissionRateBps,
            commissionAmountPaisa: order.commissionAmountPaisa,
            sellerNetEntitlementPaisa: order.sellerNetEntitlementPaisa
          },
          auth.userId,
          tx
        );
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: nextOrderStatus,
          actorId: auth.userId,
          actorRole: staffRole,
          reason: `Dispute resolved (${dto.resolutionOutcome}): ${dto.resolutionNote}`
        }
      });

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: staffRole,
          action: "DISPUTE_RESOLVED",
          targetType: "Dispute",
          targetId: dispute.id,
          reason: dto.resolutionNote,
          beforeJson: {
            disputeStatus: dispute.status,
            orderStatus: order.status
          },
          afterJson: {
            disputeStatus: "RESOLVED",
            resolutionOutcome: dto.resolutionOutcome,
            orderStatus: nextOrderStatus
          },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );

      await this.outboxService.enqueue(
        {
          eventType: "ORDER_DISPUTE_RESOLVED",
          aggregateType: "Dispute",
          aggregateId: dispute.id,
          payloadJson: {
            disputeId: dispute.id,
            orderId: order.id,
            resolutionOutcome: dto.resolutionOutcome
          }
        },
        tx
      );

      return savedDispute;
    });

    return {
      data: this.toDisputeDto(updated),
      meta: { requestId }
    };
  }

  private toReportDto(row: {
    id: string;
    reporterId: string;
    targetType: string;
    targetId: string;
    reasonCode: string;
    details: string;
    status: string;
    resolutionNote: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ReportDto {
    return ReportDtoSchema.parse({
      id: row.id,
      reporterId: row.reporterId,
      targetType: row.targetType,
      targetId: row.targetId,
      reasonCode: row.reasonCode,
      details: row.details,
      status: row.status,
      resolutionNote: row.resolutionNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    });
  }

  private toDisputeDto(row: {
    id: string;
    orderId: string;
    openedById: string;
    disputeType: string;
    description: string;
    status: string;
    resolutionOutcome: string | null;
    resolutionNote: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): DisputeDto {
    return DisputeDtoSchema.parse({
      id: row.id,
      orderId: row.orderId,
      openedById: row.openedById,
      disputeType: row.disputeType,
      description: row.description,
      status: row.status,
      resolutionOutcome: row.resolutionOutcome,
      resolutionNote: row.resolutionNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    });
  }

  private pickStaffRole(auth: AuthContext): RoleCode {
    return auth.roles.find((r) => STAFF_ROLE_SET.has(r)) ?? "ADMIN";
  }
}
