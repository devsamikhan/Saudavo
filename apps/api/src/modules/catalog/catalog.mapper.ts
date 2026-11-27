import { Prisma } from "@prisma/client";
import {
  type CategoryDto,
  CategoryDtoSchema,
  type ProductDto,
  ProductDtoSchema,
  type PublicProductDetailDto,
  PublicProductDetailDtoSchema,
  type PublicServiceDetailDto,
  PublicServiceDetailDtoSchema,
  type ServiceListingDto,
  ServiceListingDtoSchema
} from "@saudavo/contracts";
import { bigIntToSafeNumber } from "../../common/money.util";
import {
  STORE_WITH_RELATIONS_INCLUDE,
  toPublicStoreDto
} from "../seller/seller.mapper";

export const PRODUCT_WITH_VARIANTS_INCLUDE = {
  variants: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" }
  },
  images: {
    orderBy: { sortOrder: "asc" }
  }
} satisfies Prisma.ProductInclude;

export const PUBLIC_PRODUCT_INCLUDE = {
  variants: {
    where: { deletedAt: null, isActive: true },
    orderBy: { createdAt: "asc" }
  },
  images: {
    orderBy: { sortOrder: "asc" }
  },
  category: true,
  store: {
    include: STORE_WITH_RELATIONS_INCLUDE
  }
} satisfies Prisma.ProductInclude;

export const SERVICE_WITH_PACKAGES_INCLUDE = {
  packages: {
    where: { deletedAt: null },
    orderBy: { pricePaisa: "asc" }
  }
} satisfies Prisma.ServiceListingInclude;

export const PUBLIC_SERVICE_INCLUDE = {
  packages: {
    where: { deletedAt: null, isActive: true },
    orderBy: { pricePaisa: "asc" }
  },
  category: true,
  store: {
    include: STORE_WITH_RELATIONS_INCLUDE
  }
} satisfies Prisma.ServiceListingInclude;

export type CategoryRecord = Prisma.CategoryGetPayload<Record<string, never>>;
export type ProductWithVariants = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_WITH_VARIANTS_INCLUDE;
}>;
export type PublicProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof PUBLIC_PRODUCT_INCLUDE;
}>;
export type ServiceWithPackages = Prisma.ServiceListingGetPayload<{
  include: typeof SERVICE_WITH_PACKAGES_INCLUDE;
}>;
export type PublicServiceWithRelations = Prisma.ServiceListingGetPayload<{
  include: typeof PUBLIC_SERVICE_INCLUDE;
}>;

export function toCategoryDto(category: CategoryRecord): CategoryDto {
  return CategoryDtoSchema.parse({
    id: category.id,
    parentId: category.parentId,
    applicableTo: category.applicableTo,
    slug: category.slug,
    nameEn: category.nameEn,
    nameUr: category.nameUr,
    sortOrder: category.sortOrder
  });
}

export function toProductDto(product: ProductWithVariants): ProductDto {
  return ProductDtoSchema.parse({
    id: product.id,
    storeId: product.storeId,
    categoryId: product.categoryId,
    slug: product.slug,
    title: product.title,
    description: product.description,
    basePricePaisa: bigIntToSafeNumber(product.basePricePaisa, "basePricePaisa"),
    currency: product.currency,
    stockQuantity: product.stockQuantity,
    hasVariants: product.hasVariants,
    deliveryEnabled: product.deliveryEnabled,
    pickupEnabled: product.pickupEnabled,
    status: product.status,
    rejectionReason: product.rejectionReason,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      title: variant.title,
      optionValuesJson: variant.optionValuesJson,
      pricePaisa: bigIntToSafeNumber(variant.pricePaisa, "pricePaisa"),
      stockQuantity: variant.stockQuantity,
      isActive: variant.isActive
    })),
    images: product.images.map((image) => ({
      id: image.id,
      mediaAssetId: image.mediaAssetId,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
      altText: image.altText
    })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  });
}

export function toPublicProductDetailDto(
  product: PublicProductWithRelations
): PublicProductDetailDto {
  return PublicProductDetailDtoSchema.parse({
    id: product.id,
    storeId: product.storeId,
    categoryId: product.categoryId,
    slug: product.slug,
    title: product.title,
    description: product.description,
    basePricePaisa: bigIntToSafeNumber(product.basePricePaisa, "basePricePaisa"),
    currency: product.currency,
    stockQuantity: product.stockQuantity,
    hasVariants: product.hasVariants,
    deliveryEnabled: product.deliveryEnabled,
    pickupEnabled: product.pickupEnabled,
    status: product.status,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      title: variant.title,
      optionValuesJson: variant.optionValuesJson,
      pricePaisa: bigIntToSafeNumber(variant.pricePaisa, "pricePaisa"),
      stockQuantity: variant.stockQuantity,
      isActive: variant.isActive
    })),
    images: product.images.map((image) => ({
      id: image.id,
      mediaAssetId: image.mediaAssetId,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
      altText: image.altText
    })),
    category: toCategoryDto(product.category),
    store: toPublicStoreDto(product.store),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  });
}

export function toServiceListingDto(
  service: ServiceWithPackages
): ServiceListingDto {
  return ServiceListingDtoSchema.parse({
    id: service.id,
    storeId: service.storeId,
    categoryId: service.categoryId,
    slug: service.slug,
    title: service.title,
    description: service.description,
    serviceMode: service.serviceMode,
    requirementsPrompt: service.requirementsPrompt,
    status: service.status,
    rejectionReason: service.rejectionReason,
    packages: service.packages.map((pkg) => ({
      id: pkg.id,
      tierName: pkg.tierName,
      description: pkg.description,
      pricePaisa: bigIntToSafeNumber(pkg.pricePaisa, "pricePaisa"),
      currency: pkg.currency,
      deliveryEstimateDays: pkg.deliveryEstimateDays,
      maxRevisions: pkg.maxRevisions,
      isActive: pkg.isActive
    })),
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString()
  });
}

export function toPublicServiceDetailDto(
  service: PublicServiceWithRelations
): PublicServiceDetailDto {
  return PublicServiceDetailDtoSchema.parse({
    id: service.id,
    storeId: service.storeId,
    categoryId: service.categoryId,
    slug: service.slug,
    title: service.title,
    description: service.description,
    serviceMode: service.serviceMode,
    requirementsPrompt: service.requirementsPrompt,
    status: service.status,
    packages: service.packages.map((pkg) => ({
      id: pkg.id,
      tierName: pkg.tierName,
      description: pkg.description,
      pricePaisa: bigIntToSafeNumber(pkg.pricePaisa, "pricePaisa"),
      currency: pkg.currency,
      deliveryEstimateDays: pkg.deliveryEstimateDays,
      maxRevisions: pkg.maxRevisions,
      isActive: pkg.isActive
    })),
    category: toCategoryDto(service.category),
    store: toPublicStoreDto(service.store),
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString()
  });
}
