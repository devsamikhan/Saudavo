import { z } from "zod";

export const MAX_MEDIA_UPLOAD_BYTES = 5 * 1024 * 1024;

export const MediaMimeTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/webm",
  "audio/mp4",
  "audio/ogg"
]);
export type MediaMimeType = z.infer<typeof MediaMimeTypeSchema>;

export const MediaPurposeSchema = z.enum([
  "STORE_LOGO",
  "STORE_BANNER",
  "PRODUCT_IMAGE",
  "CHAT_ATTACHMENT",
  "CHAT_VOICE_NOTE"
]);
export type MediaPurpose = z.infer<typeof MediaPurposeSchema>;

export const RequestMediaUploadUrlSchema = z.object({
  purpose: MediaPurposeSchema,
  mimeType: MediaMimeTypeSchema,
  sizeBytes: z.number().int().min(1).max(MAX_MEDIA_UPLOAD_BYTES),
  fileName: z.string().trim().min(1).max(160).optional()
});
export type RequestMediaUploadUrlRequest = z.infer<
  typeof RequestMediaUploadUrlSchema
>;

export const ConfirmMediaUploadSchema = z.object({
  exifStripped: z.boolean(),
  magicBytesHex: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{8,32}$/, "Invalid magic bytes hex header")
});
export type ConfirmMediaUploadRequest = z.infer<
  typeof ConfirmMediaUploadSchema
>;

export const MediaAssetDtoSchema = z.object({
  id: z.string().uuid(),
  objectKey: z.string(),
  mimeType: MediaMimeTypeSchema,
  sizeBytes: z.number().int().positive(),
  exifStripped: z.boolean(),
  status: z.enum(["PENDING_UPLOAD", "READY", "REJECTED"]),
  createdAt: z.string().datetime()
});
export type MediaAssetDto = z.infer<typeof MediaAssetDtoSchema>;

export const PresignedUploadDtoSchema = z.object({
  asset: MediaAssetDtoSchema,
  uploadUrl: z.string().url(),
  requiredHeaders: z.record(z.string(), z.string()),
  expiresInSeconds: z.number().int().positive()
});
export type PresignedUploadDto = z.infer<typeof PresignedUploadDtoSchema>;
