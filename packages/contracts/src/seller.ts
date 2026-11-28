import { z } from "zod";
import { PhoneInputSchema } from "./auth";
import {
  CurrencyCodeSchema,
  SellerTypeSchema,
  SellerVerificationStatusSchema,
  StoreStatusSchema
} from "./enums";

export const StoreSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain lowercase letters, numbers, and hyphens only"
  );

export const StoreServiceAreaInputSchema = z.object({
  areaZoneId: z.string().uuid(),
  deliveryFeeOverridePaisa: z.number().int().nonnegative().nullable().optional(),
  pickupSupported: z.boolean().default(true),
  deliverySupported: z.boolean().default(true)
});
export type StoreServiceAreaInput = z.infer<typeof StoreServiceAreaInputSchema>;

export const SellerOnboardingStoreInputSchema = z.object({
  displayName: z.string().trim().min(2).max(140),
  slug: StoreSlugSchema,
  description: z.string().trim().max(2000).optional(),
  districtId: z.string().uuid(),
  serviceAreaZoneIds: z.array(z.string().uuid()).min(1).max(25),
  defaultDeliveryFeePaisa: z.number().int().nonnegative().default(0),
  showPublicPhone: z.boolean().default(false),
  publicContactPhone: PhoneInputSchema.optional(),
  showPublicAddress: z.boolean().default(false),
  publicBusinessAddress: z.string().trim().max(500).optional()
});

export const SellerOnboardingRequestSchema = z.object({
  sellerType: SellerTypeSchema,
  store: SellerOnboardingStoreInputSchema
});
export type SellerOnboardingRequest = z.infer<typeof SellerOnboardingRequestSchema>;

export const UpdateSellerProfileRequestSchema = z.object({
  sellerType: SellerTypeSchema.optional()
});
export type UpdateSellerProfileRequest = z.infer<
  typeof UpdateSellerProfileRequestSchema
>;

export const UpdateStoreRequestSchema = z.object({
  displayName: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  defaultDeliveryFeePaisa: z.number().int().nonnegative().optional(),
  requireCleanCodHistory: z.boolean().optional(),
  showPublicPhone: z.boolean().optional(),
  publicContactPhone: PhoneInputSchema.nullable().optional(),
  showPublicAddress: z.boolean().optional(),
  publicBusinessAddress: z.string().trim().max(500).nullable().optional(),
  serviceAreas: z.array(StoreServiceAreaInputSchema).min(1).max(25).optional(),
  submitForReview: z.boolean().optional()
});
export type UpdateStoreRequest = z.infer<typeof UpdateStoreRequestSchema>;

export const StoreServiceAreaDtoSchema = z.object({
  id: z.string().uuid(),
  areaZoneId: z.string().uuid(),
  areaZoneNameEn: z.string(),
  areaZoneNameUr: z.string(),
  areaZoneSlug: z.string(),
  deliveryFeeOverridePaisa: z.number().int().nonnegative().nullable(),
  pickupSupported: z.boolean(),
  deliverySupported: z.boolean()
});
export type StoreServiceAreaDto = z.infer<typeof StoreServiceAreaDtoSchema>;

export const SellerProfileDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sellerType: SellerTypeSchema,
  verificationStatus: SellerVerificationStatusSchema,
  rejectionReason: z.string().nullable(),
  verifiedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type SellerProfileDto = z.infer<typeof SellerProfileDtoSchema>;

export const PrivateStoreDtoSchema = z.object({
  id: z.string().uuid(),
  sellerProfileId: z.string().uuid(),
  districtId: z.string().uuid(),
  districtNameEn: z.string(),
  slug: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  showPublicPhone: z.boolean(),
  publicContactPhone: z.string().nullable(),
  showPublicAddress: z.boolean(),
  publicBusinessAddress: z.string().nullable(),
  defaultDeliveryFeePaisa: z.number().int().nonnegative(),
  requireCleanCodHistory: z.boolean().default(false),
  currency: CurrencyCodeSchema,
  status: StoreStatusSchema,
  serviceAreas: z.array(StoreServiceAreaDtoSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type PrivateStoreDto = z.infer<typeof PrivateStoreDtoSchema>;

export const PublicStoreDtoSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  districtId: z.string().uuid(),
  districtNameEn: z.string(),
  districtNameUr: z.string(),
  defaultDeliveryFeePaisa: z.number().int().nonnegative(),
  currency: CurrencyCodeSchema,
  publicContactPhone: z.string().nullable(),
  publicBusinessAddress: z.string().nullable(),
  serviceAreas: z.array(StoreServiceAreaDtoSchema),
  completedOrdersCount: z.number().int().nonnegative().default(0),
  avgResponseMinutes: z.number().int().nonnegative().nullable().default(null),
  responseRatePercent: z.number().int().min(0).max(100).nullable().default(null),
  followerCount: z.number().int().nonnegative().default(0),
  isFollowing: z.boolean().optional()
});
export type PublicStoreDto = z.infer<typeof PublicStoreDtoSchema>;

export const SellerOnboardingResponseSchema = z.object({
  data: z.object({
    sellerProfileId: z.string().uuid(),
    verificationStatus: SellerVerificationStatusSchema,
    store: z.object({
      id: z.string().uuid(),
      slug: z.string(),
      status: StoreStatusSchema
    })
  }),
  meta: z.object({
    requestId: z.string().min(1)
  })
});
export type SellerOnboardingResponse = z.infer<typeof SellerOnboardingResponseSchema>;
