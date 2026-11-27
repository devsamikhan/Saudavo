import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  type AdminMfaEnrollResponse,
  AdminMfaEnrollResponseSchema,
  type AdminMfaVerify,
  type AuthMeResponse,
  AuthMeResponseSchema,
  type AuthSessionResponse,
  AuthSessionResponseSchema,
  type LocaleCode,
  LocaleCodeSchema,
  type LoginRequest,
  type PasswordResetConfirm,
  type PasswordResetRequest,
  type RegisterRequest,
  type RoleCode,
  RoleCodeSchema,
  STAFF_ROLES
} from "@saudavo/contracts";
import * as argon2 from "argon2";
import type { AuthContext } from "../../common/auth/auth.types";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  encryptSensitiveToken,
  generateOpaqueToken,
  sha256Hex
} from "../../common/auth/crypto.util";
import { DomainException } from "../../common/errors/domain.exception";
import { resolveWebOrigin } from "../../common/http/security.config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { OutboxService } from "../outbox/outbox.service";
import { UsersService, type UserWithAuth } from "../users/users.service";
import { TotpService } from "./totp.service";

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const STAFF_ROLE_SET = new Set<RoleCode>(STAFF_ROLES);

export interface ClientMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
    private readonly totpService: TotpService
  ) {}

  async register(
    dto: RegisterRequest,
    client: ClientMetadata,
    requestId: string
  ): Promise<{ response: AuthSessionResponse; rawSessionToken: string }> {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id
    });

    const user = await this.usersService.createCustomerUser({
      email: dto.email,
      phoneE164: dto.phone,
      passwordHash,
      displayName: dto.displayName,
      preferredLocale: dto.preferredLocale
    });

    await this.outboxService.enqueue({
      eventType: "AUTH_USER_REGISTERED",
      aggregateType: "User",
      aggregateId: user.id,
      payloadJson: {
        userId: user.id,
        hasEmail: Boolean(user.email),
        hasPhone: Boolean(user.phoneE164),
        preferredLocale: dto.preferredLocale
      }
    });

    return this.issueSessionForUser(user, client, requestId);
  }

  async login(
    dto: LoginRequest,
    client: ClientMetadata,
    requestId: string
  ): Promise<{ response: AuthSessionResponse; rawSessionToken: string }> {
    const user = await this.usersService.findByIdentifierWithAuth(dto.identifier);

    if (!user || !user.passwordHash.startsWith("$argon2")) {
      throw new DomainException(
        "INVALID_CREDENTIALS",
        HttpStatus.UNAUTHORIZED,
        "Invalid login identifier or password."
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new DomainException(
        "INVALID_CREDENTIALS",
        HttpStatus.UNAUTHORIZED,
        "Invalid login identifier or password."
      );
    }

    if (user.status !== "ACTIVE") {
      throw new DomainException(
        "ACCOUNT_SUSPENDED",
        HttpStatus.FORBIDDEN,
        "This account is suspended or inactive."
      );
    }

    return this.issueSessionForUser(user, client, requestId);
  }

  async logout(auth: AuthContext, requestId: string): Promise<{
    data: { loggedOut: true };
    meta: { requestId: string };
  }> {
    await this.prisma.userSession.updateMany({
      where: {
        id: auth.sessionId,
        userId: auth.userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return {
      data: { loggedOut: true },
      meta: { requestId }
    };
  }

  async requestPasswordReset(
    dto: PasswordResetRequest,
    requestId: string
  ): Promise<{
    data: { accepted: true; message: string };
    meta: { requestId: string };
  }> {
    const user = await this.usersService.findByIdentifierWithAuth(dto.identifier);
    let rawResetTokenForEmail: string | null = null;

    if (user && user.status === "ACTIVE") {
      if (user.email) {
        const rawToken = generateOpaqueToken(32);
        const tokenHash = sha256Hex(rawToken);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

        await this.prisma.$transaction(async (tx) => {
          await tx.authToken.create({
            data: {
              userId: user.id,
              tokenType: "PASSWORD_RESET",
              tokenHash,
              expiresAt
            }
          });

          await this.outboxService.enqueue(
            {
              eventType: "AUTH_PASSWORD_RESET_REQUESTED",
              aggregateType: "User",
              aggregateId: user.id,
              payloadJson: {
                userId: user.id,
                deliveryChannel: "EMAIL",
                resetTokenEncrypted: encryptSensitiveToken(rawToken),
                expiresAt: expiresAt.toISOString()
              }
            },
            tx
          );
        });
        rawResetTokenForEmail = rawToken;
      } else {
        // PQ-05: No mandatory SMS OTP in closed beta; phone-only recovery requires support escalation
        await this.outboxService.enqueue({
          eventType: "AUTH_PHONE_ONLY_RECOVERY_SUPPORT_NOTICE",
          aggregateType: "User",
          aggregateId: user.id,
          payloadJson: {
            userId: user.id,
            deliveryChannel: "SUPPORT_ASSISTED"
          }
        });
      }
    }

    if (user?.email && rawResetTokenForEmail) {
      await this.dispatchPasswordResetEmail(
        user.email,
        user.displayName,
        rawResetTokenForEmail
      );
    }

    return {
      data: {
        accepted: true,
        message:
          "If a matching active account exists, recovery steps have been queued."
      },
      meta: { requestId }
    };
  }

  private async dispatchPasswordResetEmail(
    recipientEmail: string,
    displayName: string,
    rawToken: string
  ): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const mailFrom = process.env.MAIL_FROM?.trim();
    if (!apiKey || !mailFrom) {
      this.logger.debug(
        "Password reset queued in outbox without transactional email dispatch (RESEND_API_KEY/MAIL_FROM unset)."
      );
      return;
    }

    const resetUrl = `${resolveWebOrigin()}/auth?mode=reset&token=${encodeURIComponent(rawToken)}`;
    const safeName = displayName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: mailFrom,
          to: [recipientEmail],
          subject: "Saudavo Password Reset (Valid 30 Minutes)",
          text:
            `Assalam-o-Alaikum ${displayName},\n\n` +
            `Open this single-use link (valid for 30 minutes) to set a new Saudavo password:\n${resetUrl}\n\n` +
            `Or paste this recovery token on /auth:\n${rawToken}\n`,
          html:
            `<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.5">` +
            `<h2 style="color:#0F6B52;margin-bottom:8px">Saudavo Password Recovery</h2>` +
            `<p>Assalam-o-Alaikum <strong>${safeName}</strong>,</p>` +
            `<p>Click the button below to choose a new password (valid for 30 minutes):</p>` +
            `<p><a href="${resetUrl}" style="display:inline-block;background:#0F6B52;color:#ffffff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:bold">Reset Saudavo Password</a></p>` +
            `<p style="font-size:12px;color:#4B5563">Or paste this token manually on the login screen:<br/><code>${rawToken}</code></p>` +
            `</div>`
        })
      });

      if (!response.ok) {
        this.logger.warn(
          `Password reset email provider returned HTTP ${response.status}; token remains safely queued in outbox.`
        );
      }
    } catch {
      this.logger.warn(
        "Password reset email delivery failed transiently; token remains queued in outbox."
      );
    }
  }

  async confirmPasswordReset(
    dto: PasswordResetConfirm,
    requestId: string
  ): Promise<{
    data: { reset: true };
    meta: { requestId: string };
  }> {
    const tokenHash = sha256Hex(dto.token);
    const tokenRecord = await this.prisma.authToken.findUnique({
      where: { tokenHash }
    });

    if (
      !tokenRecord ||
      tokenRecord.tokenType !== "PASSWORD_RESET" ||
      tokenRecord.usedAt !== null ||
      tokenRecord.expiresAt.getTime() <= Date.now()
    ) {
      throw new DomainException(
        "INVALID_OR_EXPIRED_TOKEN",
        HttpStatus.BAD_REQUEST,
        "The password reset token is invalid or has expired."
      );
    }

    const newPasswordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id
    });
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authToken.updateMany({
        where: { id: tokenRecord.id, usedAt: null },
        data: { usedAt: now }
      });
      if (consumed.count !== 1) {
        throw new DomainException(
          "INVALID_OR_EXPIRED_TOKEN",
          HttpStatus.BAD_REQUEST,
          "The password reset token is invalid or has expired."
        );
      }

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash: newPasswordHash }
      });

      await tx.userSession.updateMany({
        where: {
          userId: tokenRecord.userId,
          revokedAt: null
        },
        data: { revokedAt: now }
      });

      await this.outboxService.enqueue(
        {
          eventType: "AUTH_PASSWORD_RESET_COMPLETED",
          aggregateType: "User",
          aggregateId: tokenRecord.userId,
          payloadJson: { userId: tokenRecord.userId }
        },
        tx
      );
    });

    return {
      data: { reset: true },
      meta: { requestId }
    };
  }

  async enrollAdminMfa(
    auth: AuthContext,
    client: ClientMetadata,
    requestId: string
  ): Promise<AdminMfaEnrollResponse> {
    const user = await this.usersService.findByIdWithAuth(auth.userId);
    const staffRole = auth.roles.find((role) => STAFF_ROLE_SET.has(role));

    if (!user || !staffRole) {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Staff role is required for MFA enrollment."
      );
    }

    if (user.mfaEnabled) {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        "Staff MFA is already enabled. Contact SUPER_ADMIN for reset."
      );
    }

    const secretBase32 = this.totpService.generateBase32Secret();
    const accountLabel = user.email ?? user.phoneE164 ?? user.displayName;
    const otpauthUri =
      `otpauth://totp/Saudavo:${encodeURIComponent(accountLabel)}` +
      `?secret=${secretBase32}&issuer=Saudavo&algorithm=SHA1&digits=6&period=30`;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          mfaSecretEncrypted: encryptMfaSecret(secretBase32),
          mfaEnabled: false
        }
      });

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: staffRole,
          action: "STAFF_MFA_ENROLL_STARTED",
          targetType: "User",
          targetId: auth.userId,
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );
    });

    return AdminMfaEnrollResponseSchema.parse({
      data: {
        secretBase32,
        otpauthUri,
        issuer: "Saudavo",
        accountLabel
      },
      meta: { requestId }
    });
  }

  async verifyAdminMfa(
    auth: AuthContext,
    dto: AdminMfaVerify,
    client: ClientMetadata,
    requestId: string
  ): Promise<{
    data: { mfaVerified: true };
    meta: { requestId: string };
  }> {
    const user = await this.usersService.findByIdWithAuth(auth.userId);
    const staffRole = auth.roles.find((role) => STAFF_ROLE_SET.has(role));

    if (!user || !staffRole) {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Staff role is required for MFA verification."
      );
    }

    if (!user.mfaSecretEncrypted) {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Staff MFA must be enrolled before verification."
      );
    }

    const secretBase32 = decryptMfaSecret(user.mfaSecretEncrypted);
    const valid = this.totpService.verifyCode(secretBase32, dto.code);
    if (!valid) {
      throw new DomainException(
        "INVALID_CREDENTIALS",
        HttpStatus.UNAUTHORIZED,
        "Invalid MFA verification code."
      );
    }

    const activatingNow = !user.mfaEnabled;
    const verifiedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (activatingNow) {
        await tx.user.update({
          where: { id: user.id },
          data: { mfaEnabled: true }
        });
      }

      await tx.userSession.update({
        where: { id: auth.sessionId },
        data: { mfaVerifiedAt: verifiedAt }
      });

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: staffRole,
          action: activatingNow
            ? "STAFF_MFA_ENROLLED_AND_VERIFIED"
            : "STAFF_MFA_VERIFIED",
          targetType: "UserSession",
          targetId: auth.sessionId,
          ipAddress: client.ipAddress,
          userAgent: client.userAgent
        },
        tx
      );
    });

    return {
      data: { mfaVerified: true },
      meta: { requestId }
    };
  }

  async getMe(
    auth: AuthContext,
    requestId: string,
    syncCsrf = false
  ): Promise<AuthMeResponse> {
    let csrfToken: string | undefined;
    if (syncCsrf) {
      csrfToken = generateOpaqueToken(32);
      await this.prisma.userSession.update({
        where: { id: auth.sessionId },
        data: { csrfTokenHash: sha256Hex(csrfToken) }
      });
    }

    return AuthMeResponseSchema.parse({
      data: {
        user: {
          id: auth.userId,
          displayName: auth.displayName,
          preferredLocale: auth.preferredLocale,
          roles: auth.roles,
          emailVerified: auth.emailVerified,
          phoneVerified: auth.phoneVerified,
          mfaRequired: auth.roles.some((role) => STAFF_ROLE_SET.has(role)),
          mfaEnrolled: auth.mfaEnabled,
          mfaVerified: auth.mfaVerified
        },
        ...(csrfToken ? { csrfToken } : {})
      },
      meta: { requestId }
    });
  }

  private async issueSessionForUser(
    user: UserWithAuth,
    client: ClientMetadata,
    requestId: string
  ): Promise<{ response: AuthSessionResponse; rawSessionToken: string }> {
    const rawSessionToken = generateOpaqueToken(32);
    const rawCsrfToken = generateOpaqueToken(32);
    const tokenHash = sha256Hex(rawSessionToken);
    const csrfTokenHash = sha256Hex(rawCsrfToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash,
        csrfTokenHash,
        ipAddress: client.ipAddress,
        userAgent: client.userAgent,
        expiresAt
      }
    });

    const roles = user.userRoles
      .map((ur) => RoleCodeSchema.safeParse(ur.role.code))
      .filter((parsed): parsed is { success: true; data: RoleCode } => parsed.success)
      .map((parsed) => parsed.data);

    const parsedLocale = LocaleCodeSchema.safeParse(
      user.customerProfile?.preferredLocale ?? "en"
    );
    const preferredLocale: LocaleCode = parsedLocale.success ? parsedLocale.data : "en";

    const response = AuthSessionResponseSchema.parse({
      data: {
        user: {
          id: user.id,
          displayName: user.displayName,
          preferredLocale,
          roles,
          emailVerified: user.emailVerifiedAt !== null,
          phoneVerified: user.phoneVerifiedAt !== null,
          mfaRequired: roles.some((role) => STAFF_ROLE_SET.has(role)),
          mfaEnrolled: user.mfaEnabled,
          mfaVerified: false
        },
        csrfToken: rawCsrfToken
      },
      meta: { requestId }
    });

    return { response, rawSessionToken };
  }
}
