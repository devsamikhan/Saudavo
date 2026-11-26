import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acceptChatCustomOffer,
  declineChatCustomOffer,
  fetchAdminSubscriptionRenewals,
  fetchConversationMessages,
  fetchMessengerConversations,
  fetchMessengerUnreadCount,
  fetchSellerSubscription,
  fetchSubscriptionPlans,
  reviewAdminSubscriptionRenewal,
  sendChatCustomOffer,
  sendChatMessage,
  setStoredCsrfToken,
  startMessengerConversation,
  submitSubscriptionRenewal
} from "../src/lib/api-client";

describe("Saudavo Messenger & Monthly Subscription API client wrappers", () => {
  afterEach(() => {
    setStoredCsrfToken(null);
    vi.restoreAllMocks();
  });

  it("calls subscription and messenger endpoints with CSRF and Idempotency-Key", async () => {
    setStoredCsrfToken("csrf_messenger_test");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.endsWith("/messenger/unread-count")) {
          return new Response(
            JSON.stringify({ data: { unreadCount: 2 } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ data: {} }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

    await fetchSubscriptionPlans();
    await fetchSellerSubscription();
    await submitSubscriptionRenewal({
      planCode: "PRO_MONTHLY",
      paymentMethod: "RAAST_MANUAL",
      transactionReference: "RAAST-123456"
    });
    await fetchAdminSubscriptionRenewals();
    await reviewAdminSubscriptionRenewal("11111111-1111-4111-8111-111111111111", {
      decision: "APPROVED",
      reviewNote: "Verified"
    });

    await startMessengerConversation({
      storeId: "22222222-2222-4222-8222-222222222222",
      initialMessage: "Is this available?"
    });
    await fetchMessengerConversations();
    const unread = await fetchMessengerUnreadCount();
    expect(unread.data.unreadCount).toBe(2);

    await fetchConversationMessages("33333333-3333-4333-8333-333333333333");
    await sendChatMessage("33333333-3333-4333-8333-333333333333", {
      body: "Yes, fresh batch ready today"
    });
    await sendChatCustomOffer("33333333-3333-4333-8333-333333333333", {
      productId: "44444444-4444-4444-8444-444444444444",
      quantity: 2,
      unitPricePaisa: 120000,
      deliveryFeePaisa: 15000,
      fulfilmentMode: "SELLER_DELIVERY"
    });
    await acceptChatCustomOffer(
      "33333333-3333-4333-8333-333333333333",
      "55555555-5555-4555-8555-555555555555",
      { addressId: "66666666-6666-4666-8666-666666666666" }
    );
    await declineChatCustomOffer(
      "33333333-3333-4333-8333-333333333333",
      "55555555-5555-4555-8555-555555555555"
    );

    expect(fetchMock).toHaveBeenCalledTimes(13);
    const acceptHeaders = fetchMock.mock.calls[11]?.[1]?.headers as Record<string, string>;
    expect(acceptHeaders["X-CSRF-Token"]).toBe("csrf_messenger_test");
    expect(acceptHeaders["Idempotency-Key"]).toBeTruthy();
  });
});
