import { HttpStatus, Injectable } from "@nestjs/common";
import type { MediaMimeType } from "@saudavo/contracts";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DomainException } from "../../common/errors/domain.exception";
import { sanitizeImageBuffer } from "./image-sanitizer.util";

const MAX_OBJECT_BYTES = 5 * 1024 * 1024;
const SANITIZE_URL_TTL_SECONDS = 120;

@Injectable()
export class S3PresignerService {
  /**
   * Returns true when binary media is stored on local API disk (only metadata references in PostgreSQL).
   */
  isLocalDriver(): boolean {
    const explicit = process.env.STORAGE_DRIVER?.trim().toLowerCase();
    if (explicit === "local") {
      return true;
    }
    if (explicit === "s3") {
      return false;
    }
    return (
      process.env.NODE_ENV !== "test" &&
      !process.env.S3_ENDPOINT?.trim()
    );
  }

  /**
   * Returns whether real object inspection (local disk or remote S3) must execute during confirmation.
   */
  shouldInspectRemoteObject(): boolean {
    return (
      this.isLocalDriver() ||
      process.env.NODE_ENV === "production" ||
      Boolean(process.env.S3_ENDPOINT?.trim())
    );
  }

  resolveLocalMediaDir(): string {
    return path.resolve(
      process.env.LOCAL_MEDIA_DIR?.trim() || path.join(process.cwd(), "storage", "media")
    );
  }

