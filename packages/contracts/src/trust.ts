import { z } from "zod";
import { CurrencyCodeSchema } from "./enums";

export const CreateReviewRequestSchema = z.object({
  orderItemId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(2000).optional(),
  mediaAssetId: z.string().uuid().optional()
});
export type CreateReviewRequest = z.infer<typeof CreateReviewRequestSchema>;

export const ReviewDtoSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid().nullable(),
  storeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  mediaAssetId: z.string().uuid().nullable().default(null),
  photoReadUrl: z.string().nullable().default(null),
  status: z.enum(["PUBLISHED", "HIDDEN"]),
  reviewerDisplayName: z.string(),
  createdAt: z.string().datetime()
});
export type ReviewDto = z.infer<typeof ReviewDtoSchema>;

export const ReportTargetTypeSchema = z.enum([
  "PRODUCT",
  "SERVICE",
  "STORE",
  "REVIEW",
  "ORDER_MESSAGE",
  "CONVERSATION"
]);
export type ReportTargetType = z.infer<typeof ReportTargetTypeSchema>;

export const CreateReportRequestSchema = z.object({
  targetType: ReportTargetTypeSchema,
  targetId: z.string().uuid(),
  reasonCode: z.enum([
    "PROHIBITED_ITEM",
    "MISLEADING_INFO",
    "ABUSIVE_LANGUAGE",
    "SCAM_OR_FRAUD",
    "PRIVACY_VIOLATION",
    "OTHER"
  ]),
  details: z.string().trim().min(5).max(2000)
});
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;

export const ResolveReportRequestSchema = z.object({
  action: z.enum(["DISMISSED", "CONTENT_HIDDEN", "WARNING_ISSUED"]),
  resolutionNote: z.string().trim().min(5).max(1000)
});
export type ResolveReportRequest = z.infer<typeof ResolveReportRequestSchema>;

export const ReportDtoSchema = z.object({
  id: z.string().uuid(),
  reporterId: z.string().uuid(),
  targetType: ReportTargetTypeSchema,
  targetId: z.string().uuid(),
  reasonCode: z.string(),
  details: z.string(),
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
  resolutionNote: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type ReportDto = z.infer<typeof ReportDtoSchema>;

export const DisputeTypeSchema = z.enum([
  "ITEM_NOT_RECEIVED",
  "DAMAGED_OR_DEFECTIVE",
  "QUALITY_MISMATCH",
  "PAYMENT_DISPUTE",
  "SERVICE_NON_DELIVERY"
]);
export type DisputeType = z.infer<typeof DisputeTypeSchema>;

export const CreateDisputeRequestSchema = z.object({
  disputeType: DisputeTypeSchema,
  description: z.string().trim().min(10).max(2000)
});
export type CreateDisputeRequest = z.infer<typeof CreateDisputeRequestSchema>;

export const ResolveDisputeRequestSchema = z
  .object({
    resolutionOutcome: z.enum([
      "COMPLETE_ORDER",
      "CANCEL_WITH_FULL_REFUND",
      "PARTIAL_REFUND",
      "NO_FINANCIAL_CHANGE"
    ]),
    refundAmountPaisa: z.number().int().positive().optional(),
    resolutionNote: z.string().trim().min(5).max(1000)
  })
  .refine(
    (data) =>
      data.resolutionOutcome !== "PARTIAL_REFUND" ||
      data.refundAmountPaisa !== undefined,
    {
      message: "refundAmountPaisa is required for PARTIAL_REFUND",
      path: ["refundAmountPaisa"]
    }
  );
export type ResolveDisputeRequest = z.infer<typeof ResolveDisputeRequestSchema>;

export const DisputeDtoSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  openedById: z.string().uuid(),
  disputeType: DisputeTypeSchema,
  description: z.string(),
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED"]),
  resolutionOutcome: z.string().nullable(),
  resolutionNote: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type DisputeDto = z.infer<typeof DisputeDtoSchema>;

export const RefundDtoSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  paymentId: z.string().uuid(),
  amountPaisa: z.number().int().positive(),
  currency: CurrencyCodeSchema,
  reason: z.string(),
  status: z.string(),
  createdAt: z.string().datetime()
});
export type RefundDto = z.infer<typeof RefundDtoSchema>;
