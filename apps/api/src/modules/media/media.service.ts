import { HttpStatus, Injectable } from "@nestjs/common";
import {
  ConfirmMediaUploadRequest,
  MediaAssetDto,
  MediaAssetDtoSchema,
  PresignedUploadDto,
  PresignedUploadDtoSchema,
  RequestMediaUploadUrlRequest
} from "@saudavo/contracts";
import { randomUUID } from "node:crypto";
import { DomainException } from "../../common/errors/domain.exception";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FeatureFlagsService } from "../features/feature-flags.service";
import { SellerService } from "../seller/seller.service";
import { S3PresignerService } from "./s3-presigner.service";

const UPLOAD_URL_TTL_SECONDS = 300;
const READ_URL_TTL_SECONDS = 600;
const MAX_VOICE_NOTE_BYTES = 1024 * 1024;

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sellerService: SellerService,
    private readonly s3Presigner: S3PresignerService,
    private readonly featureFlags: FeatureFlagsService
  ) {}

  async requestUploadUrl(
    userId: string,
    dto: RequestMediaUploadUrlRequest,
    requestId: string
  ): Promise<{ data: PresignedUploadDto; meta: { requestId: string } }> {
    const isAudio = dto.mimeType.startsWith("audio/");

    if (dto.purpose === "CHAT_VOICE_NOTE") {
      await this.featureFlags.assertEnabled(
        "messenger_voice_notes_enabled",
        "Urdu Voice Notes in Messenger"
      );
      if (!isAudio) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "Voice notes require audio/webm, audio/mp4, or audio/ogg MIME type."
        );
      }
      if (dto.sizeBytes > MAX_VOICE_NOTE_BYTES) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "Voice note must be 1 MB or smaller."
        );
      }
    } else if (isAudio) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Audio MIME types are only supported for CHAT_VOICE_NOTE uploads."
      );
    }

    const ext =
      dto.mimeType === "image/png"
        ? "png"
        : dto.mimeType === "image/webp"
          ? "webp"
          : dto.mimeType === "audio/webm"
            ? "webm"
            : dto.mimeType === "audio/mp4"
              ? "m4a"
              : dto.mimeType === "audio/ogg"
                ? "ogg"
                : "jpg";

    let storeId: string | null = null;
    let objectKey =
      dto.purpose === "CHAT_VOICE_NOTE"
        ? `voice/${userId}/${randomUUID()}.${ext}`
        : `chat/${userId}/${randomUUID()}.${ext}`;

    if (dto.purpose !== "CHAT_ATTACHMENT" && dto.purpose !== "CHAT_VOICE_NOTE") {
      const { store } = await this.sellerService.requireOwnStore(userId);
      storeId = store.id;
      objectKey = `stores/${store.id}/${dto.purpose.toLowerCase()}/${randomUUID()}.${ext}`;
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerUserId: userId,
        storeId,
        objectKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        exifStripped: false,
        status: "PENDING_UPLOAD"
      }
    });

    const uploadUrl = this.s3Presigner.createPresignedUrl({
      method: "PUT",
      objectKey: asset.objectKey,
      expiresInSeconds: UPLOAD_URL_TTL_SECONDS
    });

    return {
      data: PresignedUploadDtoSchema.parse({
        asset: this.toMediaAssetDto(asset),
        uploadUrl,
        requiredHeaders: {
          "Content-Type": dto.mimeType
        },
        expiresInSeconds: UPLOAD_URL_TTL_SECONDS
      }),
      meta: { requestId }
    };
  }

  async confirmUpload(
    userId: string,
    assetId: string,
    dto: ConfirmMediaUploadRequest,
    requestId: string
  ): Promise<{ data: MediaAssetDto; meta: { requestId: string } }> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: assetId, ownerUserId: userId }
    });
    if (!asset) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Media asset not found."
      );
    }

    const isAudio = asset.mimeType.startsWith("audio/");

    if (!isAudio && !dto.exifStripped) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "EXIF metadata must be stripped before media confirmation."
      );
    }

    const validMimeTypes = new Set<string>([
      "image/jpeg",
      "image/png",
      "image/webp",
      "audio/webm",
      "audio/mp4",
      "audio/ogg"
    ]);
    const mimeType = (
      validMimeTypes.has(asset.mimeType) ? asset.mimeType : "image/jpeg"
    ) as RequestMediaUploadUrlRequest["mimeType"];

    this.s3Presigner.assertValidMagicBytes(mimeType, dto.magicBytesHex);

    let verifiedSizeBytes = asset.sizeBytes;
    if (this.s3Presigner.shouldInspectRemoteObject()) {
      const inspected = await this.s3Presigner.verifyAndSanitizeUploadedObject({
        objectKey: asset.objectKey,
        mimeType
      });
      verifiedSizeBytes = inspected.verifiedSizeBytes;
    }

    const updated = await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        sizeBytes: verifiedSizeBytes,
        exifStripped: true,
        status: "READY"
      }
    });

    return {
      data: this.toMediaAssetDto(updated),
      meta: { requestId }
    };
  }

  async getSignedReadUrl(
    userId: string,
    assetId: string,
    requestId: string
  ): Promise<{
    data: { assetId: string; readUrl: string; expiresInSeconds: number };
    meta: { requestId: string };
  }> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: assetId, ownerUserId: userId, status: "READY" }
    });
    if (!asset) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Ready media asset not found."
      );
    }

    const readUrl = this.s3Presigner.createPresignedUrl({
      method: "GET",
      objectKey: asset.objectKey,
      expiresInSeconds: READ_URL_TTL_SECONDS
    });

    return {
      data: {
        assetId: asset.id,
        readUrl,
        expiresInSeconds: READ_URL_TTL_SECONDS
      },
      meta: { requestId }
    };
  }

  private toMediaAssetDto(asset: {
    id: string;
    objectKey: string;
    mimeType: string;
    sizeBytes: number;
    exifStripped: boolean;
    status: string;
    createdAt: Date;
  }): MediaAssetDto {
    return MediaAssetDtoSchema.parse({
      id: asset.id,
      objectKey: asset.objectKey,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      exifStripped: asset.exifStripped,
      status: asset.status,
      createdAt: asset.createdAt.toISOString()
    });
  }
}
