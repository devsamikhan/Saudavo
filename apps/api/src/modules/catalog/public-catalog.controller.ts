import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req
} from "@nestjs/common";
import {
  CategoriesResponse,
  PublicProductDetailDto,
  PublicServiceDetailDto,
  PublicStoreDto,
  SearchQuery,
  SearchQuerySchema,
  SearchResponse,
  StoreCatalogResponse
} from "@saudavo/contracts";
import { Public } from "../../common/auth/decorators";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { RateLimit } from "../../common/rate-limit/rate-limit.guard";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { CatalogService } from "./catalog.service";

@Public()
@Controller()
export class PublicCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("categories")
  async listCategories(
    @Query("applicableTo") applicableTo: string | undefined,
    @Req() req: AppRequest
  ): Promise<CategoriesResponse> {
    const filter =
      applicableTo === "PRODUCT" || applicableTo === "SERVICE"
        ? applicableTo
        : undefined;
    return this.catalogService.listCategories(filter, getRequestId(req));
  }

  @Get("stores/:slug")
  async getStore(
    @Param("slug") slug: string,
    @Req() req: AppRequest
  ): Promise<{ data: PublicStoreDto; meta: { requestId: string } }> {
    return this.catalogService.getPublicStoreBySlug(slug, getRequestId(req));
  }

  @Get("stores/:slug/listings")
  async getStoreListings(
    @Param("slug") slug: string,
    @Req() req: AppRequest
  ): Promise<StoreCatalogResponse> {
    return this.catalogService.getPublicStoreCatalogBySlug(
      slug,
      getRequestId(req)
    );
  }

  @Get("products/:slug")
  async getProduct(
    @Param("slug") slug: string,
    @Req() req: AppRequest
  ): Promise<{ data: PublicProductDetailDto; meta: { requestId: string } }> {
    return this.catalogService.getPublicProductBySlug(slug, getRequestId(req));
  }

  @Get("products/:slug/images/:mediaAssetId/signed-url")
  async getProductImageSignedUrl(
    @Param("slug") slug: string,
    @Param("mediaAssetId", new ParseUUIDPipe()) mediaAssetId: string,
    @Req() req: AppRequest
  ): Promise<{
    data: { mediaAssetId: string; readUrl: string; expiresInSeconds: number };
    meta: { requestId: string };
  }> {
    return this.catalogService.getPublicProductImageSignedUrl(
      slug,
      mediaAssetId,
      getRequestId(req)
    );
  }

  @Get("services/:slug")
  async getService(
    @Param("slug") slug: string,
    @Req() req: AppRequest
  ): Promise<{ data: PublicServiceDetailDto; meta: { requestId: string } }> {
    return this.catalogService.getPublicServiceBySlug(slug, getRequestId(req));
  }

  @RateLimit({ limit: 60, windowMs: 60_000, keyPrefix: "catalog_search" })
  @Get("search")
  async search(
    @Query(new ZodValidationPipe(SearchQuerySchema)) query: SearchQuery,
    @Req() req: AppRequest
  ): Promise<SearchResponse> {
    return this.catalogService.searchPublic(query, getRequestId(req));
  }
}
