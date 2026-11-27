import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req
} from "@nestjs/common";
import {
  type CreatePromoDealRequest,
  CreatePromoDealRequestSchema,
  type TogglePromoDealRequest,
  TogglePromoDealRequestSchema
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser, Public, Roles } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { DealsService } from "./deals.service";

@Controller()
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Public()
  @Get("deals")
  listPublicFlashDeals(
    @Query("storeId") storeId: string | undefined,
    @Req() req: AppRequest
  ) {
    return this.dealsService.listPublicFlashDeals(storeId, getRequestId(req));
  }

  @Roles("SELLER")
  @Get("seller/deals")
  listSellerDeals(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ) {
    if (!auth) {
      throw new DomainException("UNAUTHORIZED", HttpStatus.UNAUTHORIZED, "Authentication required.");
    }
    return this.dealsService.listSellerDeals(auth.userId, getRequestId(req));
  }

  @Roles("SELLER")
  @Post("seller/deals")
  createSellerDeal(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(CreatePromoDealRequestSchema))
    body: CreatePromoDealRequest,
    @Req() req: AppRequest
  ) {
    if (!auth) {
      throw new DomainException("UNAUTHORIZED", HttpStatus.UNAUTHORIZED, "Authentication required.");
    }
    return this.dealsService.createSellerDeal(auth.userId, body, getRequestId(req));
  }

  @Roles("SELLER")
  @Patch("seller/deals/:id/toggle")
  toggleSellerDeal(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) dealId: string,
    @Body(new ZodValidationPipe(TogglePromoDealRequestSchema))
    body: TogglePromoDealRequest,
    @Req() req: AppRequest
  ) {
    if (!auth) {
      throw new DomainException("UNAUTHORIZED", HttpStatus.UNAUTHORIZED, "Authentication required.");
    }
    return this.dealsService.toggleSellerDeal(
      auth.userId,
      dealId,
      body.isActive,
      getRequestId(req)
    );
  }
}
