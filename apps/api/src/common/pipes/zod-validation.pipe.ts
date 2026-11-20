import { HttpStatus, PipeTransform } from "@nestjs/common";
import type { ApiErrorDetail } from "@saudavo/contracts";
import type { ZodType } from "zod";
import { DomainException } from "../errors/domain.exception";

/**
 * Validates incoming request payloads against a shared @saudavo/contracts Zod schema.
 */
export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join(".") : "body",
        issue: issue.message
      }));

      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Request validation failed.",
        details
      );
    }

    return result.data;
  }
}
