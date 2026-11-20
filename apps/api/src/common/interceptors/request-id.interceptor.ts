import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor
} from "@nestjs/common";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { AppRequest } from "../request-context";

/**
 * Assigns a correlation requestId and emits structured non-PII HTTP logs.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<AppRequest>();
    const res = http.getResponse<Response>();

    const incoming = req.header("x-request-id")?.trim();
    const requestId =
      incoming && /^[A-Za-z0-9_-]{8,64}$/.test(incoming)
        ? incoming
        : `req_${randomUUID()}`;

    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);

    const startedAt = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          if (process.env.NODE_ENV !== "test") {
            const pathOnly = req.url.split("?")[0] ?? req.url;
            this.logger.log(
              JSON.stringify({
                requestId,
                method: req.method,
                path: pathOnly,
                statusCode: res.statusCode,
                durationMs: Date.now() - startedAt,
                userId: req.auth?.userId ?? null
              })
            );
          }
        }
      })
    );
  }
}
