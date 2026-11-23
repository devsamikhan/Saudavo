"use client";

import type {
  DisputeType,
  OrderDetailDto,
  OrderMessageDto
} from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../components/locale-provider";
import { StatusBadge } from "../../components/ui-primitives";
import {
  acceptServiceDelivery,
  ApiClientError,
  cancelCustomerOrder,
  createOrderDispute,
  createOrderReview,
  fetchCustomerOrders,
  fetchOrderMessages,
  postOrderMessage,
  requestServiceRevision
} from "../../lib/api-client";
import { formatPkrFromPaisa } from "../../lib/money";

export default function OrdersPage() {
  const { locale, t, user } = useAppContext();

  const [orders, setOrders] = useState<OrderDetailDto[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [messages, setMessages] = useState<OrderMessageDto[]>([]);
  const [msgText, setMsgText] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Active inline panels per order
  const [revisionOrderId, setRevisionOrderId] = useState<string | null>(null);
  const [revisionReason, setRevisionReason] = useState("");

  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const [disputeOrderId, setDisputeOrderId] = useState<string | null>(null);
  const [disputeType, setDisputeType] =
    useState<DisputeType>("QUALITY_MISMATCH");
  const [disputeDescription, setDisputeDescription] = useState("");

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
    setStatusNotice(null);
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

  const handleRequestRevision = async (
    e: React.FormEvent<HTMLFormElement>,
    orderId: string
  ) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      await requestServiceRevision(orderId, { reason: revisionReason.trim() });
      setRevisionOrderId(null);
      setRevisionReason("");
      setStatusNotice("Service revision requested.");
      await loadOrders();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Unable to request service revision."
      );
    }
  };

  const handleSubmitReview = async (
    e: React.FormEvent<HTMLFormElement>,
    orderId: string
  ) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      const trimmedComment = reviewComment.trim();
      await createOrderReview(orderId, {
        rating: reviewRating,
        ...(trimmedComment.length > 0 ? { comment: trimmedComment } : {})
      });
      setReviewOrderId(null);
      setReviewComment("");
      setReviewRating(5);
      setStatusNotice("Verified review submitted.");
      await loadOrders();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Unable to submit review."
      );
    }
  };

  const handleSubmitDispute = async (
    e: React.FormEvent<HTMLFormElement>,
    orderId: string
  ) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      await createOrderDispute(orderId, {
        disputeType,
        description: disputeDescription.trim()
      });
      setDisputeOrderId(null);
      setDisputeDescription("");
      setStatusNotice("Dispute opened for moderator review.");
      await loadOrders();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to open dispute."
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
        {t.ordersPageTitle}
      </h1>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {statusNotice && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusNotice}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-ink-secondary">{t.loadingText}</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-sm text-ink-secondary">{t.ordersEmpty}</p>
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
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-ink-primary">
                      #{order.orderNumber} ({order.orderType})
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-secondary">
                      <StatusBadge status={order.status} />
                      <span>• {order.paymentMethod}</span>
                      <StatusBadge status={order.codCollectionStatus} />
                    </div>
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
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setErrorMsg(null);
                            setStatusNotice(null);
                            void acceptServiceDelivery(order.id)
                              .then(async () => {
                                setStatusNotice("Service delivery accepted.");
                                await loadOrders();
                              })
                              .catch((err: unknown) =>
                                setErrorMsg(
                                  err instanceof ApiClientError
                                    ? err.message
                                    : "Unable to accept service delivery."
                                )
                              );
                          }}
                          className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Accept Service Delivery
                        </button>

                        {order.serviceOrderDetails &&
                          order.serviceOrderDetails.revisionsUsed <
                            order.serviceOrderDetails.maxRevisionsSnapshot && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRevisionOrderId((prev) =>
                                  prev === order.id ? null : order.id
                                );
                              }}
                              className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-ink-primary hover:bg-surface-muted"
                            >
                              Request Revision (
                              {order.serviceOrderDetails.revisionsUsed}/
                              {order.serviceOrderDetails.maxRevisionsSnapshot})
                            </button>
                          )}
                      </>
                    )}

                  {order.status === "COMPLETED" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewOrderId((prev) =>
                          prev === order.id ? null : order.id
                        );
                      }}
                      className="rounded-lg bg-brand-primary-soft px-3 py-1.5 text-xs font-semibold text-brand-primary"
                    >
                      Leave Verified Review
                    </button>
                  )}

                  {order.status !== "PENDING_CONFIRMATION" &&
                    order.status !== "CANCELLED" &&
                    order.status !== "DISPUTED" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDisputeOrderId((prev) =>
                            prev === order.id ? null : order.id
                          );
                        }}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                      >
                        Open Dispute
                      </button>
                    )}
                </div>

                {statusNotice && selectedOrderId === order.id && (
                  <p className="mt-2 text-xs font-medium text-brand-primary">
                    {statusNotice}
                  </p>
                )}

                {revisionOrderId === order.id && (
                  <form
                    onClick={(e) => e.stopPropagation()}
                    onSubmit={(e) => void handleRequestRevision(e, order.id)}
                    className="mt-3 space-y-2 rounded-xl border border-border-subtle bg-surface-muted p-3"
                  >
                    <input
                      type="text"
                      required
                      minLength={5}
                      maxLength={1000}
                      value={revisionReason}
                      onChange={(e) => setRevisionReason(e.target.value)}
                      placeholder="Describe revision adjustments needed (min 5 chars)..."
                      className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Submit Revision Request
                    </button>
                  </form>
                )}

                {reviewOrderId === order.id && (
                  <form
                    onClick={(e) => e.stopPropagation()}
                    onSubmit={(e) => void handleSubmitReview(e, order.id)}
                    className="mt-3 space-y-2 rounded-xl border border-border-subtle bg-surface-muted p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs font-semibold text-ink-primary">
                        Rating:
                      </label>
                      <select
                        value={reviewRating}
                        onChange={(e) =>
                          setReviewRating(Number(e.target.value))
                        }
                        className="rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1 text-xs"
                      >
                        <option value={5}>5 Stars</option>
                        <option value={4}>4 Stars</option>
                        <option value={3}>3 Stars</option>
                        <option value={2}>2 Stars</option>
                        <option value={1}>1 Star</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={2000}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience (optional, min 3 chars if filled)..."
                      className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Submit Verified Review
                    </button>
                  </form>
                )}

                {disputeOrderId === order.id && (
                  <form
                    onClick={(e) => e.stopPropagation()}
                    onSubmit={(e) => void handleSubmitDispute(e, order.id)}
                    className="mt-3 space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-3"
                  >
                    <select
                      value={disputeType}
                      onChange={(e) =>
                        setDisputeType(e.target.value as DisputeType)
                      }
                      className="w-full rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1.5 text-xs"
                    >
                      <option value="QUALITY_MISMATCH">Quality Mismatch</option>
                      <option value="ITEM_NOT_RECEIVED">
                        Item Not Received
                      </option>
                      <option value="DAMAGED_OR_DEFECTIVE">
                        Damaged or Defective
                      </option>
                      <option value="PAYMENT_DISPUTE">Payment Dispute</option>
                      <option value="SERVICE_NON_DELIVERY">
                        Service Non-Delivery
                      </option>
                    </select>
                    <textarea
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={2}
                      value={disputeDescription}
                      onChange={(e) => setDisputeDescription(e.target.value)}
                      placeholder="Explain the issue for moderators (min 10 chars)..."
                      className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Submit Order Dispute
                    </button>
                  </form>
                )}
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
