import { PrismaClient } from "@prisma/client";
import { normalizeEmail, normalizePakistanPhoneE164 } from "@saudavo/contracts";
import { generateOpaqueToken, sha256Hex } from "../src/common/auth/crypto.util";
import {
  loadLocalEnvFiles,
  resolveWebOrigin
} from "../src/common/http/security.config";

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

/**
 * Operator recovery CLI for issuing a single-use password reset link/token
 * for an active account (supports email and phone-only accounts when SMTP/SMS
 * is inactive during local development or closed beta).
 *
 * Usage:
 *   pnpm --filter @saudavo/api auth:recover -- samikhanniazi285@gmail.com
 */
async function main(): Promise<void> {
  loadLocalEnvFiles();

  const rawArg = process.argv
    .slice(2)
    .find((arg) => arg.trim().length > 0 && arg !== "--");
  if (!rawArg) {
    console.error(
      "Usage: pnpm --filter @saudavo/api auth:recover -- <email-or-pakistan-phone>"
    );
    process.exitCode = 1;
    return;
  }

  const trimmed = rawArg.trim();
  const normalizedPhone = normalizePakistanPhoneE164(trimmed);
  const normalizedEmail = trimmed.includes("@") ? normalizeEmail(trimmed) : null;

  if (!normalizedPhone && !normalizedEmail) {
    console.error(
      "Invalid identifier. Provide a valid email or Pakistani phone (+923XXXXXXXXX / 03XXXXXXXXX)."
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: normalizedPhone
        ? { phoneE164: normalizedPhone, deletedAt: null }
        : { email: normalizedEmail ?? undefined, deletedAt: null },
      select: {
        id: true,
        displayName: true,
        email: true,
        phoneE164: true,
        status: true
      }
    });

    if (!user || user.status !== "ACTIVE") {
      console.error("No active Saudavo user matched that identifier.");
      process.exitCode = 1;
      return;
    }

    const rawToken = generateOpaqueToken(32);
    const tokenHash = sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await prisma.$transaction(async (tx) => {
      await tx.authToken.create({
        data: {
          userId: user.id,
          tokenType: "PASSWORD_RESET",
          tokenHash,
          expiresAt
        }
      });

      await tx.outboxEvent.create({
        data: {
          eventType: "AUTH_OPERATOR_PASSWORD_RESET_ISSUED",
          aggregateType: "User",
          aggregateId: user.id,
          payloadJson: {
            userId: user.id,
            deliveryChannel: "OPERATOR_CLI",
            expiresAt: expiresAt.toISOString()
          },
          status: "PROCESSED",
          processedAt: new Date()
        }
      });
    });

    const resetUrl = `${resolveWebOrigin()}/auth?mode=reset&token=${encodeURIComponent(rawToken)}`;
    console.log(
      `\nSingle-use password recovery link generated for ${user.displayName} (expires ${expiresAt.toISOString()}):\n`
    );
    console.log(`Recovery URL:   ${resetUrl}`);
    console.log(`Recovery Token: ${rawToken}\n`);
    console.log(
      "Open the Recovery URL in your browser or click 'Forgot password?' -> 'I already have a reset token' on /auth.\n"
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
