"use client";

import type { NotificationDto } from "@saudavo/contracts";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  fetchCarts,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../lib/api-client";
import { useAppContext } from "./locale-provider";
import { SaudavoMark } from "./saudavo-mark";

function formatNotificationText(
  item: NotificationDto,
  locale: "en" | "ur"
): { label: string; href: string } {
  const payload = item.payloadJson;
  const orderNumber =
    typeof payload.orderNumber === "string" ? payload.orderNumber : "";
  const status = typeof payload.status === "string" ? payload.status : "";

  switch (item.eventType) {
    case "ORDER_CREATED":
      return {
        label:
          locale === "ur"
            ? `نیا آرڈر موصول ہوا #${orderNumber}`
            : `New order received #${orderNumber}`,
        href: "/seller"
      };
    case "ORDER_CONFIRMED":
      return {
        label:
          locale === "ur"
            ? `آپ کا آرڈر #${orderNumber} منظور ہو گیا`
            : `Order #${orderNumber} confirmed by seller`,
        href: "/orders"
      };
    case "ORDER_STATUS_UPDATED":
      return {
        label:
          locale === "ur"
            ? `آرڈر #${orderNumber} کی حیثیت: ${status}`
            : `Order #${orderNumber} updated: ${status.replace(/_/g, " ")}`,
        href: "/orders"
      };
    case "REVISION_REQUESTED":
      return {
        label:
          locale === "ur"
            ? `سروس آرڈر #${orderNumber} میں ترمیم کی درخواست`
            : `Revision requested on service #${orderNumber}`,
        href: "/seller"
      };
    case "SELLER_APPROVED":
      return {
        label:
          locale === "ur"
            ? "آپ کا سیلر اکاؤنٹ اور اسٹور منظور ہو گیا!"
            : "Your seller profile & store are now approved!",
        href: "/seller"
      };
    case "SELLER_REJECTED":
      return {
        label:
          locale === "ur"
            ? "سیلر درخواست مسترد ہوئی — تفصیل دیکھیں"
            : "Seller onboarding requires updates",
        href: "/seller"
      };
    case "LISTING_APPROVED":
      return {
        label:
          locale === "ur"
            ? "آپ کی لسٹنگ مارکیٹ میں شائع ہو گئی!"
            : "Your listing is now live on Saudavo!",
        href: "/seller"
      };
    case "LISTING_REJECTED":
      return {
        label:
          locale === "ur"
            ? "لسٹنگ میں ترمیم درکار ہے — تفصیل دیکھیں"
            : "Listing review returned feedback",
        href: "/seller"
      };
    default:
      return {
        label: item.eventType.replace(/_/g, " "),
        href: "/orders"
      };
  }
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t, user, signOut } = useAppContext();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);

  const toggleLocale = () => {
    setLocale(locale === "en" ? "ur" : "en");
  };

  const isStaff =
    user?.roles.some((r) =>
      ["MODERATOR", "SUPPORT", "ADMIN", "SUPER_ADMIN"].includes(r)
    ) ?? false;

  const loadHeaderCounts = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setCartItemCount(0);
      return;
    }

    const [notifRes, cartRes] = await Promise.all([
      fetchNotifications().catch(() => null),
      fetchCarts().catch(() => null)
    ]);

    if (notifRes) {
      setNotifications(notifRes.data);
      setUnreadCount(notifRes.meta.unreadCount);
    }
    if (cartRes) {
      const totalItems = cartRes.data.reduce(
        (sum, cart) =>
          sum + cart.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      );
      setCartItemCount(totalItems);
    }
  }, [user]);

  useEffect(() => {
    void loadHeaderCounts();
  }, [loadHeaderCounts, pathname]);

  const handleOpenNotification = async (item: NotificationDto) => {
    const target = formatNotificationText(item, locale);
    if (!item.readAt) {
      await markNotificationRead(item.id).catch(() => null);
      await loadHeaderCounts();
    }
    setNotifOpen(false);
    router.push(target.href);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => null);
    await loadHeaderCounts();
  };

  const navLinkClass = (href: string) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      pathname === href
        ? "bg-brand-primary-soft font-semibold text-brand-primary"
        : "text-ink-primary hover:bg-surface-muted"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
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
          className="hidden flex-wrap items-center gap-2 md:flex sm:gap-3"
        >
          <Link href="/" className={navLinkClass("/")}>
            {t.navStorefront}
          </Link>
          <Link href="/cart" className={`${navLinkClass("/cart")} inline-flex items-center gap-1.5`}>
            <span>{t.navCart}</span>
            {cartItemCount > 0 && (
              <span className="rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                {cartItemCount}
              </span>
            )}
          </Link>
          <Link href="/orders" className={navLinkClass("/orders")}>
            {t.navOrders}
          </Link>
          <Link
            href="/seller"
            className="rounded-lg bg-brand-accent-soft px-3 py-1.5 text-sm font-semibold text-brand-accent hover:opacity-90"
          >
            {t.navSeller}
          </Link>
          {(isStaff || !user) && (
            <Link href="/admin" className={navLinkClass("/admin")}>
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
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label={t.notificationsTitle}
                className="relative rounded-lg border border-border-subtle bg-surface-card p-2 text-ink-primary hover:border-brand-primary"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -end-1 -top-1 rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute end-0 top-11 z-40 w-80 rounded-2xl border border-border-subtle bg-surface-card p-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                    <span className="text-xs font-bold text-ink-primary">
                      {t.notificationsTitle} ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleMarkAllRead()}
                        className="text-[11px] font-semibold text-brand-primary hover:underline"
                      >
                        {t.markAllRead}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="py-3 text-center text-xs text-ink-secondary">
                        {t.notificationsEmpty}
                      </p>
                    ) : (
                      notifications.map((item) => {
                        const formatted = formatNotificationText(item, locale);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => void handleOpenNotification(item)}
                            className={`block w-full rounded-xl p-2.5 text-start text-xs transition ${
                              item.readAt
                                ? "bg-surface-canvas text-ink-secondary hover:bg-surface-muted"
                                : "bg-brand-primary-soft/50 font-semibold text-ink-primary hover:bg-brand-primary-soft"
                            }`}
                          >
                            <p dir="auto">{formatted.label}</p>
                            <p className="mt-1 text-[10px] text-ink-secondary">
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

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
