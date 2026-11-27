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

const MAX_CHAT_IMAGE_DIMENSION_PX = 1080;
const MAX_STORE_IMAGE_DIMENSION_PX = 1400;
const WEBP_QUALITY = 0.78;
const MAX_VOICE_NOTE_BYTES = 1024 * 1024;

/**
 * Formats the leading bytes of a media buffer into lowercase hex for API magic-byte checks.
 */
export function bytesToMagicHex(bytes: Uint8Array, maxBytes = 8): string {
  return Array.from(bytes.slice(0, maxBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Downscales large camera photos and re-encodes to compact WebP via an offscreen canvas,
 * automatically stripping EXIF metadata and cutting storage usage by ~80-90%.
 */
export async function stripClientExifViaCanvas(
  file: File,
  mimeType: MediaMimeType,
  maxDimensionPx: number = MAX_STORE_IMAGE_DIMENSION_PX
): Promise<{ blob: Blob; mimeType: MediaMimeType }> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") {
    return { blob: file, mimeType };
  }

  const bitmap = await createImageBitmap(file);
  try {
    const largestSide = Math.max(bitmap.width, bitmap.height, 1);
    const scale = largestSide > maxDimensionPx ? maxDimensionPx / largestSide : 1;
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { blob: file, mimeType };
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const webpBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
    });
    if (webpBlob && webpBlob.size > 0 && (webpBlob.size < file.size || scale < 1)) {
      return { blob: webpBlob, mimeType: "image/webp" };
    }

    const fallbackBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mimeType, 0.8);
    });
    if (fallbackBlob && fallbackBlob.size > 0) {
      return { blob: fallbackBlob, mimeType };
    }
    return { blob: file, mimeType };
  } finally {
    bitmap.close();
  }
}

/**
 * Runs the 3-step Saudavo private media upload flow: resize/compress -> presign -> PUT -> confirm.
 */
export async function uploadImageAssetToS3(
  file: File,
  purpose: MediaPurpose
): Promise<MediaAssetDto> {
  const originalMime = file.type as MediaMimeType;
  if (!ALLOWED_MIME_TYPES.has(originalMime)) {
    throw new Error("Only JPEG, PNG, or WebP images are supported.");
  }
  if (file.size <= 0 || file.size > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error("Image must be between 1 byte and 5 MB.");
  }

  const maxDim =
    purpose === "CHAT_ATTACHMENT"
      ? MAX_CHAT_IMAGE_DIMENSION_PX
      : MAX_STORE_IMAGE_DIMENSION_PX;
  const { blob: sanitizedBlob, mimeType } = await stripClientExifViaCanvas(
    file,
    originalMime,
    maxDim
  );
  if (sanitizedBlob.size <= 0 || sanitizedBlob.size > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error("Processed image exceeds the 5 MB upload limit.");
  }

  const ext = mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "photo";

  const presignRes = await requestMediaUploadUrl({
    purpose,
    mimeType,
    sizeBytes: sanitizedBlob.size,
    fileName: `${baseName}.${ext}`
  });

  const putRes = await fetch(presignRes.data.uploadUrl, {
    method: "PUT",
    headers: presignRes.data.requiredHeaders,
    body: sanitizedBlob
  });
  if (!putRes.ok) {
    throw new Error(
      `Media upload failed (${String(putRes.status)}). Verify storage configuration.`
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
 * Uploads a compact recorded audio voice note Blob (<= 1 MB, ~24 kbps) for Saudavo Messenger.
 */
export async function uploadVoiceNoteToS3(
  blob: Blob
): Promise<MediaAssetDto> {
  const baseMime = (blob.type.split(";")[0] || "audio/webm").trim().toLowerCase();
  const mimeType = (
    ALLOWED_AUDIO_MIMES.has(baseMime) ? baseMime : "audio/webm"
  ) as MediaMimeType;

  if (blob.size <= 0 || blob.size > MAX_VOICE_NOTE_BYTES) {
    throw new Error("Voice note must be 1 MB or smaller (up to ~45 seconds).");
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
      `Voice upload failed (${String(putRes.status)}). Verify storage configuration.`
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
