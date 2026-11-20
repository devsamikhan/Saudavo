import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  LocaleCode,
  LocaleCodeSchema,
  RoleCode,
  RoleCodeSchema
} from "@saudavo/contracts";
import { DomainException } from "../../errors/domain.exception";
import { PrismaService } from "../../prisma/prisma.service";
import type { AppRequest } from "../../request-context";
import { SESSION_COOKIE_NAME } from "../auth.types";
import { sha256Hex } from "../crypto.util";
import { IS_PUBLIC_KEY } from "../decorators";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AppRequest>();
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const rawSid = cookies?.[SESSION_COOKIE_NAME];

    if (typeof rawSid !== "string" || rawSid.trim().length === 0) {
      throw new DomainException(
        "UNAUTHORIZED",
        HttpStatus.UNAUTHORIZED,
        "Authentication session is required."
      );
    }

    const tokenHash = sha256Hex(rawSid);
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            customerProfile: true,
            userRoles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.deletedAt !== null
    ) {
      throw new DomainException(
        "UNAUTHORIZED",
        HttpStatus.UNAUTHORIZED,
        "Invalid or expired authentication session."
      );
    }

    if (session.user.status !== "ACTIVE") {
      throw new DomainException(
        "ACCOUNT_SUSPENDED",
        HttpStatus.FORBIDDEN,
        "This account is suspended or inactive."
      );
    }

    const roles: RoleCode[] = session.user.userRoles
      .map((ur) => RoleCodeSchema.safeParse(ur.role.code))
      .filter((parsed): parsed is { success: true; data: RoleCode } => parsed.success)
      .map((parsed) => parsed.data);

    const parsedLocale = LocaleCodeSchema.safeParse(
      session.user.customerProfile?.preferredLocale ?? "en"
    );
    const preferredLocale: LocaleCode = parsedLocale.success ? parsedLocale.data : "en";

    req.auth = {
      userId: session.user.id,
      sessionId: session.id,
      csrfTokenHash: session.csrfTokenHash,
      displayName: session.user.displayName,
      preferredLocale,
      roles,
      emailVerified: session.user.emailVerifiedAt !== null,
      phoneVerified: session.user.phoneVerifiedAt !== null,
      mfaEnabled: session.user.mfaEnabled,
      mfaVerified: session.mfaVerifiedAt !== null
    };

    return true;
  }
}
