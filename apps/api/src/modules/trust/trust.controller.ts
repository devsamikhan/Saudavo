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
  type CreateDisputeRequest,
  CreateDisputeRequestSchema,
  type CreateReportRequest,
  CreateReportRequestSchema,
  type CreateReviewRequest,
  CreateReviewRequestSchema,
  type DisputeDto,
  type ReportDto,
  type ResolveDisputeRequest,
  ResolveDisputeRequestSchema,
  type ResolveReportRequest,
  ResolveReportRequestSchema,
  type ReviewDto
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser, Public, Roles } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import type { ClientMetadata } from "../auth/auth.service";
import { TrustService } from "./trust.service";

@Controller()
export class TrustController {
  constructor(private readonly trustService: TrustService) {}

  @Post("orders/:id/reviews")
  async createReview(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Body(new ZodValidationPipe(CreateReviewRequestSchema))
    body: CreateReviewRequest,
    @Req() req: AppRequest
  ): Promise<{ data: ReviewDto; meta: { requestId: string } }> {
    return this.trustService.createReview(
      this.requireAuth(auth).userId,
      orderId,
      body,
      getRequestId(req)
    );
  }

  @Public()
  @Get("stores/:slug/reviews")
  async listStoreReviews(
    @Param("slug") slug: string,
    @Req() req: AppRequest
  ): Promise<{ data: ReviewDto[]; meta: { requestId: string } }> {
    return this.trustService.listStoreReviews(slug, getRequestId(req));
  }

  @Post("reports")
  async createReport(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(CreateReportRequestSchema))
    body: CreateReportRequest,
    @Req() req: AppRequest
  ): Promise<{ data: ReportDto; meta: { requestId: string } }> {
    return this.trustService.createReport(
      this.requireAuth(auth).userId,
      body,
      getRequestId(req)
    );
  }

  @Roles("MODERATOR", "ADMIN", "SUPER_ADMIN")
  @Get("admin/reports")
  async listAdminReports(
    @Req() req: AppRequest
  ): Promise<{ data: ReportDto[]; meta: { requestId: string } }> {
    return this.trustService.listAdminReports(getRequestId(req));
  }

  @Roles("MODERATOR", "ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @Post("admin/reports/:id/resolve")
  async resolveReport(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) reportId: string,
    @Body(new ZodValidationPipe(ResolveReportRequestSchema))
    body: ResolveReportRequest,
    @Req() req: AppRequest
  ): Promise<{ data: ReportDto; meta: { requestId: string } }> {
    return this.trustService.resolveReport(
      reportId,
      this.requireAuth(auth),
      body,
      this.extractClient(req),
      getRequestId(req)
    );
  }

  @Post("orders/:id/disputes")
  async createDispute(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Body(new ZodValidationPipe(CreateDisputeRequestSchema))
    body: CreateDisputeRequest,
    @Req() req: AppRequest
  ): Promise<{ data: DisputeDto; meta: { requestId: string } }> {
    return this.trustService.createDispute(
      this.requireAuth(auth).userId,
      orderId,
      body,
      getRequestId(req)
    );
  }

  @Roles("SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN")
  @Get("admin/disputes")
  async listAdminDisputes(
    @Req() req: AppRequest
  ): Promise<{ data: DisputeDto[]; meta: { requestId: string } }> {
    return this.trustService.listAdminDisputes(getRequestId(req));
  }

  @Roles("MODERATOR", "ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @Post("admin/disputes/:id/resolve")
  async resolveDispute(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) disputeId: string,
    @Body(new ZodValidationPipe(ResolveDisputeRequestSchema))
    body: ResolveDisputeRequest,
    @Req() req: AppRequest
  ): Promise<{ data: DisputeDto; meta: { requestId: string } }> {
    return this.trustService.resolveDispute(
      disputeId,
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
