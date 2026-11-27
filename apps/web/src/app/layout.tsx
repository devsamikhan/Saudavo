import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/noto-sans-arabic/400.css";
import "@fontsource/noto-sans-arabic/600.css";
import "@fontsource/noto-sans-arabic/700.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { LocaleAndAuthProvider } from "../components/locale-provider";
import { MobileBottomNav } from "../components/mobile-bottom-nav";
import { SaudaBuddy } from "../components/sauda-buddy";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getPublicSiteUrl } from "../lib/seo";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F6B52"
};

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  title: {
    default: "Saudavo — Mianwali Local Marketplace & Mobile App",
    template: "%s | Saudavo"
  },
  description:
    "Shop trusted local sellers, crafts, and services in Mianwali District with Cash on Delivery, or download the Saudavo Android App directly.",
  keywords: [
    "Saudavo",
    "Saudavo app",
    "Saudavo download",
    "Saudavo APK",
    "Mianwali local marketplace",
    "Mianwali online shopping",
    "Isakhel",
    "Piplan",
    "Cash on Delivery Pakistan"
  ],
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Saudavo",
    title: "Saudavo — Mianwali Local Marketplace & Mobile App",
    description:
      "Trusted local shops, home-based makers, and services in Mianwali District with Cash on Delivery."
  }
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
          <SaudaBuddy />
        </LocaleAndAuthProvider>
      </body>
    </html>
  );
}
