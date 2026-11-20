import {
  decryptMfaSecret,
  encryptMfaSecret
} from "../src/common/auth/crypto.util";
import { TotpService } from "../src/modules/auth/totp.service";

describe("TotpService & MFA secret encryption", () => {
  const totp = new TotpService();

  it("verifies valid 6-digit RFC 6238 codes within ±1 step window and rejects invalid codes", () => {
    const secret = totp.generateBase32Secret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);

    const fixedMs = 1_700_000_000_000;
    const code = totp.generateCode(secret, fixedMs);
    expect(code).toMatch(/^\d{6}$/);

    expect(totp.verifyCode(secret, code, fixedMs)).toBe(true);
    expect(totp.verifyCode(secret, code, fixedMs + 30_000)).toBe(true);
    expect(totp.verifyCode(secret, code, fixedMs + 120_000)).toBe(false);
    expect(totp.verifyCode(secret, "000000", fixedMs)).toBe(
      code === "000000"
    );
    expect(totp.verifyCode(secret, "abc123", fixedMs)).toBe(false);
  });

  it("encrypts and decrypts MFA secrets symmetrically with AES-256-GCM", () => {
    const secret = totp.generateBase32Secret();
    const encrypted = encryptMfaSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(encrypted.split(".")).toHaveLength(3);
    expect(decryptMfaSecret(encrypted)).toBe(secret);
  });
});
