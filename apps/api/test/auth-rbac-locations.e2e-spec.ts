import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  ApiErrorEnvelopeSchema,
  AuthMeResponseSchema,
  AuthSessionResponseSchema,
  DistrictsResponseSchema
} from "@saudavo/contracts";
import cookieParser from "cookie-parser";
import request, { type Response as SupertestResponse } from "supertest";
import { AppModule } from "../src/app.module";
import {
  decryptSensitiveToken,
  encryptMfaSecret
} from "../src/common/auth/crypto.util";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { RateLimitGuard } from "../src/common/rate-limit/rate-limit.guard";
import { TotpService } from "../src/modules/auth/totp.service";
import { InMemoryPrismaService } from "./helpers/in-memory-prisma.service";

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

describe("Auth, CSRF, RBAC, MFA, RateLimit & Locations (e2e)", () => {
  let app: INestApplication;
  let fakePrisma: InMemoryPrismaService;
  let rateLimitGuard: RateLimitGuard;
  let totpService: TotpService;

  beforeAll(async () => {
    fakePrisma = new InMemoryPrismaService();
    fakePrisma.seedDefaultLocations();

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
  });

  beforeEach(() => {
    rateLimitGuard.clearAll();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/locations/districts exposes active Mianwali District & tehsil placeholders (PQ-08)", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const res = await request(server).get("/api/v1/locations/districts").expect(200);

    const parsed = DistrictsResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.data).toHaveLength(1);
      expect(parsed.data.data[0]?.code).toBe("MIANWALI");
      expect(parsed.data.data[0]?.areaZones.map((z) => z.nameEn)).toEqual([
        "Isakhel",
        "Mianwali",
        "Piplan"
      ]);
    }
  });

  it("registers users with email-only or phone-only, rejects duplicates and missing identifiers", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    // Missing both email and phone -> 400 VALIDATION_ERROR
    const invalidRes = await request(server)
      .post("/api/v1/auth/register")
      .send({
        password: "StrongPassword!1",
        displayName: "Ali Khan"
      })
      .expect(400);
    expect(ApiErrorEnvelopeSchema.parse(invalidRes.body).error.code).toBe(
      "VALIDATION_ERROR"
    );

    // Email-only registration -> 201 + HttpOnly SameSite=Lax cookie + outbox event
    const emailReg = await request(server)
      .post("/api/v1/auth/register")
      .send({
        email: "Ali.Khan@Example.COM ",
        password: "StrongPassword!1",
        displayName: "Ali Khan",
        preferredLocale: "ur"
      })
      .expect(201);

    const setCookieHeader = String(emailReg.headers["set-cookie"]);
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("SameSite=Lax");

    const parsedEmailReg = AuthSessionResponseSchema.parse(emailReg.body);
    expect(parsedEmailReg.data.user.roles).toEqual(["CUSTOMER"]);
    expect(parsedEmailReg.data.user.preferredLocale).toBe("ur");
    expect(
      fakePrisma.outboxEvents.some(
        (e) =>
          e.eventType === "AUTH_USER_REGISTERED" &&
          e.aggregateId === parsedEmailReg.data.user.id
      )
    ).toBe(true);

    // Phone-only registration (local Pakistani mobile normalized to +923...) -> 201
    const phoneReg = await request(server)
      .post("/api/v1/auth/register")
      .send({
        phone: "0300-1234567",
        password: "StrongPassword!1",
        displayName: "Sana Ullah"
      })
      .expect(201);
    expect(AuthSessionResponseSchema.parse(phoneReg.body).data.user.roles).toEqual([
      "CUSTOMER"
    ]);

    // Duplicate email -> 409 DUPLICATE_IDENTITY
    const dupEmail = await request(server)
      .post("/api/v1/auth/register")
      .send({
        email: "ali.khan@example.com",
        password: "StrongPassword!1",
        displayName: "Dup User"
      })
      .expect(409);
    expect(ApiErrorEnvelopeSchema.parse(dupEmail.body).error.code).toBe(
      "DUPLICATE_IDENTITY"
    );

    // Duplicate phone -> 409 DUPLICATE_IDENTITY
    const dupPhone = await request(server)
      .post("/api/v1/auth/register")
      .send({
        phone: "+923001234567",
        password: "StrongPassword!1",
        displayName: "Dup Phone"
      })
      .expect(409);
    expect(ApiErrorEnvelopeSchema.parse(dupPhone.body).error.code).toBe(
      "DUPLICATE_IDENTITY"
    );
  });

  it("authenticates email/phone logins, enforces CSRF on logout, and revokes session", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post("/api/v1/auth/register")
      .send({
        email: "customer1@saudavo.pk",
        phone: "03121112233",
        password: "Password!234",
        displayName: "Customer One"
      })
      .expect(201);

    // Unauthenticated /auth/me -> 401
    await request(server).get("/api/v1/auth/me").expect(401);

    // Wrong password -> 401 INVALID_CREDENTIALS
    const badLogin = await request(server)
      .post("/api/v1/auth/login")
      .send({
        identifier: "customer1@saudavo.pk",
        password: "WrongPassword"
      })
      .expect(401);
    expect(ApiErrorEnvelopeSchema.parse(badLogin.body).error.code).toBe(
      "INVALID_CREDENTIALS"
    );

    // Login using normalized local Pakistani phone
    const loginRes = await request(server)
      .post("/api/v1/auth/login")
      .send({
        identifier: "03121112233",
        password: "Password!234"
      })
      .expect(200);

    const sidCookie = extractCookiePair(loginRes, "saudavo_sid");
    const csrfToken = AuthSessionResponseSchema.parse(loginRes.body).data.csrfToken;

    // GET /auth/me succeeds with cookie
    const meRes = await request(server)
      .get("/api/v1/auth/me")
      .set("Cookie", sidCookie)
      .expect(200);
    expect(meRes.body.data.user.displayName).toBe("Customer One");

    // POST /auth/logout without CSRF -> 403 CSRF_INVALID
    const noCsrf = await request(server)
      .post("/api/v1/auth/logout")
      .set("Cookie", sidCookie)
      .expect(403);
    expect(ApiErrorEnvelopeSchema.parse(noCsrf.body).error.code).toBe("CSRF_INVALID");

    // POST /auth/logout with wrong CSRF -> 403 CSRF_INVALID
    const badCsrf = await request(server)
      .post("/api/v1/auth/logout")
      .set("Cookie", sidCookie)
      .set("X-CSRF-Token", "invalid-csrf-token")
      .expect(403);
    expect(ApiErrorEnvelopeSchema.parse(badCsrf.body).error.code).toBe("CSRF_INVALID");

    // POST /auth/logout with valid CSRF -> 200 and revokes session
    await request(server)
      .post("/api/v1/auth/logout")
      .set("Cookie", sidCookie)
      .set("X-CSRF-Token", csrfToken)
      .expect(200);

    // Reusing revoked session cookie -> 401
    await request(server)
      .get("/api/v1/auth/me")
      .set("Cookie", sidCookie)
      .expect(401);
  });

  it("supports password reset request/confirm and revokes prior active sessions", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const reg = await request(server)
      .post("/api/v1/auth/register")
      .send({
        email: "resetme@saudavo.pk",
        password: "OldPassword!1",
        displayName: "Reset User"
      })
      .expect(201);
    const oldCookie = extractCookiePair(reg, "saudavo_sid");

    await request(server)
      .post("/api/v1/auth/password-reset/request")
      .send({ identifier: "resetme@saudavo.pk" })
      .expect(200);

    // Also ensure unknown email returns non-enumerating 200
    await request(server)
      .post("/api/v1/auth/password-reset/request")
      .send({ identifier: "nonexistent@saudavo.pk" })
      .expect(200);

    const outboxReset = [...fakePrisma.outboxEvents]
      .reverse()
      .find((e) => e.eventType === "AUTH_PASSWORD_RESET_REQUESTED");
    expect(outboxReset).toBeDefined();
    const outboxPayload = outboxReset?.payloadJson as {
      resetToken?: string;
      resetTokenEncrypted: string;
    };
    expect(outboxPayload.resetToken).toBeUndefined();
    const rawToken = decryptSensitiveToken(outboxPayload.resetTokenEncrypted);

    // Wrong token -> 400 INVALID_OR_EXPIRED_TOKEN
    const badConfirm = await request(server)
      .post("/api/v1/auth/password-reset/confirm")
      .send({
        token: "not-a-valid-reset-token-1234",
        newPassword: "NewPassword!1"
      })
      .expect(400);
    expect(ApiErrorEnvelopeSchema.parse(badConfirm.body).error.code).toBe(
      "INVALID_OR_EXPIRED_TOKEN"
    );

    // Valid token -> 200, revokes old session
    await request(server)
      .post("/api/v1/auth/password-reset/confirm")
      .send({
        token: rawToken,
        newPassword: "NewPassword!1"
      })
      .expect(200);

    await request(server)
      .get("/api/v1/auth/me")
      .set("Cookie", oldCookie)
      .expect(401);

    // Reusing single-use token fails -> 400
    await request(server)
      .post("/api/v1/auth/password-reset/confirm")
      .send({
        token: rawToken,
        newPassword: "AnotherPassword!1"
      })
      .expect(400);

    // Can log in with new password
    await request(server)
      .post("/api/v1/auth/login")
      .send({
        identifier: "resetme@saudavo.pk",
        password: "NewPassword!1"
      })
      .expect(200);
  });

  it("enforces suspended account rejection, staff RBAC (403), and staff TOTP MFA (403 -> 200 + audit log)", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    // Regular customer cannot access staff /audit/logs -> 403 FORBIDDEN
    const custReg = await request(server)
      .post("/api/v1/auth/register")
      .send({
        email: "buyer2@saudavo.pk",
        password: "Password!234",
        displayName: "Regular Buyer"
      })
      .expect(201);
    const custCookie = extractCookiePair(custReg, "saudavo_sid");
    const forbiddenCust = await request(server)
      .get("/api/v1/audit/logs")
      .set("Cookie", custCookie)
      .expect(403);
    expect(ApiErrorEnvelopeSchema.parse(forbiddenCust.body).error.code).toBe(
      "FORBIDDEN"
    );

    // Provision ADMIN account with encrypted TOTP secret
    const adminReg = await request(server)
      .post("/api/v1/auth/register")
      .send({
        email: "admin1@saudavo.pk",
        password: "AdminPassword!1",
        displayName: "Mianwali Admin"
      })
      .expect(201);
    const adminUserId = AuthSessionResponseSchema.parse(adminReg.body).data.user.id;
    const totpSecret = totpService.generateBase32Secret();
    fakePrisma.grantRole(adminUserId, "ADMIN");
    fakePrisma.setMfaSecret(adminUserId, encryptMfaSecret(totpSecret));

    // Fresh ADMIN login -> mfaRequired=true, mfaVerified=false
    const adminLogin = await request(server)
      .post("/api/v1/auth/login")
      .send({
        identifier: "admin1@saudavo.pk",
        password: "AdminPassword!1"
      })
      .expect(200);
    const parsedAdminLogin = AuthSessionResponseSchema.parse(adminLogin.body);
    expect(parsedAdminLogin.data.user.mfaRequired).toBe(true);
    expect(parsedAdminLogin.data.user.mfaVerified).toBe(false);

    const adminCookie = extractCookiePair(adminLogin, "saudavo_sid");
    const adminCsrf = parsedAdminLogin.data.csrfToken;

    // Staff endpoint blocked prior to MFA -> 403 MFA_REQUIRED
    const mfaRequiredRes = await request(server)
      .get("/api/v1/audit/logs")
      .set("Cookie", adminCookie)
      .expect(403);
    expect(ApiErrorEnvelopeSchema.parse(mfaRequiredRes.body).error.code).toBe(
      "MFA_REQUIRED"
    );

    // Wrong 6-digit TOTP code -> 401 INVALID_CREDENTIALS
    const badCode = totpService.generateCode(totpSecret, Date.now() - 300_000);
    await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({ code: badCode === totpService.generateCode(totpSecret) ? "999999" : badCode })
      .expect(401);

    // Valid 6-digit TOTP code -> 200 mfaVerified: true + AdminAuditLog entry
    const validCode = totpService.generateCode(totpSecret);
    const mfaRes = await request(server)
      .post("/api/v1/auth/admin/mfa/verify")
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({ code: validCode })
      .expect(200);
    expect(mfaRes.body.data.mfaVerified).toBe(true);

    // Staff endpoint now succeeds -> 200 OK with STAFF_MFA_VERIFIED audit entry
    const auditRes = await request(server)
      .get("/api/v1/audit/logs")
      .set("Cookie", adminCookie)
      .expect(200);
    expect(auditRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(auditRes.body.data[0].action).toBe("STAFF_MFA_VERIFIED");

    // Suspended account cannot access /auth/me or log in
    fakePrisma.setUserStatus(adminUserId, "SUSPENDED");
    const suspendedMe = await request(server)
      .get("/api/v1/auth/me")
      .set("Cookie", adminCookie)
      .expect(403);
    expect(ApiErrorEnvelopeSchema.parse(suspendedMe.body).error.code).toBe(
      "ACCOUNT_SUSPENDED"
    );
  });

  it("rate limits excessive auth requests with 429 RATE_LIMIT_EXCEEDED", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    for (let i = 0; i < 5; i += 1) {
      await request(server)
        .post("/api/v1/auth/password-reset/request")
        .send({ identifier: "rate@saudavo.pk" })
        .expect(200);
    }

    const blocked = await request(server)
      .post("/api/v1/auth/password-reset/request")
      .send({ identifier: "rate@saudavo.pk" })
      .expect(429);
    expect(ApiErrorEnvelopeSchema.parse(blocked.body).error.code).toBe(
      "RATE_LIMIT_EXCEEDED"
    );
  });

  it("supports cross-tab CSRF rotation via GET /auth/me (X-CSRF-Sync: 1) and rate limits /search", async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const regRes = await request(server)
      .post("/api/v1/auth/register")
      .send({
        email: "crosstab@saudavo.pk",
        password: "StrongPassword!1",
        displayName: "Cross Tab"
      })
      .expect(201);
    const cookie = extractCookiePair(regRes, "saudavo_sid");
    const oldCsrf = AuthSessionResponseSchema.parse(regRes.body).data.csrfToken;

    // Plain /auth/me does not return csrfToken
    const mePlain = await request(server)
      .get("/api/v1/auth/me")
      .set("Cookie", cookie)
      .expect(200);
    expect(AuthMeResponseSchema.parse(mePlain.body).data.csrfToken).toBeUndefined();

    // /auth/me with X-CSRF-Sync: 1 rotates and returns fresh csrfToken
    const meSync = await request(server)
      .get("/api/v1/auth/me")
      .set("Cookie", cookie)
      .set("X-CSRF-Sync", "1")
      .expect(200);
    const rotatedCsrf = AuthMeResponseSchema.parse(meSync.body).data.csrfToken;
    expect(rotatedCsrf).toBeDefined();
    expect(rotatedCsrf).not.toBe(oldCsrf);

    // Old CSRF token rejected after rotation
    await request(server)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", oldCsrf)
      .expect(403);

    // Rotated CSRF token accepted
    await request(server)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", rotatedCsrf ?? "")
      .expect(200);

    // Public search rate limiting (60/min)
    for (let i = 0; i < 60; i += 1) {
      await request(server).get("/api/v1/search").expect(200);
    }
    const blockedSearch = await request(server).get("/api/v1/search").expect(429);
    expect(ApiErrorEnvelopeSchema.parse(blockedSearch.body).error.code).toBe(
      "RATE_LIMIT_EXCEEDED"
    );
  });
});
