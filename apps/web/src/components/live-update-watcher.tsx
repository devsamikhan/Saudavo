"use client";

import { useEffect, useRef } from "react";

interface AppVersionPayload {
  webBuildId?: string;
}

const CHECK_INTERVAL_MS = 30_000;

/**
 * Watches /api/app-version for new Vercel deployments while the web/APK shell is open
 * and clears stale static caches + refreshes when returning to a newly deployed build.
 */
export function LiveUpdateWatcher() {
  const loadedBuildIdRef = useRef<string | null>(null);
  const lastCheckAtRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    async function checkForWebsiteUpdate() {
      const now = Date.now();
      if (now - lastCheckAtRef.current < CHECK_INTERVAL_MS) {
        return;
      }
      lastCheckAtRef.current = now;

      try {
        const res = await fetch("/api/app-version", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        if (!res.ok || !active) return;

        const data = (await res.json()) as AppVersionPayload;
        const serverBuildId =
          typeof data.webBuildId === "string" ? data.webBuildId.trim() : "";
        if (!serverBuildId || serverBuildId === "local-dev") {
          return;
        }

        if (!loadedBuildIdRef.current) {
          loadedBuildIdRef.current = serverBuildId;
          return;
        }

        if (loadedBuildIdRef.current !== serverBuildId) {
          loadedBuildIdRef.current = serverBuildId;
          if ("caches" in window) {
            const keys = await window.caches.keys();
            await Promise.all(keys.map((key) => window.caches.delete(key)));
          }
          if ("serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.getRegistration("/sw.js");
            await reg?.update().catch(() => undefined);
          }
          window.location.reload();
        }
      } catch {
        // Offline or transient network error — keep current session intact
      }
    }

    void checkForWebsiteUpdate();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForWebsiteUpdate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
