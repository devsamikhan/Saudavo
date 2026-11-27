import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res
} from "@nestjs/common";
import {
  type ConfirmMediaUploadRequest,
  ConfirmMediaUploadSchema,
  MAX_MEDIA_UPLOAD_BYTES,
  type MediaAssetDto,
  type PresignedUploadDto,
  type RequestMediaUploadUrlRequest,
  RequestMediaUploadUrlSchema
} from "@saudavo/contracts";
import type { Response } from "express";
import type { AuthContext } from "../../common/auth/auth.types";
import {
  CurrentUser,
  Public,
  Roles,
  SkipCsrf
} from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { MediaRetentionService } from "./media-retention.service";
import { MediaService } from "./media.service";
import { S3PresignerService } from "./s3-presigner.service";

function inferContentTypeFromKey(objectKey: string): string {
  const lower = objectKey.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  return "image/jpeg";
}

function readRawRequestBuffer(req: AppRequest): Promise<Buffer> {
  if (Buffer.isBuffer((req as unknown as { body?: unknown }).body)) {
    return Promise.resolve((req as unknown as { body: Buffer }).body);
  }
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    req.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > MAX_MEDIA_UPLOAD_BYTES) {
        settled = true;
        reject(
          new DomainException(
            "VALIDATION_ERROR",
            HttpStatus.BAD_REQUEST,
            "Uploaded media exceeds the 5 MB limit."
          )
        );
        return;
      }
      chunks.push(buf);
    });

    req.on("end", () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });

    req.on("error", (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

@Controller("media")
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly s3Presigner: S3PresignerService,
    private readonly mediaRetention: MediaRetentionService
  ) {}

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

  /**
   * Local disk presigned upload target (STORAGE_DRIVER=local).
   * Authenticated via HMAC-SHA256 query signature and stored strictly outside PostgreSQL.
   */
  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @Put("local-object")
  async uploadLocalObject(
    @Query("key") key: string = "",
    @Query("expires") expires: string = "",
    @Query("sig") sig: string = "",
    @Req() req: AppRequest
  ): Promise<{ data: { stored: true; key: string }; meta: { requestId: string } }> {
    if (!this.s3Presigner.isLocalDriver()) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Local disk media storage is disabled when S3 object storage is active."
      );
    }
    this.s3Presigner.assertValidLocalSignature({
      method: "PUT",
      objectKey: key,
      expires,
      sig
    });
    const buffer = await readRawRequestBuffer(req);
    await this.s3Presigner.writeLocalObject(key, buffer);
    return {
      data: { stored: true, key },
      meta: { requestId: getRequestId(req) }
    };
  }

  /**
   * Local disk presigned read target (STORAGE_DRIVER=local).
   */
  @Public()
  @Get("local-object")
  async readLocalObject(
    @Query("key") key: string = "",
    @Query("expires") expires: string = "",
    @Query("sig") sig: string = "",
    @Res() res: Response
  ): Promise<void> {
    if (!this.s3Presigner.isLocalDriver()) {
      res.status(HttpStatus.NOT_FOUND).json({
        error: { code: "NOT_FOUND", message: "Local media driver is inactive." }
      });
      return;
    }
    this.s3Presigner.assertValidLocalSignature({
      method: "GET",
      objectKey: key,
      expires,
      sig
    });
    const buf = await this.s3Presigner.readLocalObject(key);
    res.setHeader("Content-Type", inferContentTypeFromKey(key));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "private, max-age=300");
    res.status(HttpStatus.OK).send(buf);
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @Post("maintenance/retention-sweep")
  async triggerRetentionSweep(@Req() req: AppRequest) {
    const summary = await this.mediaRetention.runRetentionSweep();
    return {
      data: summary,
      meta: { requestId: getRequestId(req) }
    };
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
