import {
  assertBufferMatchesImageMime,
  sanitizeImageBuffer
} from "../src/modules/media/image-sanitizer.util";
import { S3PresignerService } from "../src/modules/media/s3-presigner.service";

function makePngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makeRiffChunk(fourCC: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.write(fourCC, 0, "ascii");
  header.writeUInt32LE(payload.length, 4);
  const pad = payload.length % 2 === 1 ? Buffer.from([0]) : Buffer.alloc(0);
  return Buffer.concat([header, payload, pad]);
}

describe("Server-side image verification & EXIF metadata stripping", () => {
  const originalFetch = global.fetch;
  const originalEndpoint = process.env.S3_ENDPOINT;
  const originalBucket = process.env.S3_BUCKET;
  const originalAccess = process.env.S3_ACCESS_KEY;
  const originalSecret = process.env.S3_SECRET_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.S3_ENDPOINT = originalEndpoint;
    process.env.S3_BUCKET = originalBucket;
    process.env.S3_ACCESS_KEY = originalAccess;
    process.env.S3_SECRET_KEY = originalSecret;
    jest.restoreAllMocks();
  });

  it("strips APP1 EXIF & COM segments from JPEG while preserving JFIF and scan data", () => {
    const soi = Buffer.from([0xff, 0xd8]);
    // APP0 JFIF segment: marker FF E0, length 0x0007 (2 + 5 bytes)
    const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x07, 0x4a, 0x46, 0x49, 0x46, 0x00]);
    // APP1 EXIF GPS segment: marker FF E1, length 0x0008 (2 + 6 bytes "ExifGPS")
    const app1 = Buffer.from([0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x47, 0x50]);
    // COM segment: marker FF FE, length 0x0005
    const com = Buffer.from([0xff, 0xfe, 0x00, 0x05, 0x68, 0x69, 0x21]);
    // SOS + minimal scan + EOI
    const sosAndEoi = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]);

    const dirtyJpeg = Buffer.concat([soi, app0, app1, com, sosAndEoi]);
    const res = sanitizeImageBuffer(dirtyJpeg, "image/jpeg");

    expect(res.strippedMetadata).toBe(true);
    expect(res.strippedBytesCount).toBe(app1.length + com.length);
    expect(res.cleanBuffer).toEqual(Buffer.concat([soi, app0, sosAndEoi]));

    // Second pass is idempotent
    const secondPass = sanitizeImageBuffer(res.cleanBuffer, "image/jpeg");
    expect(secondPass.strippedMetadata).toBe(false);
  });

  it("strips eXIf and tEXt metadata chunks from PNG images", () => {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = makePngChunk("IHDR", Buffer.alloc(13, 1));
    const exif = makePngChunk("eXIf", Buffer.from("MM*GPS-DATA"));
    const text = makePngChunk("tEXt", Buffer.from("Author\0Secret"));
    const idat = makePngChunk("IDAT", Buffer.from([1, 2, 3, 4]));
    const iend = makePngChunk("IEND", Buffer.alloc(0));

    const dirtyPng = Buffer.concat([sig, ihdr, exif, text, idat, iend]);
    const res = sanitizeImageBuffer(dirtyPng, "image/png");

    expect(res.strippedMetadata).toBe(true);
    expect(res.cleanBuffer).toEqual(Buffer.concat([sig, ihdr, idat, iend]));
  });

  it("strips EXIF chunks and clears VP8X EXIF/XMP flags from WebP images", () => {
    // VP8X payload (10 bytes): byte 0 has EXIF (0x08) + XMP (0x04) + ALPHA (0x10)
    const vp8xPayload = Buffer.alloc(10, 0);
    vp8xPayload[0] = 0x1c;
    const vp8x = makeRiffChunk("VP8X", vp8xPayload);
    const vp8 = makeRiffChunk("VP8 ", Buffer.from([0x10, 0x20, 0x30]));
    const exif = makeRiffChunk("EXIF", Buffer.from("II*GPS"));

    const body = Buffer.concat([vp8x, vp8, exif]);
    const riffHeader = Buffer.alloc(12);
    riffHeader.write("RIFF", 0, "ascii");
    riffHeader.writeUInt32LE(4 + body.length, 4);
    riffHeader.write("WEBP", 8, "ascii");

    const dirtyWebp = Buffer.concat([riffHeader, body]);
    const res = sanitizeImageBuffer(dirtyWebp, "image/webp");

    expect(res.strippedMetadata).toBe(true);
    expect(res.cleanBuffer.subarray(8, 12).toString("ascii")).toBe("WEBP");
    // VP8X flag bit 0x10 (alpha) preserved; 0x0c (EXIF + XMP) cleared
    expect(res.cleanBuffer[20]).toBe(0x10);
    expect(res.cleanBuffer.readUInt32LE(4)).toBe(res.cleanBuffer.length - 8);
  });

  it("rejects spoofed image bytes that mismatch declared MIME type", () => {
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(() => assertBufferMatchesImageMime(pngSig, "image/jpeg")).toThrow(
      "Uploaded bytes are not a valid JPEG image."
    );
  });

  it("downloads S3 object, strips EXIF bytes, and re-uploads cleaned object on confirm", async () => {
    process.env.S3_ENDPOINT = "https://s3.saudavo.local";
    process.env.S3_BUCKET = "saudavo-media";
    process.env.S3_ACCESS_KEY = "test-key";
    process.env.S3_SECRET_KEY = "test-secret";

    const dirtyJpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      Buffer.from([0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66]),
      Buffer.from([0xff, 0xda, 0x00, 0x02, 0xaa, 0xff, 0xd9])
    ]);

    const calls: Array<{ url: string; method: string; bodyLen?: number }> = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (method === "GET") {
        calls.push({ url, method });
        return new Response(dirtyJpeg, { status: 200 });
      }
      const body = init?.body as Uint8Array;
      calls.push({ url, method, bodyLen: body.byteLength });
      return new Response(null, { status: 200 });
    }) as typeof fetch;

    const presigner = new S3PresignerService();
    expect(presigner.shouldInspectRemoteObject()).toBe(true);

    const verified = await presigner.verifyAndSanitizeUploadedObject({
      objectKey: "stores/s1/product_image/a.jpg",
      mimeType: "image/jpeg"
    });

    expect(verified.strippedMetadata).toBe(true);
    expect(verified.verifiedSizeBytes).toBe(9);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.method).toBe("GET");
    expect(calls[1]?.method).toBe("PUT");
    expect(calls[1]?.bodyLen).toBe(9);
  });
});
