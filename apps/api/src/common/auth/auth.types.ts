import type { LocaleCode, RoleCode } from "@saudavo/contracts";

export const SESSION_COOKIE_NAME = "saudavo_sid";
export const CSRF_HEADER_NAME = "x-csrf-token";

export interface AuthContext {
  userId: string;
  sessionId: string;
  csrfTokenHash: string;
  displayName: string;
  preferredLocale: LocaleCode;
  roles: RoleCode[];
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  mfaVerified: boolean;
}
