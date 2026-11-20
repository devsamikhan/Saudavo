import { Body, Controller, Get, HttpStatus, Post, Req } from "@nestjs/common";
import {
  CommissionLedgerEntryDto,
  CommissionRuleDto,
  CommissionSummaryDto,
  CreateCommissionRuleRequest,
  CreateCommissionRuleRequestSchema,
  CreateSettlementRecordRequest,
  CreateSettlementRecordRequestSchema,
  SellerSettlementRecordDto
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser, Roles } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import type { ClientMetadata } from "../auth/auth.service";
import { FinanceService } from "./finance.service";

@Controller()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Roles("SELLER")
  @Get("seller/commission-summary")
  async getSellerSummary(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: CommissionSummaryDto; meta: { requestId: string } }> {
    return this.financeService.getSellerCommissionSummary(
      this.requireAuth(auth).userId,
      getRequestId(req)
    );
  }

  @Roles("SELLER")
  @Get("seller/commission-ledger")
  async getSellerLedger(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: CommissionLedgerEntryDto[]; meta: { requestId: string } }> {
    return this.financeService.listSellerCommissionLedger(
      this.requireAuth(auth).userId,
      getRequestId(req)
    );
  }

  @Roles("SELLER")
  @Get("seller/settlements")
  async getSellerSettlements(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: SellerSettlementRecordDto[]; meta: { requestId: string } }> {
    return this.financeService.listSellerSettlements(
      this.requireAuth(auth).userId,
      getRequestId(req)
    );
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @Get("admin/commission-rules")
  async listCommissionRules(
    @Req() req: AppRequest
  ): Promise<{ data: CommissionRuleDto[]; meta: { requestId: string } }> {
    return this.financeService.listCommissionRules(getRequestId(req));
  }

  @Roles("SUPER_ADMIN")
  @Post("admin/commission-rules")
  async createCommissionRule(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(CreateCommissionRuleRequestSchema))
    body: CreateCommissionRuleRequest,
    @Req() req: AppRequest
  ): Promise<{ data: CommissionRuleDto; meta: { requestId: string } }> {
    return this.financeService.createCommissionRule(
      body,
      this.requireAuth(auth),
      this.extractClient(req),
      getRequestId(req)
    );
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @Post("admin/settlements")
  async recordSettlement(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(CreateSettlementRecordRequestSchema))
    body: CreateSettlementRecordRequest,
    @Req() req: AppRequest
  ): Promise<{ data: SellerSettlementRecordDto; meta: { requestId: string } }> {
    return this.financeService.recordSettlement(
      body,
      this.requireAuth(auth),
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
