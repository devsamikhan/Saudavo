"use client";

import type {
  CommissionRuleDto,
  DisputeDto,
  FeatureFlagDto,
  FeatureFlagKey,
  ModerationQueueResponse,
  OrderType,
  ReportDto,
  ResolveDisputeRequest,
  ResolveReportRequest,
  SellerSettlementRecordDto,
  SubscriptionRenewalRequestDto
} from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  EmptyInboxSpot,
  FeatureFlagsIllustration,
  SpotState
} from "../../components/illustrations";
import { useAppContext } from "../../components/locale-provider";
import {
  ConfirmActionButton,
  StatusBadge
} from "../../components/ui-primitives";
import {
  ApiClientError,
  approveListingModeration,
  approveSellerModeration,
  createAdminCommissionRule,
  createAdminSettlement,
  enrollAdminMfa,
  fetchAdminCommissionRules,
  fetchAdminDisputes,
  fetchAdminFeatureFlags,
  fetchAdminReports,
  fetchAdminSettlements,
  fetchAdminStores,
  fetchAdminSubscriptionRenewals,
  fetchModerationQueue,
  rejectListingModeration,
  rejectSellerModeration,
  resolveAdminDispute,
  resolveAdminReport,
  reviewAdminSubscriptionRenewal,
  triggerServiceAutoCompleteSweep,
  updateAdminFeatureFlag,
  verifyAdminMfa
} from "../../lib/api-client";
import { formatPkrFromPaisa, parseWholeRupeesToPaisa } from "../../lib/money";

