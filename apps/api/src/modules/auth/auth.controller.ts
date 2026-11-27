import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res
} from "@nestjs/common";
import {
  type AdminMfaEnrollResponse,
  type AdminMfaVerify,
  AdminMfaVerifySchema,
  type AuthMeResponse,
  type AuthSessionResponse,
  type LoginRequest,
  LoginRequestSchema,
  type PasswordResetConfirm,
  PasswordResetConfirmSchema,
  type PasswordResetRequest,
  PasswordResetRequestSchema,
  type RegisterRequest,
  RegisterRequestSchema
} from "@saudavo/contracts";
import type { Response } from "express";
import { SESSION_COOKIE_NAME, type AuthContext } from "../../common/auth/auth.types";
import {
  AllowUnverifiedMfa,
  CurrentUser,
  Public,
  Roles,
  SkipCsrf
} from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { resolveCookieSameSite } from "../../common/http/security.config";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { RateLimit } from "../../common/rate-limit/rate-limit.guard";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { AuthService, type ClientMetadata } from "./auth.service";

const SESSION_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipCsrf()
  @RateLimit({ limit: 10, windowMs: 60_000, keyPrefix: "auth_register" })
  @Post("register")
  async register(
    @Body(new ZodValidationPipe(RegisterRequestSchema)) body: RegisterRequest,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthSessionResponse> {
    const { response, rawSessionToken } = await this.authService.register(
      body,
      this.extractClientMetadata(req),
      getRequestId(req)
    );
    this.setSessionCookie(res, rawSessionToken);
    return response;
  }

  @Public()
  @SkipCsrf()
  @RateLimit({ limit: 10, windowMs: 60_000, keyPrefix: "auth_login" })
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) body: LoginRequest,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthSessionResponse> {
    const { response, rawSessionToken } = await this.authService.login(
      body,
      this.extractClientMetadata(req),
      getRequestId(req)
    );
    this.setSessionCookie(res, rawSessionToken);
    return response;
  }

  @HttpCode(HttpStatus.OK)
  @Post("logout")
  async logout(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ data: { loggedOut: true }; meta: { requestId: string } }> {
    const authenticated = this.requireAuthContext(auth);
    const result = await this.authService.logout(authenticated, getRequestId(req));
    const sameSite = resolveCookieSameSite();
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite,
      secure: process.env.NODE_ENV === "production" || sameSite === "none",
      path: "/"
    });
    return result;
  }

  @Public()
  @SkipCsrf()
  @RateLimit({ limit: 5, windowMs: 60_000, keyPrefix: "auth_pw_reset_req" })
  @HttpCode(HttpStatus.OK)
  @Post("password-reset/request")
  async requestPasswordReset(
    @Body(new ZodValidationPipe(PasswordResetRequestSchema))
    body: PasswordResetRequest,
    @Req() req: AppRequest
  ): Promise<{
    data: { accepted: true; message: string };
    meta: { requestId: string };
  }> {
    return this.authService.requestPasswordReset(body, getRequestId(req));
  }

  @Public()
  @SkipCsrf()
  @RateLimit({ limit: 10, windowMs: 60_000, keyPrefix: "auth_pw_reset_confirm" })
  @HttpCode(HttpStatus.OK)
  @Post("password-reset/confirm")
  async confirmPasswordReset(
    @Body(new ZodValidationPipe(PasswordResetConfirmSchema))
    body: PasswordResetConfirm,
    @Req() req: AppRequest
  ): Promise<{ data: { reset: true }; meta: { requestId: string } }> {
    return this.authService.confirmPasswordReset(body, getRequestId(req));
  }

  @Roles("MODERATOR", "SUPPORT", "ADMIN", "SUPER_ADMIN")
  @AllowUnverifiedMfa()
  @RateLimit({ limit: 5, windowMs: 60_000, keyPrefix: "auth_mfa_enroll" })
  @HttpCode(HttpStatus.OK)
  @Post("admin/mfa/enroll")
  async enrollAdminMfa(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<AdminMfaEnrollResponse> {
    const authenticated = this.requireAuthContext(auth);
    return this.authService.enrollAdminMfa(
      authenticated,
      this.extractClientMetadata(req),
      getRequestId(req)
    );
  }

  @Roles("MODERATOR", "SUPPORT", "ADMIN", "SUPER_ADMIN")
  @AllowUnverifiedMfa()
  @RateLimit({ limit: 10, windowMs: 60_000, keyPrefix: "auth_mfa_verify" })
  @HttpCode(HttpStatus.OK)
  @Post("admin/mfa/verify")
  async verifyAdminMfa(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(AdminMfaVerifySchema)) body: AdminMfaVerify,
    @Req() req: AppRequest
  ): Promise<{ data: { mfaVerified: true }; meta: { requestId: string } }> {
    const authenticated = this.requireAuthContext(auth);
    return this.authService.verifyAdminMfa(
      authenticated,
      body,
      this.extractClientMetadata(req),
      getRequestId(req)
    );
  }

  @Get("me")
  getMe(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<AuthMeResponse> {
    const authenticated = this.requireAuthContext(auth);
    const syncCsrf = req.header("x-csrf-sync") === "1";
    return this.authService.getMe(authenticated, getRequestId(req), syncCsrf);
  }

  private requireAuthContext(auth: AuthContext | undefined): AuthContext {
    if (!auth) {
      throw new DomainException(
        "UNAUTHORIZED",
        HttpStatus.UNAUTHORIZED,
        "Authentication session is required."
      );
    }
    return auth;
  }

  private setSessionCookie(res: Response, rawSessionToken: string): void {
    const sameSite = resolveCookieSameSite();
    res.cookie(SESSION_COOKIE_NAME, rawSessionToken, {
      httpOnly: true,
      sameSite,
      secure: process.env.NODE_ENV === "production" || sameSite === "none",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_MS
    });
  }

  private extractClientMetadata(req: AppRequest): ClientMetadata {
    return {
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
      userAgent: req.header("user-agent") ?? null
    };
  }
}
