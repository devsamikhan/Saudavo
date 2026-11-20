/**
 * Integer-only monetary helpers in paisa (1 PKR = 100 paisa) and basis points (100 bps = 1.00%).
 * Floating-point arithmetic is strictly forbidden for monetary calculations.
 */

export function calculateCommissionPaisa(
  commissionableBasePaisa: bigint,
  rateBps: number
): bigint {
  if (commissionableBasePaisa < 0n) {
    throw new RangeError("commissionableBasePaisa must be non-negative");
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000) {
    throw new RangeError("rateBps must be an integer between 0 and 10000");
  }
  return (commissionableBasePaisa * BigInt(rateBps) + 5_000n) / 10_000n;
}

export function calculateSellerNetEntitlementPaisa(
  totalPaisa: bigint,
  commissionAmountPaisa: bigint
): bigint {
  return totalPaisa - commissionAmountPaisa;
}
