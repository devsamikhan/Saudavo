"use client";

import type { NotificationDto } from "@saudavo/contracts";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchMessengerUnreadCount,
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
    case "CHAT_MESSAGE_RECEIVED":
      return {
        label:
          locale === "ur"
            ? "سوداو میسنجر میں نیا پیغام آیا ہے"
            : "New message in Saudavo Messenger",
        href: "/messages"
      };
    case "CHAT_OFFER_RECEIVED":
      return {
        label:
          locale === "ur"
            ? "سیلر نے چیٹ میں کسٹم آفر بھیجی ہے"
            : "Seller sent a Custom Offer in chat",
        href: "/messages"
      };
    case "SUBSCRIPTION_ACTIVATED":
      return {
        label:
          locale === "ur"
            ? "آپ کا ماہانہ سیلر پلان فعال ہو گیا!"
            : "Your monthly seller plan is now active!",
        href: "/seller"
      };
    case "SUBSCRIPTION_RENEWAL_REJECTED":
      return {
        label:
          locale === "ur"
            ? "سبسکرپشن درخواست مسترد ہوئی — تفصیل دیکھیں"
            : "Subscription renewal needs attention",
        href: "/seller"
      };
    case "NEW_LISTING_FROM_FOLLOWED_STORE": {
      const storeSlug =
        typeof payload.storeSlug === "string" ? payload.storeSlug : "";
      const storeName =
        typeof payload.storeName === "string" ? payload.storeName : "Store";
      return {
        label:
          locale === "ur"
            ? `${storeName} نے نئی لسٹنگ شامل کی!`
            : `${storeName} posted a new listing!`,
        href: storeSlug ? `/stores/${storeSlug}` : "/"
      };
    }
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
  const {
    locale,
    setLocale,
    t,
    user,
    features,
    cartItemCount,
    wishlistIds,
    signOut
  } = useAppContext();

  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [alertsPerm, setAlertsPerm] = useState<string>("default");
  const notifContainerRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number | null>(null);
  const prevChatUnreadRef = useRef<number | null>(null);

  const toggleLocale = () => {
    setLocale(locale === "en" ? "ur" : "en");
  };

  const isStaff =
    user?.roles.some((r) =>
      ["MODERATOR", "SUPPORT", "ADMIN", "SUPER_ADMIN"].includes(r)
    ) ?? false;

  const triggerLiveAlert = useCallback(
    (title: string, body: string, href: string) => {
      if (typeof window === "undefined") return;
      const win = window as Window & {
        SaudavoAndroid?: {
          notify?: (t: string, b: string, path: string) => void;
          requestNotificationPermission?: () => void;
        };
      };
      if (win.SaudavoAndroid?.notify) {
        win.SaudavoAndroid.notify(title, body, href);
        return;
      }
      if ("Notification" in window && window.Notification.permission === "granted") {
        if ("serviceWorker" in navigator) {
          void navigator.serviceWorker.getRegistration("/sw.js").then((reg) => {
            if (reg) {
              void reg.showNotification(title, { body, tag: "saudavo-alert" });
            } else {
              new window.Notification(title, { body });
            }
          });
        } else {
          new window.Notification(title, { body });
        }
      }
    },
    []
  );

  const loadHeaderCounts = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setChatUnreadCount(0);
      prevUnreadRef.current = null;
      prevChatUnreadRef.current = null;
      return;
    }

    const [notifRes, chatRes] = await Promise.all([
      fetchNotifications().catch(() => null),
      fetchMessengerUnreadCount().catch(() => null)
    ]);
    if (notifRes) {
      setNotifications(notifRes.data);
      const nextUnread = notifRes.meta.unreadCount;
      if (
        prevUnreadRef.current !== null &&
        nextUnread > prevUnreadRef.current &&
        notifRes.data[0]
      ) {
        const latest = formatNotificationText(notifRes.data[0], locale);
        triggerLiveAlert("Saudavo", latest.label, latest.href);
      }
      prevUnreadRef.current = nextUnread;
      setUnreadCount(nextUnread);
    }
    if (chatRes) {
      const nextChatUnread = chatRes.data.unreadCount;
      if (
        prevChatUnreadRef.current !== null &&
        nextChatUnread > prevChatUnreadRef.current
      ) {
        triggerLiveAlert(
          "Saudavo Messenger",
          locale === "ur"
            ? "آپ کو سوداو میسنجر میں نیا پیغام موصول ہوا ہے!"
            : "You received a new message in Saudavo Messenger!",
          "/messages"
        );
      }
      prevChatUnreadRef.current = nextChatUnread;
      setChatUnreadCount(nextChatUnread);
    }
  }, [locale, triggerLiveAlert, user]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setAlertsPerm(window.Notification.permission);
    }
    void loadHeaderCounts();
    setMobileMenuOpen(false);
    setNotifOpen(false);
  }, [loadHeaderCounts, pathname]);

  // Fast background alert polling every 9 seconds while tab/app is active
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadHeaderCounts();
      }
    }, 9000);
    return () => window.clearInterval(timer);
  }, [loadHeaderCounts, user]);

  useEffect(() => {
    if (!notifOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotifOpen(false);
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(event.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [notifOpen]);

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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <SaudavoMark width={34} height={34} />
            <span className="flex flex-col leading-none">
              <span className="text-base font-extrabold tracking-tight text-brand-primary sm:text-lg">
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
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={navTabClass("/")}
          >
            {t.navStorefront}
          </Link>
          {features.buyer_requests_board_enabled && (
            <Link
              href="/demands"
              aria-current={pathname === "/demands" ? "page" : undefined}
              className={navTabClass("/demands")}
            >
              {locale === "ur" ? "مجھے چاہیے" : "Demands"}
            </Link>
          )}
          {features.shopping_messenger_enabled && (
            <Link
              href="/messages"
              aria-current={pathname === "/messages" ? "page" : undefined}
              className={`${navTabClass("/messages")} inline-flex items-center gap-1.5`}
            >
              <span>{locale === "ur" ? "میسنجر" : "Messenger"}</span>
              {chatUnreadCount > 0 && (
                <span className="rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {chatUnreadCount}
                </span>
              )}
            </Link>
          )}
          <Link
            href="/orders"
            aria-current={pathname === "/orders" ? "page" : undefined}
            className={navTabClass("/orders")}
          >
            {t.navOrders}
          </Link>
          <Link
            href="/seller"
            aria-current={pathname === "/seller" ? "page" : undefined}
            className={navTabClass("/seller")}
          >
            {t.navSeller}
          </Link>
          {isStaff && (
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              className={navTabClass("/admin")}
            >
              {t.navAdmin}
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Quick Saved Wishlist Link */}
          <Link
            href="/?saved=1#catalog"
            aria-label={t.savedItemsFilter}
            className="relative inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-brand-primary-soft/75 p-2 text-brand-primary transition hover:bg-brand-primary-soft"
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
            className="relative inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-brand-primary-soft/75 p-2 text-brand-primary transition hover:bg-brand-primary-soft"
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
            className="min-h-[38px] rounded-xl border border-border-subtle bg-surface-muted px-2 py-1.5 text-[11px] font-semibold text-ink-primary transition hover:border-brand-primary sm:px-2.5 sm:text-xs"
            aria-label="Switch language between English and Urdu"
          >
            <span className="sm:hidden">{locale === "en" ? "اردو" : "EN"}</span>
            <span className="hidden sm:inline">
              {locale === "en" ? "اردو | EN" : "EN | اردو"}
            </span>
          </button>

          {user ? (
            <div ref={notifContainerRef} className="relative flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label={t.notificationsTitle}
                aria-expanded={notifOpen}
                aria-haspopup="true"
                className="relative inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-border-subtle bg-surface-card p-2 text-ink-primary transition hover:border-brand-primary"
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
                <div className="fixed inset-x-3 top-16 z-40 rounded-2xl border border-border-subtle bg-surface-card p-3 shadow-soft sm:absolute sm:inset-x-auto sm:end-0 sm:top-11 sm:w-80">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                    <span className="text-xs font-bold text-ink-primary">
                      {t.notificationsTitle} ({unreadCount})
                    </span>
                    <div className="flex items-center gap-2">
                      {alertsPerm === "default" && (
                        <button
                          type="button"
                          onClick={() => {
                            const win = window as Window & {
                              SaudavoAndroid?: {
                                requestNotificationPermission?: () => void;
                              };
                            };
                            win.SaudavoAndroid?.requestNotificationPermission?.();
                            if ("Notification" in window) {
                              void window.Notification.requestPermission().then((p) =>
                                setAlertsPerm(p)
                              );
                            }
                          }}
                          className="text-[11px] font-bold text-brand-accent hover:underline"
                        >
                          {locale === "ur" ? "الرٹس آن کریں" : "Enable Alerts"}
                        </button>
                      )}
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

              <Link
                href="/account"
                dir="auto"
                title={locale === "ur" ? "میرا اکاؤنٹ اور پتے" : "My Account & Addresses"}
                className="hidden rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary hover:text-white lg:inline-block"
              >
                {user.displayName}
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="hidden rounded-xl border border-border-subtle px-3 py-1.5 text-xs font-semibold text-ink-primary transition hover:bg-surface-muted md:inline-block"
              >
                {t.navSignOut}
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="inline-flex min-h-[38px] items-center rounded-xl bg-brand-accent px-2.5 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-brand-accent-hover sm:px-4 sm:text-xs"
            >
              {t.navSignIn}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
            className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-brand-primary-soft/75 p-2 text-brand-primary md:hidden"
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
        <div className="space-y-3 border-t border-border-subtle bg-surface-card px-4 py-3 text-xs font-bold md:hidden">
          {user && (
            <div className="flex items-center justify-between rounded-xl bg-brand-primary-soft/50 px-3 py-2">
              <span dir="auto" className="truncate font-semibold text-brand-primary">
                {user.displayName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void signOut();
                }}
                className="rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1 text-[11px] font-semibold text-ink-primary"
              >
                {t.navSignOut}
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              aria-current={pathname === "/" ? "page" : undefined}
              className={`${navTabClass("/")} flex min-h-[40px] items-center justify-center`}
            >
              {t.navStorefront}
            </Link>
            <Link
              href="/cart"
              aria-current={pathname === "/cart" ? "page" : undefined}
              className={`${navTabClass("/cart")} flex min-h-[40px] items-center justify-center`}
            >
              {t.navCart} {cartItemCount > 0 ? `(${cartItemCount})` : ""}
            </Link>
            <Link
              href="/orders"
              aria-current={pathname === "/orders" ? "page" : undefined}
              className={`${navTabClass("/orders")} flex min-h-[40px] items-center justify-center`}
            >
              {t.navOrders}
            </Link>
            <Link
              href="/seller"
              aria-current={pathname === "/seller" ? "page" : undefined}
              className={`${navTabClass("/seller")} flex min-h-[40px] items-center justify-center`}
            >
              {t.navSeller}
            </Link>
            <Link
              href="/messages"
              aria-current={pathname === "/messages" ? "page" : undefined}
              className={`${navTabClass("/messages")} flex min-h-[40px] items-center justify-center gap-1`}
            >
              <span>{locale === "ur" ? "میسنجر" : "Messenger"}</span>
              {chatUnreadCount > 0 ? ` (${chatUnreadCount})` : ""}
            </Link>
            <Link
              href="/?saved=1#catalog"
              className={`${navTabClass("/saved")} flex min-h-[40px] items-center justify-center`}
            >
              {t.savedItemsFilter} ({wishlistIds.length})
            </Link>
            {user && (
              <Link
                href="/account"
                aria-current={pathname === "/account" ? "page" : undefined}
                className={`${navTabClass("/account")} flex min-h-[40px] items-center justify-center`}
              >
                {locale === "ur" ? "میرا اکاؤنٹ" : "Account"}
              </Link>
            )}
            {isStaff && (
              <Link
                href="/admin"
                aria-current={pathname === "/admin" ? "page" : undefined}
                className={`${navTabClass("/admin")} flex min-h-[40px] items-center justify-center`}
              >
                {t.navAdmin}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
