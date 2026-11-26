import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAdminCommissionRule,
  createAdminSettlement,
  deleteAddress,
  fetchAdminCommissionRules,
  fetchAdminSettlements,
  fetchAdminStores,
  fetchCustomerProfile,
  setStoredCsrfToken,
  updateAddress,
  updateCustomerProfile
} from "../src/lib/api-client";

describe("Customer Account and Admin Finance API client wrappers", () => {
  afterEach(() => {
    setStoredCsrfToken(null);
    vi.restoreAllMocks();
  });

  it("sends customer profile/address mutations and admin finance requests cleanly", async () => {
    setStoredCsrfToken("test_csrf_token");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.endsWith("/customer/profile")) {
          return new Response(
            JSON.stringify({
              data: {
                id: "11111111-1111-4111-8111-111111111111",
                userId: "22222222-2222-4222-8222-222222222222",
                preferredLocale: "ur",
                defaultDistrictId: null,
                defaultAreaZoneId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        if (url.includes("/customer/addresses/")) {
          return new Response(
            JSON.stringify({
              data: { deleted: true, id: "addr-1" }
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ data: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

    await fetchCustomerProfile();
    await updateCustomerProfile({ preferredLocale: "ur" });
    await updateAddress("addr-1", { isDefault: true });
    await deleteAddress("addr-1");
    await fetchAdminCommissionRules();
    await fetchAdminSettlements();
    await fetchAdminStores();
    await createAdminCommissionRule({
      name: "Standard Pilot",
      scopeType: "GLOBAL",
      rateBps: 0,
      includeDeliveryFee: false
    });
    await createAdminSettlement({
      storeId: "33333333-3333-4333-8333-333333333333",
      direction: "SELLER_TO_PLATFORM",
      settlementMethod: "BANK_TRANSFER",
      amountPaisa: 100000,
      periodStart: "2026-11-01T00:00:00.000Z",
      periodEnd: "2026-11-30T23:59:59.999Z"
    });

    expect(fetchMock).toHaveBeenCalledTimes(9);
    expect(String(fetchMock.mock.calls[5]?.[0])).toContain("/admin/settlements");
    expect(String(fetchMock.mock.calls[6]?.[0])).toContain("/admin/stores");
  });
});
