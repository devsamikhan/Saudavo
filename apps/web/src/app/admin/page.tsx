"use client";

import type {
  DisputeDto,
  ModerationQueueResponse,
  ReportDto,
  ResolveDisputeRequest,
  ResolveReportRequest
} from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyInboxSpot, SpotState } from "../../components/illustrations";
import { useAppContext } from "../../components/locale-provider";
import {
  ConfirmActionButton,
  StatusBadge
} from "../../components/ui-primitives";
import {
  ApiClientError,
  approveListingModeration,
  approveSellerModeration,
  enrollAdminMfa,
  fetchAdminDisputes,
  fetchAdminReports,
  fetchModerationQueue,
  rejectListingModeration,
  rejectSellerModeration,
  resolveAdminDispute,
  resolveAdminReport,
  triggerServiceAutoCompleteSweep,
  verifyAdminMfa
} from "../../lib/api-client";
import { formatPkrFromPaisa } from "../../lib/money";

export default function AdminConsolePage() {
  const { locale, t, user, refreshUser } = useAppContext();

  const [queue, setQueue] = useState<ModerationQueueResponse["data"] | null>(null);
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [disputes, setDisputes] = useState<DisputeDto[]>([]);
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
      const [queueRes, reportsRes, disputesRes] = await Promise.all([
        fetchModerationQueue(),
        fetchAdminReports(),
        fetchAdminDisputes()
      ]);
      setQueue(queueRes.data);
      setReports(reportsRes.data);
      setDisputes(disputesRes.data);
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
                          className="min-w-[220px] flex-1 rounded-lg border border-border-subtle px-3 py-1.5 text-xs"
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
                          className="min-w-[220px] flex-1 rounded-lg border border-border-subtle px-3 py-1.5 text-xs"
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
