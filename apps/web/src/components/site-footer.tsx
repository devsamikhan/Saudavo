"use client";

import Link from "next/link";
import { useAppContext } from "./locale-provider";
import { SaudavoMark } from "./saudavo-mark";

export function SiteFooter() {
  const { locale, t } = useAppContext();

  return (
    <footer className="mt-16 border-t border-border-subtle bg-surface-card pb-24 md:pb-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 text-xs text-ink-secondary sm:px-6 md:grid-cols-12 lg:px-8">
        <div className="space-y-2.5 md:col-span-5">
          <div className="flex items-center gap-2.5">
            <SaudavoMark width={30} height={30} />
            <span className="text-base font-extrabold text-brand-primary">
              {t.brandName}
            </span>
            <span className="rounded-full bg-brand-primary-soft px-2.5 py-0.5 text-[10px] font-bold text-brand-primary">
              {t.pilotBadge}
            </span>
          </div>
          <p className="max-w-md leading-relaxed text-ink-secondary">
            {t.heroSubtitle}
          </p>
        </div>

        <div className="space-y-2 md:col-span-3">
          <p className="font-bold uppercase tracking-wider text-ink-primary">
            {locale === "ur" ? "مارکیٹ لنکس" : "Marketplace"}
          </p>
          <div className="flex flex-col gap-1.5 font-medium">
            <Link href="/" className="hover:text-brand-primary">
              {t.navStorefront}
            </Link>
            <Link href="/cart" className="hover:text-brand-primary">
              {t.navCart}
            </Link>
            <Link href="/orders" className="hover:text-brand-primary">
              {t.navOrders}
            </Link>
            <Link href="/seller" className="hover:text-brand-primary">
              {t.navSeller}
            </Link>
            <Link href="/admin" className="text-ink-secondary/80 hover:text-brand-primary">
              {locale === "ur" ? "اسٹاف ماڈریشن کنسول" : "Staff Moderation Console"}
            </Link>
          </div>
        </div>

        <div className="space-y-2 md:col-span-4">
          <p className="font-bold uppercase tracking-wider text-ink-primary">
            {t.privacyShieldBadge}
          </p>
          <p className="font-medium leading-relaxed text-ink-primary">
            {t.privacyFooterNote}
          </p>
          <p className="leading-relaxed text-ink-secondary">
            {t.footerBetaNote}
          </p>
        </div>
      </div>
    </footer>
  );
}
