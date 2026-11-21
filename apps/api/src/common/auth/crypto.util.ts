import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual
} from "node:crypto";

/**
 * Computes a SHA-256 hex digest (used for opaque session, CSRF, and auth token hashes).
 */
export function sha256Hex(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Generates a cryptographically strong URL-safe opaque token.
 */
export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/**
 * Timing-safe string equality check on fixed-length hex digests.
 */
export function safeHexEqual(aHex: string, bHex: string): boolean {
  if (aHex.length !== bHex.length) {
    return false;
  }
  const bufA = Buffer.from(aHex, "hex");
  const bufB = Buffer.from(bHex, "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function resolveCipherKey(envVarName: string, devFallbackSeed: string): Buffer {
  const raw = process.env[envVarName];
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`${envVarName} is required in production`);
    }
    return createHash("sha256").update(devFallbackSeed, "utf8").digest();
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

function resolveMfaCipherKey(): Buffer {
  return resolveCipherKey(
    "MFA_ENCRYPTION_KEY",
    "saudavo-dev-only-mfa-encryption-key-do-not-use-in-prod"
  );
}

function resolveOutboxCipherKey(): Buffer {
  if (process.env.OUTBOX_ENCRYPTION_KEY) {
    return createHash("sha256")
      .update(process.env.OUTBOX_ENCRYPTION_KEY, "utf8")
      .digest();
  }
  return resolveMfaCipherKey();
}

function encryptAesGcm(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptAesGcm(payload: string, key: Buffer): string {
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret format");
  }
  const [ivB64, tagB64, dataB64] = parts;
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted secret components");
  }
  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(tagB64, "base64url");
  const encrypted = Buffer.from(dataB64, "base64url");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function encryptMfaSecret(secretBase32: string): string {
  return encryptAesGcm(secretBase32, resolveMfaCipherKey());
}

export function decryptMfaSecret(payload: string): string {
  return decryptAesGcm(payload, resolveMfaCipherKey());
}

/**
 * Encrypts sensitive transient tokens before storing them inside internal outbox payloads.
 */
export function encryptSensitiveToken(rawToken: string): string {
  return encryptAesGcm(rawToken, resolveOutboxCipherKey());
}

/**
 * Decrypts sensitive transient tokens stored inside internal outbox payloads.
 */
export function decryptSensitiveToken(payload: string): string {
  return decryptAesGcm(payload, resolveOutboxCipherKey());
}
