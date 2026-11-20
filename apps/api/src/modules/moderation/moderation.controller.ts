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
  ApproveDecisionRequest,
  ApproveDecisionRequestSchema,
  ApproveListingRequest,
  ApproveListingRequestSchema,
  ModerationQueueResponse,
  RejectDecisionRequest,
  RejectDecisionRequestSchema,
  RejectListingRequest,
  RejectListingRequestSchema,
  SuspendEntityRequest,
  SuspendEntityRequestSchema
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser, Roles } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import type { ClientMetadata } from "../auth/auth.service";
import { ModerationService } from "./moderation.service";

@Roles("MODERATOR", "ADMIN", "SUPER_ADMIN")
@Controller("admin")
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get("review-queue")
  async getReviewQueue(
    @Req() req: AppRequest
  ): Promise<ModerationQueueResponse> {
    return this.moderationService.getReviewQueue(getRequestId(req));
  }

  @HttpCode(HttpStatus.OK)
  @Post("sellers/:id/approve")
  async approveSeller(
    @Param("id", new ParseUUIDPipe()) sellerProfileId: string,
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(ApproveDecisionRequestSchema))
    body: ApproveDecisionRequest,
    @Req() req: AppRequest
  ): Promise<{
    data: {
      sellerProfileId: string;
      verificationStatus: "APPROVED";
      storeActivated: boolean;
    };
    meta: { requestId: string };
  }> {
    return this.moderationService.approveSeller(
      sellerProfileId,
      this.requireAuth(auth),
      body,
      this.extractClient(req),
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post("sellers/:id/reject")
  async rejectSeller(
    @Param("id", new ParseUUIDPipe()) sellerProfileId: string,
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(RejectDecisionRequestSchema))
    body: RejectDecisionRequest,
    @Req() req: AppRequest
  ): Promise<{
    data: { sellerProfileId: string; verificationStatus: "REJECTED" };
    meta: { requestId: string };
  }> {
    return this.moderationService.rejectSeller(
      sellerProfileId,
      this.requireAuth(auth),
      body,
      this.extractClient(req),
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post("listings/:id/approve")
  async approveListing(
    @Param("id", new ParseUUIDPipe()) listingId: string,
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(ApproveListingRequestSchema))
    body: ApproveListingRequest,
    @Req() req: AppRequest
  ): Promise<{
    data: { id: string; listingType: "PRODUCT" | "SERVICE"; status: "ACTIVE" };
    meta: { requestId: string };
  }> {
    return this.moderationService.approveListing(
      listingId,
      this.requireAuth(auth),
      body,
      this.extractClient(req),
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post("listings/:id/reject")
  async rejectListing(
    @Param("id", new ParseUUIDPipe()) listingId: string,
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(RejectListingRequestSchema))
    body: RejectListingRequest,
    @Req() req: AppRequest
  ): Promise<{
    data: { id: string; listingType: "PRODUCT" | "SERVICE"; status: "REJECTED" };
    meta: { requestId: string };
  }> {
    return this.moderationService.rejectListing(
      listingId,
      this.requireAuth(auth),
      body,
      this.extractClient(req),
      getRequestId(req)
    );
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @Post("stores/:id/suspend")
  async suspendStore(
    @Param("id", new ParseUUIDPipe()) storeId: string,
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(SuspendEntityRequestSchema))
    body: SuspendEntityRequest,
    @Req() req: AppRequest
  ): Promise<{
    data: { storeId: string; status: "SUSPENDED" };
    meta: { requestId: string };
  }> {
    return this.moderationService.suspendStore(
      storeId,
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
