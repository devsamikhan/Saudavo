import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req
} from "@nestjs/common";
import {
  CreateProductRequest,
  CreateProductRequestSchema,
  CreateServiceListingRequest,
  CreateServiceListingRequestSchema,
  ProductDto,
  ServiceListingDto,
  UpdateProductRequest,
  UpdateProductRequestSchema,
  UpdateServiceListingRequest,
  UpdateServiceListingRequestSchema
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser, Roles } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { CatalogService } from "./catalog.service";

@Roles("SELLER")
@Controller("seller")
export class SellerCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("products")
  async listProducts(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: ProductDto[]; meta: { requestId: string } }> {
    return this.catalogService.listSellerProducts(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Post("products")
  async createProduct(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(CreateProductRequestSchema))
    body: CreateProductRequest,
    @Req() req: AppRequest
  ): Promise<{ data: ProductDto; meta: { requestId: string } }> {
    return this.catalogService.createProduct(
      this.requireUserId(auth),
      body,
      getRequestId(req)
    );
  }

  @Patch("products/:id")
  async updateProduct(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) productId: string,
    @Body(new ZodValidationPipe(UpdateProductRequestSchema))
    body: UpdateProductRequest,
    @Req() req: AppRequest
  ): Promise<{ data: ProductDto; meta: { requestId: string } }> {
    return this.catalogService.updateSellerProduct(
      this.requireUserId(auth),
      productId,
      body,
      getRequestId(req)
    );
  }

  @Delete("products/:id")
  async archiveProduct(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) productId: string,
    @Req() req: AppRequest
  ): Promise<{
    data: { archived: true; id: string };
    meta: { requestId: string };
  }> {
    return this.catalogService.archiveSellerProduct(
      this.requireUserId(auth),
      productId,
      getRequestId(req)
    );
  }

  @Get("services")
  async listServices(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: ServiceListingDto[]; meta: { requestId: string } }> {
    return this.catalogService.listSellerServices(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Post("services")
  async createService(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(CreateServiceListingRequestSchema))
    body: CreateServiceListingRequest,
    @Req() req: AppRequest
  ): Promise<{ data: ServiceListingDto; meta: { requestId: string } }> {
    return this.catalogService.createServiceListing(
      this.requireUserId(auth),
      body,
      getRequestId(req)
    );
  }

  @Patch("services/:id")
  async updateService(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) serviceId: string,
    @Body(new ZodValidationPipe(UpdateServiceListingRequestSchema))
    body: UpdateServiceListingRequest,
    @Req() req: AppRequest
  ): Promise<{ data: ServiceListingDto; meta: { requestId: string } }> {
    return this.catalogService.updateSellerService(
      this.requireUserId(auth),
      serviceId,
      body,
      getRequestId(req)
    );
  }

  @Delete("services/:id")
  async archiveService(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) serviceId: string,
    @Req() req: AppRequest
  ): Promise<{
    data: { archived: true; id: string };
    meta: { requestId: string };
  }> {
    return this.catalogService.archiveSellerService(
      this.requireUserId(auth),
      serviceId,
      getRequestId(req)
    );
  }

  private requireUserId(auth: AuthContext | undefined): string {
    if (!auth) {
      throw new DomainException(
        "UNAUTHORIZED",
        HttpStatus.UNAUTHORIZED,
        "Authentication session is required."
      );
    }
    return auth.userId;
  }
}
