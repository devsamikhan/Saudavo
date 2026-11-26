import { z } from "zod";
import { CurrencyCodeSchema } from "./enums";

export const SubscriptionPlanCodeSchema = z.enum([
  "FREE_STARTER",
  "PRO_MONTHLY",
  "GROWTH_MONTHLY"
]);
export type SubscriptionPlanCode = z.infer<typeof SubscriptionPlanCodeSchema>;

export const SubscriptionStatusSchema = z.enum([
  "ACTIVE",
  "GRACE_PERIOD",
  "EXPIRED"
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const ManualBillingMethodSchema = z.enum([
  "RAAST_MANUAL",
  "JAZZCASH_MANUAL",
  "EASYPAISA_MANUAL",
  "BANK_TRANSFER",
  "CASH_OFFICE"
]);
export type ManualBillingMethod = z.infer<typeof ManualBillingMethodSchema>;

export const RenewalRequestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED"
]);
export type RenewalRequestStatus = z.infer<typeof RenewalRequestStatusSchema>;

export const SubscriptionPlanDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  nameEn: z.string(),
  nameUr: z.string(),
  descriptionEn: z.string(),
  descriptionUr: z.string(),
  pricePaisa: z.number().int().nonnegative(),
  currency: CurrencyCodeSchema,
  durationDays: z.number().int().positive(),
  maxActiveProducts: z.number().int().positive(),
  maxActiveServices: z.number().int().positive(),
  hasVerifiedBadge: z.boolean(),
  hasPriorityPlacement: z.boolean(),
  hasCustomOffers: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
export type SubscriptionPlanDto = z.infer<typeof SubscriptionPlanDtoSchema>;

export const SubscriptionRenewalRequestDtoSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  storeDisplayName: z.string().optional(),
  planId: z.string().uuid(),
  planCode: z.string().optional(),
  planNameEn: z.string().optional(),
  amountPaisa: z.number().int().nonnegative(),
  currency: CurrencyCodeSchema,
  paymentMethod: ManualBillingMethodSchema,
  transactionReference: z.string(),
  payerAccountNote: z.string().nullable(),
  status: RenewalRequestStatusSchema,
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});
export type SubscriptionRenewalRequestDto = z.infer<
  typeof SubscriptionRenewalRequestDtoSchema
>;

export const BillingInstructionsDtoSchema = z.object({
  accountTitle: z.string(),
  raastId: z.string(),
  walletNumber: z.string(),
  note: z.string()
});
export type BillingInstructionsDto = z.infer<typeof BillingInstructionsDtoSchema>;

export const StoreSubscriptionSummaryDtoSchema = z.object({
  storeId: z.string().uuid(),
  status: SubscriptionStatusSchema,
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime().nullable(),
  graceEndsAt: z.string().datetime().nullable(),
  plan: SubscriptionPlanDtoSchema,
  activeProductCount: z.number().int().nonnegative(),
  activeServiceCount: z.number().int().nonnegative(),
  billingInstructions: BillingInstructionsDtoSchema,
  renewals: z.array(SubscriptionRenewalRequestDtoSchema)
});
export type StoreSubscriptionSummaryDto = z.infer<
  typeof StoreSubscriptionSummaryDtoSchema
>;

export const SubmitSubscriptionRenewalRequestSchema = z.object({
  planCode: z.enum(["PRO_MONTHLY", "GROWTH_MONTHLY"]),
  paymentMethod: ManualBillingMethodSchema,
  transactionReference: z.string().trim().min(4).max(140),
  payerAccountNote: z.string().trim().max(200).optional()
});
export type SubmitSubscriptionRenewalRequest = z.infer<
  typeof SubmitSubscriptionRenewalRequestSchema
>;

export const ReviewSubscriptionRenewalRequestSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(500).optional()
});
export type ReviewSubscriptionRenewalRequest = z.infer<
  typeof ReviewSubscriptionRenewalRequestSchema
>;
