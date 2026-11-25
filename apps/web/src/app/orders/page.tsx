"use client";

import type {
  DisputeType,
  OrderDetailDto,
  OrderMessageDto
} from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  EmptyInboxSpot,
  IsometricTrackingIllustration,
  SpotState
} from "../../components/illustrations";
import { useAppContext } from "../../components/locale-provider";
import type { UiDictionary } from "../../i18n/dictionaries";
import {
  ConfirmActionButton,
  ListCardSkeleton,
  OrderTimeline,
  StatusBadge
} from "../../components/ui-primitives";
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

function getLiveTrackingData(order: OrderDetailDto, t: UiDictionary) {
  const isService = order.orderType === "SERVICE";
  const steps = isService
    ? [
        { title: t.serviceTrackStep1Title, sub: t.serviceTrackStep1Sub },
        { title: t.serviceTrackStep2Title, sub: t.serviceTrackStep2Sub },
        { title: t.serviceTrackStep3Title, sub: t.serviceTrackStep3Sub },
        { title: t.serviceTrackStep4Title, sub: t.serviceTrackStep4Sub }
      ]
    : [
        { title: t.trackStep1Title, sub: t.trackStep1Sub },
        { title: t.trackStep2Title, sub: t.trackStep2Sub },
        { title: t.trackStep3Title, sub: t.trackStep3Sub },
        { title: t.trackStep4Title, sub: t.trackStep4Sub }
      ];

  const isHalted = order.status === "CANCELLED" || order.status === "DISPUTED";

  let activeIdx = 0;
  if (isService) {
    if (order.status === "CONFIRMED") activeIdx = 1;
    else if (
      order.status === "IN_PROGRESS" ||
      order.status === "REVISION_REQUESTED"
    )
      activeIdx = 2;
    else if (
      order.status === "DELIVERY_SUBMITTED" ||
      order.status === "COMPLETED"
    )
      activeIdx = 3;
  } else {
    if (order.status === "CONFIRMED" || order.status === "PREPARING")
      activeIdx = 1;
    else if (
      order.status === "READY_FOR_DISPATCH" ||
      order.status === "OUT_FOR_DELIVERY"
    )
      activeIdx = 2;
    else if (order.status === "DELIVERED" || order.status === "COMPLETED")
      activeIdx = 3;
  }

  return {
    steps,
    activeIdx,
    isHalted,
    progressPercent: isHalted ? 100 : ((activeIdx + 1) / steps.length) * 100
  };
}

