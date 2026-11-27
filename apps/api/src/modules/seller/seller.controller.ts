import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Post,
  Req
} from "@nestjs/common";
import {
  type PrivateStoreDto,
  type SellerOnboardingRequest,
  SellerOnboardingRequestSchema,
  type SellerOnboardingResponse,
  type SellerProfileDto,
  type UpdateSellerProfileRequest,
  UpdateSellerProfileRequestSchema,
  type UpdateStoreRequest,
  UpdateStoreRequestSchema
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser, Roles } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { SellerService } from "./seller.service";

@Controller("seller")
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  @Post("onboarding")
  async onboard(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(SellerOnboardingRequestSchema))
    body: SellerOnboardingRequest,
    @Req() req: AppRequest
  ): Promise<SellerOnboardingResponse> {
    const userId = this.requireUserId(auth);
    return this.sellerService.onboard(userId, body, getRequestId(req));
  }

  @Roles("SELLER")
  @Get("profile")
  async getOwnProfile(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: SellerProfileDto; meta: { requestId: string } }> {
    return this.sellerService.getOwnProfile(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Roles("SELLER")
  @Patch("profile")
  async updateOwnProfile(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(UpdateSellerProfileRequestSchema))
    body: UpdateSellerProfileRequest,
    @Req() req: AppRequest
  ): Promise<{ data: SellerProfileDto; meta: { requestId: string } }> {
    return this.sellerService.updateOwnProfile(
      this.requireUserId(auth),
      body,
      getRequestId(req)
    );
  }

  @Roles("SELLER")
  @Get("store")
  async getOwnStore(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: PrivateStoreDto; meta: { requestId: string } }> {
    return this.sellerService.getOwnStore(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Roles("SELLER")
  @Patch("store")
  async updateOwnStore(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(UpdateStoreRequestSchema))
    body: UpdateStoreRequest,
    @Req() req: AppRequest
  ): Promise<{ data: PrivateStoreDto; meta: { requestId: string } }> {
    return this.sellerService.updateOwnStore(
      this.requireUserId(auth),
      body,
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
