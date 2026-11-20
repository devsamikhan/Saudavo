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
  AddCartItemRequest,
  AddCartItemRequestSchema,
  CartsResponse,
  StoreCartDto,
  UpdateCartItemRequest,
  UpdateCartItemRequestSchema
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { CartService } from "./cart.service";

@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async listCarts(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<CartsResponse> {
    return this.cartService.listCarts(this.requireUserId(auth), getRequestId(req));
  }

  @Post("items")
  async addItem(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(AddCartItemRequestSchema))
    body: AddCartItemRequest,
    @Req() req: AppRequest
  ): Promise<{ data: StoreCartDto; meta: { requestId: string } }> {
    return this.cartService.addItem(
      this.requireUserId(auth),
      body,
      getRequestId(req)
    );
  }

  @Patch("items/:id")
  async updateItem(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) itemId: string,
    @Body(new ZodValidationPipe(UpdateCartItemRequestSchema))
    body: UpdateCartItemRequest,
    @Req() req: AppRequest
  ): Promise<{ data: StoreCartDto; meta: { requestId: string } }> {
    return this.cartService.updateItem(
      this.requireUserId(auth),
      itemId,
      body,
      getRequestId(req)
    );
  }

  @Delete("items/:id")
  async removeItem(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) itemId: string,
    @Req() req: AppRequest
  ): Promise<{
    data: { removed: true; id: string };
    meta: { requestId: string };
  }> {
    return this.cartService.removeItem(
      this.requireUserId(auth),
      itemId,
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
