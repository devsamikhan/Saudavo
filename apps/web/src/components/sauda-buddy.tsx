"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SaudaBuddyAvatar } from "./illustrations";
import { useAppContext } from "./locale-provider";

export function SaudaBuddy() {
  const pathname = usePathname();
  const { locale, t } = useAppContext();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasStickyMobileBar =
    pathname.startsWith("/products/") || pathname.startsWith("/services/");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`fixed bottom-20 start-4 z-40 md:bottom-5 md:start-5 ${
        hasStickyMobileBar ? "hidden md:block" : ""
      }`}
    >
      {open && (
        <div
          role="dialog"
          aria-label={t.buddyName}
          className="fade-slide mb-3 w-72 rounded-3xl border border-border-subtle bg-surface-card p-4 shadow-soft sm:w-80"
        >
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border-subtle bg-brand-primary-soft/60 p-1">
              <SaudaBuddyAvatar className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-ink-primary">
                  {t.buddyName}
                </p>
                <span className="rounded-full bg-brand-primary-soft px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                  {t.buddyGreeting}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                {t.buddyTipBody}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[11px] font-semibold">
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-surface-muted px-2 py-1.5 text-ink-primary transition hover:bg-brand-primary-soft hover:text-brand-primary"
            >
              {t.navCart}
            </Link>
            <Link
              href="/orders"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-surface-muted px-2 py-1.5 text-ink-primary transition hover:bg-brand-primary-soft hover:text-brand-primary"
            >
              {t.navOrders}
            </Link>
            <Link
              href="/seller"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-brand-accent-soft px-2 py-1.5 text-brand-accent transition hover:opacity-90"
            >
              {locale === "ur" ? "سیلر بنیں" : "Sell Locally"}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full rounded-xl bg-brand-primary py-2 text-xs font-bold text-white transition hover:bg-brand-primary-hover"
          >
            {t.buddyGotItBtn}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={t.buddyName}
        className="flex items-center gap-2 rounded-full border-2 border-brand-accent bg-surface-card py-1.5 pe-4 ps-1.5 shadow-soft transition hover:scale-[1.03]"
      >
        <span className="h-9 w-9 overflow-hidden rounded-full bg-brand-primary-soft">
          <SaudaBuddyAvatar className="h-full w-full" />
        </span>
        <span className="text-xs font-extrabold text-ink-primary">
          {t.buddyName}
        </span>
        <span className="h-2 w-2 rounded-full bg-brand-primary" />
      </button>
    </div>
  );
}
