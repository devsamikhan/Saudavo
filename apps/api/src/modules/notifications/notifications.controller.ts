import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req
} from "@nestjs/common";
import { NotificationDto, NotificationsResponse } from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<NotificationsResponse> {
    return this.notificationsService.listForUser(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Post("read-all")
  async markAllRead(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: { markedCount: number }; meta: { requestId: string } }> {
    return this.notificationsService.markAllRead(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Post(":id/read")
  async markRead(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AppRequest
  ): Promise<{ data: NotificationDto; meta: { requestId: string } }> {
    return this.notificationsService.markRead(
      this.requireUserId(auth),
      id,
      getRequestId(req)
    );
  }

  private requireUserId(auth: AuthContext | undefined): string {
    if (!auth) {
      throw new DomainException(
        "UNAUTHORIZED",
        HttpStatus.UNAUTHORIZED,
        "Authentication is required."
      );
    }
    return auth.userId;
  }
}
