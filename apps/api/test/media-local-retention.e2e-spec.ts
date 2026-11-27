import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request, { type Response as SupertestResponse } from "supertest";
import { AuthSessionResponseSchema } from "@saudavo/contracts";
import { AppModule } from "../src/app.module";
import { encryptMfaSecret } from "../src/common/auth/crypto.util";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { RateLimitGuard } from "../src/common/rate-limit/rate-limit.guard";
import { TotpService } from "../src/modules/auth/totp.service";
import { MediaRetentionService } from "../src/modules/media/media-retention.service";
import { InMemoryPrismaService } from "./helpers/in-memory-prisma.service";

const ONE_PIXEL_WEBP = Buffer.from(
  "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=",
  "base64"
);

function extractCookiePair(res: SupertestResponse, name: string): string {
  const raw = res.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  for (const item of list) {
    const firstPart = item.split(";")[0]?.trim();
    if (firstPart?.startsWith(`${name}=`)) {
      return firstPart;
    }
  }
  throw new Error(`Missing Set-Cookie header for ${name}`);
}

async function registerUser(
  server: Parameters<typeof request>[0],
  email: string,
  displayName: string
): Promise<{ userId: string; cookie: string; csrfToken: string }> {
  const res = await request(server)
    .post("/api/v1/auth/register")
    .send({
      email,
      password: "StrongPassword!123",
      displayName
    })
    .expect(201);

  const parsed = AuthSessionResponseSchema.parse(res.body);
  return {
    userId: parsed.data.user.id,
    cookie: extractCookiePair(res, "saudavo_sid"),
    csrfToken: parsed.data.csrfToken
  };
}

describe("Local Disk Media Driver & 30-Day Retention Sweep (e2e)", () => {
  let app: INestApplication;
  let fakePrisma: InMemoryPrismaService;
  let rateLimitGuard: RateLimitGuard;
  let totpService: TotpService;
  let retentionService: MediaRetentionService;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "saudavo-local-media-"));
    process.env.STORAGE_DRIVER = "local";
    process.env.LOCAL_MEDIA_DIR = tempDir;

    fakePrisma = new InMemoryPrismaService();
    fakePrisma.seedDefaultLocations();
    fakePrisma.seedDefaultCategories();
    fakePrisma.seedInitialCommissionRule();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    await app.init();

    rateLimitGuard = moduleRef.get(RateLimitGuard);
    totpService = moduleRef.get(TotpService);
    retentionService = moduleRef.get(MediaRetentionService);
  });

  beforeEach(() => {
    rateLimitGuard.clearAll();
  });

  afterAll(async () => {
    delete process.env.STORAGE_DRIVER;
    delete process.env.LOCAL_MEDIA_DIR;
    await app.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("stores compressed WebP images on local disk via HMAC-signed URLs and cleans 30-day chat media & DB bloat", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const buyer = await registerUser(server, "localmedia@saudavo.pk", "Sana Local");

    const presignRes = await request(server)
      .post("/api/v1/media/upload-url")
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        purpose: "CHAT_ATTACHMENT",
        mimeType: "image/webp",
        sizeBytes: ONE_PIXEL_WEBP.length,
        fileName: "compressed.webp"
      })
      .expect(201);

    const uploadUrl = new URL(presignRes.body.data.uploadUrl as string);
    const localPathWithQuery = `${uploadUrl.pathname}${uploadUrl.search}`;
    const assetId = presignRes.body.data.asset.id as string;

    // Tampered signature rejected
    await request(server)
      .put(`${localPathWithQuery.replace(/sig=[^&]+/, "sig=0000")}`)
      .set("Content-Type", "image/webp")
      .send(ONE_PIXEL_WEBP)
      .expect(403);

    // Valid signed PUT writes directly to local disk (never PostgreSQL)
    await request(server)
      .put(localPathWithQuery)
      .set("Content-Type", "image/webp")
      .send(ONE_PIXEL_WEBP)
      .expect(200);

    await request(server)
      .post(`/api/v1/media/${assetId}/confirm`)
      .set("Cookie", [buyer.cookie])
      .set("X-CSRF-Token", buyer.csrfToken)
      .send({
        exifStripped: true,
        magicBytesHex: ONE_PIXEL_WEBP.subarray(0, 12).toString("hex")
      })
      .expect(200);

    const signedReadRes = await request(server)
      .get(`/api/v1/media/${assetId}/signed-url`)
      .set("Cookie", [buyer.cookie])
      .expect(200);
    const readUrl = new URL(signedReadRes.body.data.readUrl as string);
    const fetchedBinary = await request(server)
      .get(`${readUrl.pathname}${readUrl.search}`)
      .expect(200);
    expect(fetchedBinary.headers["content-type"]).toContain("image/webp");
    expect(Buffer.compare(Buffer.from(fetchedBinary.body), ONE_PIXEL_WEBP)).toBe(0);

    // Simulate 35-day-old chat asset vs 35-day-old product asset + expired DB rows
    const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    const chatRecord = fakePrisma.mediaAssets.find((m) => m.id === assetId)!;
    chatRecord.createdAt = oldDate;

    fakePrisma.mediaAssets.push({
      id: "99999999-9999-4999-8999-999999999991",
      ownerUserId: buyer.userId,
      storeId: "11111111-1111-4111-8111-111111111111",
      objectKey: "stores/1111/product_image/keep.webp",
      mimeType: "image/webp",
      sizeBytes: 1200,
      exifStripped: true,
      status: "READY",
      createdAt: oldDate
    });

    fakePrisma.userSessions.push({
      id: "88888888-8888-4888-8888-888888888881",
      userId: buyer.userId,
      tokenHash: "expired_hash",
      csrfTokenHash: "csrf",
      mfaVerifiedAt: null,
      ipAddress: null,
      userAgent: null,
      expiresAt: oldDate,
      revokedAt: null,
      createdAt: oldDate
    });

    const admin = await registerUser(server, "retadmin@saudavo.pk", "Ret Admin");
    fakePrisma.grantRole(admin.userId, "ADMIN");
    const mfaSecret = totpService.generateBase32Secret();
    fakePrisma.setMfaSecret(admin.userId, encryptMfaSecret(mfaSecret));
    await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", [admin.cookie])
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ code: totpService.generateCode(mfaSecret) })
      .expect(200);

    const sweepRes = await retentionService.runRetentionSweep();
    expect(sweepRes.deletedChatAssets).toBe(1);
    expect(sweepRes.prunedSessions).toBeGreaterThanOrEqual(1);
    // Product media under stores/* MUST remain preserved
    expect(
      fakePrisma.mediaAssets.some((m) => m.objectKey.startsWith("stores/"))
    ).toBe(true);

    // Local file deleted from disk -> signed read returns 404
    await request(server)
      .get(`${readUrl.pathname}${readUrl.search}`)
      .expect(404);
  });
});
