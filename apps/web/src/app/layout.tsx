import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleAndAuthProvider } from "../components/locale-provider";
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
        <LocaleAndAuthProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </LocaleAndAuthProvider>
      </body>
    </html>
  );
}
