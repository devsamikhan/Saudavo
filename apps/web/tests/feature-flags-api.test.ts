import { DEFAULT_FEATURE_FLAGS_MAP } from "@saudavo/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBuyerDemand,
  createSellerDeal,
  fetchPublicFeatureFlags,
  updateAdminFeatureFlag
} from "../src/lib/api-client";
import { uploadVoiceNoteToS3 } from "../src/lib/media-upload";

describe("feature flags & differentiators api helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps Monthly Subscriptions and 5 new differentiators OFF in defaults", () => {
    expect(DEFAULT_FEATURE_FLAGS_MAP.shopping_messenger_enabled).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS_MAP.seller_subscriptions_enabled).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS_MAP.buyer_requests_board_enabled).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS_MAP.messenger_voice_notes_enabled).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS_MAP.handover_pin_enabled).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS_MAP.flash_deals_coupons_enabled).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS_MAP.cod_refusal_shield_enabled).toBe(false);
  });

  it("fetches public feature flags and updates Admin flags via PATCH", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: DEFAULT_FEATURE_FLAGS_MAP,
            meta: { requestId: "req_1" }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              key: "seller_subscriptions_enabled",
              nameEn: "Monthly Seller Subscriptions",
              nameUr: "ماہانہ سیلر سبسکرپشن پلانز",
              descriptionEn: "desc",
              descriptionUr: "desc",
              category: "MONETIZATION",
              isEnabled: true,
              sortOrder: 20,
              updatedAt: "2026-11-26T12:00:00.000Z"
            },
            meta: { requestId: "req_2" }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const res = await fetchPublicFeatureFlags();
    expect(res.data.seller_subscriptions_enabled).toBe(false);

    const updated = await updateAdminFeatureFlag("seller_subscriptions_enabled", {
      isEnabled: true,
      reason: "Launch Pro plans"
    });
    expect(updated.data.isEnabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("posts local buyer demands and seller promo deals with integer paisa values", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "0193a8b2-0000-7000-8000-000000000011",
              buyerId: "0193a8b2-0000-7000-8000-000000000001",
              buyerDisplayName: "Bilal",
              districtId: "0193a8b2-0000-7000-8000-000000000002",
              districtNameEn: "Mianwali",
              areaZoneId: null,
              areaZoneNameEn: null,
              categoryId: null,
              categoryNameEn: null,
              title: "Solar Battery Needed",
              description: "12V battery with Mianwali warranty",
              budgetMaxPaisa: 4_500_000,
              status: "OPEN",
              responsesCount: 0,
              createdAt: "2026-11-26T12:00:00.000Z",
              updatedAt: "2026-11-26T12:00:00.000Z"
            }
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "0193a8b2-0000-7000-8000-000000000012",
              storeId: "0193a8b2-0000-7000-8000-000000000003",
              code: "WINTER10",
              title: "Mianwali Flash Deal",
              discountType: "PERCENT_BPS",
              discountValue: 1000,
              minOrderPaisa: 50_000,
              isFlashDeal: true,
              startsAt: "2026-11-26T12:00:00.000Z",
              endsAt: "2026-11-27T12:00:00.000Z",
              isActive: true,
              createdAt: "2026-11-26T12:00:00.000Z"
            }
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      );

    const demand = await createBuyerDemand({
      districtId: "0193a8b2-0000-7000-8000-000000000002",
      title: "Solar Battery Needed",
      description: "12V battery with Mianwali warranty",
      budgetMaxPaisa: 4_500_000
    });
    expect(demand.data.budgetMaxPaisa).toBe(4_500_000);

    const deal = await createSellerDeal({
      title: "Mianwali Flash Deal",
      code: "WINTER10",
      discountType: "PERCENT_BPS",
      discountValue: 1000,
      minOrderPaisa: 50_000,
      isFlashDeal: true,
      durationHours: 24
    });
    expect(deal.data.code).toBe("WINTER10");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects voice notes over 1 MB to preserve free-tier storage quotas", async () => {
    const oversized = new Blob([new Uint8Array(1024 * 1024 + 64)], {
      type: "audio/webm"
    });
    await expect(uploadVoiceNoteToS3(oversized)).rejects.toThrow(
      /1 MB or smaller/
    );
  });
});
