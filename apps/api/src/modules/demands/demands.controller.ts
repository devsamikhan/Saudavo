import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req
} from "@nestjs/common";
import {
  type CreateBuyerRequest,
  CreateBuyerRequestSchema,
  type RespondBuyerRequest,
  RespondBuyerRequestSchema
} from "@saudavo/contracts";
import { z } from "zod";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser, Public, Roles } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { DemandsService } from "./demands.service";

const CloseDemandSchema = z.object({
  status: z.enum(["FULFILLED", "CLOSED"]).default("FULFILLED")
});

@Controller("demands")
export class DemandsController {
  constructor(private readonly demandsService: DemandsService) {}

  @Public()
  @Get()
  listDemands(
    @Query("districtId") districtId: string | undefined,
    @Query("areaZoneId") areaZoneId: string | undefined,
    @Query("status") status: string | undefined,
    @Req() req: AppRequest
  ) {
    return this.demandsService.listPublicDemands(
      { districtId, areaZoneId, status },
      getRequestId(req)
    );
  }

  @Post()
  createDemand(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(CreateBuyerRequestSchema))
    body: CreateBuyerRequest,
    @Req() req: AppRequest
  ) {
    if (!auth) {
      throw new DomainException("UNAUTHORIZED", HttpStatus.UNAUTHORIZED, "Authentication required.");
    }
    return this.demandsService.createDemand(auth.userId, body, getRequestId(req));
  }

  @Roles("SELLER")
  @HttpCode(HttpStatus.OK)
  @Post(":id/respond")
  respondToDemand(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) demandId: string,
    @Body(new ZodValidationPipe(RespondBuyerRequestSchema))
    body: RespondBuyerRequest,
    @Req() req: AppRequest
  ) {
    if (!auth) {
      throw new DomainException("UNAUTHORIZED", HttpStatus.UNAUTHORIZED, "Authentication required.");
    }
    return this.demandsService.respondToDemand(
      auth.userId,
      demandId,
      body,
      getRequestId(req)
    );
  }

  @Patch(":id/close")
  closeDemand(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) demandId: string,
    @Body(new ZodValidationPipe(CloseDemandSchema))
    body: ReturnType<typeof CloseDemandSchema.parse>,
    @Req() req: AppRequest
  ) {
    if (!auth) {
      throw new DomainException("UNAUTHORIZED", HttpStatus.UNAUTHORIZED, "Authentication required.");
    }
    return this.demandsService.closeDemand(
      auth.userId,
      demandId,
      body.status,
      getRequestId(req)
    );
  }
}
