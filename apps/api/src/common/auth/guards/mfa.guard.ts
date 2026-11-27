import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { type RoleCode, STAFF_ROLES } from "@saudavo/contracts";
import { DomainException } from "../../errors/domain.exception";
import type { AppRequest } from "../../request-context";
import {
  ALLOW_UNVERIFIED_MFA_KEY,
  REQUIRE_MFA_KEY,
  ROLES_KEY
} from "../decorators";

const STAFF_ROLE_SET = new Set<RoleCode>(STAFF_ROLES);

@Injectable()
export class MfaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowUnverifiedMfa = this.reflector.getAllAndOverride<
      boolean | undefined
    >(ALLOW_UNVERIFIED_MFA_KEY, [context.getHandler(), context.getClass()]);
    if (allowUnverifiedMfa) {
      return true;
    }

    const requireMfa = this.reflector.getAllAndOverride<boolean | undefined>(
      REQUIRE_MFA_KEY,
      [context.getHandler(), context.getClass()]
    );
    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    const req = context.switchToHttp().getRequest<AppRequest>();
    if (!req.auth) {
      return true;
    }

    // Determine whether this route grants access only via a staff role
    const matchedNonStaff =
      requiredRoles?.some(
        (role) => !STAFF_ROLE_SET.has(role) && req.auth?.roles.includes(role)
      ) ?? false;
    const matchedStaff =
      requiredRoles?.some(
        (role) => STAFF_ROLE_SET.has(role) && req.auth?.roles.includes(role)
      ) ?? false;

    const needsMfa = Boolean(requireMfa) || (matchedStaff && !matchedNonStaff);
    if (needsMfa && !req.auth.mfaVerified) {
      throw new DomainException(
        "MFA_REQUIRED",
        HttpStatus.FORBIDDEN,
        "Staff MFA verification is required before performing this operation."
      );
    }

    return true;
  }
}
