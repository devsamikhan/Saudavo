import type { LocaleCode } from "@saudavo/contracts";

/**
 * Formats integer paisa amounts into display PKR without using floating-point math.
 */
export function formatPkrFromPaisa(
  amountPaisa: number,
  locale: LocaleCode = "en"
): string {
  const safeInt = Math.trunc(amountPaisa);
  const negative = safeInt < 0;
  const absPaisa = Math.abs(safeInt);
  const wholeRupees = Math.trunc(absPaisa / 100);
  const remainingPaisa = absPaisa % 100;

  const formattedWhole = wholeRupees.toLocaleString("en-US");
  const formatted =
    remainingPaisa === 0
      ? formattedWhole
      : `${formattedWhole}.${String(remainingPaisa).padStart(2, "0")}`;

  const prefix = negative ? "-" : "";
  return locale === "ur" ? `${prefix}${formatted} روپے` : `${prefix}Rs. ${formatted}`;
}

/**
 * Converts a whole-rupee user input string or integer to integer paisa without float drift.
 */
export function parseWholeRupeesToPaisa(rupeesInput: string | number): number {
  if (typeof rupeesInput === "number") {
    if (!Number.isFinite(rupeesInput) || rupeesInput < 0) return 0;
    return Math.trunc(rupeesInput) * 100;
  }
  const digits = rupeesInput.replace(/[^0-9]/g, "");
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return 0;
  return parsed * 100;
}

/**
 * Returns whole rupees truncated cleanly from integer paisa for rupee-denominated form inputs.
 */
export function paisaToWholeRupees(amountPaisa: number): number {
  const safeInt = Math.trunc(amountPaisa);
  return Math.max(0, Math.trunc(safeInt / 100));
}
