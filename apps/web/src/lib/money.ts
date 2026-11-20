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
