"use client";

import type {
  BuyerRequestDto,
  CategoryDto,
  DistrictDto
} from "@saudavo/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  DemandBoardIllustration,
  SpotState
} from "../../components/illustrations";
import { useAppContext } from "../../components/locale-provider";
import { StatusBadge, TrustPill } from "../../components/ui-primitives";
import {
  ApiClientError,
  closeBuyerDemand,
  createBuyerDemand,
  fetchCategories,
  fetchDistricts,
  fetchPublicDemands,
  respondToBuyerDemand
} from "../../lib/api-client";
import { formatPkrFromPaisa, parseWholeRupeesToPaisa } from "../../lib/money";

export default function DemandsBoardPage() {
  const { locale, user, features, showToast } = useAppContext();
  const router = useRouter();

  const [demands, setDemands] = useState<BuyerRequestDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [filterZoneId, setFilterZoneId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetRupees, setBudgetRupees] = useState(3000);
  const [areaZoneId, setAreaZoneId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Seller reply composer
  const [replyDemandId, setReplyDemandId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const isSeller = user?.roles.includes("SELLER") ?? false;

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [distRes, catRes] = await Promise.all([
        fetchDistricts(),
        fetchCategories()
      ]);
      setDistricts(distRes.data);
      setCategories(catRes.data);
      if (!areaZoneId && distRes.data[0]?.areaZones[0]?.id) {
        setAreaZoneId(distRes.data[0].areaZones[0].id);
      }

      if (features.buyer_requests_board_enabled) {
        const res = await fetchPublicDemands({
          ...(filterZoneId ? { areaZoneId: filterZoneId } : {}),
          status: "OPEN"
        });
        setDemands(res.data);
      } else {
        setDemands([]);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to load local demands."
      );
    } finally {
      setLoading(false);
    }
  }, [areaZoneId, features.buyer_requests_board_enabled, filterZoneId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateDemand = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const districtId = districts[0]?.id;
    if (!districtId || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await createBuyerDemand({
        districtId,
        areaZoneId: areaZoneId || null,
        categoryId: categoryId || null,
        title: title.trim(),
        description: description.trim(),
        budgetMaxPaisa: parseWholeRupeesToPaisa(budgetRupees)
      });
      setTitle("");
      setDescription("");
      showToast(
        locale === "ur"
          ? "آپ کی ضرورت میانوالی کے دکانداروں تک پہنچ گئی!"
          : "Your local demand is live for verified Mianwali sellers!",
        "primary"
      );
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to post demand."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSellerReply = async (demandId: string) => {
    if (!replyMessage.trim() || sendingReply) return;
    setSendingReply(true);
    setErrorMsg(null);
    try {
      const res = await respondToBuyerDemand(demandId, {
        message: replyMessage.trim()
      });
      setReplyDemandId(null);
      setReplyMessage("");
      showToast(
        locale === "ur"
          ? "آپ کا جواب سوداو میسنجر میں بھیج دیا گیا!"
          : "Reply sent! Continuing directly in Saudavo Messenger.",
        "primary"
      );
      router.push(`/messages?conversationId=${res.data.conversation.id}`);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to respond to demand."
      );
    } finally {
      setSendingReply(false);
    }
  };

  if (!features.buyer_requests_board_enabled) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 pb-24 md:pb-10">
        <SpotState
          illustration={<DemandBoardIllustration />}
          badge={locale === "ur" ? "مجھے چاہیے ڈیمانڈ بورڈ" : "Mujhy Chahiye Demand Board"}
          title={
            locale === "ur"
              ? "یہ سہولت فی الحال ایڈمن کنٹرول سے آف ہے"
              : "Demand Board Coming Soon (Feature Controlled)"
          }
          description={
            locale === "ur"
              ? "سوداو ایڈمن ایک کلک سے کسی بھی وقت میانوالی ڈیمانڈ بورڈ کو آن کر سکتے ہیں۔ ابھی آپ براہِ راست دکانوں سے خریداری کر سکتے ہیں۔"
              : "Saudavo Admin can enable the Mianwali Buyer Demand Board anytime in 1 click from the Feature Control Center."
          }
          actions={
            <Link
              href="/"
              className="rounded-2xl bg-brand-primary px-6 py-3 text-sm font-bold text-white shadow-soft"
            >
              {locale === "ur" ? "اسٹورفرنٹ دیکھیں" : "Browse Mianwali Catalog"}
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-3.5 py-6 pb-24 sm:px-6 sm:py-8 md:pb-10 lg:px-8">
      {/* Illustrated Hero Banner */}
      <section className="rounded-3xl bg-gradient-to-br from-[#0F6B52] via-[#135C48] to-[#0B4635] p-5 text-white shadow-card sm:p-7">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div className="space-y-2.5 max-w-2xl">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FDE5D6]">
              {locale === "ur" ? "میانوالی خصوصی فیچر" : "Mianwali Local Request Board"}
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {locale === "ur"
                ? "مجھے چاہیے — اپنی ضرورت لکھیں، دکاندار خود آفر بھیجیں"
                : "Mujhy Chahiye — Tell Mianwali Sellers What You Need"}
            </h1>
            <p className="text-xs leading-relaxed text-emerald-50/90 sm:text-sm">
              {locale === "ur"
                ? "کوئی چیز یا سروس نہیں مل رہی؟ اپنا بجٹ لکھیں۔ صرف تصدیق شدہ مقامی دکاندار آپ کو سوداو میسنجر میں براہِ راست ڈیل بھیجیں گے — بغیر نمبر شیئر کیے!"
                : "Post what you want with your PKR budget. Verified local shopkeepers reply privately via Saudavo Messenger with zero public phone exposure."}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <TrustPill variant="cod" label="0% Order Commission" />
              <TrustPill variant="privacy" label="No Phone Exposure" />
            </div>
          </div>
          <div className="rounded-2xl bg-white/95 p-3 shadow-soft">
            <DemandBoardIllustration />
          </div>
        </div>
      </section>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
        >
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Post a Demand Form */}
        <section className="rounded-3xl border border-border-subtle bg-surface-card p-5 shadow-card lg:col-span-1 h-fit">
          <h2 className="text-lg font-extrabold text-ink-primary">
            {locale === "ur" ? "نئی ضرورت پوسٹ کریں" : "Post a Local Request"}
          </h2>
          {!user ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-ink-secondary">
                {locale === "ur"
                  ? "ضرورت پوسٹ کرنے کے لیے لاگ ان کریں۔"
                  : "Sign in to post your request for Mianwali sellers."}
              </p>
              <Link
                href="/auth"
                className="inline-block rounded-2xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white"
              >
                {locale === "ur" ? "سائن ان کریں" : "Sign In to Post"}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleCreateDemand} className="mt-4 space-y-3">
              <input
                type="text"
                required
                minLength={5}
                maxLength={180}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  locale === "ur"
                    ? "مثال: اچھی کوالٹی کا سولر انورٹر یا سلائی"
                    : "e.g. Need 2kg Desi Cow Ghee or Bridal Tailor"
                }
                className="w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-xs focus:border-brand-primary focus:outline-none"
              />
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  locale === "ur"
                    ? "تفصیل، سائز، کوالٹی اور ڈلیوری علاقہ لکھیں..."
                    : "Describe specs, preferred area in Mianwali, delivery timing..."
                }
                className="w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-xs focus:border-brand-primary focus:outline-none"
              />
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary">
                  {locale === "ur" ? "زیادہ سے زیادہ بجٹ (روپے)" : "Max Budget (Rs.)"}
                </label>
                <input
                  type="number"
                  required
                  min={50}
                  value={budgetRupees}
                  onChange={(e) => setBudgetRupees(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-border-subtle px-3.5 py-2 text-xs"
                />
              </div>
              <select
                value={areaZoneId}
                onChange={(e) => setAreaZoneId(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2 text-xs"
              >
                <option value="">
                  {locale === "ur" ? "پورا ضلع میانوالی" : "All Mianwali Tehsils"}
                </option>
                {(districts[0]?.areaZones ?? []).map((z) => (
                  <option key={z.id} value={z.id}>
                    {locale === "ur" ? z.nameUr : z.nameEn}
                  </option>
                ))}
              </select>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2 text-xs"
              >
                <option value="">
                  {locale === "ur" ? "کوئی بھی کیٹیگری" : "Any Category"}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "ur" ? c.nameUr : c.nameEn}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-brand-accent py-3 text-xs font-bold text-white shadow-soft hover:bg-brand-accent-hover disabled:opacity-50"
              >
                {submitting
                  ? "..."
                  : locale === "ur"
                    ? "ضرورت پوسٹ کریں"
                    : "Post Demand to Local Shops"}
              </button>
            </form>
          )}
        </section>

        {/* Live Buyer Requests Feed */}
        <section className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-ink-primary">
              {locale === "ur"
                ? `زندہ مقامی طلب (${demands.length})`
                : `Open Mianwali Requests (${demands.length})`}
            </h2>
            <select
              value={filterZoneId}
              onChange={(e) => setFilterZoneId(e.target.value)}
              className="rounded-xl border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
            >
              <option value="">
                {locale === "ur" ? "تمام علاقے" : "All Areas"}
              </option>
              {(districts[0]?.areaZones ?? []).map((z) => (
                <option key={z.id} value={z.id}>
                  {locale === "ur" ? z.nameUr : z.nameEn}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-border-subtle bg-surface-card p-6 text-xs text-ink-secondary">
              Loading Mianwali requests...
            </div>
          ) : demands.length === 0 ? (
            <SpotState
              illustration={<DemandBoardIllustration />}
              badge={locale === "ur" ? "ابھی تک کوئی پوسٹ نہیں" : "Empty Board"}
              title={
                locale === "ur"
                  ? "پہلی مقامی ضرورت پوسٹ کریں"
                  : "No Open Buyer Requests Yet"
              }
              description={
                locale === "ur"
                  ? "بائیں جانب فارم سے اپنی ضرورت شامل کریں تاکہ مقامی دکاندار فوراً آفر بھیج سکیں۔"
                  : "Use the form to post what you need in Mianwali and let verified sellers contact you via Saudavo Messenger."
              }
            />
          ) : (
            <div className="space-y-3">
              {demands.map((d) => {
                const isOwn = user?.id === d.buyerId;
                return (
                  <article
                    key={d.id}
                    className="rounded-3xl border border-border-subtle bg-surface-card p-5 shadow-card space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 dir="auto" className="text-base font-extrabold text-ink-primary">
                            {d.title}
                          </h3>
                          <StatusBadge status={d.status} />
                        </div>
                        <p className="text-[11px] text-ink-secondary">
                          {d.buyerDisplayName} • {d.districtNameEn}
                          {d.areaZoneNameEn ? ` (${d.areaZoneNameEn})` : ""}
                          {d.categoryNameEn ? ` • ${d.categoryNameEn}` : ""}
                        </p>
                      </div>
                      <span className="rounded-xl bg-brand-primary-soft px-3 py-1.5 text-xs font-extrabold text-brand-primary">
                        {locale === "ur" ? "بجٹ: " : "Budget: "}
                        {formatPkrFromPaisa(d.budgetMaxPaisa, locale)}
                      </span>
                    </div>

                    <p dir="auto" className="text-xs leading-relaxed text-ink-secondary">
                      {d.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <span className="text-[11px] font-semibold text-ink-secondary">
                        {d.responsesCount} seller quote(s)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {isOwn && d.status === "OPEN" && (
                          <button
                            type="button"
                            onClick={() =>
                              void closeBuyerDemand(d.id, "FULFILLED").then(loadData)
                            }
                            className="rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-primary"
                          >
                            {locale === "ur" ? "مکمل نشان زد کریں" : "Mark Fulfilled"}
                          </button>
                        )}
                        {!isOwn && isSeller && (
                          <button
                            type="button"
                            onClick={() =>
                              setReplyDemandId((prev) =>
                                prev === d.id ? null : d.id
                              )
                            }
                            className="rounded-xl bg-brand-primary px-4 py-1.5 text-xs font-bold text-white"
                          >
                            {locale === "ur"
                              ? "میسنجر میں آفر بھیجیں"
                              : "Send Offer in Messenger"}
                          </button>
                        )}
                      </div>
                    </div>

                    {replyDemandId === d.id && (
                      <div className="flex flex-col gap-2 rounded-2xl bg-brand-primary-soft/40 p-3 sm:flex-row">
                        <input
                          type="text"
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder={
                            locale === "ur"
                              ? "اپنی قیمت اور ڈلیوری ٹائم لکھیں..."
                              : "Write your price offer & delivery availability..."
                          }
                          className="flex-1 rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          disabled={sendingReply}
                          onClick={() => void handleSellerReply(d.id)}
                          className="rounded-xl bg-brand-accent px-4 py-2 text-xs font-bold text-white"
                        >
                          {sendingReply ? "..." : "Send to Buyer Chat"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
