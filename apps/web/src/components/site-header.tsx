"use client";

import Link from "next/link";
import { useAppContext } from "./locale-provider";
import { SaudavoMark } from "./saudavo-mark";

export function SiteHeader() {
  const { locale, setLocale, t, user, signOut } = useAppContext();

  const toggleLocale = () => {
    setLocale(locale === "en" ? "ur" : "en");
  };

  const isStaff =
    user?.roles.some((r) =>
      ["MODERATOR", "SUPPORT", "ADMIN", "SUPER_ADMIN"].includes(r)
    ) ?? false;

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <SaudavoMark width={36} height={36} />
            <span className="text-xl font-bold tracking-tight text-brand-primary">
              {t.brandName}
            </span>
          </Link>
          <span className="hidden rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-semibold text-brand-primary sm:inline-block">
            {t.pilotBadge}
          </span>
        </div>

        <nav
          aria-label="Primary navigation"
          className="flex flex-wrap items-center gap-2 sm:gap-3"
        >
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-primary hover:bg-surface-muted"
          >
            {t.navStorefront}
          </Link>
          <Link
            href="/cart"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-primary hover:bg-surface-muted"
          >
            {t.navCart}
          </Link>
          <Link
            href="/orders"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-primary hover:bg-surface-muted"
          >
            {t.navOrders}
          </Link>
          <Link
            href="/seller"
            className="rounded-lg bg-brand-accent-soft px-3 py-1.5 text-sm font-semibold text-brand-accent hover:opacity-90"
          >
            {t.navSeller}
          </Link>
          {(isStaff || !user) && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-secondary hover:bg-surface-muted"
            >
              {t.navAdmin}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleLocale}
            className="rounded-lg border border-border-subtle bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-primary transition hover:border-brand-primary"
            aria-label="Switch language between English and Urdu"
          >
            {locale === "en" ? "اردو | EN" : "EN | اردو"}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <span
                dir="auto"
                className="hidden rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-semibold text-brand-primary md:inline-block"
              >
                {user.displayName}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-ink-primary hover:bg-surface-muted"
              >
                {t.navSignOut}
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="rounded-lg bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
            >
              {t.navSignIn}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
