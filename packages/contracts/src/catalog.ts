import { z } from "zod";
import {
  CategoryApplicableToSchema,
  CurrencyCodeSchema,
  ListingStatusSchema,
  ServiceModeSchema
} from "./enums";
import { PublicStoreDtoSchema } from "./seller";

/**
 * Generates a URL-safe lowercase slug base from an arbitrary title.
 */
export function slugifyTitle(title: string): string {
  const base = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return base.length >= 2 ? base : "listing";
}

export const CategoryDtoSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  applicableTo: CategoryApplicableToSchema,
  slug: z.string(),
  nameEn: z.string(),
  nameUr: z.string(),
  sortOrder: z.number().int()
});
export type CategoryDto = z.infer<typeof CategoryDtoSchema>;

export const CategoriesResponseSchema = z.object({
  data: z.array(CategoryDtoSchema),
  meta: z.object({
    requestId: z.string().min(1)
  })
});
export type CategoriesResponse = z.infer<typeof CategoriesResponseSchema>;

export const ProductVariantInputSchema = z.object({
  sku: z.string().trim().min(1).max(80).nullable().optional(),
  title: z.string().trim().min(1).max(120),
  optionValuesJson: z.record(z.string(), z.string()),
  pricePaisa: z.number().int().positive(),
  stockQuantity: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true)
});
export type ProductVariantInput = z.infer<typeof ProductVariantInputSchema>;

export const CreateProductRequestSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().min(10).max(5000),
  basePricePaisa: z.number().int().positive(),
  stockQuantity: z.number().int().nonnegative().default(0),
  deliveryEnabled: z.boolean().default(true),
  pickupEnabled: z.boolean().default(true),
  initialStatus: z.enum(["DRAFT", "PENDING_REVIEW"]).default("PENDING_REVIEW"),
  variants: z.array(ProductVariantInputSchema).max(50).optional(),
  mediaAssetIds: z.array(z.string().uuid()).max(6).optional()
});
export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>;

export const UpdateProductRequestSchema = z.object({
  categoryId: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  basePricePaisa: z.number().int().positive().optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  deliveryEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW"]).optional(),
  variants: z.array(ProductVariantInputSchema).max(50).optional()
});
export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;

export const ProductVariantDtoSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().nullable(),
  title: z.string(),
  optionValuesJson: z.record(z.string(), z.string()),
  pricePaisa: z.number().int().positive(),
  stockQuantity: z.number().int().nonnegative(),
  isActive: z.boolean()
});
export type ProductVariantDto = z.infer<typeof ProductVariantDtoSchema>;

export const ProductImageDtoSchema = z.object({
  id: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  sortOrder: z.number().int().nonnegative(),
  isPrimary: z.boolean(),
  altText: z.string().nullable()
});
export type ProductImageDto = z.infer<typeof ProductImageDtoSchema>;

export const ProductDtoSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  categoryId: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  basePricePaisa: z.number().int().positive(),
  currency: CurrencyCodeSchema,
  stockQuantity: z.number().int().nonnegative(),
  hasVariants: z.boolean(),
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  status: ListingStatusSchema,
  rejectionReason: z.string().nullable(),
  variants: z.array(ProductVariantDtoSchema),
  images: z.array(ProductImageDtoSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type ProductDto = z.infer<typeof ProductDtoSchema>;

export const PublicProductDetailDtoSchema = ProductDtoSchema.omit({
  rejectionReason: true
}).extend({
  category: CategoryDtoSchema,
  store: PublicStoreDtoSchema
});
export type PublicProductDetailDto = z.infer<typeof PublicProductDetailDtoSchema>;

export const ServicePackageInputSchema = z.object({
  tierName: z.string().trim().min(2).max(60),
  description: z.string().trim().min(5).max(2000),
  pricePaisa: z.number().int().positive(),
  deliveryEstimateDays: z.number().int().min(1).max(365),
  maxRevisions: z.number().int().nonnegative().max(50).default(0),
  isActive: z.boolean().default(true)
});
export type ServicePackageInput = z.infer<typeof ServicePackageInputSchema>;

export const CreateServiceListingRequestSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().min(10).max(5000),
  serviceMode: ServiceModeSchema,
  requirementsPrompt: z.string().trim().max(2000).nullable().optional(),
  initialStatus: z.enum(["DRAFT", "PENDING_REVIEW"]).default("PENDING_REVIEW"),
  packages: z.array(ServicePackageInputSchema).min(1).max(5)
});
export type CreateServiceListingRequest = z.infer<
  typeof CreateServiceListingRequestSchema
>;

export const UpdateServiceListingRequestSchema = z.object({
  categoryId: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  serviceMode: ServiceModeSchema.optional(),
  requirementsPrompt: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW"]).optional(),
  packages: z.array(ServicePackageInputSchema).min(1).max(5).optional()
});
export type UpdateServiceListingRequest = z.infer<
  typeof UpdateServiceListingRequestSchema
>;

export const ServicePackageDtoSchema = z.object({
  id: z.string().uuid(),
  tierName: z.string(),
  description: z.string(),
  pricePaisa: z.number().int().positive(),
  currency: CurrencyCodeSchema,
  deliveryEstimateDays: z.number().int().min(1),
  maxRevisions: z.number().int().nonnegative(),
  isActive: z.boolean()
});
export type ServicePackageDto = z.infer<typeof ServicePackageDtoSchema>;

export const ServiceListingDtoSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  categoryId: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  serviceMode: ServiceModeSchema,
  requirementsPrompt: z.string().nullable(),
  status: ListingStatusSchema,
  rejectionReason: z.string().nullable(),
  packages: z.array(ServicePackageDtoSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type ServiceListingDto = z.infer<typeof ServiceListingDtoSchema>;

export const PublicServiceDetailDtoSchema = ServiceListingDtoSchema.omit({
  rejectionReason: true
}).extend({
  category: CategoryDtoSchema,
  store: PublicStoreDtoSchema
});
export type PublicServiceDetailDto = z.infer<typeof PublicServiceDetailDtoSchema>;

export const SearchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  type: z.enum(["PRODUCT", "SERVICE", "ALL"]).default("ALL"),
  categoryId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  areaZoneId: z.string().uuid().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const PublicSearchItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["PRODUCT", "SERVICE"]),
  slug: z.string(),
  title: z.string(),
  pricePaisa: z.number().int().positive(),
  currency: CurrencyCodeSchema,
  serviceMode: ServiceModeSchema.nullable(),
  store: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    displayName: z.string(),
    districtName: z.string(),
    serviceAreas: z.array(z.string())
  })
});
export type PublicSearchItem = z.infer<typeof PublicSearchItemSchema>;

export const SearchResponseSchema = z.object({
  data: z.array(PublicSearchItemSchema),
  meta: z.object({
    requestId: z.string().min(1),
    pagination: z.object({
      cursor: z.string().uuid().nullable(),
      hasMore: z.boolean(),
      limit: z.number().int()
    })
  })
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
