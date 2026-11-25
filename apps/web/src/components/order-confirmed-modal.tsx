"use client";

import type { OrderCreatedSummary } from "@saudavo/contracts";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { formatPkrFromPaisa } from "../lib/money";
import { useAppContext } from "./locale-provider";

const CONFETTI_PARTICLES: Array<{
  color: string;
  tx: string;
  ty: string;
  rot: string;
  size: string;
  delay: string;
}> = [
  { color: "#0F6B52", tx: "-115px", ty: "-90px", rot: "-140deg", size: "h-2.5 w-2.5", delay: "0.02s" },
  { color: "#D96B27", tx: "-72px", ty: "-120px", rot: "160deg", size: "h-2 w-4", delay: "0.05s" },
  { color: "#E7F4EF", tx: "-32px", ty: "-132px", rot: "90deg", size: "h-2.5 w-2.5", delay: "0.08s" },
  { color: "#F59E0B", tx: "28px", ty: "-128px", rot: "-110deg", size: "h-2.5 w-2.5", delay: "0.04s" },
  { color: "#D96B27", tx: "85px", ty: "-114px", rot: "190deg", size: "h-2 w-4", delay: "0.07s" },
  { color: "#0F6B52", tx: "118px", ty: "-82px", rot: "145deg", size: "h-2.5 w-2.5", delay: "0.10s" },
  { color: "#F59E0B", tx: "-124px", ty: "-30px", rot: "-200deg", size: "h-2 w-3.5", delay: "0.06s" },
  { color: "#0F6B52", tx: "124px", ty: "-28px", rot: "220deg", size: "h-2 w-3.5", delay: "0.09s" },
  { color: "#D96B27", tx: "-90px", ty: "54px", rot: "-170deg", size: "h-2.5 w-2.5", delay: "0.12s" },
  { color: "#0F6B52", tx: "92px", ty: "52px", rot: "130deg", size: "h-2.5 w-2.5", delay: "0.11s" },
  { color: "#E7F4EF", tx: "-44px", ty: "76px", rot: "85deg", size: "h-3 w-2", delay: "0.13s" },
  { color: "#F59E0B", tx: "46px", ty: "78px", rot: "-95deg", size: "h-3 w-2", delay: "0.14s" }
];

export function OrderConfirmedModal({
  order,
  onClose
}: {
  order: OrderCreatedSummary;
  onClose?: () => void;
}) {
  const { locale, t } = useAppContext();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const paymentLabel =
    order.paymentMethod === "MANUAL_OFFLINE"
      ? t.remoteBadge
      : t.codBadge;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-confirmed-heading"
      onClick={(event) => {
        if (event.target === event.currentTarget && onClose) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#094232]/65 p-4 backdrop-blur-sm"
    >
      <div className="fade-slide relative w-full max-w-md overflow-hidden rounded-3xl border border-border-subtle bg-surface-card p-8 text-center shadow-soft">
        {/* Pure-CSS Confetti Burst */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-20 h-0 w-0"
        >
          {CONFETTI_PARTICLES.map((p, idx) => (
            <span
              key={idx}
              className={`confetti-piece absolute rounded-full ${p.size}`}
              style={
                {
                  backgroundColor: p.color,
                  animationDelay: p.delay,
                  "--tx": p.tx,
                  "--ty": p.ty,
                  "--rot": p.rot
                } as CSSProperties
              }
            />
          ))}
        </div>

        {/* Animated Lottie-Style SVG Checkmark */}
        <svg
          width="96"
          height="96"
          viewBox="0 0 100 100"
          className="relative mx-auto"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="38" fill="#E7F4EF" />
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="#0F6B52"
            strokeWidth="6"
            strokeLinecap="round"
            className="draw-circle"
            transform="rotate(-90 50 50)"
          />
          <path
            d="M33 51 L45 63 L69 39"
            fill="none"
            stroke="#0B5440"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="draw-check"
          />
        </svg>

        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-primary">
          #{order.orderNumber}
        </span>

        <h2
          id="order-confirmed-heading"
          className="mt-3 text-2xl font-extrabold tracking-tight text-ink-primary"
        >
          {t.orderConfirmedTitle}
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
          {t.orderConfirmedBody}
        </p>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-canvas px-4 py-3 text-xs">
          <span className="font-semibold text-ink-secondary">
            {paymentLabel}
          </span>
          <span className="text-base font-extrabold text-brand-primary">
            {formatPkrFromPaisa(order.totalPaisa, locale)}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href={`/orders?order=${encodeURIComponent(order.orderId)}`}
            onClick={onClose}
            className="w-full rounded-2xl bg-brand-accent py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-accent-hover"
          >
            {t.trackLiveOrderBtn}
          </Link>
          <Link
            href="/"
            onClick={onClose}
            className="w-full rounded-2xl border border-border-subtle bg-surface-muted py-3 text-sm font-semibold text-ink-primary transition hover:border-brand-primary"
          >
            {t.continueShoppingBtn}
          </Link>
        </div>
      </div>
    </div>
  );
}
