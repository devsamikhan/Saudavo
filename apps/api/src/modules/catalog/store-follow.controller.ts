import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req
} from "@nestjs/common";
import type { PublicStoreDto } from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { CatalogService } from "./catalog.service";

@Controller("stores")
export class StoreFollowController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("following")
  async listFollowedStores(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: PublicStoreDto[]; meta: { requestId: string } }> {
    return this.catalogService.listFollowedStores(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Post(":storeId/follow")
  async followStore(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("storeId", new ParseUUIDPipe()) storeId: string,
    @Req() req: AppRequest
  ): Promise<{
    data: { storeId: string; isFollowing: true; followerCount: number };
    meta: { requestId: string };
  }> {
    return this.catalogService.followStore(
      this.requireUserId(auth),
      storeId,
      getRequestId(req)
    );
  }

  @Delete(":storeId/follow")
  async unfollowStore(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("storeId", new ParseUUIDPipe()) storeId: string,
    @Req() req: AppRequest
  ): Promise<{
    data: { storeId: string; isFollowing: false; followerCount: number };
    meta: { requestId: string };
  }> {
    return this.catalogService.unfollowStore(
      this.requireUserId(auth),
      storeId,
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
