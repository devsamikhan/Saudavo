import { z } from "zod";
import {
  SellerVerificationStatusSchema,
  StoreStatusSchema
} from "./enums";

export const ApproveDecisionRequestSchema = z.object({
  notes: z.string().trim().max(1000).optional()
});
export type ApproveDecisionRequest = z.infer<typeof ApproveDecisionRequestSchema>;

export const RejectDecisionRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Rejection reason must be at least 5 characters")
    .max(1000)
});
export type RejectDecisionRequest = z.infer<typeof RejectDecisionRequestSchema>;

export const ApproveListingRequestSchema = z.object({
  listingType: z.enum(["PRODUCT", "SERVICE"]).optional(),
  notes: z.string().trim().max(1000).optional()
});
export type ApproveListingRequest = z.infer<typeof ApproveListingRequestSchema>;

export const RejectListingRequestSchema = z.object({
  listingType: z.enum(["PRODUCT", "SERVICE"]).optional(),
  reason: z
    .string()
    .trim()
    .min(5, "Rejection reason must be at least 5 characters")
    .max(1000)
});
export type RejectListingRequest = z.infer<typeof RejectListingRequestSchema>;

export const SuspendEntityRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Suspension reason must be at least 5 characters")
    .max(1000)
});
export type SuspendEntityRequest = z.infer<typeof SuspendEntityRequestSchema>;

export const ModerationQueueResponseSchema = z.object({
  data: z.object({
    sellers: z.array(
      z.object({
        sellerProfileId: z.string().uuid(),
        userId: z.string().uuid(),
        sellerType: z.string(),
        verificationStatus: SellerVerificationStatusSchema,
        store: z
          .object({
            id: z.string().uuid(),
            slug: z.string(),
            displayName: z.string(),
            status: StoreStatusSchema
          })
          .nullable(),
        createdAt: z.string().datetime()
      })
    ),
    products: z.array(
      z.object({
        id: z.string().uuid(),
        storeId: z.string().uuid(),
        slug: z.string(),
        title: z.string(),
        basePricePaisa: z.number().int().positive(),
        status: z.string(),
        createdAt: z.string().datetime()
      })
    ),
    services: z.array(
      z.object({
        id: z.string().uuid(),
        storeId: z.string().uuid(),
        slug: z.string(),
        title: z.string(),
        serviceMode: z.string(),
        status: z.string(),
        createdAt: z.string().datetime()
      })
    )
  }),
  meta: z.object({
    requestId: z.string().min(1)
  })
});
export type ModerationQueueResponse = z.infer<typeof ModerationQueueResponseSchema>;
