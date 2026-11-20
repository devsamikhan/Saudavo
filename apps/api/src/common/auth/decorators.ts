import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata
} from "@nestjs/common";
import type { RoleCode } from "@saudavo/contracts";
import type { AppRequest } from "../request-context";
import type { AuthContext } from "./auth.types";

export const IS_PUBLIC_KEY = "saudavo:is_public";
export const ROLES_KEY = "saudavo:roles";
export const REQUIRE_MFA_KEY = "saudavo:require_mfa";
export const ALLOW_UNVERIFIED_MFA_KEY = "saudavo:allow_unverified_mfa";
export const SKIP_CSRF_KEY = "saudavo:skip_csrf";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);
export const RequireMfa = () => SetMetadata(REQUIRE_MFA_KEY, true);
export const AllowUnverifiedMfa = () => SetMetadata(ALLOW_UNVERIFIED_MFA_KEY, true);
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext | undefined => {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    return req.auth;
  }
);
