"use client";

import type { AuthUser, LocaleCode } from "@saudavo/contracts";
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
  getStoredCsrfToken,
  logoutAccount,
  setStoredCsrfToken
} from "../lib/api-client";

interface AppContextValue {
  locale: LocaleCode;
  dir: "ltr" | "rtl";
  t: UiDictionary;
  setLocale: (next: LocaleCode) => void;
  user: AuthUser | null;
  authLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
  cartItemCount: number;
  refreshCartCount: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);
const LOCALE_STORAGE_KEY = "saudavo_locale";

export function LocaleAndAuthProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>("en");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cartItemCount, setCartItemCount] = useState(0);

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
      } catch {
        // Ignore storage errors
      }
    }
    void refreshUser();
  }, [applyLocaleToDom, refreshUser]);

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
      cartItemCount,
      refreshCartCount,
      signOut
    }),
    [
      authLoading,
      cartItemCount,
      locale,
      refreshCartCount,
      refreshUser,
      setLocale,
      signOut,
      user
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used inside LocaleAndAuthProvider");
  }
  return ctx;
}
