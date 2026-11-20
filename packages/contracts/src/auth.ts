import { z } from "zod";
import { LocaleCodeSchema, RoleCodeSchema } from "./enums";

/**
 * Normalizes an email address to trimmed lowercase.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Normalizes Pakistani mobile numbers into canonical E.164 (+923XXXXXXXXX).
 * Accepts "+923001234567", "00923001234567", "923001234567", or "03001234567".
 * Returns null if the input is not a valid Pakistani mobile/phone E.164 format.
 */
export function normalizePakistanPhoneE164(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");

  let candidate: string;
  if (cleaned.startsWith("+")) {
    candidate = cleaned;
  } else if (cleaned.startsWith("0092")) {
    candidate = `+${cleaned.slice(2)}`;
  } else if (cleaned.startsWith("92")) {
    candidate = `+${cleaned}`;
  } else if (cleaned.startsWith("03") && cleaned.length === 11) {
    candidate = `+92${cleaned.slice(1)}`;
  } else {
    return null;
  }

  return /^\+923\d{9}$/.test(candidate) ? candidate : null;
}

export const EmailInputSchema = z
  .string()
  .trim()
  .email("Invalid email format")
  .max(255)
  .transform(normalizeEmail);

export const PhoneInputSchema = z
  .string()
  .trim()
  .min(10)
  .max(20)
  .transform((val, ctx) => {
    const normalized = normalizePakistanPhoneE164(val);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number must be a valid Pakistani mobile number (+923XXXXXXXXX or 03XXXXXXXXX)"
      });
      return z.NEVER;
    }
    return normalized;
  });

export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters");

export const RegisterRequestSchema = z
  .object({
    email: EmailInputSchema.optional(),
    phone: PhoneInputSchema.optional(),
    password: PasswordSchema,
    displayName: z.string().trim().min(2).max(120),
    preferredLocale: LocaleCodeSchema.default("en")
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "Either email or phone number is required",
    path: ["email"]
  });
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  identifier: z.string().trim().min(3).max(255),
  password: z.string().min(1).max(128)
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const PasswordResetRequestSchema = z.object({
  identifier: z.string().trim().min(3).max(255)
});
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = z.object({
  token: z.string().trim().min(16).max(256),
  newPassword: PasswordSchema
});
export type PasswordResetConfirm = z.infer<typeof PasswordResetConfirmSchema>;

export const AdminMfaVerifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "MFA code must be 6 digits")
});
export type AdminMfaVerify = z.infer<typeof AdminMfaVerifySchema>;

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  preferredLocale: LocaleCodeSchema,
  roles: z.array(RoleCodeSchema),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  mfaRequired: z.boolean(),
  mfaVerified: z.boolean()
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthSessionResponseSchema = z.object({
  data: z.object({
    user: AuthUserSchema,
    csrfToken: z.string().min(1)
  }),
  meta: z.object({
    requestId: z.string().min(1)
  })
});
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;
