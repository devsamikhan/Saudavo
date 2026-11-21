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
  CancelOrderRequest,
  CancelOrderRequestSchema,
  CheckoutQuoteDto,
  CheckoutQuoteRequest,
  CheckoutQuoteRequestSchema,
  CreateOrderMessageRequest,
  CreateOrderMessageRequestSchema,
  CreatePhysicalOrderRequest,
  CreatePhysicalOrderRequestSchema,
  CreateServiceOrderRequest,
  CreateServiceOrderRequestSchema,
  OrderCreatedSummary,
  OrderDetailDto,
  OrderMessageDto,
  RequestServiceRevisionRequest,
  RequestServiceRevisionRequestSchema
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { RateLimit } from "../../common/rate-limit/rate-limit.guard";
import { type AppRequest, getRequestId } from "../../common/request-context";
import type { ClientMetadata } from "../auth/auth.service";
import { OrdersService } from "./orders.service";

@Controller()
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @RateLimit({ limit: 30, windowMs: 60_000, keyPrefix: "checkout_quote" })
  @HttpCode(HttpStatus.OK)
  @Post("checkout/quote")
  async quoteCheckout(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(CheckoutQuoteRequestSchema))
    body: CheckoutQuoteRequest,
    @Req() req: AppRequest
  ): Promise<{ data: CheckoutQuoteDto; meta: { requestId: string } }> {
    return this.ordersService.quoteCheckout(
      this.requireAuth(auth).userId,
      body,
      getRequestId(req)
    );
  }

  @RateLimit({ limit: 15, windowMs: 60_000, keyPrefix: "order_create_physical" })
  @Post("orders")
  async createPhysicalOrder(
    @CurrentUser() auth: AuthContext | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(CreatePhysicalOrderRequestSchema))
    body: CreatePhysicalOrderRequest,
    @Req() req: AppRequest
  ): Promise<{ data: OrderCreatedSummary; meta: { requestId: string } }> {
    return this.ordersService.createPhysicalOrder(
      this.requireAuth(auth).userId,
      body,
      idempotencyKey,
      getRequestId(req)
    );
  }

  @RateLimit({ limit: 15, windowMs: 60_000, keyPrefix: "order_create_service" })
  @Post("orders/services")
  async createServiceOrder(
    @CurrentUser() auth: AuthContext | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(CreateServiceOrderRequestSchema))
    body: CreateServiceOrderRequest,
    @Req() req: AppRequest
  ): Promise<{ data: OrderCreatedSummary; meta: { requestId: string } }> {
    return this.ordersService.createServiceOrder(
      this.requireAuth(auth).userId,
      body,
      idempotencyKey,
      getRequestId(req)
    );
  }

  @Get("orders")
  async listOrders(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: OrderDetailDto[]; meta: { requestId: string } }> {
    return this.ordersService.listCustomerOrders(
      this.requireAuth(auth).userId,
      getRequestId(req)
    );
  }

  @Get("orders/:id")
  async getOrder(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Req() req: AppRequest
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    return this.ordersService.getCustomerOrder(
      this.requireAuth(auth).userId,
      orderId,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post("orders/:id/cancel")
  async cancelOrder(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Body(new ZodValidationPipe(CancelOrderRequestSchema))
    body: CancelOrderRequest,
    @Req() req: AppRequest
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    return this.ordersService.cancelCustomerOrder(
      this.requireAuth(auth).userId,
      orderId,
      body,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post("orders/:id/service/accept-delivery")
  async acceptServiceDelivery(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Req() req: AppRequest
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    return this.ordersService.acceptServiceDelivery(
      this.requireAuth(auth).userId,
      orderId,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post("orders/:id/service/request-revision")
  async requestServiceRevision(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Body(new ZodValidationPipe(RequestServiceRevisionRequestSchema))
    body: RequestServiceRevisionRequest,
    @Req() req: AppRequest
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    return this.ordersService.requestServiceRevision(
      this.requireAuth(auth).userId,
      orderId,
      body,
      getRequestId(req)
    );
  }

  @Get("orders/:id/messages")
  async listMessages(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Req() req: AppRequest
  ): Promise<{ data: OrderMessageDto[]; meta: { requestId: string } }> {
    return this.ordersService.listOrderMessages(
      this.requireAuth(auth),
      orderId,
      this.extractClient(req),
      getRequestId(req)
    );
  }

  @Post("orders/:id/messages")
  async postMessage(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) orderId: string,
    @Body(new ZodValidationPipe(CreateOrderMessageRequestSchema))
    body: CreateOrderMessageRequest,
    @Req() req: AppRequest
  ): Promise<{ data: OrderMessageDto; meta: { requestId: string } }> {
    return this.ordersService.postOrderMessage(
      this.requireAuth(auth),
      orderId,
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
