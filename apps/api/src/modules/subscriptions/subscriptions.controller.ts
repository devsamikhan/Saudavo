import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req
} from "@nestjs/common";
import {
  type ReviewSubscriptionRenewalRequest,
  ReviewSubscriptionRenewalRequestSchema,
  type StoreSubscriptionSummaryDto,
  type SubmitSubscriptionRenewalRequest,
  SubmitSubscriptionRenewalRequestSchema,
  type SubscriptionPlanDto,
  type SubscriptionRenewalRequestDto
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser, Public, Roles } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import type { ClientMetadata } from "../auth/auth.service";
import { SubscriptionsService } from "./subscriptions.service";

@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get("subscriptions/plans")
  async listPlans(
    @Req() req: AppRequest
  ): Promise<{ data: SubscriptionPlanDto[]; meta: { requestId: string } }> {
    return this.subscriptionsService.listPlans(getRequestId(req));
  }

  @Roles("SELLER")
  @Get("seller/subscription")
  async getSellerSubscription(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: StoreSubscriptionSummaryDto; meta: { requestId: string } }> {
    return this.subscriptionsService.getSellerSubscription(
      this.requireAuth(auth).userId,
      getRequestId(req)
    );
  }

  @Roles("SELLER")
  @Post("seller/subscription/renewals")
  async submitRenewal(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(SubmitSubscriptionRenewalRequestSchema))
    body: SubmitSubscriptionRenewalRequest,
    @Req() req: AppRequest
  ): Promise<{
    data: SubscriptionRenewalRequestDto;
    meta: { requestId: string };
  }> {
    return this.subscriptionsService.submitRenewalRequest(
      this.requireAuth(auth).userId,
      body,
      getRequestId(req)
    );
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @Get("admin/subscriptions/renewals")
  async listAdminRenewals(@Req() req: AppRequest): Promise<{
    data: SubscriptionRenewalRequestDto[];
    meta: { requestId: string };
  }> {
    return this.subscriptionsService.listAdminRenewals(getRequestId(req));
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @Post("admin/subscriptions/renewals/:id/review")
  async reviewAdminRenewal(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) renewalId: string,
    @Body(new ZodValidationPipe(ReviewSubscriptionRenewalRequestSchema))
    body: ReviewSubscriptionRenewalRequest,
    @Req() req: AppRequest
  ): Promise<{
    data: SubscriptionRenewalRequestDto;
    meta: { requestId: string };
  }> {
    return this.subscriptionsService.reviewAdminRenewal(
      renewalId,
      this.requireAuth(auth),
      body,
      this.extractClient(req),
      getRequestId(req)
    );
  }

  private requireAuth(auth: AuthContext | undefined): AuthContext {
    if (!auth) {
      throw new DomainException(
        "UNAUTHORIZED",
        HttpStatus.UNAUTHORIZED,
        "Authentication session is required."
      );
    }
    return auth;
  }

  private extractClient(req: AppRequest): ClientMetadata {
    return {
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
      userAgent: req.header("user-agent") ?? null
    };
  }
}
