import { HttpStatus, Injectable } from "@nestjs/common";
import {
  AdminMfaVerify,
  AuthMeResponse,
  AuthMeResponseSchema,
  AuthSessionResponse,
  AuthSessionResponseSchema,
  LocaleCode,
  LocaleCodeSchema,
  LoginRequest,
  PasswordResetConfirm,
  PasswordResetRequest,
  RegisterRequest,
  RoleCode,
  RoleCodeSchema,
  STAFF_ROLES
} from "@saudavo/contracts";
import * as argon2 from "argon2";
import type { AuthContext } from "../../common/auth/auth.types";
import {
  decryptMfaSecret,
  encryptSensitiveToken,
  generateOpaqueToken,
  sha256Hex
} from "../../common/auth/crypto.util";
import { DomainException } from "../../common/errors/domain.exception";
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

    return {
      data: {
        accepted: true,
        message:
          "If a matching active account exists, recovery steps have been queued."
      },
      meta: { requestId }
    };
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

    if (!user.mfaEnabled || !user.mfaSecretEncrypted) {
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

    const verifiedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.userSession.update({
        where: { id: auth.sessionId },
        data: { mfaVerifiedAt: verifiedAt }
      });

      await this.auditService.record(
        {
          actorId: auth.userId,
          actorRole: staffRole,
          action: "STAFF_MFA_VERIFIED",
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
          mfaVerified: false
        },
        csrfToken: rawCsrfToken
      },
      meta: { requestId }
    });

    return { response, rawSessionToken };
  }
}
