import { z } from "zod";

export const BuyerRequestStatusSchema = z.enum(["OPEN", "FULFILLED", "CLOSED"]);
export type BuyerRequestStatus = z.infer<typeof BuyerRequestStatusSchema>;

export const CreateBuyerRequestSchema = z.object({
  districtId: z.string().uuid(),
  areaZoneId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(10).max(2000),
  budgetMaxPaisa: z.number().int().positive()
});
export type CreateBuyerRequest = z.infer<typeof CreateBuyerRequestSchema>;

export const RespondBuyerRequestSchema = z.object({
  message: z.string().trim().min(5).max(1500),
  productId: z.string().uuid().optional(),
  serviceListingId: z.string().uuid().optional()
});
export type RespondBuyerRequest = z.infer<typeof RespondBuyerRequestSchema>;

export const BuyerRequestDtoSchema = z.object({
  id: z.string().uuid(),
  buyerId: z.string().uuid(),
  buyerDisplayName: z.string(),
  districtId: z.string().uuid(),
  districtNameEn: z.string(),
  areaZoneId: z.string().uuid().nullable(),
  areaZoneNameEn: z.string().nullable(),
  categoryId: z.string().uuid().nullable(),
  categoryNameEn: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  budgetMaxPaisa: z.number().int().positive(),
  status: BuyerRequestStatusSchema,
  responsesCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type BuyerRequestDto = z.infer<typeof BuyerRequestDtoSchema>;
