"use client";

import {
  type AuthUser,
  DEFAULT_FEATURE_FLAGS_MAP,
  type FeatureFlagsMap,
  type LocaleCode
} from "@saudavo/contracts";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  DICTIONARIES,
  getLocaleDirection,
  type UiDictionary
} from "../i18n/dictionaries";
import {
  fetchCarts,
  fetchCurrentUser,
  fetchPublicFeatureFlags,
  getStoredCsrfToken,
  logoutAccount,
  setStoredCsrfToken
} from "../lib/api-client";

interface ToastItem {
  id: number;
  message: string;
  tone: "primary" | "accent" | "neutral";
}

interface AppContextValue {
  locale: LocaleCode;
  dir: "ltr" | "rtl";
  t: UiDictionary;
  setLocale: (next: LocaleCode) => void;
  user: AuthUser | null;
  authLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
  features: FeatureFlagsMap;
  refreshFeatures: () => Promise<void>;
  cartItemCount: number;
  refreshCartCount: () => Promise<void>;
  wishlistIds: string[];
  isWishlisted: (id: string) => boolean;
  toggleWishlist: (id: string, title?: string) => void;
  showToast: (message: string, tone?: "primary" | "accent" | "neutral") => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);
const LOCALE_STORAGE_KEY = "saudavo_locale";
const WISHLIST_STORAGE_KEY = "saudavo_wishlist";

export function LocaleAndAuthProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>("en");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [features, setFeatures] = useState<FeatureFlagsMap>(
    DEFAULT_FEATURE_FLAGS_MAP
  );
  const [cartItemCount, setCartItemCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, tone: "primary" | "accent" | "neutral" = "primary") => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, message, tone }]);
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== id));
        }, 3200);
      }
    },
    []
  );

  const isWishlisted = useCallback(
    (id: string) => wishlistIds.includes(id),
    [wishlistIds]
  );

  const toggleWishlist = useCallback(
    (id: string, title?: string) => {
      const exists = wishlistIds.includes(id);
      const next = exists
        ? wishlistIds.filter((entry) => entry !== id)
        : [...wishlistIds, id];
      setWishlistIds(next);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage error
        }
      }
      const dict = DICTIONARIES[locale];
      const msg = exists
        ? dict.wishlistRemovedToast
        : title
          ? `${title} — ${dict.wishlistSavedToast}`
          : dict.wishlistSavedToast;
      showToast(msg, exists ? "neutral" : "accent");
    },
    [locale, showToast, wishlistIds]
  );

  const applyLocaleToDom = useCallback((next: LocaleCode) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
      document.documentElement.dir = getLocaleDirection(next);
    }
  }, []);

  const setLocale = useCallback(
    (next: LocaleCode) => {
      setLocaleState(next);
      applyLocaleToDom(next);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
        } catch {
          // Ignore storage error
        }
      }
    },
    [applyLocaleToDom]
  );

  const refreshCartCount = useCallback(async () => {
    try {
      const cartRes = await fetchCarts();
      const totalItems = cartRes.data.reduce(
        (sum, cart) =>
          sum + cart.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      );
      setCartItemCount(totalItems);
    } catch {
      setCartItemCount(0);
    }
  }, []);

  const refreshFeatures = useCallback(async () => {
    try {
      const res = await fetchPublicFeatureFlags();
      setFeatures(res.data);
    } catch {
      // Keep defaults when API is unreachable
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await fetchCurrentUser({
        syncCsrf: !getStoredCsrfToken()
      });
      setUser(res.data.user);
      void refreshCartCount();
    } catch {
      setUser(null);
      setCartItemCount(0);
      setStoredCsrfToken(null);
    } finally {
      setAuthLoading(false);
    }
  }, [refreshCartCount]);

  const signOut = useCallback(async () => {
    try {
      await logoutAccount();
    } catch {
      // Clear client state even if session already expired
    }
    setUser(null);
    setCartItemCount(0);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
        if (saved === "ur" || saved === "en") {
          setLocaleState(saved);
          applyLocaleToDom(saved);
        }
        const rawWish = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
        if (rawWish) {
          const parsed: unknown = JSON.parse(rawWish);
          if (Array.isArray(parsed)) {
            setWishlistIds(parsed.filter((item): item is string => typeof item === "string"));
          }
        }
      } catch {
        // Ignore storage errors
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js", { updateViaCache: "none" })
          .then((registration) => {
            void registration.update().catch(() => undefined);
          })
          .catch(() => undefined);
      }
    }
    void refreshUser();
    void refreshFeatures();
  }, [applyLocaleToDom, refreshFeatures, refreshUser]);

  const value = useMemo<AppContextValue>(
    () => ({
      locale,
      dir: getLocaleDirection(locale),
      t: DICTIONARIES[locale],
      setLocale,
      user,
      authLoading,
      setUser,
      refreshUser,
      features,
      refreshFeatures,
      cartItemCount,
      refreshCartCount,
      wishlistIds,
      isWishlisted,
      toggleWishlist,
      showToast,
      signOut
    }),
    [
      authLoading,
      cartItemCount,
      features,
      isWishlisted,
      locale,
      refreshCartCount,
      refreshFeatures,
      refreshUser,
      setLocale,
      showToast,
      signOut,
      toggleWishlist,
      user,
      wishlistIds
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-3 top-16 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:bottom-5 md:end-5 md:top-auto md:max-w-sm md:items-end"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast-enter pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 text-xs font-semibold text-white shadow-soft md:w-auto ${
                toast.tone === "accent"
                  ? "bg-brand-accent"
                  : toast.tone === "neutral"
                    ? "bg-ink-primary"
                    : "bg-brand-primary"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used inside LocaleAndAuthProvider");
  }
  return ctx;
}
