import { z } from "zod";
import { CurrencyCodeSchema, OrderTypeSchema } from "./enums";

export const CommissionRuleScopeSchema = z.enum([
  "GLOBAL",
  "ORDER_TYPE",
  "CATEGORY"
]);
export type CommissionRuleScope = z.infer<typeof CommissionRuleScopeSchema>;

export const CommissionLedgerEntryTypeSchema = z.enum([
  "COMMISSION_ACCRUAL",
  "COMMISSION_REVERSAL",
  "ADJUSTMENT",
  "SETTLEMENT_OFFSET"
]);
export type CommissionLedgerEntryType = z.infer<
  typeof CommissionLedgerEntryTypeSchema
>;

export const CommissionSummaryDtoSchema = z.object({
  storeId: z.string().uuid(),
  currency: CurrencyCodeSchema,
  accountingDisclaimer: z.string(),
  completedGrossPaisa: z.number().int().nonnegative(),
  accruedCommissionPaisa: z.number().int(),
  settledCommissionPaisa: z.number().int().nonnegative(),
  outstandingCommissionOwedPaisa: z.number().int(),
  promotionalBetaNote: z.string()
});
export type CommissionSummaryDto = z.infer<typeof CommissionSummaryDtoSchema>;

export const CommissionLedgerEntryDtoSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  storeId: z.string().uuid(),
  commissionRuleId: z.string().uuid(),
  entryType: CommissionLedgerEntryTypeSchema,
  grossOrderPaisa: z.number().int().nonnegative(),
  commissionableBasePaisa: z.number().int().nonnegative(),
  rateBps: z.number().int().nonnegative(),
  commissionPaisa: z.number().int(),
  sellerNetEntitlementPaisa: z.number().int(),
  currency: CurrencyCodeSchema,
  referenceEntryId: z.string().uuid().nullable(),
  reason: z.string(),
  createdAt: z.string().datetime()
});
export type CommissionLedgerEntryDto = z.infer<
  typeof CommissionLedgerEntryDtoSchema
>;

export const CreateCommissionRuleRequestSchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    scopeType: z.enum(["GLOBAL", "ORDER_TYPE"]),
    orderType: OrderTypeSchema.optional(),
    rateBps: z.number().int().min(0).max(5000),
    includeDeliveryFee: z.literal(false).default(false),
    effectiveFrom: z.string().datetime().optional()
  })
  .refine(
    (data) =>
      (data.scopeType === "GLOBAL" && data.orderType === undefined) ||
      (data.scopeType === "ORDER_TYPE" && data.orderType !== undefined),
    {
      message: "orderType is required for ORDER_TYPE scope and omitted for GLOBAL",
      path: ["orderType"]
    }
  );
export type CreateCommissionRuleRequest = z.infer<
  typeof CreateCommissionRuleRequestSchema
>;

export const CommissionRuleDtoSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().min(1),
  name: z.string(),
  scopeType: CommissionRuleScopeSchema,
  orderType: OrderTypeSchema.nullable(),
  rateBps: z.number().int().min(0).max(5000),
  includeDeliveryFee: z.literal(false),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime()
});
export type CommissionRuleDto = z.infer<typeof CommissionRuleDtoSchema>;

export const CreateSettlementRecordRequestSchema = z.object({
  storeId: z.string().uuid(),
  direction: z
    .enum(["SELLER_TO_PLATFORM", "PLATFORM_TO_SELLER"])
    .default("SELLER_TO_PLATFORM"),
  settlementMethod: z.enum([
    "BANK_TRANSFER",
    "CASH_OFFICE",
    "JAZZCASH_MANUAL",
    "EASYPAISA_MANUAL"
  ]),
  amountPaisa: z.number().int().positive(),
  externalReference: z.string().trim().max(140).optional(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  notes: z.string().trim().max(1000).optional()
});
export type CreateSettlementRecordRequest = z.infer<
  typeof CreateSettlementRecordRequestSchema
>;

export const SellerSettlementRecordDtoSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  direction: z.string(),
  settlementMethod: z.string(),
  amountPaisa: z.number().int().positive(),
  currency: CurrencyCodeSchema,
  externalReference: z.string().nullable(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  status: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime()
});
export type SellerSettlementRecordDto = z.infer<
  typeof SellerSettlementRecordDtoSchema
>;
