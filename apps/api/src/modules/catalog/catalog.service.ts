import { HttpStatus, Injectable } from "@nestjs/common";
import {
  CategoriesResponse,
  CategoriesResponseSchema,
  CreateProductRequest,
  CreateServiceListingRequest,
  ProductDto,
  PublicProductDetailDto,
  PublicSearchItem,
  PublicServiceDetailDto,
  PublicStoreDto,
  SearchQuery,
  SearchResponse,
  SearchResponseSchema,
  ServiceListingDto,
  slugifyTitle,
  UpdateProductRequest,
  UpdateServiceListingRequest
} from "@saudavo/contracts";
import { DomainException } from "../../common/errors/domain.exception";
import { bigIntToSafeNumber } from "../../common/money.util";
import { PrismaService } from "../../common/prisma/prisma.service";
import { OutboxService } from "../outbox/outbox.service";
import {
  STORE_WITH_RELATIONS_INCLUDE,
  toPublicStoreDto
} from "../seller/seller.mapper";
import { SellerService } from "../seller/seller.service";
import {
  PRODUCT_WITH_VARIANTS_INCLUDE,
  PUBLIC_PRODUCT_INCLUDE,
  PUBLIC_SERVICE_INCLUDE,
  SERVICE_WITH_PACKAGES_INCLUDE,
  toCategoryDto,
  toProductDto,
  toPublicProductDetailDto,
  toPublicServiceDetailDto,
  toServiceListingDto
} from "./catalog.mapper";

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sellerService: SellerService,
    private readonly outboxService: OutboxService
  ) {}

  async listCategories(
    applicableTo: "PRODUCT" | "SERVICE" | undefined,
    requestId: string
  ): Promise<CategoriesResponse> {
    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
        ...(applicableTo
          ? { applicableTo: { in: [applicableTo, "BOTH"] } }
          : {})
      },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }]
    });

    return CategoriesResponseSchema.parse({
      data: categories.map(toCategoryDto),
      meta: { requestId }
    });
  }

  async listSellerProducts(
    userId: string,
    requestId: string
  ): Promise<{ data: ProductDto[]; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const products = await this.prisma.product.findMany({
      where: { storeId: store.id, deletedAt: null },
      include: PRODUCT_WITH_VARIANTS_INCLUDE,
      orderBy: { createdAt: "desc" }
    });

    return {
      data: products.map(toProductDto),
      meta: { requestId }
    };
  }

  async createProduct(
    userId: string,
    dto: CreateProductRequest,
    requestId: string
  ): Promise<{ data: ProductDto; meta: { requestId: string } }> {
    const store = await this.sellerService.requireApprovedOwnStore(userId);
    await this.requireValidCategory(dto.categoryId, "PRODUCT");

    const baseSlug = dto.slug ?? slugifyTitle(dto.title);
    const uniqueSlug = await this.resolveUniqueActiveSlug("PRODUCT", baseSlug);
    const variants = dto.variants ?? [];

    const created = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          storeId: store.id,
          categoryId: dto.categoryId,
          slug: uniqueSlug,
          title: dto.title,
          description: dto.description,
          basePricePaisa: BigInt(dto.basePricePaisa),
          currency: "PKR",
          stockQuantity: dto.stockQuantity,
          hasVariants: variants.length > 0,
          deliveryEnabled: dto.deliveryEnabled,
          pickupEnabled: dto.pickupEnabled,
          status: dto.initialStatus,
          ...(variants.length > 0
            ? {
                variants: {
                  create: variants.map((v) => ({
                    sku: v.sku ?? null,
                    title: v.title,
                    optionValuesJson: v.optionValuesJson,
                    pricePaisa: BigInt(v.pricePaisa),
                    stockQuantity: v.stockQuantity,
                    isActive: v.isActive
                  }))
                }
              }
            : {})
        },
        include: PRODUCT_WITH_VARIANTS_INCLUDE
      });

      if (dto.initialStatus === "PENDING_REVIEW") {
        await this.outboxService.enqueue(
          {
            eventType: "LISTING_SUBMITTED_FOR_REVIEW",
            aggregateType: "Product",
            aggregateId: product.id,
            payloadJson: { listingType: "PRODUCT", storeId: store.id }
          },
          tx
        );
      }

      return product;
    });

    return {
      data: toProductDto(created),
      meta: { requestId }
    };
  }

  async updateSellerProduct(
    userId: string,
    productId: string,
    dto: UpdateProductRequest,
    requestId: string
  ): Promise<{ data: ProductDto; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const existing = await this.prisma.product.findFirst({
      where: { id: productId, storeId: store.id, deletedAt: null },
      include: PRODUCT_WITH_VARIANTS_INCLUDE
    });

    if (!existing) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Product not found."
      );
    }

    if (dto.categoryId !== undefined) {
      await this.requireValidCategory(dto.categoryId, "PRODUCT");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.variants !== undefined) {
        await tx.productVariant.updateMany({
          where: { productId: existing.id, deletedAt: null },
          data: { deletedAt: new Date(), isActive: false }
        });

        if (dto.variants.length > 0) {
          await tx.productVariant.createMany({
            data: dto.variants.map((v) => ({
              productId: existing.id,
              sku: v.sku ?? null,
              title: v.title,
              optionValuesJson: v.optionValuesJson,
              pricePaisa: BigInt(v.pricePaisa),
              stockQuantity: v.stockQuantity,
              isActive: v.isActive
            }))
          });
        }
      }

      return tx.product.update({
        where: { id: existing.id },
        data: {
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.basePricePaisa !== undefined
            ? { basePricePaisa: BigInt(dto.basePricePaisa) }
            : {}),
          ...(dto.stockQuantity !== undefined
            ? { stockQuantity: dto.stockQuantity }
            : {}),
          ...(dto.deliveryEnabled !== undefined
            ? { deliveryEnabled: dto.deliveryEnabled }
            : {}),
          ...(dto.pickupEnabled !== undefined
            ? { pickupEnabled: dto.pickupEnabled }
            : {}),
          ...(dto.variants !== undefined
            ? { hasVariants: dto.variants.length > 0 }
            : {}),
          ...(dto.status !== undefined
            ? { status: dto.status, rejectionReason: null }
            : {})
        },
        include: PRODUCT_WITH_VARIANTS_INCLUDE
      });
    });

    return {
      data: toProductDto(updated),
      meta: { requestId }
    };
  }

  async archiveSellerProduct(
    userId: string,
    productId: string,
    requestId: string
  ): Promise<{ data: { archived: true; id: string }; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const existing = await this.prisma.product.findFirst({
      where: { id: productId, storeId: store.id, deletedAt: null }
    });
    if (!existing) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Product not found."
      );
    }

    await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        status: "ARCHIVED",
        deletedAt: new Date()
      }
    });

    return {
      data: { archived: true, id: existing.id },
      meta: { requestId }
    };
  }

  async listSellerServices(
    userId: string,
    requestId: string
  ): Promise<{ data: ServiceListingDto[]; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const services = await this.prisma.serviceListing.findMany({
      where: { storeId: store.id, deletedAt: null },
      include: SERVICE_WITH_PACKAGES_INCLUDE,
      orderBy: { createdAt: "desc" }
    });

    return {
      data: services.map(toServiceListingDto),
      meta: { requestId }
    };
  }

  async createServiceListing(
    userId: string,
    dto: CreateServiceListingRequest,
    requestId: string
  ): Promise<{ data: ServiceListingDto; meta: { requestId: string } }> {
    const store = await this.sellerService.requireApprovedOwnStore(userId);
    await this.requireValidCategory(dto.categoryId, "SERVICE");

    const baseSlug = dto.slug ?? slugifyTitle(dto.title);
    const uniqueSlug = await this.resolveUniqueActiveSlug("SERVICE", baseSlug);

    const created = await this.prisma.$transaction(async (tx) => {
      const listing = await tx.serviceListing.create({
        data: {
          storeId: store.id,
          categoryId: dto.categoryId,
          slug: uniqueSlug,
          title: dto.title,
          description: dto.description,
          serviceMode: dto.serviceMode,
          requirementsPrompt: dto.requirementsPrompt ?? null,
          status: dto.initialStatus,
          packages: {
            create: dto.packages.map((pkg) => ({
              tierName: pkg.tierName,
              description: pkg.description,
              pricePaisa: BigInt(pkg.pricePaisa),
              currency: "PKR",
              deliveryEstimateDays: pkg.deliveryEstimateDays,
              maxRevisions: pkg.maxRevisions,
              isActive: pkg.isActive
            }))
          }
        },
        include: SERVICE_WITH_PACKAGES_INCLUDE
      });

      if (dto.initialStatus === "PENDING_REVIEW") {
        await this.outboxService.enqueue(
          {
            eventType: "LISTING_SUBMITTED_FOR_REVIEW",
            aggregateType: "ServiceListing",
            aggregateId: listing.id,
            payloadJson: { listingType: "SERVICE", storeId: store.id }
          },
          tx
        );
      }

      return listing;
    });

    return {
      data: toServiceListingDto(created),
      meta: { requestId }
    };
  }

  async updateSellerService(
    userId: string,
    serviceId: string,
    dto: UpdateServiceListingRequest,
    requestId: string
  ): Promise<{ data: ServiceListingDto; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const existing = await this.prisma.serviceListing.findFirst({
      where: { id: serviceId, storeId: store.id, deletedAt: null },
      include: SERVICE_WITH_PACKAGES_INCLUDE
    });
    if (!existing) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Service listing not found."
      );
    }

    if (dto.categoryId !== undefined) {
      await this.requireValidCategory(dto.categoryId, "SERVICE");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.packages !== undefined) {
        await tx.servicePackage.updateMany({
          where: { serviceListingId: existing.id, deletedAt: null },
          data: { deletedAt: new Date(), isActive: false }
        });

        await tx.servicePackage.createMany({
          data: dto.packages.map((pkg) => ({
            serviceListingId: existing.id,
            tierName: pkg.tierName,
            description: pkg.description,
            pricePaisa: BigInt(pkg.pricePaisa),
            currency: "PKR",
            deliveryEstimateDays: pkg.deliveryEstimateDays,
            maxRevisions: pkg.maxRevisions,
            isActive: pkg.isActive
          }))
        });
      }

      return tx.serviceListing.update({
        where: { id: existing.id },
        data: {
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.serviceMode !== undefined
            ? { serviceMode: dto.serviceMode }
            : {}),
          ...(dto.requirementsPrompt !== undefined
            ? { requirementsPrompt: dto.requirementsPrompt }
            : {}),
          ...(dto.status !== undefined
            ? { status: dto.status, rejectionReason: null }
            : {})
        },
        include: SERVICE_WITH_PACKAGES_INCLUDE
      });
    });

    return {
      data: toServiceListingDto(updated),
      meta: { requestId }
    };
  }

  async archiveSellerService(
    userId: string,
    serviceId: string,
    requestId: string
  ): Promise<{ data: { archived: true; id: string }; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const existing = await this.prisma.serviceListing.findFirst({
      where: { id: serviceId, storeId: store.id, deletedAt: null }
    });
    if (!existing) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Service listing not found."
      );
    }

    await this.prisma.serviceListing.update({
      where: { id: existing.id },
      data: {
        status: "ARCHIVED",
        deletedAt: new Date()
      }
    });

    return {
      data: { archived: true, id: existing.id },
      meta: { requestId }
    };
  }

  async getPublicStoreBySlug(
    slug: string,
    requestId: string
  ): Promise<{ data: PublicStoreDto; meta: { requestId: string } }> {
    const store = await this.prisma.store.findFirst({
      where: {
        slug,
        status: "ACTIVE",
        deletedAt: null,
        sellerProfile: { verificationStatus: "APPROVED" }
      },
      include: STORE_WITH_RELATIONS_INCLUDE
    });

    if (!store) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Store not found."
      );
    }

    return {
      data: toPublicStoreDto(store),
      meta: { requestId }
    };
  }

  async getPublicProductBySlug(
    slug: string,
    requestId: string
  ): Promise<{ data: PublicProductDetailDto; meta: { requestId: string } }> {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        status: "ACTIVE",
        deletedAt: null,
        store: {
          status: "ACTIVE",
          deletedAt: null,
          sellerProfile: { verificationStatus: "APPROVED" }
        }
      },
      include: PUBLIC_PRODUCT_INCLUDE
    });

    if (!product) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Product not found."
      );
    }

    return {
      data: toPublicProductDetailDto(product),
      meta: { requestId }
    };
  }

  async getPublicServiceBySlug(
    slug: string,
    requestId: string
  ): Promise<{ data: PublicServiceDetailDto; meta: { requestId: string } }> {
    const service = await this.prisma.serviceListing.findFirst({
      where: {
        slug,
        status: "ACTIVE",
        deletedAt: null,
        store: {
          status: "ACTIVE",
          deletedAt: null,
          sellerProfile: { verificationStatus: "APPROVED" }
        }
      },
      include: PUBLIC_SERVICE_INCLUDE
    });

    if (!service) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Service listing not found."
      );
    }

    return {
      data: toPublicServiceDetailDto(service),
      meta: { requestId }
    };
  }

  async searchPublic(
    query: SearchQuery,
    requestId: string
  ): Promise<SearchResponse> {
    const normalizedQ = query.q?.trim().toLowerCase() ?? "";
    const storeFilter = {
      status: "ACTIVE",
      deletedAt: null,
      sellerProfile: { verificationStatus: "APPROVED" },
      ...(query.districtId ? { districtId: query.districtId } : {}),
      ...(query.areaZoneId
        ? { serviceAreas: { some: { areaZoneId: query.areaZoneId } } }
        : {})
    };

    const items: PublicSearchItem[] = [];

    if (query.type === "ALL" || query.type === "PRODUCT") {
      const products = await this.prisma.product.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          store: storeFilter
        },
        include: PUBLIC_PRODUCT_INCLUDE,
        orderBy: { createdAt: "desc" }
      });

      for (const product of products) {
        const pricePaisa = bigIntToSafeNumber(
          product.basePricePaisa,
          "basePricePaisa"
        );
        if (query.minPrice !== undefined && pricePaisa < query.minPrice) {
          continue;
        }
        if (query.maxPrice !== undefined && pricePaisa > query.maxPrice) {
          continue;
        }
        if (
          normalizedQ &&
          !product.title.toLowerCase().includes(normalizedQ) &&
          !product.description.toLowerCase().includes(normalizedQ)
        ) {
          continue;
        }

        items.push({
          id: product.id,
          type: "PRODUCT",
          slug: product.slug,
          title: product.title,
          pricePaisa,
          currency: "PKR",
          serviceMode: null,
          store: {
            id: product.store.id,
            slug: product.store.slug,
            displayName: product.store.displayName,
            districtName: product.store.district.nameEn,
            serviceAreas: product.store.serviceAreas.map(
              (sa) => sa.areaZone.nameEn
            )
          }
        });
      }
    }

    if (query.type === "ALL" || query.type === "SERVICE") {
      const services = await this.prisma.serviceListing.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          store: storeFilter
        },
        include: PUBLIC_SERVICE_INCLUDE,
        orderBy: { createdAt: "desc" }
      });

      for (const service of services) {
        const activePackages = service.packages.filter((p) => p.isActive);
        const lowestPrice =
          activePackages.length > 0
            ? Math.min(
                ...activePackages.map((p) =>
                  bigIntToSafeNumber(p.pricePaisa, "pricePaisa")
                )
              )
            : 0;
        if (lowestPrice <= 0) {
          continue;
        }
        if (query.minPrice !== undefined && lowestPrice < query.minPrice) {
          continue;
        }
        if (query.maxPrice !== undefined && lowestPrice > query.maxPrice) {
          continue;
        }
        if (
          normalizedQ &&
          !service.title.toLowerCase().includes(normalizedQ) &&
          !service.description.toLowerCase().includes(normalizedQ)
        ) {
          continue;
        }

        items.push({
          id: service.id,
          type: "SERVICE",
          slug: service.slug,
          title: service.title,
          pricePaisa: lowestPrice,
          currency: "PKR",
          serviceMode:
            service.serviceMode === "ON_SITE" ||
            service.serviceMode === "REMOTE" ||
            service.serviceMode === "HYBRID"
              ? service.serviceMode
              : null,
          store: {
            id: service.store.id,
            slug: service.store.slug,
            displayName: service.store.displayName,
            districtName: service.store.district.nameEn,
            serviceAreas: service.store.serviceAreas.map(
              (sa) => sa.areaZone.nameEn
            )
          }
        });
      }
    }

    const startIndex = query.cursor
      ? Math.max(
          0,
          items.findIndex((item) => item.id === query.cursor) + 1
        )
      : 0;
    const page = items.slice(startIndex, startIndex + query.limit);
    const hasMore = startIndex + query.limit < items.length;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    return SearchResponseSchema.parse({
      data: page,
      meta: {
        requestId,
        pagination: {
          cursor: nextCursor,
          hasMore,
          limit: query.limit
        }
      }
    });
  }

  private async requireValidCategory(
    categoryId: string,
    targetType: "PRODUCT" | "SERVICE"
  ): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        isActive: true
      }
    });

    if (
      !category ||
      (category.applicableTo !== targetType && category.applicableTo !== "BOTH")
    ) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        `Category is invalid or not applicable for ${targetType.toLowerCase()} listings.`
      );
    }
  }

  /**
   * PQ-16: Guarantees globally unique active slugs by auto-suffixing collisions (-2, -3, ...).
   */
  private async resolveUniqueActiveSlug(
    kind: "PRODUCT" | "SERVICE",
    baseSlug: string
  ): Promise<string> {
    for (let attempt = 1; attempt <= 50; attempt += 1) {
      const candidate =
        attempt === 1 ? baseSlug : `${baseSlug}-${String(attempt)}`;
      const exists =
        kind === "PRODUCT"
          ? await this.prisma.product.findFirst({
              where: { slug: candidate, deletedAt: null },
              select: { id: true }
            })
          : await this.prisma.serviceListing.findFirst({
              where: { slug: candidate, deletedAt: null },
              select: { id: true }
            });
      if (!exists) {
        return candidate;
      }
    }

    throw new DomainException(
      "CONFLICT",
      HttpStatus.CONFLICT,
      "Unable to allocate a unique listing slug."
    );
  }
}
