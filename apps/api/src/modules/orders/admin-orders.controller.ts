import { Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser, Roles } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { OrdersService } from "./orders.service";

@Roles("ADMIN", "SUPER_ADMIN")
@Controller("admin/orders")
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @HttpCode(HttpStatus.OK)
  @Post("auto-complete-services")
  async autoCompleteServices(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{
    data: { checkedCount: number; completedOrderIds: string[] };
    meta: { requestId: string };
  }> {
    if (!auth) {
      throw new DomainException(
        "UNAUTHORIZED",
        HttpStatus.UNAUTHORIZED,
        "Authentication session is required."
      );
    }

    const result = await this.ordersService.autoCompleteExpiredServiceOrders({
      actorId: auth.userId,
      actorRole: auth.roles.includes("SUPER_ADMIN") ? "SUPER_ADMIN" : "ADMIN",
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
      userAgent: req.header("user-agent") ?? null
    });
    return {
      data: result,
      meta: { requestId: getRequestId(req) }
    };
  }
}
