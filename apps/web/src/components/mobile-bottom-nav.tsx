"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppContext } from "./locale-provider";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useAppContext();

  const itemClass = (href: string) =>
    `flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
      pathname === href
        ? "text-brand-primary"
        : "text-ink-secondary hover:text-ink-primary"
    }`;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border-subtle bg-surface-card/95 px-2 py-1 backdrop-blur md:hidden"
    >
      <Link href="/" className={itemClass("/")}>
        <span>{t.navStorefront}</span>
      </Link>
      <Link href="/cart" className={itemClass("/cart")}>
        <span>{t.navCart}</span>
      </Link>
      <Link href="/orders" className={itemClass("/orders")}>
        <span>{t.navOrders}</span>
      </Link>
      <Link href="/seller" className={itemClass("/seller")}>
        <span>{t.navSeller}</span>
      </Link>
    </nav>
  );
}
