"use client";

import type { NotificationDto } from "@saudavo/contracts";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
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
  const { locale, setLocale, t, user, cartItemCount, wishlistIds, signOut } =
    useAppContext();

  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
      return;
    }

    const notifRes = await fetchNotifications().catch(() => null);
    if (notifRes) {
      setNotifications(notifRes.data);
      setUnreadCount(notifRes.meta.unreadCount);
    }
  }, [user]);

  useEffect(() => {
    void loadHeaderCounts();
    setMobileMenuOpen(false);
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

  const navTabClass = (href: string) =>
    `rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
      pathname === href
        ? "bg-brand-primary text-white shadow-sm"
        : "text-ink-primary hover:bg-surface-card"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <SaudavoMark width={36} height={36} />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight text-brand-primary">
                {t.brandName}
              </span>
              <span className="hidden text-[10px] font-bold uppercase tracking-wider text-brand-accent sm:inline">
                {t.pilotBadge}
              </span>
            </span>
          </Link>
        </div>

        {/* Segmented Desktop Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 rounded-xl bg-brand-primary-soft/65 p-1 md:flex"
        >
          <Link href="/" className={navTabClass("/")}>
            {t.navStorefront}
          </Link>
          <Link href="/orders" className={navTabClass("/orders")}>
            {t.navOrders}
          </Link>
          <Link href="/seller" className={navTabClass("/seller")}>
            {t.navSeller}
          </Link>
          {(isStaff || !user) && (
            <Link href="/admin" className={navTabClass("/admin")}>
              {t.navAdmin}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/* Quick Saved Wishlist Link */}
          <Link
            href="/?saved=1#catalog"
            aria-label={t.savedItemsFilter}
            className="relative hidden rounded-xl bg-brand-primary-soft/75 p-2 text-brand-primary transition hover:bg-brand-primary-soft sm:inline-flex"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill={wishlistIds.length > 0 ? "#D96B27" : "none"}
              stroke={wishlistIds.length > 0 ? "#D96B27" : "currentColor"}
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            {wishlistIds.length > 0 && (
              <span className="absolute -end-1 -top-1 rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {wishlistIds.length}
              </span>
            )}
          </Link>

          {/* Quick Cart Icon Button */}
          <Link
            href="/cart"
            aria-label={t.navCart}
            className="relative rounded-xl bg-brand-primary-soft/75 p-2 text-brand-primary transition hover:bg-brand-primary-soft"
          >
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
              <span className="absolute -end-1 -top-1 rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {cartItemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleLocale}
            className="rounded-xl border border-border-subtle bg-surface-muted px-2.5 py-1.5 text-xs font-semibold text-ink-primary transition hover:border-brand-primary"
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
                className="relative rounded-xl border border-border-subtle bg-surface-card p-2 text-ink-primary transition hover:border-brand-primary"
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
                <div className="absolute end-0 top-11 z-40 w-80 rounded-2xl border border-border-subtle bg-surface-card p-3 shadow-soft">
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
                className="hidden rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-semibold text-brand-primary lg:inline-block"
              >
                {user.displayName}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-xl border border-border-subtle px-3 py-1.5 text-xs font-semibold text-ink-primary transition hover:bg-surface-muted"
              >
                {t.navSignOut}
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="rounded-xl bg-brand-accent px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-accent-hover"
            >
              {t.navSignIn}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
            className="rounded-xl bg-brand-primary-soft/75 p-2 text-brand-primary md:hidden"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Responsive Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="grid grid-cols-2 gap-2 border-t border-border-subtle bg-surface-card px-4 py-3 text-xs font-bold md:hidden">
          <Link href="/" className={navTabClass("/")}>
            {t.navStorefront}
          </Link>
          <Link href="/cart" className={navTabClass("/cart")}>
            {t.navCart} {cartItemCount > 0 ? `(${cartItemCount})` : ""}
          </Link>
          <Link href="/orders" className={navTabClass("/orders")}>
            {t.navOrders}
          </Link>
          <Link href="/seller" className={navTabClass("/seller")}>
            {t.navSeller}
          </Link>
          <Link href="/?saved=1#catalog" className={navTabClass("/saved")}>
            {t.savedItemsFilter} ({wishlistIds.length})
          </Link>
          {(isStaff || !user) && (
            <Link href="/admin" className={navTabClass("/admin")}>
              {t.navAdmin}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
