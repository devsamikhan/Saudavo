"use client";

import type { ModerationQueueResponse } from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../components/locale-provider";
import {
  ApiClientError,
  approveListingModeration,
  approveSellerModeration,
  enrollAdminMfa,
  fetchModerationQueue,
  rejectListingModeration,
  rejectSellerModeration,
  verifyAdminMfa
} from "../../lib/api-client";
import { formatPkrFromPaisa } from "../../lib/money";

export default function AdminConsolePage() {
  const { locale, user, refreshUser } = useAppContext();

  const [queue, setQueue] = useState<ModerationQueueResponse["data"] | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaEnrollment, setMfaEnrollment] = useState<{
    secretBase32: string;
    otpauthUri: string;
    accountLabel: string;
  } | null>(null);
  const [enrollingMfa, setEnrollingMfa] = useState(false);
  const [rejectReason, setRejectReason] = useState(
    "Insufficient store information for Mianwali closed beta."
  );
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
      const res = await fetchModerationQueue();
      setQueue(res.data);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Access restricted."
      );
    }
  }, [user]);

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
      <main className="mx-auto max-w-4xl px-4 py-10 text-center">
        <Link
          href="/auth"
          className="inline-block rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In as Staff
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-primary">
          Saudavo Trust & Moderation Console
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

          <section className="rounded-2xl border border-border-subtle bg-surface-card p-6">
            <h2 className="text-lg font-bold text-ink-primary">
              Pending Sellers ({queue?.sellers.length ?? 0})
            </h2>
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
          </section>

          <section className="rounded-2xl border border-border-subtle bg-surface-card p-6">
            <h2 className="text-lg font-bold text-ink-primary">
              Pending Listings (
              {(queue?.products.length ?? 0) + (queue?.services.length ?? 0)})
            </h2>
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
          </section>
        </div>
      )}
    </main>
  );
}
