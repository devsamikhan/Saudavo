"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useAppContext } from "./locale-provider";

export function StoreShareAndQrCard({
  storeSlug,
  storeDisplayName,
  districtName
}: {
  storeSlug: string;
  storeDisplayName: string;
  districtName: string;
}) {
  const { locale, t } = useAppContext();
  const [qrSvg, setQrSvg] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const storePath = `/stores/${storeSlug}`;
  const storeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${storePath}`
      : `https://saudavo.pk${storePath}`;

  useEffect(() => {
    let active = true;
    void QRCode.toString(storeUrl, {
      type: "svg",
      width: 156,
      margin: 1,
      color: {
        dark: "#0f6b52",
        light: "#ffffff"
      }
    }).then((svg) => {
      if (active) setQrSvg(svg);
    });
    return () => {
      active = false;
    };
  }, [storeUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  };

  const handleDownloadPoster = () => {
    if (!qrSvg) return;
    const escapedName = storeDisplayName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const escapedDistrict = districtName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const innerQr = qrSvg
      .replace(/<svg[^>]*>/, "")
      .replace(/<\/svg>/, "");

    const posterSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="520" viewBox="0 0 420 520">
  <rect width="420" height="520" rx="24" fill="#ffffff" stroke="#0f6b52" stroke-width="6"/>
  <rect x="0" y="0" width="420" height="96" rx="18" fill="#0f6b52"/>
  <text x="210" y="48" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">Saudavo Verified Store</text>
  <text x="210" y="76" font-family="Arial, sans-serif" font-size="14" fill="#e7f4ef" text-anchor="middle">${escapedDistrict} • Cash on Delivery</text>
  <text x="210" y="138" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#111827" text-anchor="middle">${escapedName}</text>
  <g transform="translate(85,165) scale(1.6)">${innerQr}</g>
  <text x="210" y="455" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#d96b27" text-anchor="middle">Scan to browse &amp; order safely</text>
  <text x="210" y="485" font-family="monospace" font-size="11" fill="#4b5563" text-anchor="middle">${storePath}</text>
</svg>`;

    const blob = new Blob([posterSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${storeSlug}-saudavo-qr.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const whatsappText =
    locale === "ur"
      ? `سوداو پر ہمارے تصدیق شدہ مقامی اسٹور "${storeDisplayName}" (${districtName}) کا وزٹ کریں اور محفوظ کیش آن ڈلیوری آرڈر کریں: ${storeUrl}`
      : `Visit our verified Saudavo store "${storeDisplayName}" (${districtName}) and order safely with Cash on Delivery: ${storeUrl}`;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-brand-primary/20 bg-brand-primary-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">
          {locale === "ur"
            ? "واٹس ایپ اور QR اسٹور کارڈ"
            : "WhatsApp & Printable Storefront QR"}
        </p>
        <p className="text-xs text-ink-secondary break-all">{storeUrl}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover"
          >
            {t.shareStoreWhatsApp}
          </a>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-xs font-semibold text-ink-primary hover:border-brand-primary"
          >
            {copied
              ? t.copiedNotice
              : locale === "ur"
                ? "لنک کاپی کریں"
                : "Copy Store Link"}
          </button>
          <button
            type="button"
            onClick={handleDownloadPoster}
            disabled={!qrSvg}
            className="rounded-lg bg-brand-accent px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {t.downloadQrPoster}
          </button>
        </div>
      </div>

      {qrSvg && (
        <div
          aria-label={`QR code for ${storeDisplayName}`}
          className="shrink-0 self-start rounded-xl border border-border-subtle bg-white p-2 shadow-sm sm:self-center"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      )}
    </div>
  );
}
