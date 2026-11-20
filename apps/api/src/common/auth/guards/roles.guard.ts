import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RoleCode } from "@saudavo/contracts";
import { DomainException } from "../../errors/domain.exception";
import type { AppRequest } from "../../request-context";
import { ROLES_KEY } from "../decorators";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AppRequest>();
    if (!req.auth) {
      throw new DomainException(
        "UNAUTHORIZED",
        HttpStatus.UNAUTHORIZED,
        "Authentication session is required."
      );
    }

    const hasRole = requiredRoles.some((role) => req.auth?.roles.includes(role));
    if (!hasRole) {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "You do not have permission to perform this action."
      );
    }

    return true;
  }
}
