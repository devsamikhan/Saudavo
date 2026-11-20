import { Injectable } from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

@Injectable()
export class TotpService {
  generateBase32Secret(byteLength = 20): string {
    const bytes = randomBytes(byteLength);
    let bits = 0;
    let value = 0;
    let output = "";

    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31] ?? "";
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += BASE32_ALPHABET[(value << (5 - bits)) & 31] ?? "";
    }

    return output;
  }

  generateCode(secretBase32: string, timestampMs = Date.now(), stepSeconds = 30): string {
    const counter = Math.floor(timestampMs / 1000 / stepSeconds);
    return this.hotp(this.decodeBase32(secretBase32), counter);
  }

  verifyCode(
    secretBase32: string,
    candidateCode: string,
    timestampMs = Date.now(),
    windowSteps = 1
  ): boolean {
    const normalized = candidateCode.trim();
    if (!/^\d{6}$/.test(normalized)) {
      return false;
    }

    const key = this.decodeBase32(secretBase32);
    const currentCounter = Math.floor(timestampMs / 1000 / 30);
    const candidateBuf = Buffer.from(normalized, "utf8");

    for (let offset = -windowSteps; offset <= windowSteps; offset += 1) {
      const expected = this.hotp(key, currentCounter + offset);
      const expectedBuf = Buffer.from(expected, "utf8");
      if (timingSafeEqual(candidateBuf, expectedBuf)) {
        return true;
      }
    }

    return false;
  }

  private hotp(key: Buffer, counter: number): string {
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigUInt64BE(BigInt(Math.max(0, counter)));

    const hmac = createHmac("sha1", key).update(counterBuf).digest();
    const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
    const binary =
      (((hmac[offset] ?? 0) & 0x7f) << 24) |
      (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
      (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
      ((hmac[offset + 3] ?? 0) & 0xff);

    const otp = binary % 1_000_000;
    return otp.toString().padStart(6, "0");
  }

  private decodeBase32(input: string): Buffer {
    const cleaned = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const ch of cleaned) {
      const idx = BASE32_ALPHABET.indexOf(ch);
      if (idx === -1) {
        throw new Error("Invalid Base32 character in TOTP secret");
      }
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }
}
