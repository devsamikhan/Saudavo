"use client";

import Link from "next/link";
import { useAppContext } from "../../components/locale-provider";

export default function PrivacyPage() {
  const { locale } = useAppContext();

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 pb-24 sm:px-6 md:pb-12">
      <div className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card sm:p-8">
        <span className="inline-block rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-bold text-brand-primary">
          {locale === "ur" ? "پرائیویسی شیلڈ • PQ-07 / PQ-12" : "Privacy Shield • PQ-07 / PQ-12"}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-ink-primary sm:text-3xl">
          {locale === "ur"
            ? "سوداو پرائیویسی پالیسی"
            : "Saudavo Privacy & Safety Policy"}
        </h1>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-ink-primary">
          <section className="space-y-1.5">
            <h2 className="font-bold text-brand-primary">
              {locale === "ur"
                ? "1. گھریلو پتہ اور ذاتی فون نمبر کی حفاظت"
                : "1. Home Address & Personal Phone Protection"}
            </h2>
            <p className="text-xs text-ink-secondary sm:text-sm">
              {locale === "ur"
                ? "گھریلو ہنرمندوں اور سیلرز کا ذاتی فون نمبر اور گھر کا پتہ عوامی طور پر کبھی ظاہر نہیں کیا جاتا جب تک سیلر خود کاروباری تفصیل ظاہر کرنے کی اجازت نہ دے۔ عوامی سطح پر صرف میانوالی کے علاقے (AreaZone) دکھائے جاتے ہیں۔"
                : "Home-based makers and sellers never have their residential address or personal phone exposed publicly unless explicitly opted in. Public listings show Mianwali service AreaZones only."}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-brand-primary">
              {locale === "ur"
                ? "2. تصاویر کا EXIF GPS ڈیٹا خودکار حذف"
                : "2. Automatic EXIF & GPS Stripping on Photos"}
            </h2>
            <p className="text-xs text-ink-secondary sm:text-sm">
              {locale === "ur"
                ? "اپ لوڈ کی جانے والی ہر پروڈکٹ تصویر سے لوکیشن (GPS) اور کیمرہ میٹاڈیٹا سرور پر خودکار صاف کیا جاتا ہے اور فائلیں پرائیویٹ اسٹوریج میں محفوظ رہتی ہیں۔"
                : "Uploaded product photos are stored privately and sanitized to strip embedded EXIF/GPS camera metadata before display."}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-brand-primary">
              {locale === "ur"
                ? "3. کلوزڈ بیٹا میں شناختی کارڈ جمع نہیں ہوتا (PQ-07)"
                : "3. No CNIC Collection in Closed Beta (PQ-07)"}
            </h2>
            <p className="text-xs text-ink-secondary sm:text-sm">
              {locale === "ur"
                ? "سوداو کلوزڈ بیٹا میں صارفین یا سیلرز سے شناختی کارڈ نمبر یا تصویر نہیں مانگتا۔ تمام لاگ ان سیشنز محفوظ HttpOnly کوکیز اور انکرپٹڈ پاس ورڈز سے محفوظ ہیں۔"
                : "No national ID (CNIC) numbers or document images are collected during closed beta. Sessions are secured via server-backed HttpOnly cookies and Argon2id hashing."}
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-border-subtle pt-5">
          <Link
            href="/"
            className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover"
          >
            {locale === "ur" ? "مارکیٹ پلیس پر واپس" : "Back to Storefront"}
          </Link>
          <Link
            href="/terms"
            className="rounded-xl border border-border-subtle px-4 py-2 text-xs font-semibold text-ink-primary hover:border-brand-primary"
          >
            {locale === "ur" ? "استعمال کی شرائط دیکھیں" : "Read Terms of Use"}
          </Link>
        </div>
      </div>
    </main>
  );
}
