import { describe, expect, it } from "vitest";
import { CurrencyCodeSchema, LocaleCodeSchema } from "@saudavo/contracts";

describe("@saudavo/web scaffold", () => {
  it("resolves shared contracts for currency and locales", () => {
    expect(CurrencyCodeSchema.parse("PKR")).toBe("PKR");
    expect(LocaleCodeSchema.options).toEqual(["en", "ur"]);
  });
});
