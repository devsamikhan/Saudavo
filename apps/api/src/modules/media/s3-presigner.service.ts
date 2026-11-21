import { HttpStatus, Injectable } from "@nestjs/common";
import type { MediaMimeType } from "@saudavo/contracts";
import { createHash, createHmac } from "node:crypto";
import { DomainException } from "../../common/errors/domain.exception";
import { sanitizeImageBuffer } from "./image-sanitizer.util";

const MAX_OBJECT_BYTES = 5 * 1024 * 1024;
const SANITIZE_URL_TTL_SECONDS = 120;

@Injectable()
export class S3PresignerService {
  /**
   * Returns whether real remote S3 object inspection must execute during confirmation.
   */
  shouldInspectRemoteObject(): boolean {
    return (
      process.env.NODE_ENV === "production" ||
      Boolean(process.env.S3_ENDPOINT?.trim())
    );
  }

  /**
   * Downloads the uploaded S3 object, validates binary signature & size, strips EXIF/XMP metadata,
   * and overwrites the S3 object if metadata segments were removed.
   */
  async verifyAndSanitizeUploadedObject(input: {
    objectKey: string;
    mimeType: MediaMimeType;
  }): Promise<{ verifiedSizeBytes: number; strippedMetadata: boolean }> {
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

    const rawBuffer = Buffer.from(await getRes.arrayBuffer());
    if (rawBuffer.length === 0 || rawBuffer.length > MAX_OBJECT_BYTES) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Uploaded image size is empty or exceeds the 5 MB limit."
      );
    }

    const sanitized = sanitizeImageBuffer(rawBuffer, input.mimeType);
    if (sanitized.strippedMetadata) {
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

    return {
      verifiedSizeBytes: sanitized.cleanBuffer.length,
      strippedMetadata: sanitized.strippedMetadata
    };
  }

  /**
   * Validates that uploaded image magic bytes match the declared MIME type.
   */
  assertValidMagicBytes(mimeType: MediaMimeType, magicBytesHex: string): void {
    const normalized = magicBytesHex.trim().toLowerCase();
    const matches =
      (mimeType === "image/jpeg" && normalized.startsWith("ffd8ff")) ||
      (mimeType === "image/png" && normalized.startsWith("89504e47")) ||
      (mimeType === "image/webp" && normalized.startsWith("52494646"));

    if (!matches) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        `Uploaded file magic bytes do not match declared MIME type ${mimeType}.`
      );
    }
  }

  /**
   * Generates an AWS Signature v4 presigned URL (PUT or GET) for private S3-compatible buckets.
   */
  createPresignedUrl(input: {
    method: "PUT" | "GET";
    objectKey: string;
    expiresInSeconds: number;
  }): string {
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
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION ?? "us-east-1";
    const bucket = process.env.S3_BUCKET;
    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;

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
