import { describe, expect, it } from "vitest";
import { DICTIONARIES, getLocaleDirection } from "../src/i18n/dictionaries";
import { ApiClientError, parseApiResponse } from "../src/lib/api-client";
import { formatPkrFromPaisa } from "../src/lib/money";

describe("@saudavo/web i18n, integer PKR formatting, and API client", () => {
  it("formats integer paisa values cleanly in English and Urdu without float precision loss", () => {
    expect(formatPkrFromPaisa(0, "en")).toBe("Rs. 0");
    expect(formatPkrFromPaisa(350_000, "en")).toBe("Rs. 3,500");
    expect(formatPkrFromPaisa(350_050, "en")).toBe("Rs. 3,500.50");
    expect(formatPkrFromPaisa(350_000, "ur")).toBe("3,500 روپے");
    expect(formatPkrFromPaisa(-10_000, "en")).toBe("-Rs. 100");
  });

  it("maintains full EN/UR dictionary parity and RTL/LTR direction mapping", () => {
    const enKeys = Object.keys(DICTIONARIES.en).sort();
    const urKeys = Object.keys(DICTIONARIES.ur).sort();
    expect(urKeys).toEqual(enKeys);

    expect(getLocaleDirection("en")).toBe("ltr");
    expect(getLocaleDirection("ur")).toBe("rtl");
    expect(DICTIONARIES.ur.brandName).toBe("سوداو");
  });

  it("parses ApiErrorEnvelope failures into typed ApiClientError instances", async () => {
    const errorPayload = {
      error: {
        code: "INVALID_STATE_TRANSITION",
        message: "Self-cancellation blocked after confirmation.",
        requestId: "req_test_web_01"
      }
    };
    const fakeResponse = new Response(JSON.stringify(errorPayload), {
      status: 409,
      headers: { "Content-Type": "application/json" }
    });

    await expect(parseApiResponse(fakeResponse)).rejects.toMatchObject({
      name: "ApiClientError",
      status: 409,
      code: "INVALID_STATE_TRANSITION",
      requestId: "req_test_web_01"
    });

    const okResponse = new Response(JSON.stringify({ data: { ok: true } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    const parsed = await parseApiResponse<{ data: { ok: boolean } }>(okResponse);
    expect(parsed.data.ok).toBe(true);
    expect(new ApiClientError(400, "VALIDATION_ERROR", "Bad input").code).toBe(
      "VALIDATION_ERROR"
    );
  });
});
