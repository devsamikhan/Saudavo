import type { Metadata } from "next";
import { getPublicSiteUrl } from "../../lib/seo";
import { DownloadAppClient } from "./download-client";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getPublicSiteUrl();
  const title =
    "Download Saudavo App (Android APK & Mobile Web App) — Mianwali Marketplace";
  const description =
    "Download Saudavo mobile app for Mianwali, Esa Khel & Piplan. Shop verified local stores with Cash on Delivery, Urdu Voice Notes, Flash Deals & live order tracking directly from GitHub Releases or install as a fast Web App.";

  return {
    title,
    description,
    keywords: [
      "Saudavo download",
      "Saudavo app",
      "Saudavo APK download",
      "Mianwali shopping app",
      "Mianwali local marketplace app",
      "Pakistan Cash on Delivery app"
    ],
    alternates: {
      canonical: `${siteUrl}/download`
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/download`,
      type: "website"
    }
  };
}

export default function DownloadPage() {
  return <DownloadAppClient />;
}
