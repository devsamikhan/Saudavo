import { HttpStatus } from "@nestjs/common";
import type { MediaMimeType } from "@saudavo/contracts";
import { DomainException } from "../../common/errors/domain.exception";

export interface SanitizedImageResult {
  cleanBuffer: Buffer;
  strippedMetadata: boolean;
  strippedBytesCount: number;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_METADATA_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
const WEBP_METADATA_CHUNKS = new Set(["EXIF", "XMP "]);

function rejectInvalidImage(message: string): never {
  throw new DomainException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST, message);
}

/**
 * Verifies raw file bytes match the declared image MIME type.
 */
export function assertBufferMatchesImageMime(
  buf: Buffer,
  mimeType: MediaMimeType
): void {
  if (mimeType === "image/jpeg") {
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
      rejectInvalidImage("Uploaded bytes are not a valid JPEG image.");
    }
    return;
  }

  if (mimeType === "image/png") {
    if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
      rejectInvalidImage("Uploaded bytes are not a valid PNG image.");
    }
    return;
  }

  if (
    buf.length < 20 ||
    buf.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buf.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    rejectInvalidImage("Uploaded bytes are not a valid WebP image.");
  }
}

function sanitizeJpeg(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let offset = 2;
  let sawSos = false;

  while (offset < buf.length) {
    while (offset < buf.length && buf[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= buf.length) {
      break;
    }

    const markerStart = offset - 1;
    const marker = buf[offset]!;
    offset += 1;

    if (marker === 0xd9) {
      parts.push(Buffer.from([0xff, 0xd9]));
      break;
    }

    if (marker === 0xda) {
      parts.push(buf.subarray(markerStart));
      sawSos = true;
      break;
    }

    // Standalone restart / padding markers carry no length field
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(buf.subarray(markerStart, offset));
      continue;
    }

    if (offset + 2 > buf.length) {
      rejectInvalidImage("Malformed JPEG segment length.");
    }
    const segmentLen = buf.readUInt16BE(offset);
    if (segmentLen < 2 || offset + segmentLen > buf.length) {
      rejectInvalidImage("Malformed JPEG segment bounds.");
    }

    const segmentEnd = offset + segmentLen;
    const isMetadataMarker =
      (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;

    if (!isMetadataMarker) {
      parts.push(buf.subarray(markerStart, segmentEnd));
    }
    offset = segmentEnd;
  }

  if (!sawSos) {
    rejectInvalidImage("Incomplete JPEG image missing scan data.");
  }

  return Buffer.concat(parts);
}

function sanitizePng(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 8)];
  let offset = 8;
  let sawIhdr = false;
  let sawIend = false;

  while (offset + 12 <= buf.length) {
    const chunkLen = buf.readUInt32BE(offset);
    const chunkType = buf.subarray(offset + 4, offset + 8).toString("ascii");
    const chunkEnd = offset + 12 + chunkLen;
    if (chunkEnd > buf.length) {
      rejectInvalidImage("Malformed PNG chunk length.");
    }

    if (chunkType === "IHDR") {
      sawIhdr = true;
    }
    if (chunkType === "IEND") {
      sawIend = true;
    }

    if (!PNG_METADATA_CHUNKS.has(chunkType)) {
      parts.push(buf.subarray(offset, chunkEnd));
    }

    offset = chunkEnd;
    if (sawIend) {
      break;
    }
  }

  if (!sawIhdr || !sawIend) {
    rejectInvalidImage("Incomplete PNG image structure.");
  }

  return Buffer.concat(parts);
}

function sanitizeWebp(buf: Buffer): Buffer {
  const chunks: Buffer[] = [Buffer.from(buf.subarray(0, 12))];
  let offset = 12;

  while (offset + 8 <= buf.length) {
    const fourCC = buf.subarray(offset, offset + 4).toString("ascii");
    const chunkSize = buf.readUInt32LE(offset + 4);
    const paddedSize = chunkSize + (chunkSize % 2);
    const chunkEnd = offset + 8 + paddedSize;
    if (chunkEnd > buf.length) {
      rejectInvalidImage("Malformed WebP RIFF chunk.");
    }

    if (!WEBP_METADATA_CHUNKS.has(fourCC)) {
      const chunkCopy = Buffer.from(buf.subarray(offset, chunkEnd));
      if (fourCC === "VP8X" && chunkSize >= 1) {
        // Clear EXIF (bit 3 = 0x08) and XMP (bit 2 = 0x04) flags in VP8X header
        chunkCopy[8] = (chunkCopy[8] ?? 0) & ~0x0c;
      }
      chunks.push(chunkCopy);
    }

    offset = chunkEnd;
  }

  const clean = Buffer.concat(chunks);
  clean.writeUInt32LE(clean.length - 8, 4);
  return clean;
}

/**
 * Validates raw uploaded image bytes against declared MIME type and strips EXIF/XMP/comment metadata.
 */
export function sanitizeImageBuffer(
  buf: Buffer,
  mimeType: MediaMimeType
): SanitizedImageResult {
  assertBufferMatchesImageMime(buf, mimeType);

  let cleanBuffer: Buffer;
  if (mimeType === "image/jpeg") {
    cleanBuffer = sanitizeJpeg(buf);
  } else if (mimeType === "image/png") {
    cleanBuffer = sanitizePng(buf);
  } else {
    cleanBuffer = sanitizeWebp(buf);
  }

  const strippedBytesCount = Math.max(0, buf.length - cleanBuffer.length);
  return {
    cleanBuffer,
    strippedMetadata: strippedBytesCount > 0,
    strippedBytesCount
  };
}
