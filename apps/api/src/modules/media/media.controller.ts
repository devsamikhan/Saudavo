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
  ConfirmMediaUploadRequest,
  ConfirmMediaUploadSchema,
  MediaAssetDto,
  PresignedUploadDto,
  RequestMediaUploadUrlRequest,
  RequestMediaUploadUrlSchema
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { MediaService } from "./media.service";

@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post("upload-url")
  async requestUploadUrl(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(RequestMediaUploadUrlSchema))
    body: RequestMediaUploadUrlRequest,
    @Req() req: AppRequest
  ): Promise<{ data: PresignedUploadDto; meta: { requestId: string } }> {
    return this.mediaService.requestUploadUrl(
      this.requireUserId(auth),
      body,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post(":id/confirm")
  async confirmUpload(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) assetId: string,
    @Body(new ZodValidationPipe(ConfirmMediaUploadSchema))
    body: ConfirmMediaUploadRequest,
    @Req() req: AppRequest
  ): Promise<{ data: MediaAssetDto; meta: { requestId: string } }> {
    return this.mediaService.confirmUpload(
      this.requireUserId(auth),
      assetId,
      body,
      getRequestId(req)
    );
  }

  @Get(":id/signed-url")
  async getSignedReadUrl(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) assetId: string,
    @Req() req: AppRequest
  ): Promise<{
    data: { assetId: string; readUrl: string; expiresInSeconds: number };
    meta: { requestId: string };
  }> {
    return this.mediaService.getSignedReadUrl(
      this.requireUserId(auth),
      assetId,
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
