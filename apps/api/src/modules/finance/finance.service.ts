import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  calculateCommissionPaisa,
  calculateSellerNetEntitlementPaisa,
  CommissionLedgerEntryDto,
  CommissionLedgerEntryDtoSchema,
  CommissionRuleDto,
  CommissionRuleDtoSchema,
  CommissionSummaryDto,
  CommissionSummaryDtoSchema,
  CreateCommissionRuleRequest,
  CreateSettlementRecordRequest,
  OrderType,
  RoleCode,
  SellerSettlementRecordDto,
  SellerSettlementRecordDtoSchema,
  STAFF_ROLES
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { DomainException } from "../../common/errors/domain.exception";
import { bigIntToSafeNumber } from "../../common/money.util";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { ClientMetadata } from "../auth/auth.service";
import { OutboxService } from "../outbox/outbox.service";
import { SellerService } from "../seller/seller.service";

const STAFF_ROLE_SET = new Set<RoleCode>(STAFF_ROLES);

export interface OrderFinancialCalculation {
  commissionRuleId: string;
  commissionRateBps: number;
  commissionableBasePaisa: bigint;
  commissionAmountPaisa: bigint;
  totalPaisa: bigint;
  sellerNetEntitlementPaisa: bigint;
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sellerService: SellerService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService
  ) {}

  /**
   * PQ-15: Resolves single order-level ORDER_TYPE or GLOBAL rule. Never mixes item-level rules in MVP.
   */
  async resolveApplicableRule(
    orderType: OrderType,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.prisma;
    const now = new Date();
    const candidates = await db.commissionRule.findMany({
      where: {
        isActive: true,
        effectiveFrom: { lte: now }
      },
      orderBy: { version: "desc" }
    });

    const activeValid = candidates.filter(
      (rule) => rule.effectiveTo === null || rule.effectiveTo.getTime() > now.getTime()
    );

    const orderTypeRule = activeValid.find(
      (rule) => rule.scopeType === "ORDER_TYPE" && rule.orderType === orderType
    );
    if (orderTypeRule) {
      return orderTypeRule;
    }

    const globalRule = activeValid.find((rule) => rule.scopeType === "GLOBAL");
    if (globalRule) {
      return globalRule;
    }

    throw new DomainException(
      "INTERNAL_SERVER_ERROR",
      HttpStatus.INTERNAL_SERVER_ERROR,
      "No active commission rule is configured."
    );
  }

  /**
   * PQ-02 & PQ-13: Excludes deliveryFeePaisa from commission calculation; retains full delivery fee in seller net entitlement.
   */
  calculateOrderFinancials(input: {
    subtotalPaisa: bigint;
    deliveryFeePaisa: bigint;
    discountPaisa: bigint;
    commissionRuleId: string;
    rateBps: number;
  }): OrderFinancialCalculation {
    const commissionableBasePaisa = input.subtotalPaisa - input.discountPaisa;
    if (commissionableBasePaisa < 0n) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Discount cannot exceed order subtotal."
      );
    }

    const commissionAmountPaisa = calculateCommissionPaisa(
      commissionableBasePaisa,
      input.rateBps
    );
    const totalPaisa = commissionableBasePaisa + input.deliveryFeePaisa;
    const sellerNetEntitlementPaisa = calculateSellerNetEntitlementPaisa(
      totalPaisa,
      commissionAmountPaisa
    );

    return {
      commissionRuleId: input.commissionRuleId,
      commissionRateBps: input.rateBps,
      commissionableBasePaisa,
      commissionAmountPaisa,
      totalPaisa,
      sellerNetEntitlementPaisa
    };
  }

  /**
   * Posts a single append-only COMMISSION_ACCRUAL row when order is COMPLETED and COLLECTED.
   */
  async postCommissionAccrualIfEligible(
    order: {
      id: string;
      storeId: string;
      status: string;
      codCollectionStatus: string;
      subtotalPaisa: bigint;
      discountPaisa: bigint;
      totalPaisa: bigint;
      commissionRuleId: string;
      commissionRateBps: number;
      commissionAmountPaisa: bigint;
      sellerNetEntitlementPaisa: bigint;
    },
    actorId: string,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    if (order.status !== "COMPLETED" || order.codCollectionStatus !== "COLLECTED") {
      return;
    }

    const existingAccrual = await tx.commissionLedger.findFirst({
      where: {
        orderId: order.id,
        entryType: "COMMISSION_ACCRUAL"
      },
      select: { id: true }
    });
    if (existingAccrual) {
      return;
    }

    const commissionableBasePaisa = order.subtotalPaisa - order.discountPaisa;

    await tx.commissionLedger.create({
      data: {
        orderId: order.id,
        storeId: order.storeId,
        commissionRuleId: order.commissionRuleId,
        entryType: "COMMISSION_ACCRUAL",
        grossOrderPaisa: order.totalPaisa,
        commissionableBasePaisa,
        rateBps: order.commissionRateBps,
        commissionPaisa: order.commissionAmountPaisa,
        sellerNetEntitlementPaisa: order.sellerNetEntitlementPaisa,
        currency: "PKR",
        reason: `Order completed and collection confirmed (${String(order.commissionRateBps)} bps).`,
        createdById: actorId
      }
    });
  }

  /**
   * Appends an immutable COMMISSION_REVERSAL or ADJUSTMENT entry on verified refund/dispute.
   * Never modifies or deletes historical ledger entries.
   */
  async postCommissionAdjustmentOnRefund(
    input: {
      order: {
        id: string;
        storeId: string;
        totalPaisa: bigint;
        subtotalPaisa: bigint;
        discountPaisa: bigint;
        commissionRuleId: string;
        commissionRateBps: number;
        commissionAmountPaisa: bigint;
        sellerNetEntitlementPaisa: bigint;
      };
      refundAmountPaisa: bigint;
      isFullRefund: boolean;
      reason: string;
      actorId: string;
    },
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const accrual = await tx.commissionLedger.findFirst({
      where: {
        orderId: input.order.id,
        entryType: "COMMISSION_ACCRUAL"
      }
    });
    if (!accrual) {
      return;
    }

    const commissionableBase = input.order.subtotalPaisa - input.order.discountPaisa;
    let deltaCommission: bigint;

    if (input.isFullRefund || input.refundAmountPaisa >= input.order.totalPaisa) {
      deltaCommission = -accrual.commissionPaisa;
    } else {
      const basePortion =
        commissionableBase > input.refundAmountPaisa
          ? input.refundAmountPaisa
          : commissionableBase;
      deltaCommission = -calculateCommissionPaisa(basePortion, accrual.rateBps);
    }

    await tx.commissionLedger.create({
      data: {
        orderId: input.order.id,
        storeId: input.order.storeId,
        commissionRuleId: accrual.commissionRuleId,
        entryType: input.isFullRefund ? "COMMISSION_REVERSAL" : "ADJUSTMENT",
        grossOrderPaisa: input.refundAmountPaisa,
        commissionableBasePaisa: commissionableBase,
        rateBps: accrual.rateBps,
        commissionPaisa: deltaCommission,
        sellerNetEntitlementPaisa: -(input.refundAmountPaisa + deltaCommission),
        currency: "PKR",
        referenceEntryId: accrual.id,
        reason: input.reason,
        createdById: input.actorId
      }
    });
  }

  async getSellerCommissionSummary(
    userId: string,
    requestId: string
  ): Promise<{ data: CommissionSummaryDto; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);

    const [completedOrders, ledgerEntries, settlements] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          storeId: store.id,
          status: "COMPLETED",
          codCollectionStatus: "COLLECTED"
        },
        select: { totalPaisa: true }
      }),
      this.prisma.commissionLedger.findMany({
        where: { storeId: store.id },
        select: { commissionPaisa: true }
      }),
      this.prisma.sellerSettlementRecord.findMany({
        where: {
          storeId: store.id,
          direction: "SELLER_TO_PLATFORM",
          status: "VERIFIED"
        },
        select: { amountPaisa: true }
      })
    ]);

    const completedGross = completedOrders.reduce(
      (sum, row) => sum + row.totalPaisa,
      0n
    );
    const accruedCommission = ledgerEntries.reduce(
      (sum, row) => sum + row.commissionPaisa,
      0n
    );
    const settledCommission = settlements.reduce(
      (sum, row) => sum + row.amountPaisa,
      0n
    );
    const outstandingOwed = accruedCommission - settledCommission;

    return {
      data: CommissionSummaryDtoSchema.parse({
        storeId: store.id,
        currency: "PKR",
        accountingDisclaimer:
          "Accounting ledger only; not a withdrawable wallet or escrow balance.",
        completedGrossPaisa: bigIntToSafeNumber(
          completedGross,
          "completedGrossPaisa"
        ),
        accruedCommissionPaisa: bigIntToSafeNumber(
          accruedCommission,
          "accruedCommissionPaisa"
        ),
        settledCommissionPaisa: bigIntToSafeNumber(
          settledCommission,
          "settledCommissionPaisa"
        ),
        outstandingCommissionOwedPaisa: bigIntToSafeNumber(
          outstandingOwed,
          "outstandingCommissionOwedPaisa"
        ),
        promotionalBetaNote:
          "0% promotional commission active during Mianwali District closed beta (delivery fees excluded)."
      }),
      meta: { requestId }
    };
  }

  async listSellerCommissionLedger(
    userId: string,
    requestId: string
  ): Promise<{ data: CommissionLedgerEntryDto[]; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const entries = await this.prisma.commissionLedger.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" }
    });

    return {
      data: entries.map((entry) =>
        CommissionLedgerEntryDtoSchema.parse({
          id: entry.id,
          orderId: entry.orderId,
          storeId: entry.storeId,
          commissionRuleId: entry.commissionRuleId,
          entryType: entry.entryType,
          grossOrderPaisa: bigIntToSafeNumber(
            entry.grossOrderPaisa,
            "grossOrderPaisa"
          ),
          commissionableBasePaisa: bigIntToSafeNumber(
            entry.commissionableBasePaisa,
            "commissionableBasePaisa"
          ),
          rateBps: entry.rateBps,
          commissionPaisa: bigIntToSafeNumber(
            entry.commissionPaisa,
            "commissionPaisa"
          ),
          sellerNetEntitlementPaisa: bigIntToSafeNumber(
            entry.sellerNetEntitlementPaisa,
            "sellerNetEntitlementPaisa"
          ),
          currency: entry.currency,
          referenceEntryId: entry.referenceEntryId,
          reason: entry.reason,
          createdAt: entry.createdAt.toISOString()
        })
      ),
      meta: { requestId }
    };
  }

  async listSellerSettlements(
    userId: string,
    requestId: string
  ): Promise<{ data: SellerSettlementRecordDto[]; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const rows = await this.prisma.sellerSettlementRecord.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" }
    });

    return {
      data: rows.map((row) => this.toSettlementDto(row)),
      meta: { requestId }
    };
  }

  async listCommissionRules(
    requestId: string
  ): Promise<{ data: CommissionRuleDto[]; meta: { requestId: string } }> {
    const rules = await this.prisma.commissionRule.findMany({
      orderBy: [{ scopeType: "asc" }, { version: "desc" }]
    });

    return {
      data: rules.map((r) => this.toRuleDto(r)),
      meta: { requestId }
    };
  }

  async createCommissionRule(
    dto: CreateCommissionRuleRequest,
    auth: AuthContext,
    client: ClientMetadata,
    requestId: string
  ): Promise<{ data: CommissionRuleDto; meta: { requestId: string } }> {
    const effectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const existingInScope = await tx.commissionRule.findMany({
        where: {
          scopeType: dto.scopeType,
          orderType: dto.scopeType === "ORDER_TYPE" ? (dto.orderType ?? null) : null
        },
        orderBy: { version: "desc" }
      });

      const nextVersion = (existingInScope[0]?.version ?? 0) + 1;

      await tx.commissionRule.updateMany({
        where: {
          scopeType: dto.scopeType,
          orderType: dto.scopeType === "ORDER_TYPE" ? (dto.orderType ?? null) : null,
          isActive: true
        },
        data: {
          isActive: false,
          effectiveTo: effectiveFrom
        }
      });

      const rule = await tx.commissionRule.create({
        data: {
          version: nextVersion,
          name: dto.name,
          scopeType: dto.scopeType,
          orderType: dto.scopeType === "ORDER_TYPE" ? (dto.orderType ?? null) : null,
          rateBps: dto.rateBps,
          includeDeliveryFee: false,
          effectiveFrom,
          isActive: true,
          createdById: auth.userId
        }
      });

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: this.pickStaffRole(auth),
          action: "COMMISSION_RULE_CREATED",
          targetType: "CommissionRule",
          targetId: rule.id,
          reason: `Created ${rule.scopeType} v${String(rule.version)} at ${String(rule.rateBps)} bps`,
          afterJson: {
            version: rule.version,
            scopeType: rule.scopeType,
            orderType: rule.orderType,
            rateBps: rule.rateBps,
            includeDeliveryFee: false
          },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );

      await this.outboxService.enqueue(
        {
          eventType: "COMMISSION_RULE_UPDATED",
          aggregateType: "CommissionRule",
          aggregateId: rule.id,
          payloadJson: {
            ruleId: rule.id,
            rateBps: rule.rateBps,
            scopeType: rule.scopeType
          }
        },
        tx
      );

      return rule;
    });

    return {
      data: this.toRuleDto(created),
      meta: { requestId }
    };
  }

  async recordSettlement(
    dto: CreateSettlementRecordRequest,
    auth: AuthContext,
    client: ClientMetadata,
    requestId: string
  ): Promise<{ data: SellerSettlementRecordDto; meta: { requestId: string } }> {
    const store = await this.prisma.store.findFirst({
      where: { id: dto.storeId, deletedAt: null }
    });
    if (!store) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Store not found."
      );
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (periodEnd.getTime() < periodStart.getTime()) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Settlement periodEnd must be on or after periodStart."
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const settlement = await tx.sellerSettlementRecord.create({
        data: {
          storeId: store.id,
          direction: dto.direction,
          settlementMethod: dto.settlementMethod,
          amountPaisa: BigInt(dto.amountPaisa),
          currency: "PKR",
          externalReference: dto.externalReference ?? null,
          periodStart,
          periodEnd,
          status: "VERIFIED",
          verifiedById: auth.userId,
          notes: dto.notes ?? null
        }
      });

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: this.pickStaffRole(auth),
          action: "SELLER_SETTLEMENT_RECORDED",
          targetType: "SellerSettlementRecord",
          targetId: settlement.id,
          reason: dto.notes ?? "Verified offline seller settlement",
          afterJson: {
            storeId: store.id,
            direction: dto.direction,
            amountPaisa: dto.amountPaisa,
            settlementMethod: dto.settlementMethod
          },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );

      await this.outboxService.enqueue(
        {
          eventType: "SELLER_SETTLEMENT_VERIFIED",
          aggregateType: "SellerSettlementRecord",
          aggregateId: settlement.id,
          payloadJson: {
            settlementId: settlement.id,
            storeId: store.id,
            amountPaisa: dto.amountPaisa
          }
        },
        tx
      );

      return settlement;
    });

    return {
      data: this.toSettlementDto(created),
      meta: { requestId }
    };
  }

  private toRuleDto(rule: {
    id: string;
    version: number;
    name: string;
    scopeType: string;
    orderType: string | null;
    rateBps: number;
    includeDeliveryFee: boolean;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    isActive: boolean;
    createdAt: Date;
  }): CommissionRuleDto {
    return CommissionRuleDtoSchema.parse({
      id: rule.id,
      version: rule.version,
      name: rule.name,
      scopeType: rule.scopeType,
      orderType: rule.orderType,
      rateBps: rule.rateBps,
      includeDeliveryFee: false,
      effectiveFrom: rule.effectiveFrom.toISOString(),
      effectiveTo: rule.effectiveTo ? rule.effectiveTo.toISOString() : null,
      isActive: rule.isActive,
      createdAt: rule.createdAt.toISOString()
    });
  }

  private toSettlementDto(row: {
    id: string;
    storeId: string;
    direction: string;
    settlementMethod: string;
    amountPaisa: bigint;
    currency: string;
    externalReference: string | null;
    periodStart: Date;
    periodEnd: Date;
    status: string;
    notes: string | null;
    createdAt: Date;
  }): SellerSettlementRecordDto {
    return SellerSettlementRecordDtoSchema.parse({
      id: row.id,
      storeId: row.storeId,
      direction: row.direction,
      settlementMethod: row.settlementMethod,
      amountPaisa: bigIntToSafeNumber(row.amountPaisa, "amountPaisa"),
      currency: row.currency,
      externalReference: row.externalReference,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt.toISOString()
    });
  }

  private pickStaffRole(auth: AuthContext): RoleCode {
    return auth.roles.find((r) => STAFF_ROLE_SET.has(r)) ?? "ADMIN";
  }
}
