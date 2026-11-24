"use client";

import type { CreateReportRequest, ReportTargetType } from "@saudavo/contracts";
import { useState } from "react";
import { ApiClientError, createReport } from "../lib/api-client";
import { useAppContext } from "./locale-provider";

const STATUS_STYLE_MAP: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-800 border-emerald-200",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  COLLECTED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CONFIRMED: "bg-teal-50 text-teal-800 border-teal-200",
  IN_PROGRESS: "bg-teal-50 text-teal-800 border-teal-200",
  READY_FOR_DISPATCH: "bg-sky-50 text-sky-800 border-sky-200",
  DELIVERED: "bg-sky-50 text-sky-800 border-sky-200",
  DELIVERY_SUBMITTED: "bg-amber-50 text-amber-800 border-amber-200",
  PENDING_REVIEW: "bg-amber-50 text-amber-800 border-amber-200",
  PENDING_CONFIRMATION: "bg-amber-50 text-amber-800 border-amber-200",
  PENDING_COLLECTION: "bg-amber-50 text-amber-800 border-amber-200",
  REVISION_REQUESTED: "bg-orange-50 text-orange-800 border-orange-200",
  DISPUTED: "bg-red-50 text-red-800 border-red-200",
  REJECTED: "bg-red-50 text-red-800 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-700 border-slate-200",
  FAILED_REFUSED: "bg-red-50 text-red-800 border-red-200"
};

