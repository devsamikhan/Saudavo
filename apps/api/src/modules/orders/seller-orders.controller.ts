import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req
} from "@nestjs/common";
import {
  type CodCollectionRequest,
  CodCollectionRequestSchema,
  type ManualPaymentConfirmationRequest,
  ManualPaymentConfirmationRequestSchema,
  type OrderDetailDto,
  type RejectOrderRequest,
  RejectOrderRequestSchema,
  type UpdateSellerOrderStatusRequest,
  UpdateSellerOrderStatusRequestSchema
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser, Roles } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { OrdersService } from "./orders.service";

@Roles("SELLER")
@Controller("seller/orders")
export class SellerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async listOrders(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: OrderDetailDto[]; meta: { requestId: string } }> {
    return this.ordersService.listSellerOrders(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Get(":id")
  async getOrder(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Req() req: AppRequest
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    return this.ordersService.getSellerOrder(
      this.requireUserId(auth),
      orderId,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post(":id/confirm")
  async confirmOrder(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Req() req: AppRequest
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    return this.ordersService.confirmSellerOrder(
      this.requireUserId(auth),
      orderId,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post(":id/reject")
  async rejectOrder(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Body(new ZodValidationPipe(RejectOrderRequestSchema))
    body: RejectOrderRequest,
    @Req() req: AppRequest
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    return this.ordersService.rejectSellerOrder(
      this.requireUserId(auth),
      orderId,
      body,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post(":id/status")
  async updateStatus(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Body(new ZodValidationPipe(UpdateSellerOrderStatusRequestSchema))
    body: UpdateSellerOrderStatusRequest,
    @Req() req: AppRequest
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    return this.ordersService.updateSellerOrderStatus(
      this.requireUserId(auth),
      orderId,
      body,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post(":id/cod-collection")
  async confirmCodCollection(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(CodCollectionRequestSchema))
    body: CodCollectionRequest,
    @Req() req: AppRequest
  ) {
    return this.ordersService.confirmCodCollection(
      this.requireUserId(auth),
      orderId,
      body,
      idempotencyKey,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post(":id/manual-payment-confirmation")
  async confirmManualPayment(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(ManualPaymentConfirmationRequestSchema))
    body: ManualPaymentConfirmationRequest,
    @Req() req: AppRequest
  ) {
    return this.ordersService.confirmManualPayment(
      this.requireUserId(auth),
      orderId,
      body,
      idempotencyKey,
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
