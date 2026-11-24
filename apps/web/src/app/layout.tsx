import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-sans-arabic/400.css";
import "@fontsource/noto-sans-arabic/600.css";
import "@fontsource/noto-sans-arabic/700.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleAndAuthProvider } from "../components/locale-provider";
import { MobileBottomNav } from "../components/mobile-bottom-nav";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saudavo — Mianwali Local Marketplace",
  description:
    "Shop trusted local sellers, crafts, and services in Mianwali District with Cash on Delivery."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-surface-canvas text-ink-primary antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <LocaleAndAuthProvider>
          <SiteHeader />
          <div id="main-content" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </div>
          <SiteFooter />
          <MobileBottomNav />
        </LocaleAndAuthProvider>
      </body>
    </html>
  );
}