export default function OrdersPage() {
  const { locale, t, user, showToast } = useAppContext();

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
    if (typeof window !== "undefined") {
      const requested = new URLSearchParams(window.location.search).get("order");
      if (requested) {
        setSelectedOrderId(requested);
      }
    }
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
      showToast(
        locale === "ur" ? "پیغام بھیج دیا گیا۔" : "Message sent to seller.",
        "primary"
      );
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
      <main className="mx-auto max-w-4xl px-4 py-10">
        <SpotState
          illustration={<EmptyInboxSpot />}
          badge={t.ordersPageTitle}
          title={t.ordersEmpty}
          description={t.emptyInboxBody}
          actions={
            <Link
              href="/auth"
              className="rounded-2xl bg-brand-accent px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-accent-hover"
            >
              {t.navSignIn}
            </Link>
          }
        />
      </main>
    );
  }

  const activeOrder =
    orders.find((o) => o.id === selectedOrderId) ?? orders[0] ?? null;
  const trackingInfo = activeOrder ? getLiveTrackingData(activeOrder, t) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 md:pb-8 lg:px-8">
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
        <div className="mt-6">
          <ListCardSkeleton rows={3} />
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-6">
          <SpotState
            illustration={<EmptyInboxSpot />}
            badge={locale === "ur" ? "آرڈرز اور ان باکس" : "Orders & Inbox"}
            title={t.ordersEmpty}
            description={t.emptyInboxBody}
            actions={
              <Link
                href="/"
                className="inline-flex rounded-2xl bg-brand-primary px-6 py-3 text-sm font-bold text-white shadow-soft transition-all hover:bg-brand-primary-hover"
              >
                {t.browseMarketplaceBtn}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Isometric Live Order Tracking Hero Card */}
          {activeOrder && trackingInfo && (
            <section className="grid grid-cols-1 items-center gap-8 rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card sm:p-8 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <IsometricTrackingIllustration />
              </div>

              <div className="space-y-4 lg:col-span-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-brand-primary">
                    {t.liveTrackingBadge}
                  </span>
                  <StatusBadge status={activeOrder.status} />
                </div>

                <h2 className="text-2xl font-extrabold text-ink-primary sm:text-3xl">
                  {t.liveTrackingTitle} #{activeOrder.orderNumber}
                </h2>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-primary-soft">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      trackingInfo.isHalted
                        ? "bg-red-600"
                        : trackingInfo.activeIdx === trackingInfo.steps.length - 1
                          ? "bg-brand-primary"
                          : "bg-brand-accent"
                    }`}
                    style={{ width: `${trackingInfo.progressPercent}%` }}
                  />
                </div>

                <div className="space-y-2.5">
                  {trackingInfo.steps.map((step, idx) => {
                    const reached = !trackingInfo.isHalted && idx <= trackingInfo.activeIdx;
                    return (
                      <div key={step.title} className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                            reached
                              ? "bg-brand-primary text-white"
                              : "bg-brand-primary-soft text-ink-secondary"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div
                            className={`text-xs ${
                              reached
                                ? "font-extrabold text-ink-primary"
                                : "font-medium text-ink-secondary"
                            }`}
                          >
                            {step.title}
                          </div>
                          <div className="text-[11px] text-ink-secondary">
                            {step.sub}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {orders.map((order) => (
                <article
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`cursor-pointer rounded-3xl border bg-surface-card p-5 shadow-card transition ${
                    (activeOrder?.id ?? selectedOrderId) === order.id
                      ? "border-brand-primary ring-2 ring-brand-primary/15"
                      : "border-border-subtle hover:border-brand-primary/50"
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

                <OrderTimeline
                  orderType={order.orderType}
                  status={order.status}
                  locale={locale}
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  {order.status === "PENDING_CONFIRMATION" && (
                    <ConfirmActionButton
                      label={
                        locale === "ur"
                          ? "آرڈر منسوخ کریں (منظوری سے پہلے)"
                          : "Self-Cancel (Before Confirmation)"
                      }
                      confirmLabel={t.confirmYesBtn}
                      cancelLabel={t.cancelBtn}
                      onConfirm={() => {
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
                    />
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

          <aside className="h-fit rounded-3xl border border-border-subtle bg-surface-card p-5 shadow-card">
            <h2 className="text-base font-extrabold text-ink-primary">
              Order Messages (Text-Only REST • PQ-09)
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Freezes automatically upon order completion or cancellation.
            </p>

            <div className="mt-4 max-h-64 space-y-2.5 overflow-y-auto rounded-2xl bg-surface-canvas p-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <div className="w-28">
                    <EmptyInboxSpot />
                  </div>
                  <p className="mt-2 text-xs font-bold text-ink-primary">
                    {t.emptyInboxTitle}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderRole === "CUSTOMER";
                  return (
                    <div
                      key={msg.id}
                      className={`rounded-2xl p-3 text-xs ${
                        isMine
                          ? "ms-6 bg-brand-primary text-white"
                          : "me-6 bg-brand-primary-soft text-ink-primary"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wide ${
                          isMine ? "text-white/80" : "text-brand-primary"
                        }`}
                      >
                        {msg.senderRole}
                      </span>
                      <p dir="auto" className="mt-1 leading-relaxed">
                        {msg.body}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
              <input
                type="text"
                maxLength={2000}
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Write a text message..."
                className="flex-1 rounded-2xl border border-border-subtle px-3.5 py-2.5 text-xs focus:border-brand-primary focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-2xl bg-brand-accent px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-accent-hover"
              >
                Send
              </button>
            </form>
          </aside>
          </div>
        </div>
      )}
    </main>
  );
}
