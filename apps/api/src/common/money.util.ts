import { HttpStatus } from "@nestjs/common";
import { DomainException } from "./errors/domain.exception";

/**
 * Safely converts Prisma BIGINT integer paisa columns to JS safe integer numbers for JSON DTOs.
 */
export function bigIntToSafeNumber(value: bigint, fieldName = "amountPaisa"): number {
  const num = Number(value);
  if (!Number.isSafeInteger(num)) {
    throw new DomainException(
      "INTERNAL_SERVER_ERROR",
      HttpStatus.INTERNAL_SERVER_ERROR,
      `Monetary field ${fieldName} exceeds safe integer bounds.`
    );
  }
  return num;
}