  resolveSafeLocalFilePath(objectKey: string): string {
    const cleanKey = objectKey.replace(/^\/+/, "");
    if (!cleanKey || cleanKey.includes("\0") || cleanKey.includes("..")) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Invalid local media object key."
      );
    }
    const rootDir = this.resolveLocalMediaDir();
    const resolved = path.resolve(rootDir, cleanKey);
    if (!resolved.startsWith(`${rootDir}${path.sep}`)) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Media object path escapes storage directory."
      );
    }
    return resolved;
  }

  private getSigningSecret(): string {
    return (
      process.env.MEDIA_SIGNING_SECRET?.trim() ||
      process.env.SESSION_SECRET?.trim() ||
      "dev-local-media-signing-key-32-chars"
    );
  }

  private signLocalParams(
    method: "PUT" | "GET",
    objectKey: string,
    expiresEpochSec: number
  ): string {
    return createHmac("sha256", this.getSigningSecret())
      .update(`${method}:${objectKey}:${String(expiresEpochSec)}`, "utf8")
      .digest("hex");
  }

  assertValidLocalSignature(input: {
    method: "PUT" | "GET";
    objectKey: string;
    expires: string;
    sig: string;
  }): void {
    const expiresEpochSec = Number(input.expires);
    if (!Number.isInteger(expiresEpochSec) || expiresEpochSec <= 0) {
      throw new DomainException("FORBIDDEN", HttpStatus.FORBIDDEN, "Invalid media URL expiry.");
    }
    if (Math.floor(Date.now() / 1000) > expiresEpochSec) {
      throw new DomainException("FORBIDDEN", HttpStatus.FORBIDDEN, "Signed media URL has expired.");
    }
    const expected = this.signLocalParams(input.method, input.objectKey, expiresEpochSec);
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(input.sig.trim().toLowerCase(), "hex");
    if (
      expectedBuf.length === 0 ||
      actualBuf.length !== expectedBuf.length ||
      !timingSafeEqual(expectedBuf, actualBuf)
    ) {
      throw new DomainException("FORBIDDEN", HttpStatus.FORBIDDEN, "Invalid media URL signature.");
    }
    this.resolveSafeLocalFilePath(input.objectKey);
  }

  async writeLocalObject(objectKey: string, buffer: Buffer): Promise<void> {
    if (buffer.length === 0 || buffer.length > MAX_OBJECT_BYTES) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Uploaded media size is empty or exceeds the 5 MB limit."
      );
    }
    const filePath = this.resolveSafeLocalFilePath(objectKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  }

  async readLocalObject(objectKey: string): Promise<Buffer> {
    const filePath = this.resolveSafeLocalFilePath(objectKey);
    try {
      return await readFile(filePath);
    } catch {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Stored local media file was not found or has expired."
      );
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    if (this.isLocalDriver()) {
      try {
        const filePath = this.resolveSafeLocalFilePath(objectKey);
        await unlink(filePath);
      } catch (err: unknown) {
        if ((err as { code?: string })?.code !== "ENOENT") {
          throw err;
        }
      }
      return;
    }

    if (!process.env.S3_ENDPOINT?.trim() || !process.env.S3_BUCKET?.trim()) {
      return;
    }

    const deleteUrl = this.createPresignedUrl({
      method: "DELETE",
      objectKey,
      expiresInSeconds: SANITIZE_URL_TTL_SECONDS
    });
    await fetch(deleteUrl, { method: "DELETE" }).catch(() => undefined);
  }

  /**
   * Downloads or reads the uploaded object, validates binary signature & size,
   * strips EXIF/XMP metadata for images, and overwrites if metadata segments were removed.
   */
  async verifyAndSanitizeUploadedObject(input: {
    objectKey: string;
    mimeType: MediaMimeType;
  }): Promise<{ verifiedSizeBytes: number; strippedMetadata: boolean }> {
    let rawBuffer: Buffer;

    if (this.isLocalDriver()) {
      rawBuffer = await this.readLocalObject(input.objectKey);
    } else {
      const readUrl = this.createPresignedUrl({
        method: "GET",
        objectKey: input.objectKey,
        expiresInSeconds: SANITIZE_URL_TTL_SECONDS
      });

      const getRes = await fetch(readUrl, { method: "GET" });
      if (!getRes.ok) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "Uploaded media object could not be retrieved from storage for verification."
        );
      }
      rawBuffer = Buffer.from(await getRes.arrayBuffer());
    }

    if (rawBuffer.length === 0 || rawBuffer.length > MAX_OBJECT_BYTES) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Uploaded media size is empty or exceeds the 5 MB limit."
      );
    }

    if (input.mimeType.startsWith("audio/")) {
      const hex = rawBuffer.subarray(0, 16).toString("hex");
      this.assertValidMagicBytes(input.mimeType, hex);
      return {
        verifiedSizeBytes: rawBuffer.length,
        strippedMetadata: false
      };
    }

    const sanitized = sanitizeImageBuffer(rawBuffer, input.mimeType);
    if (sanitized.strippedMetadata) {
      if (this.isLocalDriver()) {
        await this.writeLocalObject(input.objectKey, sanitized.cleanBuffer);
      } else {
        const putUrl = this.createPresignedUrl({
          method: "PUT",
          objectKey: input.objectKey,
          expiresInSeconds: SANITIZE_URL_TTL_SECONDS
        });
        const putRes = await fetch(putUrl, {
          method: "PUT",
          headers: { "Content-Type": input.mimeType },
          body: new Uint8Array(sanitized.cleanBuffer)
        });
        if (!putRes.ok) {
          throw new DomainException(
            "INTERNAL_SERVER_ERROR",
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Failed to persist EXIF-stripped image to object storage."
          );
        }
      }
    }

    return {
      verifiedSizeBytes: sanitized.cleanBuffer.length,
      strippedMetadata: sanitized.strippedMetadata
    };
  }

  /**
   * Validates that uploaded media magic bytes match the declared MIME type.
   */
  assertValidMagicBytes(mimeType: MediaMimeType, magicBytesHex: string): void {
    const normalized = magicBytesHex.trim().toLowerCase();
    const matches =
      (mimeType === "image/jpeg" && normalized.startsWith("ffd8ff")) ||
      (mimeType === "image/png" && normalized.startsWith("89504e47")) ||
      (mimeType === "image/webp" && normalized.startsWith("52494646")) ||
      (mimeType === "audio/webm" && normalized.startsWith("1a45dfa3")) ||
      (mimeType === "audio/ogg" && normalized.startsWith("4f676753")) ||
      (mimeType === "audio/mp4" && normalized.includes("66747970"));

    if (!matches) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        `Uploaded file magic bytes do not match declared MIME type ${mimeType}.`
      );
    }
  }

  /**
   * Generates a presigned PUT/GET/DELETE URL for S3-compatible storage OR signed local API URL.
   */
  createPresignedUrl(input: {
    method: "PUT" | "GET" | "DELETE";
    objectKey: string;
    expiresInSeconds: number;
  }): string {
    if (this.isLocalDriver() && input.method !== "DELETE") {
      const apiBase = (
        process.env.API_PUBLIC_URL?.trim() ||
        `http://localhost:${process.env.API_PORT ?? "4000"}`
      ).replace(/\/+$/g, "");
      const expires = Math.floor(Date.now() / 1000) + input.expiresInSeconds;
      const sig = this.signLocalParams(input.method, input.objectKey, expires);
      return `${apiBase}/api/v1/media/local-object?key=${encodeURIComponent(input.objectKey)}&expires=${String(expires)}&sig=${sig}`;
    }

    const config = this.resolveConfig();
    const endpoint = new URL(config.endpoint);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;

    const basePath = endpoint.pathname.replace(/\/+$/g, "");
    const encodedKey = input.objectKey
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    const canonicalUri = `${basePath}/${config.bucket}/${encodedKey}`;

    const queryParams = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${config.accessKey}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(input.expiresInSeconds),
      "X-Amz-SignedHeaders": "host"
    });
    queryParams.sort();
    const canonicalQueryString = queryParams.toString();

    const canonicalHeaders = `host:${endpoint.host}\n`;
    const canonicalRequest = [
      input.method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      "host",
      "UNSIGNED-PAYLOAD"
    ].join("\n");

    const hashedCanonical = createHash("sha256")
      .update(canonicalRequest, "utf8")
      .digest("hex");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      hashedCanonical
    ].join("\n");

    const kDate = createHmac("sha256", `AWS4${config.secretKey}`)
      .update(dateStamp, "utf8")
      .digest();
    const kRegion = createHmac("sha256", kDate)
      .update(config.region, "utf8")
      .digest();
    const kService = createHmac("sha256", kRegion).update("s3", "utf8").digest();
    const kSigning = createHmac("sha256", kService)
      .update("aws4_request", "utf8")
      .digest();
    const signature = createHmac("sha256", kSigning)
      .update(stringToSign, "utf8")
      .digest("hex");

    return `${endpoint.origin}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }

  private resolveConfig(): {
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
  } {
    const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
    const region = process.env.S3_REGION?.trim() || "us-east-1";
    const bucket = process.env.S3_BUCKET?.trim() || undefined;
    const accessKey = process.env.S3_ACCESS_KEY?.trim() || undefined;
    const secretKey = process.env.S3_SECRET_KEY?.trim() || undefined;

    if (!endpoint || !bucket || !accessKey || !secretKey) {
      if (process.env.NODE_ENV === "production") {
        throw new DomainException(
          "INTERNAL_SERVER_ERROR",
          HttpStatus.INTERNAL_SERVER_ERROR,
          "S3 object storage configuration is missing in production."
        );
      }
      return {
        endpoint: endpoint ?? "http://localhost:9000",
        region,
        bucket: bucket ?? "saudavo-media-private",
        accessKey: accessKey ?? "dev-s3-access-key",
        secretKey: secretKey ?? "dev-s3-secret-key"
      };
    }

    return { endpoint, region, bucket, accessKey, secretKey };
  }
}
