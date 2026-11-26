import {
  MAX_MEDIA_UPLOAD_BYTES,
  type MediaAssetDto,
  type MediaMimeType,
  type MediaPurpose
} from "@saudavo/contracts";
import { confirmMediaUpload, requestMediaUploadUrl } from "./api-client";

const ALLOWED_MIME_TYPES = new Set<MediaMimeType>([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

/**
 * Formats the leading bytes of an image buffer into lowercase hex for API magic-byte checks.
 */
export function bytesToMagicHex(bytes: Uint8Array, maxBytes = 8): string {
  return Array.from(bytes.slice(0, maxBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Re-encodes an uploaded image via an offscreen canvas in the browser to drop client EXIF metadata
 * before presigned S3 upload (server-side EXIF stripping also runs in production).
 */
export async function stripClientExifViaCanvas(
  file: File,
  mimeType: MediaMimeType
): Promise<Blob> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }
    ctx.drawImage(bitmap, 0, 0);

    const encoded = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mimeType, 0.9);
    });
    return encoded ?? file;
  } finally {
    bitmap.close();
  }
}

/**
 * Runs the 3-step Saudavo private S3 upload flow: presign -> PUT to S3 -> confirm & EXIF verify.
 */
export async function uploadImageAssetToS3(
  file: File,
  purpose: MediaPurpose
): Promise<MediaAssetDto> {
  const mimeType = file.type as MediaMimeType;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Only JPEG, PNG, or WebP images are supported.");
  }
  if (file.size <= 0 || file.size > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error("Image must be between 1 byte and 5 MB.");
  }

  const sanitizedBlob = await stripClientExifViaCanvas(file, mimeType);
  if (sanitizedBlob.size <= 0 || sanitizedBlob.size > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error("Processed image exceeds the 5 MB upload limit.");
  }

  const presignRes = await requestMediaUploadUrl({
    purpose,
    mimeType,
    sizeBytes: sanitizedBlob.size,
    fileName: file.name.slice(0, 120)
  });

  const putRes = await fetch(presignRes.data.uploadUrl, {
    method: "PUT",
    headers: presignRes.data.requiredHeaders,
    body: sanitizedBlob
  });
  if (!putRes.ok) {
    throw new Error(
      `Object storage upload failed (${String(putRes.status)}). Verify S3/R2 bucket CORS configuration.`
    );
  }

  const headBytes = new Uint8Array(await sanitizedBlob.slice(0, 12).arrayBuffer());
  const magicBytesHex = bytesToMagicHex(headBytes, 12);

  const confirmed = await confirmMediaUpload(presignRes.data.asset.id, {
    exifStripped: true,
    magicBytesHex
  });
  return confirmed.data;
}

const ALLOWED_AUDIO_MIMES = new Set<string>([
  "audio/webm",
  "audio/mp4",
  "audio/ogg"
]);

/**
 * Uploads a recorded audio voice note Blob to private S3/R2 storage for Saudavo Messenger.
 */
export async function uploadVoiceNoteToS3(
  blob: Blob
): Promise<MediaAssetDto> {
  const baseMime = (blob.type.split(";")[0] || "audio/webm").trim().toLowerCase();
  const mimeType = (
    ALLOWED_AUDIO_MIMES.has(baseMime) ? baseMime : "audio/webm"
  ) as MediaMimeType;

  if (blob.size <= 0 || blob.size > 2 * 1024 * 1024) {
    throw new Error("Voice note must be 2 MB or smaller.");
  }

  const presignRes = await requestMediaUploadUrl({
    purpose: "CHAT_VOICE_NOTE",
    mimeType,
    sizeBytes: blob.size,
    fileName: `voice-note.${mimeType === "audio/mp4" ? "m4a" : mimeType === "audio/ogg" ? "ogg" : "webm"}`
  });

  const putRes = await fetch(presignRes.data.uploadUrl, {
    method: "PUT",
    headers: presignRes.data.requiredHeaders,
    body: blob
  });
  if (!putRes.ok) {
    throw new Error(
      `Voice upload failed (${String(putRes.status)}). Verify object storage configuration.`
    );
  }

  const headBytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const magicBytesHex = bytesToMagicHex(headBytes, 12);

  const confirmed = await confirmMediaUpload(presignRes.data.asset.id, {
    exifStripped: true,
    magicBytesHex
  });
  return confirmed.data;
}
