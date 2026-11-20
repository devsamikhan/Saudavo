import { HttpException, HttpStatus } from "@nestjs/common";
import type { ApiErrorCode, ApiErrorDetail } from "@saudavo/contracts";

/**
 * Typed domain/application exception mapped directly into ApiErrorEnvelope.
 */
export class DomainException extends HttpException {
  readonly code: ApiErrorCode;
  readonly details?: ApiErrorDetail[];

  constructor(
    code: ApiErrorCode,
    status: HttpStatus,
    message: string,
    details?: ApiErrorDetail[]
  ) {
    super({ code, message, details }, status);
    this.code = code;
    this.details = details;
  }
}
