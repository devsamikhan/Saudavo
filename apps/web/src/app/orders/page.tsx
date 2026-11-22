"use client";

import type { OrderDetailDto, OrderMessageDto } from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../components/locale-provider";
import {
  acceptServiceDelivery,
  ApiClientError,
  cancelCustomerOrder,
  fetchCustomerOrders,
  fetchOrderMessages,
  postOrderMessage
} from "../../lib/api-client";
import { formatPkrFromPaisa } from "../../lib/money";

export default function OrdersPage() {
  const { locale, user } = useAppContext();

  const [orders, setOrders] = useState<OrderDetailDto[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [messages, setMessages] = useState<OrderMessageDto[]>([]);
  const [msgText, setMsgText] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchCustomerOrders();
      setOrders(res.data);
      if (res.data.length > 0 && !selectedOrderId) {
        setSelectedOrderId(res.data[0]?.id ?? "");
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to load orders."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedOrderId, user]);

  const loadMessages = useCallback(async (orderId: string) => {
    if (!orderId) return;
    try {
      const res = await fetchOrderMessages(orderId);
      setMessages(res.data);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (selectedOrderId) {
      void loadMessages(selectedOrderId);
    }
  }, [loadMessages, selectedOrderId]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrderId || !msgText.trim()) return;
    setErrorMsg(null);
    try {
      await postOrderMessage(selectedOrderId, { body: msgText.trim() });
      setMsgText("");
      await loadMessages(selectedOrderId);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to post message."
      );
    }
  };

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-center">
        <Link
          href="/auth"
          className="inline-block rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In to View Orders
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-ink-primary">
        My Orders & Order Messages
      </h1>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-ink-secondary">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-sm text-ink-secondary">No orders placed yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {orders.map((order) => (
              <article
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`cursor-pointer rounded-2xl border bg-surface-card p-5 transition ${
                  selectedOrderId === order.id
                    ? "border-brand-primary"
                    : "border-border-subtle"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-ink-primary">
                      #{order.orderNumber} ({order.orderType})
                    </h2>
                    <p className="text-xs text-ink-secondary">
                      Status: <strong>{order.status}</strong> • Payment:{" "}
                      <strong>{order.paymentMethod}</strong> (
                      {order.codCollectionStatus})
                    </p>
                    {order.paymentMethod === "MANUAL_OFFLINE" && (
                      <p className="mt-1 text-[11px] text-brand-accent">
                        {locale === "ur"
                          ? "PQ-14: ادائیگی براہِ راست سیلر کے ساتھ آف لائن طے ہوگی؛ کسی تنازعے کی صورت میں رسید محفوظ رکھیں۔"
                          : "PQ-14: Offline payment is arranged directly with the seller (no platform escrow). Keep transfer proof if raising a dispute."}
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-brand-primary">
                    {formatPkrFromPaisa(order.totalPaisa, locale)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {order.status === "PENDING_CONFIRMATION" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void cancelCustomerOrder(order.id, {
                          reason: "Cancelled by customer"
                        })
                          .then(loadOrders)
                          .catch((err: unknown) =>
                            setErrorMsg(
                              err instanceof ApiClientError
                                ? err.message
                                : "Unable to cancel order."
                            )
                          );
                      }}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Self-Cancel (Before Confirmation)
                    </button>
                  )}

                  {order.orderType === "SERVICE" &&
                    order.status === "DELIVERY_SUBMITTED" &&
                    !order.serviceOrderDetails?.customerAcceptedAt && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void acceptServiceDelivery(order.id).then(loadOrders);
                        }}
                        className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Accept Service Delivery
                      </button>
                    )}
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-2xl border border-border-subtle bg-surface-card p-5 h-fit">
            <h2 className="text-base font-bold text-ink-primary">
              Order Messages (Text-Only REST • PQ-09)
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Freezes automatically upon order completion or cancellation.
            </p>

            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-xl bg-surface-muted p-3">
              {messages.length === 0 ? (
                <p className="text-xs text-ink-secondary">No messages yet.</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg bg-surface-card p-2.5 text-xs"
                  >
                    <span className="font-bold text-brand-primary">
                      {msg.senderRole}
                    </span>
                    <p dir="auto" className="mt-1 text-ink-primary">
                      {msg.body}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
              <input
                type="text"
                maxLength={2000}
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Write a text message..."
                className="flex-1 rounded-xl border border-border-subtle px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white"
              >
                Send
              </button>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}
