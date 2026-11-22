import { afterEach, describe, expect, it, vi } from "vitest";
import { DICTIONARIES, getLocaleDirection } from "../src/i18n/dictionaries";
import {
  ApiClientError,
  logoutAccount,
  parseApiResponse,
  setStoredCsrfToken
} from "../src/lib/api-client";
import { bytesToMagicHex, uploadImageAssetToS3 } from "../src/lib/media-upload";
import { formatPkrFromPaisa } from "../src/lib/money";

afterEach(() => {
  vi.restoreAllMocks();
  setStoredCsrfToken(null);
});

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

  it("auto-resyncs CSRF token via GET /auth/me (X-CSRF-Sync: 1) and retries once on 403 CSRF_INVALID", async () => {
    setStoredCsrfToken("stale_tab_csrf");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: "CSRF_INVALID",
              message: "Invalid CSRF token.",
              requestId: "req_csrf_1"
            }
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              user: {
                id: "0193a8b2-1000-7000-8000-000000000001",
                displayName: "Ali Khan",
                preferredLocale: "en",
                roles: ["CUSTOMER"],
                emailVerified: true,
                phoneVerified: false,
                mfaRequired: false,
                mfaVerified: false
              },
              csrfToken: "fresh_synced_csrf"
            },
            meta: { requestId: "req_csrf_2" }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { loggedOut: true },
            meta: { requestId: "req_csrf_3" }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    await logoutAccount();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const secondCallInit = fetchMock.mock.calls[1]?.[1];
    expect((secondCallInit?.headers as Record<string, string>)["X-CSRF-Sync"]).toBe(
      "1"
    );
    const thirdCallInit = fetchMock.mock.calls[2]?.[1];
    expect((thirdCallInit?.headers as Record<string, string>)["X-CSRF-Token"]).toBe(
      "fresh_synced_csrf"
    );
  });

  it("extracts image magic bytes hex cleanly and rejects unsupported upload MIME types", async () => {
    expect(
      bytesToMagicHex(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]))
    ).toBe("ffd8ffe00010");

    const svgFile = new File(["<svg/>"], "bad.svg", { type: "image/svg+xml" });
    await expect(
      uploadImageAssetToS3(svgFile, "PRODUCT_IMAGE")
    ).rejects.toThrow("Only JPEG, PNG, or WebP images are supported.");
  });
});
