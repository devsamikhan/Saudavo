"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppContext } from "./locale-provider";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { locale, t, cartItemCount, user, features } = useAppContext();

  const itemClass = (href: string) =>
    `relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition ${
      pathname === href
        ? "text-brand-primary"
        : "text-ink-secondary hover:text-ink-primary"
    }`;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border-subtle bg-surface-card/95 px-1.5 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
    >
      <Link
        href="/"
        aria-current={pathname === "/" ? "page" : undefined}
        className={itemClass("/")}
      >
        {pathname === "/" && (
          <span
            aria-hidden="true"
            className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-primary"
          />
        )}
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        <span>{t.navStorefront}</span>
      </Link>

      {features.buyer_requests_board_enabled && (
        <Link
          href="/demands"
          aria-current={pathname === "/demands" ? "page" : undefined}
          className={itemClass("/demands")}
        >
          {pathname === "/demands" && (
            <span
              aria-hidden="true"
              className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-primary"
            />
          )}
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          <span>{locale === "ur" ? "ڈیمانڈز" : "Demands"}</span>
        </Link>
      )}

      {features.shopping_messenger_enabled && (
        <Link
          href="/messages"
          aria-current={pathname === "/messages" ? "page" : undefined}
          className={itemClass("/messages")}
        >
          {pathname === "/messages" && (
            <span
              aria-hidden="true"
              className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-primary"
            />
          )}
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{locale === "ur" ? "چیٹ" : "Chat"}</span>
        </Link>
      )}

      <Link
        href="/cart"
        aria-current={pathname === "/cart" ? "page" : undefined}
        className={itemClass("/cart")}
      >
        {pathname === "/cart" && (
          <span
            aria-hidden="true"
            className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-primary"
          />
        )}
        <div className="relative">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {cartItemCount > 0 && (
            <span className="absolute -end-2.5 -top-1.5 rounded-full bg-brand-accent px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
              {cartItemCount}
            </span>
          )}
        </div>
        <span>{t.navCart}</span>
      </Link>

      <Link
        href="/orders"
        aria-current={pathname === "/orders" ? "page" : undefined}
        className={itemClass("/orders")}
      >
        {pathname === "/orders" && (
          <span
            aria-hidden="true"
            className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-primary"
          />
        )}
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <span>{t.navOrders}</span>
      </Link>

      <Link
        href={user ? "/seller" : "/auth"}
        aria-current={pathname === "/seller" || pathname === "/auth" ? "page" : undefined}
        className={itemClass(user ? "/seller" : "/auth")}
      >
        {(pathname === "/seller" || pathname === "/auth") && (
          <span
            aria-hidden="true"
            className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-primary"
          />
        )}
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
          <path d="M16 3H8L3 7h18l-5-4z" />
        </svg>
        <span>{user ? t.navSeller : t.navSignIn}</span>
      </Link>
    </nav>
  );
}