export function StatusBadge({ status }: { status: string }) {
  const tone =
    STATUS_STYLE_MAP[status] ?? "bg-surface-muted text-ink-secondary border-border-subtle";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${tone}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function TrustPill({
  label,
  variant = "verified"
}: {
  label: string;
  variant?: "verified" | "privacy" | "cod" | "accent";
}) {
  const styles: Record<string, string> = {
    verified: "bg-brand-primary-soft text-brand-primary border-brand-primary/20",
    privacy: "bg-emerald-50 text-emerald-800 border-emerald-200",
    cod: "bg-brand-accent-soft text-brand-accent border-brand-accent/20",
    accent: "bg-amber-50 text-amber-900 border-amber-200"
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles[variant]}`}
    >
      {label}
    </span>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-border-subtle bg-surface-card p-4 space-y-3">
      <div className="h-36 w-full rounded-xl bg-surface-muted" />
      <div className="h-4 w-3/4 rounded bg-surface-muted" />
      <div className="h-3 w-1/2 rounded bg-surface-muted" />
      <div className="h-6 w-1/3 rounded bg-surface-muted" />
    </div>
  );
}

export function CategoryArtwork({
  type,
  label
}: {
  type: "PRODUCT" | "SERVICE";
  label: string;
}) {
  const isService = type === "SERVICE";
  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden px-4 text-center ${
        isService
          ? "bg-gradient-to-br from-brand-accent-soft via-amber-50 to-white text-brand-accent"
          : "bg-gradient-to-br from-brand-primary-soft via-emerald-50 to-white text-brand-primary"
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 shadow-sm">
        {isService ? (
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        )}
      </div>
      <span className="text-xs font-semibold tracking-wide opacity-90">
        {label}
      </span>
    </div>
  );
}

export function ConfirmActionButton({
  label,
  confirmLabel,
  cancelLabel,
  onConfirm,
  className = "rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
}: {
  label: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setArmed(true);
        }}
        className={className}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setArmed(false);
          void onConfirm();
        }}
        className="rounded-lg bg-red-700 px-2.5 py-1 text-xs font-semibold text-white"
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setArmed(false);
        }}
        className="rounded-lg bg-surface-muted px-2 py-1 text-xs font-semibold text-ink-secondary"
      >
        {cancelLabel}
      </button>
    </span>
  );
}

export function OrderTimeline({
  orderType,
  status,
  locale
}: {
  orderType: "PHYSICAL" | "SERVICE";
  status: string;
  locale: "en" | "ur";
}) {
  if (status === "CANCELLED" || status === "DISPUTED") {
    return (
      <div className="mt-3 rounded-xl border border-red-200 bg-red-50/70 px-3 py-2 text-xs font-semibold text-red-800">
        {status === "CANCELLED"
          ? locale === "ur"
            ? "یہ آرڈر منسوخ ہو چکا ہے۔"
            : "This order has been cancelled."
          : locale === "ur"
            ? "یہ آرڈر ماڈریٹر تنازعہ (Dispute) کے تحت ہے۔"
            : "This order is currently under moderator dispute review."}
      </div>
    );
  }

  const steps =
    orderType === "SERVICE"
      ? [
          {
            key: "PENDING_CONFIRMATION",
            en: "Placed",
            ur: "موصول"
          },
          { key: "CONFIRMED", en: "Confirmed", ur: "منظور" },
          { key: "IN_PROGRESS", en: "Working", ur: "جاری" },
          { key: "DELIVERY_SUBMITTED", en: "Delivered", ur: "مکمل کام" },
          { key: "COMPLETED", en: "Completed", ur: "مکمل" }
        ]
      : [
          { key: "PENDING_CONFIRMATION", en: "Placed", ur: "موصول" },
          { key: "CONFIRMED", en: "Confirmed", ur: "منظور" },
          { key: "READY_FOR_DISPATCH", en: "Ready", ur: "تیار" },
          { key: "DELIVERED", en: "Delivered", ur: "ڈلیور" },
          { key: "COMPLETED", en: "Completed", ur: "مکمل" }
        ];

  const normalizedStatus =
    status === "REVISION_REQUESTED"
      ? "IN_PROGRESS"
      : status === "PREPARING"
        ? "CONFIRMED"
        : status === "OUT_FOR_DELIVERY"
          ? "READY_FOR_DISPATCH"
          : status;

  const activeIdx = Math.max(
    0,
    steps.findIndex((s) => s.key === normalizedStatus)
  );

  return (
    <div className="mt-3 grid grid-cols-5 gap-1.5" aria-label="Order progress">
      {steps.map((step, idx) => {
        const reached = idx <= activeIdx;
        return (
          <div key={step.key} className="space-y-1">
            <div
              className={`h-1.5 w-full rounded-full ${
                reached ? "bg-brand-primary" : "bg-surface-muted"
              }`}
            />
            <p
              className={`truncate text-[10px] font-semibold ${
                reached ? "text-brand-primary" : "text-ink-secondary"
              }`}
            >
              {locale === "ur" ? step.ur : step.en}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function ReportListingButton({
  targetType,
  targetId
}: {
  targetType: ReportTargetType;
  targetId: string;
}) {
  const { locale, t, user } = useAppContext();
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] =
    useState<CreateReportRequest["reasonCode"]>("MISLEADING_INFO");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      await createReport({
        targetType,
        targetId,
        reasonCode,
        details: details.trim()
      });
      setDetails("");
      setOpen(false);
      setNotice(t.reportSubmittedNotice);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : locale === "ur"
            ? "رپورٹ جمع کرانے میں مسئلہ پیش آیا۔"
            : "Unable to submit report."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:border-red-300 hover:text-red-700"
      >
        {t.reportListingLabel}
      </button>

      {notice && (
        <p className="text-xs font-medium text-emerald-700">{notice}</p>
      )}
      {errorMsg && <p className="text-xs font-medium text-red-700">{errorMsg}</p>}

      {open && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-red-200 bg-red-50/40 p-3.5 space-y-2.5"
        >
          <select
            value={reasonCode}
            onChange={(e) =>
              setReasonCode(e.target.value as CreateReportRequest["reasonCode"])
            }
            className="w-full rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1.5 text-xs"
          >
            <option value="MISLEADING_INFO">Misleading Information</option>
            <option value="PROHIBITED_ITEM">Prohibited Item</option>
            <option value="SCAM_OR_FRAUD">Scam or Fraud</option>
            <option value="ABUSIVE_LANGUAGE">Abusive Language</option>
            <option value="PRIVACY_VIOLATION">Privacy Violation</option>
            <option value="OTHER">Other</option>
          </select>
          <textarea
            required
            minLength={5}
            maxLength={2000}
            rows={2}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={
              locale === "ur"
                ? "مسئلے کی مختصر تفصیل لکھیں (کم از کم 5 حروف)..."
                : "Describe the issue for moderators (min 5 chars)..."
            }
            className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "..." : t.submitReportButton}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-muted"
            >
              {locale === "ur" ? "بند کریں" : "Cancel"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
