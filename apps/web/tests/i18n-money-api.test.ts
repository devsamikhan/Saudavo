import { afterEach, describe, expect, it, vi } from "vitest";
import { DICTIONARIES, getLocaleDirection } from "../src/i18n/dictionaries";
import {
  ApiClientError,
  archiveSellerProduct,
  createOrderDispute,
  createOrderReview,
  fetchAdminDisputes,
  fetchAdminReports,
  fetchNotifications,
  fetchPublicStoreCatalog,
  logoutAccount,
  markAllNotificationsRead,
  markNotificationRead,
  parseApiResponse,
  requestServiceRevision,
  resolveAdminDispute,
  resolveAdminReport,
  searchListings,
  setStoredCsrfToken,
  triggerServiceAutoCompleteSweep,
  updateSellerProduct,
  updateSellerService
} from "../src/lib/api-client";
import { bytesToMagicHex, uploadImageAssetToS3 } from "../src/lib/media-upload";
import {
  formatPkrFromPaisa,
  paisaToWholeRupees,
  parseWholeRupeesToPaisa
} from "../src/lib/money";

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
    expect(parseWholeRupeesToPaisa("1500")).toBe(150_000);
    expect(parseWholeRupeesToPaisa("Rs. 2,450")).toBe(245_000);
    expect(parseWholeRupeesToPaisa(-5)).toBe(0);
    expect(paisaToWholeRupees(150_000)).toBe(1500);
    expect(paisaToWholeRupees(-100)).toBe(0);
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

  it("wires service revision, review, dispute, report, and admin auto-complete endpoints cleanly", async () => {
    setStoredCsrfToken("csrf_test_trust");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );

    const orderId = "0193a8b2-1000-7000-8000-000000000010";
    const reportId = "0193a8b2-1000-7000-8000-000000000020";
    const disputeId = "0193a8b2-1000-7000-8000-000000000030";

    await requestServiceRevision(orderId, { reason: "Adjust border spacing." });
    await createOrderReview(orderId, { rating: 5, comment: "Prompt work." });
    await createOrderDispute(orderId, {
      disputeType: "QUALITY_MISMATCH",
      description: "Work did not match agreed package."
    });
    await fetchAdminReports();
    await resolveAdminReport(reportId, {
      action: "DISMISSED",
      resolutionNote: "Reviewed content."
    });
    await fetchAdminDisputes();
    await resolveAdminDispute(disputeId, {
      resolutionOutcome: "COMPLETE_ORDER",
      resolutionNote: "Confirmed completed delivery."
    });
    await triggerServiceAutoCompleteSweep();

    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      `/orders/${orderId}/service/request-revision`
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      `/orders/${orderId}/reviews`
    );
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      `/orders/${orderId}/disputes`
    );
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("/admin/reports");
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain(
      `/admin/reports/${reportId}/resolve`
    );
    expect(String(fetchMock.mock.calls[5]?.[0])).toContain("/admin/disputes");
    expect(String(fetchMock.mock.calls[6]?.[0])).toContain(
      `/admin/disputes/${disputeId}/resolve`
    );
    expect(String(fetchMock.mock.calls[7]?.[0])).toContain(
      "/admin/orders/auto-complete-services"
    );
  });

  it("wires v2 store catalog, search sorting/price filters, seller catalog edits, and notifications", async () => {
    setStoredCsrfToken("csrf_test_v2");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        new Response(
          JSON.stringify({ data: {}, meta: { requestId: "req_v2", unreadCount: 0 } }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      );

    const listingId = "0193a8b2-1000-7000-8000-000000000040";
    const notifId = "0193a8b2-1000-7000-8000-000000000050";

    await searchListings({
      q: "shawl",
      minPrice: 10000,
      maxPrice: 500000,
      sort: "PRICE_ASC"
    });
    await fetchPublicStoreCatalog("mianwali-handloom");
    await updateSellerProduct(listingId, { stockQuantity: 10 });
    await archiveSellerProduct(listingId);
    await updateSellerService(listingId, { status: "PENDING_REVIEW" });
    await fetchNotifications();
    await markNotificationRead(notifId);
    await markAllNotificationsRead();

    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("sort=PRICE_ASC");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("minPrice=10000");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "/stores/mianwali-handloom/listings"
    );
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      `/seller/products/${listingId}`
    );
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain(
      `/seller/services/${listingId}`
    );
    expect(String(fetchMock.mock.calls[5]?.[0])).toContain("/notifications");
    expect(String(fetchMock.mock.calls[6]?.[0])).toContain(
      `/notifications/${notifId}/read`
    );
    expect(String(fetchMock.mock.calls[7]?.[0])).toContain(
      "/notifications/read-all"
    );
  });
});
