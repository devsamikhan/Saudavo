import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ApiErrorCode, ApiErrorDetail, ApiErrorEnvelope } from "@saudavo/contracts";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { DomainException } from "../errors/domain.exception";
import type { AppRequest } from "../request-context";

function mapStatusToErrorCode(status: HttpStatus): ApiErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "VALIDATION_ERROR";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    case HttpStatus.TOO_MANY_REQUESTS:
      return "RATE_LIMIT_EXCEEDED";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

/**
 * Global exception filter returning canonical ApiErrorEnvelope payloads
 * while preventing leakage of secrets, credentials, or stack traces.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<AppRequest>();
    const res = ctx.getResponse<Response>();

    const requestId = req.requestId ?? `req_${randomUUID()}`;
    res.setHeader("X-Request-Id", requestId);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ApiErrorCode = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected internal error occurred.";
    let details: ApiErrorDetail[] | undefined;

    if (exception instanceof DomainException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = mapStatusToErrorCode(status);
      const responseBody = exception.getResponse();
      if (typeof responseBody === "string") {
        message = responseBody;
      } else if (
        typeof responseBody === "object" &&
        responseBody !== null &&
        "message" in responseBody
      ) {
        const msg = (responseBody as { message?: unknown }).message;
        if (Array.isArray(msg)) {
          message = msg.map((item) => String(item)).join("; ");
        } else if (typeof msg === "string") {
          message = msg;
        }
      }
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === "P2002"
    ) {
      status = HttpStatus.CONFLICT;
      code = "CONFLICT";
      message = "A record with this unique identifier already exists.";
    } else {
      const safeErrorMsg =
        exception instanceof Error ? exception.message : "Unknown non-Error exception";
      this.logger.error(
        `[${requestId}] Unhandled error on ${req.method} ${req.url}: ${safeErrorMsg}`
      );
    }

    const payload: ApiErrorEnvelope = {
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
        requestId
      }
    };

    res.status(status).json(payload);
  }
}
