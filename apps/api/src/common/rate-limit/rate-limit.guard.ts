import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  SetMetadata
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DomainException } from "../errors/domain.exception";
import type { AppRequest } from "../request-context";

export const RATE_LIMIT_KEY = "saudavo:rate_limit";

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * In-memory fixed/sliding timestamp rate limiter for single-instance MVP
 * auth and sensitive mutation endpoints (no Redis required).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!options) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AppRequest>();
    const prefix = options.keyPrefix ?? `${context.getClass().name}:${context.getHandler().name}`;
    const clientIp = req.ip ?? req.socket?.remoteAddress ?? "unknown";
    const key = `${prefix}:${clientIp}`;

    const now = Date.now();
    const cutoff = now - options.windowMs;
    const recent = (this.buckets.get(key) ?? []).filter((ts) => ts > cutoff);

    if (recent.length >= options.limit) {
      this.buckets.set(key, recent);
      throw new DomainException(
        "RATE_LIMIT_EXCEEDED",
        HttpStatus.TOO_MANY_REQUESTS,
        "Too many requests. Please wait before retrying."
      );
    }

    recent.push(now);
    this.buckets.set(key, recent);

    if (this.buckets.size > 10_000) {
      this.pruneExpired(now);
    }

    return true;
  }

  clearAll(): void {
    this.buckets.clear();
  }

  private pruneExpired(now: number): void {
    for (const [key, timestamps] of this.buckets.entries()) {
      const latest = timestamps[timestamps.length - 1];
      if (latest === undefined || now - latest > 3_600_000) {
        this.buckets.delete(key);
      }
    }
  }
}
