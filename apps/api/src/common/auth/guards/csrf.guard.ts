import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DomainException } from "../../errors/domain.exception";
import type { AppRequest } from "../../request-context";
import { CSRF_HEADER_NAME } from "../auth.types";
import { safeHexEqual, sha256Hex } from "../crypto.util";
import { SKIP_CSRF_KEY } from "../decorators";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AppRequest>();
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      return true;
    }

    const skipCsrf = this.reflector.getAllAndOverride<boolean | undefined>(
      SKIP_CSRF_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (skipCsrf || !req.auth) {
      return true;
    }

    const rawCsrf = req.header(CSRF_HEADER_NAME)?.trim();
    if (!rawCsrf) {
      throw new DomainException(
        "CSRF_INVALID",
        HttpStatus.FORBIDDEN,
        "Missing CSRF token."
      );
    }

    const providedHash = sha256Hex(rawCsrf);
    if (!safeHexEqual(providedHash, req.auth.csrfTokenHash)) {
      throw new DomainException(
        "CSRF_INVALID",
        HttpStatus.FORBIDDEN,
        "Invalid CSRF token."
      );
    }

    return true;
  }
}
