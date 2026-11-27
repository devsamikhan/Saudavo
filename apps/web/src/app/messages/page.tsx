"use client";

import type {
  AddressDto,
  ChatMessageDto,
  ConversationSummaryDto,
  OrderCreatedSummary,
  ProductDto
} from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EmptyInboxSpot,
  SpotState,
  VoiceMessengerSpot
} from "../../components/illustrations";
import { useAppContext } from "../../components/locale-provider";
import { OrderConfirmedModal } from "../../components/order-confirmed-modal";
import { StatusBadge, TrustPill } from "../../components/ui-primitives";
import {
  acceptChatCustomOffer,
  ApiClientError,
  declineChatCustomOffer,
  fetchAddresses,
  fetchConversationMessages,
  fetchMessengerConversations,
  fetchSellerProducts,
  sendChatCustomOffer,
  sendChatMessage,
  startMessengerConversation
} from "../../lib/api-client";
import {
  uploadImageAssetToS3,
  uploadVoiceNoteToS3
} from "../../lib/media-upload";
import { formatPkrFromPaisa, parseWholeRupeesToPaisa } from "../../lib/money";

const PHONE_HINT_REGEX = /(?:\+92|03)\d{9}/;

export default function MessagesPage() {
  const { locale, t, user, authLoading, features, showToast } = useAppContext();

  const [conversations, setConversations] = useState<ConversationSummaryDto[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [filterTab, setFilterTab] = useState<"ALL" | "BUYER" | "SELLER">("ALL");
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [sellerProducts, setSellerProducts] = useState<ProductDto[]>([]);

  const [messageText, setMessageText] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartedAtRef = useRef<number>(0);
  const [sendingMsg, setSendingMsg] = useState(false);

  // Seller custom offer builder state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerProductId, setOfferProductId] = useState("");
  const [offerUnitRupees, setOfferUnitRupees] = useState(1200);
  const [offerQty, setOfferQty] = useState(1);
  const [offerDeliveryRupees, setOfferDeliveryRupees] = useState(150);
  const [offerFulfilment, setOfferFulfilment] = useState<
    "SELLER_DELIVERY" | "CUSTOMER_PICKUP"
  >("SELLER_DELIVERY");
  const [offerNote, setOfferNote] = useState("");

  // Buyer accept offer state
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderCreatedSummary | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const initDeepLinkDone = useRef(false);

  const loadConversations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetchMessengerConversations();
      setConversations(res.data);
      setSelectedId((prev) => prev || res.data[0]?.id || "");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Unable to load messenger conversations."
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(
    async (convId: string) => {
      if (!user || !convId) {
        setMessages([]);
        return;
      }
      try {
        const res = await fetchConversationMessages(convId);
        setMessages(res.data);
      } catch {
        // Keep current thread visible on transient poll errors
      }
    },
    [user]
  );

  // Handle initial deep links: /messages?storeId=...&productId=... or conversationId=...
  useEffect(() => {
    if (authLoading || !user || initDeepLinkDone.current) return;
    initDeepLinkDone.current = true;

    const runInit = async () => {
      const sp =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const storeId = sp?.get("storeId");
      const productId = sp?.get("productId") ?? undefined;
      const serviceListingId = sp?.get("serviceListingId") ?? undefined;
      const conversationId = sp?.get("conversationId");

      const [addrRes, prodRes] = await Promise.all([
        fetchAddresses().catch(() => ({ data: [] })),
        fetchSellerProducts().catch(() => ({ data: [] }))
      ]);
      setAddresses(addrRes.data);
      if (addrRes.data[0]?.id) {
        setSelectedAddressId(addrRes.data[0].id);
      }
      const activeProds = prodRes.data.filter(
        (p) => p.status === "ACTIVE" && p.stockQuantity > 0
      );
      setSellerProducts(activeProds);
      if (activeProds[0]?.id) {
        setOfferProductId(activeProds[0].id);
        setOfferUnitRupees(Math.max(1, Math.round(activeProds[0].basePricePaisa / 100)));
      }

      if (storeId) {
        try {
          const started = await startMessengerConversation({
            storeId,
            ...(productId ? { productId } : {}),
            ...(serviceListingId ? { serviceListingId } : {})
          });
          await loadConversations();
          setSelectedId(started.data.id);
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", "/messages");
          }
          return;
        } catch (err: unknown) {
          setErrorMsg(
            err instanceof ApiClientError
              ? err.message
              : "Unable to open seller conversation."
          );
        }
      }

      await loadConversations();
      if (conversationId) {
        setSelectedId(conversationId);
      }
    };

    void runInit();
  }, [authLoading, loadConversations, user]);

  useEffect(() => {
    if (!selectedId) return;
    void loadMessages(selectedId);
  }, [loadMessages, selectedId]);

  // 5-second background polling while tab is visible (no WebSockets in MVP)
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadConversations();
        if (selectedId) {
          void loadMessages(selectedId);
        }
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loadConversations, loadMessages, selectedId, user]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const visibleConversations = useMemo(
    () =>
      filterTab === "ALL"
        ? conversations
        : conversations.filter((c) => c.roleView === filterTab),
    [conversations, filterTab]
  );

  const hasPhoneHint = PHONE_HINT_REGEX.test(messageText);

  const handleSendText = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeConversation || !messageText.trim()) return;
    setSendingMsg(true);
    setErrorMsg(null);
    try {
      await sendChatMessage(activeConversation.id, {
        body: messageText.trim()
      });
      setMessageText("");
      await Promise.all([loadMessages(activeConversation.id), loadConversations()]);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to send message."
      );
    } finally {
      setSendingMsg(false);
    }
  };

  const handleUploadChatPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeConversation) return;
    setUploadingPhoto(true);
    setErrorMsg(null);
    try {
      const asset = await uploadImageAssetToS3(file, "CHAT_ATTACHMENT");
      await sendChatMessage(activeConversation.id, {
        body: messageText.trim(),
        mediaAssetId: asset.id
      });
      setMessageText("");
      await Promise.all([loadMessages(activeConversation.id), loadConversations()]);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to send image attachment."
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleToggleVoiceRecord = async () => {
    if (!activeConversation) return;
    if (recordingVoice && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecordingVoice(false);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(
        locale === "ur"
          ? "آپ کا براؤزر وائس ریکارڈنگ کو سپورٹ نہیں کرتا۔"
          : "Voice recording is not supported in this browser."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { audioBitsPerSecond: 24_000 });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      audioChunksRef.current = [];
      recordStartedAtRef.current = Date.now();
      const autoStopTimer =
        typeof window !== "undefined"
          ? window.setTimeout(() => {
              if (recorder.state === "recording") {
                recorder.stop();
                setRecordingVoice(false);
              }
            }, 45_000)
          : null;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };
      recorder.onstop = () => {
        if (autoStopTimer !== null && typeof window !== "undefined") {
          window.clearTimeout(autoStopTimer);
        }
        stream.getTracks().forEach((track) => track.stop());
        const durationSec = Math.max(
          1,
          Math.min(45, Math.round((Date.now() - recordStartedAtRef.current) / 1000))
        );
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm"
        });
        setUploadingVoice(true);
        void uploadVoiceNoteToS3(blob)
          .then((asset) =>
            sendChatMessage(activeConversation.id, {
              body: locale === "ur" ? "اردو وائس پیغام" : "Voice message",
              mediaAssetId: asset.id,
              voiceDurationSec: durationSec
            })
          )
          .then(() =>
            Promise.all([loadMessages(activeConversation.id), loadConversations()])
          )
          .catch((err: unknown) => {
            setErrorMsg(
              err instanceof Error ? err.message : "Unable to upload voice note."
            );
          })
          .finally(() => setUploadingVoice(false));
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingVoice(true);
    } catch {
      setErrorMsg(
        locale === "ur"
          ? "مائیکروفون کی اجازت نہیں ملی۔"
          : "Microphone access was denied."
      );
    }
  };

  const handleSendCustomOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeConversation || !offerProductId) return;
    setSendingMsg(true);
    setErrorMsg(null);
    try {
      await sendChatCustomOffer(activeConversation.id, {
        productId: offerProductId,
        quantity: offerQty,
        unitPricePaisa: parseWholeRupeesToPaisa(offerUnitRupees),
        deliveryFeePaisa: parseWholeRupeesToPaisa(offerDeliveryRupees),
        fulfilmentMode: offerFulfilment,
        ...(offerNote.trim() ? { note: offerNote.trim() } : {})
      });
      setShowOfferForm(false);
      setOfferNote("");
      showToast(
        locale === "ur"
          ? "کسٹم COD آفر چیٹ میں بھیج دی گئی!"
          : "Custom COD offer sent in chat!"
      );
      await Promise.all([loadMessages(activeConversation.id), loadConversations()]);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to send custom offer."
      );
    } finally {
      setSendingMsg(false);
    }
  };

  const handleAcceptOffer = async (msg: ChatMessageDto) => {
    if (!activeConversation) return;
    setAcceptingOfferId(msg.id);
    setErrorMsg(null);
    try {
      const res = await acceptChatCustomOffer(activeConversation.id, msg.id, {
        ...(msg.offerFulfilmentMode === "SELLER_DELIVERY" && selectedAddressId
          ? { addressId: selectedAddressId }
          : {})
      });
      setConfirmedOrder(res.data);
      await Promise.all([loadMessages(activeConversation.id), loadConversations()]);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Unable to accept custom offer."
      );
    } finally {
      setAcceptingOfferId(null);
    }
  };

  const handleDeclineOffer = async (msgId: string) => {
    if (!activeConversation) return;
    try {
      await declineChatCustomOffer(activeConversation.id, msgId);
      await loadMessages(activeConversation.id);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to decline offer."
      );
    }
  };

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-secondary">
        {t.loadingText}
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 pb-24">
        <SpotState
          illustration={<EmptyInboxSpot />}
          badge={locale === "ur" ? "سوداو میسنجر" : "Saudavo Shopping Messenger"}
          title={
            locale === "ur"
              ? "سیلرز اور خریداروں سے چیٹ کرنے کے لیے لاگ ان کریں"
              : "Sign in to chat safely with local sellers & buyers"
          }
          description={
            locale === "ur"
              ? "اپنا ذاتی موبائل نمبر ظاہر کیے بغیر سوداو کے اندر ہی بات چیت، بھاؤ تاؤ اور COD آرڈر مکمل کریں۔"
              : "Ask questions, negotiate custom deals, and place Cash on Delivery orders inside Saudavo without sharing personal phone numbers."
          }
          actions={
            <Link
              href="/auth"
              className="rounded-2xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover"
            >
              {t.openAuthBtn}
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-3 py-5 pb-24 sm:px-6 md:pb-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-ink-primary sm:text-2xl">
            {locale === "ur" ? "سوداو شاپنگ میسنجر" : "Saudavo Shopping Messenger"}
          </h1>
          <p className="text-xs text-ink-secondary">
            {locale === "ur"
              ? "بغیر کسی اضافی ایپ یا واٹس ایپ کے محفوظ خریداری اور کسٹم COD ڈیلز"
              : "Private buyer–seller chat & 1-click custom COD deals inside Saudavo"}
          </p>
        </div>
        <TrustPill
          label={t.privacyShieldBadge}
          variant="privacy"
        />
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700"
        >
          {errorMsg}
        </div>
      )}

      {conversations.length === 0 ? (
        <SpotState
          illustration={<EmptyInboxSpot />}
          badge={locale === "ur" ? "انباکس خالی ہے" : "Inbox Ready"}
          title={
            locale === "ur"
              ? "ابھی تک کوئی چیٹ شروع نہیں ہوئی"
              : "No conversations yet"
          }
          description={
            locale === "ur"
              ? "کسی بھی پروڈکٹ، سروس یا اسٹور پیج پر 'سیلر سے چیٹ کریں' بٹن دبائیں اور یہیں سودا طے کریں۔"
              : "Tap 'Chat with Seller' on any product, service, or store page to start a protected Saudavo conversation."
          }
          actions={
            <Link
              href="/"
              className="rounded-2xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white"
            >
              {t.browseMarketplaceBtn}
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left Thread List */}
          <aside
            className={`space-y-3 rounded-3xl border border-border-subtle bg-surface-card p-4 shadow-card lg:col-span-4 ${
              activeConversation ? "hidden lg:block" : "block"
            }`}
          >
            <div className="flex gap-1.5 rounded-2xl bg-surface-muted p-1 text-xs font-semibold">
              {(
                [
                  { key: "ALL", label: locale === "ur" ? "سب" : "All" },
                  { key: "BUYER", label: locale === "ur" ? "خریداری" : "Buying" },
                  { key: "SELLER", label: locale === "ur" ? "فروخت" : "Selling" }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTab(tab.key)}
                  className={`flex-1 rounded-xl py-1.5 transition ${
                    filterTab === tab.key
                      ? "bg-surface-card text-brand-primary shadow-sm"
                      : "text-ink-secondary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="max-h-[540px] space-y-2 overflow-y-auto">
              {visibleConversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                const title =
                  conv.roleView === "BUYER"
                    ? conv.storeDisplayName
                    : conv.buyerDisplayName;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full rounded-2xl border p-3 text-start transition ${
                      isSelected
                        ? "border-brand-primary bg-brand-primary-soft/50"
                        : "border-border-subtle bg-surface-canvas hover:border-brand-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span dir="auto" className="truncate text-sm font-bold text-ink-primary">
                        {title}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-bold text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 font-semibold text-ink-secondary">
                        {conv.roleView === "BUYER"
                          ? conv.storeDistrictNameEn
                          : locale === "ur"
                            ? "خریدار"
                            : "Buyer"}
                      </span>
                      {conv.roleView === "BUYER" && conv.storeVerifiedPro && (
                        <span className="rounded-full bg-brand-primary-soft px-2 py-0.5 font-bold text-brand-primary">
                          Verified Pro
                        </span>
                      )}
                      {conv.roleView === "SELLER" && conv.buyerCodStats && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                          COD: {conv.buyerCodStats.completedCodCount}✓ /{" "}
                          {conv.buyerCodStats.refusedCodCount}✕
                        </span>
                      )}
                    </div>
                    <p dir="auto" className="mt-1.5 truncate text-xs text-ink-secondary">
                      {conv.lastMessagePreview}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Chat Thread */}
          <section
            className={`flex min-h-[540px] flex-col rounded-3xl border border-border-subtle bg-surface-card shadow-card lg:col-span-8 ${
              activeConversation ? "flex" : "hidden lg:flex"
            }`}
          >
            {activeConversation ? (
              <>
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedId("")}
                      className="rounded-xl border border-border-subtle px-2.5 py-1 text-xs font-semibold text-brand-primary lg:hidden"
                    >
                      {locale === "ur" ? "← فہرست" : "← Inbox"}
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 dir="auto" className="text-sm font-extrabold text-ink-primary">
                          {activeConversation.roleView === "BUYER"
                            ? activeConversation.storeDisplayName
                            : activeConversation.buyerDisplayName}
                        </h2>
                        {activeConversation.storeVerifiedPro && (
                          <span className="rounded-full bg-brand-primary-soft px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                            Verified Pro
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-secondary">
                        {activeConversation.roleView === "BUYER"
                          ? `${activeConversation.storeDistrictNameEn} • COD Protected`
                          : activeConversation.buyerCodStats
                            ? `Buyer COD History: ${activeConversation.buyerCodStats.completedCodCount} collected, ${activeConversation.buyerCodStats.refusedCodCount} refused`
                            : "Buyer Inquiry"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeConversation.roleView === "SELLER" &&
                      sellerProducts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowOfferForm((prev) => !prev)}
                          className="rounded-xl bg-brand-accent px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-accent-hover"
                        >
                          {showOfferForm
                            ? t.cancelBtn
                            : locale === "ur"
                              ? "+ کسٹم COD آفر بھیجیں"
                              : "+ Send Custom Offer"}
                        </button>
                      )}
                    <Link
                      href={`/stores/${activeConversation.storeSlug}`}
                      className="rounded-xl border border-border-subtle px-3 py-1.5 text-xs font-semibold text-ink-primary hover:border-brand-primary"
                    >
                      {locale === "ur" ? "اسٹور دیکھیں" : "Store"}
                    </Link>
                  </div>
                </header>

                {/* In-Chat Safety Banner */}
                <div className="border-b border-brand-primary/15 bg-brand-primary-soft/50 px-4 py-2 text-[11px] font-medium text-brand-primary">
                  {locale === "ur"
                    ? "حفاظتی ہدایت: تمام بات چیت اور ڈیلز سوداو میسنجر کے اندر مکمل کریں اور صرف کیش آن ڈلیوری (COD) یا تصدیق شدہ آرڈر پر اعتماد کریں۔"
                    : "Safety Tip: Keep all bargaining and orders inside Saudavo Messenger for Cash on Delivery protection. Never share personal phone numbers unnecessarily."}
                </div>

                {/* Seller Custom Offer Composer */}
                {showOfferForm && activeConversation.roleView === "SELLER" && (
                  <form
                    onSubmit={handleSendCustomOffer}
                    className="grid grid-cols-1 gap-2.5 border-b border-border-subtle bg-surface-muted/60 p-4 sm:grid-cols-4"
                  >
                    <select
                      value={offerProductId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setOfferProductId(nextId);
                        const prod = sellerProducts.find((p) => p.id === nextId);
                        if (prod) {
                          setOfferUnitRupees(
                            Math.max(1, Math.round(prod.basePricePaisa / 100))
                          );
                        }
                      }}
                      className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs sm:col-span-2"
                    >
                      {sellerProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} (Stock: {p.stockQuantity})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      required
                      value={offerUnitRupees}
                      onChange={(e) => setOfferUnitRupees(Number(e.target.value))}
                      placeholder="Agreed Price (Rs.)"
                      className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                    />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={offerQty}
                      onChange={(e) => setOfferQty(Number(e.target.value))}
                      placeholder="Qty"
                      className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                    />
                    <input
                      type="number"
                      min={0}
                      required
                      value={offerDeliveryRupees}
                      onChange={(e) => setOfferDeliveryRupees(Number(e.target.value))}
                      placeholder="Delivery Rs."
                      className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                    />
                    <select
                      value={offerFulfilment}
                      onChange={(e) =>
                        setOfferFulfilment(
                          e.target.value === "CUSTOMER_PICKUP"
                            ? "CUSTOMER_PICKUP"
                            : "SELLER_DELIVERY"
                        )
                      }
                      className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                    >
                      <option value="SELLER_DELIVERY">SELLER_DELIVERY</option>
                      <option value="CUSTOMER_PICKUP">CUSTOMER_PICKUP</option>
                    </select>
                    <input
                      type="text"
                      value={offerNote}
                      onChange={(e) => setOfferNote(e.target.value)}
                      placeholder="Note (e.g. Special discounted deal)"
                      className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={sendingMsg}
                      className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white"
                    >
                      {locale === "ur" ? "آفر بھیجیں" : "Send COD Offer"}
                    </button>
                  </form>
                )}

                {/* Message Feed */}
                <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[380px]">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.messageType === "SYSTEM"
                            ? "items-center"
                            : isMine
                              ? "items-end"
                              : "items-start"
                        }`}
                      >
                        {msg.messageType === "SYSTEM" ? (
                          <div className="rounded-full bg-surface-muted px-3.5 py-1 text-[11px] font-semibold text-ink-secondary">
                            {msg.body}
                          </div>
                        ) : msg.messageType === "CUSTOM_OFFER" ? (
                          <div className="w-full max-w-sm space-y-2 rounded-2xl border-2 border-brand-accent/40 bg-brand-accent-soft/30 p-3.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold uppercase tracking-wide text-brand-accent">
                                {locale === "ur" ? "کسٹم COD آفر" : "Custom COD Offer"}
                              </span>
                              <StatusBadge status={msg.offerStatus ?? "PENDING"} />
                            </div>
                            <p dir="auto" className="text-sm font-bold text-ink-primary">
                              {msg.offerTitle} × {msg.offerQuantity}
                            </p>
                            <p className="text-ink-secondary">
                              {formatPkrFromPaisa(msg.offerUnitPricePaisa ?? 0, locale)}{" "}
                              each + Delivery{" "}
                              {formatPkrFromPaisa(msg.offerDeliveryFeePaisa ?? 0, locale)}
                            </p>
                            <p className="text-sm font-extrabold text-brand-primary">
                              Total:{" "}
                              {formatPkrFromPaisa(msg.offerTotalPaisa ?? 0, locale)} (
                              {msg.offerFulfilmentMode})
                            </p>
                            {msg.body && (
                              <p dir="auto" className="text-ink-secondary">
                                {msg.body}
                              </p>
                            )}

                            {msg.offerStatus === "PENDING" &&
                              activeConversation.roleView === "BUYER" && (
                                <div className="space-y-2 border-t border-brand-accent/20 pt-2">
                                  {msg.offerFulfilmentMode === "SELLER_DELIVERY" &&
                                    (addresses.length > 0 ? (
                                      <select
                                        value={selectedAddressId}
                                        onChange={(e) =>
                                          setSelectedAddressId(e.target.value)
                                        }
                                        className="w-full rounded-xl border border-border-subtle bg-surface-card px-2.5 py-1.5 text-xs"
                                      >
                                        {addresses.map((addr) => (
                                          <option key={addr.id} value={addr.id}>
                                            {addr.areaZoneName} — {addr.streetAddress}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <Link
                                        href="/account"
                                        className="block text-[11px] font-semibold text-brand-primary underline"
                                      >
                                        {locale === "ur"
                                          ? "پہلے ڈلیوری پتہ شامل کریں →"
                                          : "Save a Mianwali delivery address first →"}
                                      </Link>
                                    ))}
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={
                                        acceptingOfferId === msg.id ||
                                        (msg.offerFulfilmentMode ===
                                          "SELLER_DELIVERY" &&
                                          !selectedAddressId)
                                      }
                                      onClick={() => void handleAcceptOffer(msg)}
                                      className="flex-1 rounded-xl bg-brand-primary py-2 text-xs font-bold text-white hover:bg-brand-primary-hover disabled:opacity-50"
                                    >
                                      {acceptingOfferId === msg.id
                                        ? "..."
                                        : locale === "ur"
                                          ? "قبول کریں اور COD آرڈر دیں"
                                          : "Accept & Place COD Order"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDeclineOffer(msg.id)}
                                      className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs font-semibold text-ink-secondary"
                                    >
                                      {locale === "ur" ? "انکار" : "Decline"}
                                    </button>
                                  </div>
                                </div>
                              )}

                            {msg.offerStatus === "ACCEPTED" && msg.offerOrderId && (
                              <Link
                                href="/orders"
                                className="inline-block font-bold text-brand-primary underline"
                              >
                                {locale === "ur"
                                  ? "لائیو آرڈر ٹریکنگ دیکھیں →"
                                  : "View Confirmed Order →"}
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`max-w-[82%] space-y-1.5 rounded-2xl px-3.5 py-2.5 text-xs ${
                              isMine
                                ? "bg-brand-primary text-white"
                                : "border border-border-subtle bg-surface-canvas text-ink-primary"
                            }`}
                          >
                            {msg.productSummary && (
                              <Link
                                href={`/products/${msg.productSummary.slug}`}
                                className={`block rounded-xl p-2 text-[11px] font-semibold ${
                                  isMine
                                    ? "bg-white/15 text-white"
                                    : "bg-brand-primary-soft text-brand-primary"
                                }`}
                              >
                                {msg.productSummary.title} •{" "}
                                {formatPkrFromPaisa(
                                  msg.productSummary.basePricePaisa,
                                  locale
                                )}
                              </Link>
                            )}
                            {msg.serviceSummary && (
                              <Link
                                href={`/services/${msg.serviceSummary.slug}`}
                                className={`block rounded-xl p-2 text-[11px] font-semibold ${
                                  isMine
                                    ? "bg-white/15 text-white"
                                    : "bg-brand-primary-soft text-brand-primary"
                                }`}
                              >
                                {msg.serviceSummary.title} (
                                {msg.serviceSummary.serviceMode})
                              </Link>
                            )}
                            {msg.imageReadUrl && (
                              <img
                                src={msg.imageReadUrl}
                                alt="Shared attachment"
                                className="max-h-44 rounded-xl object-cover"
                              />
                            )}
                            {msg.messageType === "VOICE_NOTE" && msg.voiceReadUrl && (
                              <div className="space-y-1.5 rounded-xl bg-white/95 p-2 text-ink-primary">
                                <div className="flex items-center justify-between gap-2">
                                  <VoiceMessengerSpot />
                                  <span className="text-[10px] font-bold text-brand-primary">
                                    {msg.voiceDurationSec ?? 1}s
                                  </span>
                                </div>
                                <audio
                                  controls
                                  preload="metadata"
                                  src={msg.voiceReadUrl}
                                  className="h-8 w-52 max-w-full"
                                />
                              </div>
                            )}
                            {msg.body && <p dir="auto">{msg.body}</p>}
                            <p
                              className={`text-[10px] ${
                                isMine ? "text-white/75" : "text-ink-secondary"
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Composer */}
                <div className="border-t border-border-subtle p-3">
                  {hasPhoneHint && (
                    <p className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">
                      {locale === "ur"
                        ? "رازداری کی یاددہانی: سوداو میسنجر میں ذاتی فون نمبر شیئر کرنا ضروری نہیں — یہیں محفوظ آفر اور آرڈر کریں۔"
                        : "Privacy reminder: You don't need to share personal phone numbers. Agree on a price and complete COD orders right inside Saudavo."}
                    </p>
                  )}
                  <form onSubmit={handleSendText} className="flex items-center gap-2">
                    <label className="cursor-pointer rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-xs font-semibold text-ink-primary hover:border-brand-primary">
                      {uploadingPhoto ? "..." : locale === "ur" ? "تصویر" : "Photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingPhoto}
                        onChange={(e) => void handleUploadChatPhoto(e)}
                        className="sr-only"
                      />
                    </label>
                    {features.messenger_voice_notes_enabled && (
                      <button
                        type="button"
                        disabled={uploadingVoice}
                        onClick={() => void handleToggleVoiceRecord()}
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                          recordingVoice
                            ? "animate-pulse bg-red-600 text-white"
                            : "border border-border-subtle bg-brand-primary-soft text-brand-primary hover:border-brand-primary"
                        }`}
                      >
                        {uploadingVoice
                          ? "..."
                          : recordingVoice
                            ? locale === "ur"
                              ? "بھیجیں (Stop)"
                              : "Stop & Send"
                            : locale === "ur"
                              ? "وائس"
                              : "Voice"}
                      </button>
                    )}
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={
                        locale === "ur"
                          ? "پیغام لکھیں یا بھاؤ تاؤ کریں..."
                          : "Type your message or ask about delivery..."
                      }
                      className="flex-1 rounded-xl border border-border-subtle px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingMsg || !messageText.trim()}
                      className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover disabled:opacity-50"
                    >
                      {locale === "ur" ? "بھیجیں" : "Send"}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-xs text-ink-secondary">
                {locale === "ur"
                  ? "بات چیت دیکھنے کے لیے بائیں جانب سے چیٹ منتخب کریں"
                  : "Select a conversation from the inbox."}
              </div>
            )}
          </section>
        </div>
      )}

      {confirmedOrder && (
        <OrderConfirmedModal
          order={confirmedOrder}
          onClose={() => setConfirmedOrder(null)}
        />
      )}
    </main>
  );
}