export default function AdminConsolePage() {
  const { locale, t, user, refreshUser, refreshFeatures, showToast } =
    useAppContext();

  const [queue, setQueue] = useState<ModerationQueueResponse["data"] | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagDto[]>([]);
  const [togglingFlagKey, setTogglingFlagKey] = useState<FeatureFlagKey | null>(
    null
  );
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [disputes, setDisputes] = useState<DisputeDto[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRuleDto[]>([]);
  const [settlements, setSettlements] = useState<SellerSettlementRecordDto[]>([]);
  const [subscriptionRenewals, setSubscriptionRenewals] = useState<
    SubscriptionRenewalRequestDto[]
  >([]);
  const [renewalReviewNotes, setRenewalReviewNotes] = useState<
    Record<string, string>
  >({});
  const [adminStores, setAdminStores] = useState<
    Array<{ id: string; slug: string; displayName: string; status: string }>
  >([]);
  const [ruleName, setRuleName] = useState("");
  const [ruleScope, setRuleScope] = useState<"GLOBAL" | "ORDER_TYPE">("GLOBAL");
  const [ruleOrderType, setRuleOrderType] = useState<OrderType>("PHYSICAL");
  const [ruleRateBps, setRuleRateBps] = useState(0);
  const [settlementStoreId, setSettlementStoreId] = useState("");
  const [settlementDirection, setSettlementDirection] = useState<
    "SELLER_TO_PLATFORM" | "PLATFORM_TO_SELLER"
  >("SELLER_TO_PLATFORM");
  const [settlementMethod, setSettlementMethod] = useState<
    "BANK_TRANSFER" | "CASH_OFFICE" | "JAZZCASH_MANUAL" | "EASYPAISA_MANUAL"
  >("BANK_TRANSFER");
  const [settlementAmountRupees, setSettlementAmountRupees] = useState(1000);
  const [settlementRef, setSettlementRef] = useState("");
  const [settlementPeriodStart, setSettlementPeriodStart] = useState(() =>
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [settlementPeriodEnd, setSettlementPeriodEnd] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [settlementNotes, setSettlementNotes] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaEnrollment, setMfaEnrollment] = useState<{
    secretBase32: string;
    otpauthUri: string;
    accountLabel: string;
  } | null>(null);
  const [enrollingMfa, setEnrollingMfa] = useState(false);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState(
    "Insufficient store information for Mianwali closed beta."
  );
  const [reportResolutionNotes, setReportResolutionNotes] = useState<
    Record<string, string>
  >({});
  const [disputeResolutionNotes, setDisputeResolutionNotes] = useState<
    Record<string, string>
  >({});
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEnrollMfa = async () => {
    setErrorMsg(null);
    setEnrollingMfa(true);
    try {
      const res = await enrollAdminMfa();
      setMfaEnrollment({
        secretBase32: res.data.secretBase32,
        otpauthUri: res.data.otpauthUri,
        accountLabel: res.data.accountLabel
      });
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to start MFA enrollment."
      );
    } finally {
      setEnrollingMfa(false);
    }
  };

  const loadQueue = useCallback(async () => {
    if (!user || !user.mfaVerified) return;
    setErrorMsg(null);
    try {
      const [
        queueRes,
        flagsRes,
        reportsRes,
        disputesRes,
        rulesRes,
        settlementsRes,
        storesRes,
        renewalsRes
      ] = await Promise.all([
        fetchModerationQueue(),
        fetchAdminFeatureFlags().catch(() => ({ data: [] })),
        fetchAdminReports(),
        fetchAdminDisputes(),
        fetchAdminCommissionRules().catch(() => ({ data: [] })),
        fetchAdminSettlements().catch(() => ({ data: [] })),
        fetchAdminStores().catch(() => ({ data: [] })),
        fetchAdminSubscriptionRenewals().catch(() => ({ data: [] }))
      ]);
      setQueue(queueRes.data);
      setFeatureFlags(flagsRes.data);
      setReports(reportsRes.data);
      setDisputes(disputesRes.data);
      setCommissionRules(rulesRes.data);
      setSettlements(settlementsRes.data);
      setAdminStores(storesRes.data);
      setSubscriptionRenewals(renewalsRes.data);
      if (!settlementStoreId && storesRes.data[0]?.id) {
        setSettlementStoreId(storesRes.data[0].id);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Access restricted."
      );
    }
  }, [user]);

  const runAdminAction = async (
    action: () => Promise<unknown>,
    notice: string,
    fallbackError: string
  ) => {
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      await action();
      setStatusNotice(notice);
      await loadQueue();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : fallbackError
      );
    }
  };

  const handleAutoCompleteSweep = async () => {
    setErrorMsg(null);
    setStatusNotice(null);
    setSweepLoading(true);
    try {
      const res = await triggerServiceAutoCompleteSweep();
      setStatusNotice(
        `Auto-complete sweep checked ${res.data.checkedCount} orders; completed ${res.data.completedOrderIds.length}.`
      );
      await loadQueue();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Unable to run service auto-complete sweep."
      );
    } finally {
      setSweepLoading(false);
    }
  };

  const handleResolveReport = async (
    reportId: string,
    action: ResolveReportRequest["action"]
  ) => {
    const resolutionNote =
      reportResolutionNotes[reportId]?.trim() ||
      "Reviewed and resolved per Saudavo trust guidelines.";
    await runAdminAction(
      () => resolveAdminReport(reportId, { action, resolutionNote }),
      `Report marked ${action}.`,
      "Unable to resolve report."
    );
  };

  const handleResolveDispute = async (
    disputeId: string,
    resolutionOutcome: ResolveDisputeRequest["resolutionOutcome"]
  ) => {
    const resolutionNote =
      disputeResolutionNotes[disputeId]?.trim() ||
      "Dispute resolved following moderator review.";
    await runAdminAction(
      () => resolveAdminDispute(disputeId, { resolutionOutcome, resolutionNote }),
      `Dispute resolved (${resolutionOutcome}).`,
      "Unable to resolve dispute."
    );
  };

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleMfa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await verifyAdminMfa(mfaCode.trim());
      await refreshUser();
      await loadQueue();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Invalid MFA code."
      );
    }
  };

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 pb-24 md:pb-10">
        <SpotState
          illustration={<EmptyInboxSpot />}
          badge={t.adminConsoleTitle}
          title={
            locale === "ur"
              ? "اسٹاف اکاؤنٹ درکار ہے"
              : "Staff Authentication Required"
          }
          description={
            locale === "ur"
              ? "ماڈریشن، سیلر منظوری اور تنازعات دیکھنے کے لیے اپنے اسٹاف اکاؤنٹ سے لاگ ان کریں (PQ-06)۔"
              : "Sign in with your verified Saudavo moderator or admin account (TOTP MFA protected • PQ-06)."
          }
          actions={
            <Link
              href="/auth"
              className="inline-flex rounded-2xl bg-brand-primary px-6 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-brand-primary-hover"
            >
              Sign In as Staff
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 md:pb-8 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-primary">
          {t.adminConsoleTitle}
        </h1>
        <span className="rounded-full bg-brand-primary-soft px-3.5 py-1 text-xs font-semibold text-brand-primary">
          {user.mfaVerified
            ? "Staff TOTP MFA Verified • Audit Logging Active"
            : "MFA Verification Required"}
        </span>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {statusNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusNotice}
        </div>
      )}

      {!user.mfaVerified ? (
        <div className="max-w-lg space-y-4">
          {!user.mfaEnrolled && (
            <section className="space-y-3 rounded-2xl border border-border-subtle bg-surface-card p-6">
              <h2 className="text-base font-bold text-ink-primary">
                First-Time Staff Authenticator Setup (PQ-06)
              </h2>
              <p className="text-xs text-ink-secondary">
                {locale === "ur"
                  ? "ایڈمن اور ماڈریشن ٹولز کھولنے کے لیے اپنی Authenticator ایپ (Google Authenticator / Authy) میں سیکریٹ کی درج کریں۔"
                  : "Generate a TOTP secret key and add it to your authenticator app (Google Authenticator / Authy / 1Password), then verify your first 6-digit code below."}
              </p>

              {!mfaEnrollment ? (
                <button
                  type="button"
                  disabled={enrollingMfa}
                  onClick={() => void handleEnrollMfa()}
                  className="rounded-xl bg-brand-accent px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {enrollingMfa
                    ? "Generating Secret..."
                    : "Generate Authenticator Setup Key"}
                </button>
              ) : (
                <div className="space-y-2 rounded-xl border border-brand-primary/30 bg-brand-primary-soft/40 p-4 text-xs">
                  <p className="font-semibold text-brand-primary">
                    Account: {mfaEnrollment.accountLabel}
                  </p>
                  <div>
                    <span className="text-ink-secondary">Manual Setup Secret Key (Base32):</span>
                    <code className="mt-1 block select-all break-all rounded-lg bg-surface-card px-3 py-2 font-mono text-xs font-bold text-ink-primary">
                      {mfaEnrollment.secretBase32}
                    </code>
                  </div>
                  <div>
                    <span className="text-ink-secondary">Provisioning URI:</span>
                    <code className="mt-1 block select-all break-all rounded-lg bg-surface-card px-3 py-1.5 font-mono text-[11px] text-ink-secondary">
                      {mfaEnrollment.otpauthUri}
                    </code>
                  </div>
                </div>
              )}
            </section>
          )}

          <form
            onSubmit={handleMfa}
            className="space-y-3 rounded-2xl border border-border-subtle bg-surface-card p-6"
          >
            <h2 className="text-base font-bold text-ink-primary">
              Verify Staff TOTP MFA (PQ-06)
            </h2>
            <label
              htmlFor="admin-mfa-code"
              className="block text-xs font-semibold text-ink-secondary"
            >
              6-Digit Authenticator Code
            </label>
            <input
              id="admin-mfa-code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              required
              placeholder="6-digit code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="w-full rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-brand-primary py-2.5 text-sm font-semibold text-white"
            >
              {user.mfaEnrolled
                ? "Verify & Unlock Review Queue"
                : "Activate MFA & Unlock Review Queue"}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Illustrated 1-Click Platform Feature Control Center */}
          <section className="rounded-3xl border border-brand-primary/25 bg-surface-card p-6 shadow-card space-y-5">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1.5 max-w-2xl">
                <span className="inline-block rounded-full bg-brand-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-primary">
                  {locale === "ur" ? "ون کلک رول آؤٹ کنٹرول" : "1-Click Platform Rollout Control"}
                </span>
                <h2 className="text-xl font-extrabold text-ink-primary">
                  {locale === "ur"
                    ? "سوداو فیچر کنٹرول سینٹر (آن / آف)"
                    : "Saudavo Feature Control Center"}
                </h2>
                <p className="text-xs leading-relaxed text-ink-secondary">
                  {locale === "ur"
                    ? "ماہانہ سیلر سبسکرپشن سمیت تمام جدید فیچرز یہاں سے ایک کلک میں آن یا آف کریں۔ آف شدہ فیچر صارفین کو نظر نہیں آئیں گے۔"
                    : "Turn Monthly Seller Subscriptions and all 5 Saudavo differentiators ON or OFF in one click. Disabled modules remain completely hidden from buyers and sellers until you launch them."}
                </p>
              </div>
              <FeatureFlagsIllustration />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {featureFlags.map((flag) => (
                <div
                  key={flag.key}
                  className={`flex items-start justify-between gap-3 rounded-2xl border p-4 transition ${
                    flag.isEnabled
                      ? "border-brand-primary/40 bg-brand-primary-soft/30"
                      : "border-border-subtle bg-surface-canvas"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-accent">
                        {flag.category}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          flag.isEnabled
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {flag.isEnabled ? "LIVE" : "OFF"}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-ink-primary">
                      {locale === "ur" ? flag.nameUr : flag.nameEn}
                    </h3>
                    <p className="text-xs leading-relaxed text-ink-secondary">
                      {locale === "ur" ? flag.descriptionUr : flag.descriptionEn}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-pressed={flag.isEnabled}
                    disabled={togglingFlagKey === flag.key}
                    onClick={() => {
                      setTogglingFlagKey(flag.key);
                      setErrorMsg(null);
                      void updateAdminFeatureFlag(flag.key, {
                        isEnabled: !flag.isEnabled
                      })
                        .then(async (res) => {
                          setFeatureFlags((prev) =>
                            prev.map((item) =>
                              item.key === flag.key ? res.data : item
                            )
                          );
                          await refreshFeatures();
                          showToast(
                            `${flag.nameEn}: ${res.data.isEnabled ? "ENABLED" : "TURNED OFF"}`,
                            res.data.isEnabled ? "primary" : "neutral"
                          );
                        })
                        .catch((err: unknown) => {
                          setErrorMsg(
                            err instanceof ApiClientError
                              ? err.message
                              : "Unable to toggle feature."
                          );
                        })
                        .finally(() => setTogglingFlagKey(null));
                    }}
                    className={`shrink-0 rounded-xl px-4 py-2 text-xs font-extrabold transition disabled:opacity-50 ${
                      flag.isEnabled
                        ? "bg-brand-primary text-white hover:bg-brand-primary-hover"
                        : "border border-brand-primary bg-surface-card text-brand-primary hover:bg-brand-primary-soft"
                    }`}
                  >
                    {togglingFlagKey === flag.key
                      ? "..."
                      : flag.isEnabled
                        ? locale === "ur"
                          ? "آف کریں"
                          : "Turn OFF"
                        : locale === "ur"
                          ? "آن کریں (1-Click)"
                          : "Enable (1-Click)"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="rounded-2xl border border-border-subtle bg-surface-card p-5">
            <label className="block text-xs font-semibold text-ink-secondary">
              Mandatory Rejection Reason (Used when rejecting sellers/listings)
            </label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
            />
          </div>

          <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink-primary">
              {locale === "ur" ? "زیرِ التواء سیلرز" : "Pending Sellers"} (
              {queue?.sellers.length ?? 0})
            </h2>
            {(queue?.sellers.length ?? 0) === 0 ? (
              <p className="mt-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-xs text-ink-secondary">
                {locale === "ur"
                  ? "کوئی سیلر درخواست باقی نہیں — سب منظور یا مکمل ہو چکی ہیں۔"
                  : "Queue clear — no pending seller profiles awaiting review."}
              </p>
            ) : (
            <div className="mt-4 space-y-3">
              {(queue?.sellers ?? []).map((seller) => (
                <div
                  key={seller.sellerProfileId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle p-4"
                >
                  <div>
                    <p dir="auto" className="text-sm font-bold text-ink-primary">
                      {seller.store?.displayName ?? seller.sellerProfileId} (
                      {seller.sellerType})
                    </p>
                    <p className="text-xs text-ink-secondary">
                      Status: {seller.verificationStatus} • No CNIC stored (PQ-07)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void approveSellerModeration(seller.sellerProfileId, {
                          notes: "Approved from Admin Console"
                        }).then(loadQueue)
                      }
                      className="rounded-lg bg-brand-primary px-3.5 py-1.5 text-xs font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void rejectSellerModeration(seller.sellerProfileId, {
                          reason: rejectReason
                        }).then(loadQueue)
                      }
                      className="rounded-lg bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </section>

          <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink-primary">
              {locale === "ur" ? "زیرِ التواء لسٹنگز" : "Pending Listings"} (
              {(queue?.products.length ?? 0) + (queue?.services.length ?? 0)})
            </h2>
            {(queue?.products.length ?? 0) + (queue?.services.length ?? 0) === 0 ? (
              <p className="mt-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-xs text-ink-secondary">
                {locale === "ur"
                  ? "کوئی پروڈکٹ یا سروس منظوری کے لیے باقی نہیں۔"
                  : "Queue clear — no pending products or services awaiting moderation."}
              </p>
            ) : (
            <div className="mt-4 space-y-3">
              {(queue?.products ?? []).map((prod) => (
                <div
                  key={prod.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle p-4"
                >
                  <div>
                    <p dir="auto" className="text-sm font-bold text-ink-primary">
                      [PRODUCT] {prod.title}
                    </p>
                    <p className="text-xs text-ink-secondary">
                      {formatPkrFromPaisa(prod.basePricePaisa, locale)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void approveListingModeration(prod.id, {
                          listingType: "PRODUCT"
                        }).then(loadQueue)
                      }
                      className="rounded-lg bg-brand-primary px-3.5 py-1.5 text-xs font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void rejectListingModeration(prod.id, {
                          listingType: "PRODUCT",
                          reason: rejectReason
                        }).then(loadQueue)
                      }
                      className="rounded-lg bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}

              {(queue?.services ?? []).map((svc) => (
                <div
                  key={svc.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle p-4"
                >
                  <div>
                    <p dir="auto" className="text-sm font-bold text-ink-primary">
                      [SERVICE • {svc.serviceMode}] {svc.title}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void approveListingModeration(svc.id, {
                          listingType: "SERVICE"
                        }).then(loadQueue)
                      }
                      className="rounded-lg bg-brand-primary px-3.5 py-1.5 text-xs font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void rejectListingModeration(svc.id, {
                          listingType: "SERVICE",
                          reason: rejectReason
                        }).then(loadQueue)
                      }
                      className="rounded-lg bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </section>

          <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card space-y-4">
            <div>
              <h2 className="text-lg font-bold text-ink-primary">
                Seller Subscription Renewals ({subscriptionRenewals.length})
              </h2>
              <p className="text-xs text-ink-secondary">
                Verify offline Raast / JazzCash / Easypaisa monthly plan transfers and activate 30-day seller subscriptions.
              </p>
            </div>
            {subscriptionRenewals.length === 0 ? (
              <p className="text-xs text-ink-secondary">
                No subscription renewal requests submitted yet.
              </p>
            ) : (
              <div className="space-y-3">
                {subscriptionRenewals.map((reqItem) => (
                  <div
                    key={reqItem.id}
                    className="space-y-2 rounded-xl border border-border-subtle p-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink-primary">
                        {reqItem.storeDisplayName ?? reqItem.storeId} —{" "}
                        {reqItem.planNameEn ?? reqItem.planCode} (
                        {formatPkrFromPaisa(reqItem.amountPaisa, locale)})
                      </p>
                      <StatusBadge status={reqItem.status} />
                    </div>
                    <p className="text-ink-secondary">
                      {reqItem.paymentMethod} • Ref: {reqItem.transactionReference}
                      {reqItem.payerAccountNote ? ` • ${reqItem.payerAccountNote}` : ""}
                    </p>
                    {reqItem.status === "PENDING" && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={renewalReviewNotes[reqItem.id] ?? ""}
                          onChange={(e) =>
                            setRenewalReviewNotes((prev) => ({
                              ...prev,
                              [reqItem.id]: e.target.value
                            }))
                          }
                          placeholder="Verification note (optional)..."
                          className="w-full rounded-lg border border-border-subtle px-3 py-2 text-xs sm:min-w-[200px] sm:flex-1"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void runAdminAction(
                              () =>
                                reviewAdminSubscriptionRenewal(reqItem.id, {
                                  decision: "APPROVED",
                                  ...(renewalReviewNotes[reqItem.id]?.trim()
                                    ? {
                                        reviewNote:
                                          renewalReviewNotes[reqItem.id]!.trim()
                                      }
                                    : {})
                                }),
                              "Seller subscription approved for 30 days.",
                              "Unable to approve subscription renewal."
                            )
                          }
                          className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Approve (30 Days)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void runAdminAction(
                              () =>
                                reviewAdminSubscriptionRenewal(reqItem.id, {
                                  decision: "REJECTED",
                                  ...(renewalReviewNotes[reqItem.id]?.trim()
                                    ? {
                                        reviewNote:
                                          renewalReviewNotes[reqItem.id]!.trim()
                                      }
                                    : {})
                                }),
                              "Subscription renewal marked rejected.",
                              "Unable to reject subscription renewal."
                            )
                          }
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card space-y-4">
            <div>
              <h2 className="text-lg font-bold text-ink-primary">
                Commission Policy Rules ({commissionRules.length})
              </h2>
              <p className="text-xs text-ink-secondary">
                Versioned commission rules (delivery fees always excluded). Closed beta runs at 0 bps (0%).
              </p>
            </div>

            {commissionRules.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {commissionRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle p-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-ink-primary">
                        v{rule.version} • {rule.name}
                      </p>
                      <p className="text-ink-secondary">
                        {rule.scopeType}
                        {rule.orderType ? ` (${rule.orderType})` : ""} •{" "}
                        {(rule.rateBps / 100).toFixed(2)}% ({rule.rateBps} bps)
                      </p>
                    </div>
                    <StatusBadge status={rule.isActive ? "ACTIVE" : "ARCHIVED"} />
                  </div>
                ))}
              </div>
            )}

            {user.roles.includes("SUPER_ADMIN") && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void runAdminAction(
                    async () => {
                      await createAdminCommissionRule({
                        name: ruleName.trim(),
                        scopeType: ruleScope,
                        ...(ruleScope === "ORDER_TYPE"
                          ? { orderType: ruleOrderType }
                          : {}),
                        rateBps: ruleRateBps,
                        includeDeliveryFee: false
                      });
                      setRuleName("");
                    },
                    "New commission rule version activated.",
                    "Unable to create commission rule."
                  );
                }}
                className="grid grid-cols-1 gap-2.5 border-t border-border-subtle pt-4 sm:grid-cols-4"
              >
                <input
                  type="text"
                  required
                  minLength={3}
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="Rule name (e.g. Post-Beta Standard)"
                  className="rounded-xl border border-border-subtle px-3 py-2 text-xs sm:col-span-2"
                />
                <select
                  value={ruleScope}
                  onChange={(e) =>
                    setRuleScope(e.target.value === "ORDER_TYPE" ? "ORDER_TYPE" : "GLOBAL")
                  }
                  className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                >
                  <option value="GLOBAL">GLOBAL</option>
                  <option value="ORDER_TYPE">ORDER_TYPE</option>
                </select>
                {ruleScope === "ORDER_TYPE" && (
                  <select
                    value={ruleOrderType}
                    onChange={(e) =>
                      setRuleOrderType(e.target.value === "SERVICE" ? "SERVICE" : "PHYSICAL")
                    }
                    className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                  >
                    <option value="PHYSICAL">PHYSICAL</option>
                    <option value="SERVICE">SERVICE</option>
                  </select>
                )}
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={ruleRateBps}
                  onChange={(e) => setRuleRateBps(Number(e.target.value))}
                  placeholder="Rate bps (e.g. 500 = 5%)"
                  className="rounded-xl border border-border-subtle px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white"
                >
                  Publish Rule Version
                </button>
              </form>
            )}
          </section>

          <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card space-y-4">
            <div>
              <h2 className="text-lg font-bold text-ink-primary">
                Offline Seller Settlements ({settlements.length})
              </h2>
              <p className="text-xs text-ink-secondary">
                Accounting record of verified offline bank, cash-office, or manual settlements (no platform wallet/escrow).
              </p>
            </div>

            {adminStores.length > 0 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void runAdminAction(
                    async () => {
                      await createAdminSettlement({
                        storeId: settlementStoreId,
                        direction: settlementDirection,
                        settlementMethod,
                        amountPaisa: parseWholeRupeesToPaisa(settlementAmountRupees),
                        ...(settlementRef.trim()
                          ? { externalReference: settlementRef.trim() }
                          : {}),
                        periodStart: new Date(`${settlementPeriodStart}T00:00:00.000Z`).toISOString(),
                        periodEnd: new Date(`${settlementPeriodEnd}T23:59:59.999Z`).toISOString(),
                        ...(settlementNotes.trim()
                          ? { notes: settlementNotes.trim() }
                          : {})
                      });
                      setSettlementRef("");
                      setSettlementNotes("");
                    },
                    "Offline settlement recorded & verified.",
                    "Unable to record settlement."
                  );
                }}
                className="grid grid-cols-1 gap-2.5 rounded-2xl border border-border-subtle bg-surface-muted/40 p-4 sm:grid-cols-3"
              >
                <select
                  required
                  value={settlementStoreId}
                  onChange={(e) => setSettlementStoreId(e.target.value)}
                  className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                >
                  {adminStores.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.displayName} ({st.status})
                    </option>
                  ))}
                </select>
                <select
                  value={settlementDirection}
                  onChange={(e) =>
                    setSettlementDirection(
                      e.target.value === "PLATFORM_TO_SELLER"
                        ? "PLATFORM_TO_SELLER"
                        : "SELLER_TO_PLATFORM"
                    )
                  }
                  className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                >
                  <option value="SELLER_TO_PLATFORM">SELLER_TO_PLATFORM</option>
                  <option value="PLATFORM_TO_SELLER">PLATFORM_TO_SELLER</option>
                </select>
                <select
                  value={settlementMethod}
                  onChange={(e) =>
                    setSettlementMethod(
                      e.target.value as
                        | "BANK_TRANSFER"
                        | "CASH_OFFICE"
                        | "JAZZCASH_MANUAL"
                        | "EASYPAISA_MANUAL"
                    )
                  }
                  className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                >
                  <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  <option value="CASH_OFFICE">CASH_OFFICE</option>
                  <option value="JAZZCASH_MANUAL">JAZZCASH_MANUAL</option>
                  <option value="EASYPAISA_MANUAL">EASYPAISA_MANUAL</option>
                </select>
                <input
                  type="number"
                  required
                  min={1}
                  value={settlementAmountRupees}
                  onChange={(e) => setSettlementAmountRupees(Number(e.target.value))}
                  placeholder="Amount (PKR Rs.)"
                  className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                />
                <input
                  type="date"
                  required
                  value={settlementPeriodStart}
                  onChange={(e) => setSettlementPeriodStart(e.target.value)}
                  className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                />
                <input
                  type="date"
                  required
                  value={settlementPeriodEnd}
                  onChange={(e) => setSettlementPeriodEnd(e.target.value)}
                  className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={settlementRef}
                  onChange={(e) => setSettlementRef(e.target.value)}
                  placeholder="Receipt / Transfer Ref (optional)"
                  className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white"
                >
                  Record Verified Settlement
                </button>
              </form>
            )}

            {settlements.length > 0 && (
              <div className="space-y-2">
                {settlements.map((s) => {
                  const storeName =
                    adminStores.find((st) => st.id === s.storeId)?.displayName ??
                    s.storeId;
                  return (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle p-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-ink-primary">
                          {storeName} — {formatPkrFromPaisa(s.amountPaisa, locale)}
                        </p>
                        <p className="text-ink-secondary">
                          {s.direction} • {s.settlementMethod}
                          {s.externalReference ? ` • Ref: ${s.externalReference}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink-primary">
                  Service Order Auto-Complete Policy (PQ-10)
                </h2>
                <p className="text-xs text-ink-secondary">
                  Automatically completes delivered service orders after 7 days
                  of customer inaction.
                </p>
              </div>
              <button
                type="button"
                disabled={sweepLoading}
                onClick={() => void handleAutoCompleteSweep()}
                className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {sweepLoading
                  ? "Running Sweep..."
                  : "Run 7-Day Auto-Complete Sweep"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-surface-card p-6">
            <h2 className="text-lg font-bold text-ink-primary">
              Abuse Reports ({reports.length})
            </h2>
            {reports.length === 0 ? (
              <p className="mt-3 text-xs text-ink-secondary">
                No abuse reports in queue.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="space-y-2 rounded-xl border border-border-subtle p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink-primary">
                        [{report.targetType}] {report.reasonCode}
                      </p>
                      <StatusBadge status={report.status} />
                    </div>
                    <p dir="auto" className="text-xs text-ink-secondary">
                      {report.details}
                    </p>
                    {report.status === "OPEN" && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={reportResolutionNotes[report.id] ?? ""}
                          onChange={(e) =>
                            setReportResolutionNotes((prev) => ({
                              ...prev,
                              [report.id]: e.target.value
                            }))
                          }
                          placeholder="Resolution note (min 5 chars)..."
                          className="w-full rounded-lg border border-border-subtle px-3 py-2 text-xs sm:min-w-[220px] sm:flex-1"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void handleResolveReport(report.id, "DISMISSED")
                          }
                          className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-primary"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleResolveReport(
                              report.id,
                              "WARNING_ISSUED"
                            )
                          }
                          className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800"
                        >
                          Issue Warning
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleResolveReport(
                              report.id,
                              "CONTENT_HIDDEN"
                            )
                          }
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                        >
                          Hide Content
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border-subtle bg-surface-card p-6">
            <h2 className="text-lg font-bold text-ink-primary">
              Order Disputes ({disputes.length})
            </h2>
            {disputes.length === 0 ? (
              <p className="mt-3 text-xs text-ink-secondary">
                No order disputes found.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {disputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="space-y-2 rounded-xl border border-border-subtle p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink-primary">
                        Order {dispute.orderId} • {dispute.disputeType}
                      </p>
                      <StatusBadge status={dispute.status} />
                    </div>
                    <p dir="auto" className="text-xs text-ink-secondary">
                      {dispute.description}
                    </p>
                    {(dispute.status === "OPEN" ||
                      dispute.status === "UNDER_REVIEW") && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={disputeResolutionNotes[dispute.id] ?? ""}
                          onChange={(e) =>
                            setDisputeResolutionNotes((prev) => ({
                              ...prev,
                              [dispute.id]: e.target.value
                            }))
                          }
                          placeholder="Resolution note (min 5 chars)..."
                          className="w-full rounded-lg border border-border-subtle px-3 py-2 text-xs sm:min-w-[220px] sm:flex-1"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void handleResolveDispute(
                              dispute.id,
                              "COMPLETE_ORDER"
                            )
                          }
                          className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Complete Order
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleResolveDispute(
                              dispute.id,
                              "NO_FINANCIAL_CHANGE"
                            )
                          }
                          className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-primary"
                        >
                          Close Without Change
                        </button>
                        <ConfirmActionButton
                          label="Cancel & Full Refund"
                          confirmLabel={t.confirmYesBtn}
                          cancelLabel={t.cancelBtn}
                          onConfirm={() =>
                            handleResolveDispute(
                              dispute.id,
                              "CANCEL_WITH_FULL_REFUND"
                            )
                          }
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
