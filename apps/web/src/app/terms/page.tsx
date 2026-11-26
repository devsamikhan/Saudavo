"use client";

import Link from "next/link";
import { useAppContext } from "../../components/locale-provider";

export default function TermsPage() {
  const { locale } = useAppContext();

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 pb-24 sm:px-6 md:pb-12">
      <div className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card sm:p-8">
        <span className="inline-block rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-bold text-brand-primary">
          {locale === "ur" ? "کلوزڈ بیٹا شرائط • Gate F" : "Mianwali Closed Beta • Terms"}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-ink-primary sm:text-3xl">
          {locale === "ur"
            ? "سوداو استعمال کی شرائط و ضوابط"
            : "Saudavo Marketplace Terms of Use"}
        </h1>
        <p className="mt-2 text-xs text-ink-secondary">
          {locale === "ur"
            ? "میانوالی کلوزڈ بیٹا پائلٹ کے لیے بنیادی رہنما اصول — حتمی قانونی منظوری (Gate F) تک لاگو"
            : "Closed-beta operational terms for Mianwali District pilot (subject to final Gate F legal sign-off)."}
        </p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-ink-primary">
          <section className="space-y-1.5">
            <h2 className="font-bold text-brand-primary">
              {locale === "ur"
                ? "1. صرف کیش آن ڈلیوری (COD) اور سنگل سیلر چیک آؤٹ"
                : "1. Cash on Delivery (COD) & Single-Seller Checkout"}
            </h2>
            <p className="text-xs text-ink-secondary sm:text-sm">
              {locale === "ur"
                ? "ہر آرڈر صرف ایک مقامی دکان یا ہنرمند (Store) سے ہوتا ہے۔ کلوزڈ بیٹا میں فزیکل آرڈرز کی ادائیگی ڈلیوری کے وقت نقد (COD) ہوتی ہے اور سوداو کوئی والٹ یا ایسکرو اکاؤنٹ نہیں چلاتا۔"
                : "Each order belongs to a single verified local seller store. During closed beta, physical orders are paid via Cash on Delivery (COD); Saudavo does not hold customer wallets or escrow funds."}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-brand-primary">
              {locale === "ur"
                ? "2. آرڈر منسوخی اور 7 روزہ سروس تکمیل"
                : "2. Cancellations & 7-Day Service Acceptance (PQ-10)"}
            </h2>
            <p className="text-xs text-ink-secondary sm:text-sm">
              {locale === "ur"
                ? "خریدار صرف سیلر کی تصدیق (PENDING_CONFIRMATION) سے پہلے خود آرڈر منسوخ کر سکتا ہے۔ سروس آرڈر ڈلیوری جمع ہونے کے 7 دن بعد اگر کوئی نظرِثانی یا تنازعہ نہ ہو تو خودکار مکمل ہو جاتا ہے۔"
                : "Buyers may self-cancel only while an order is PENDING_CONFIRMATION. Delivered service orders auto-complete after 7 days if no revision or dispute is opened."}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-brand-primary">
              {locale === "ur"
                ? "3. ریموٹ سروسز (PQ-14) اور تنازعات"
                : "3. Remote Service Offline Payments & Disputes"}
            </h2>
            <p className="text-xs text-ink-secondary sm:text-sm">
              {locale === "ur"
                ? "ریموٹ سروسز کے لیے ادائیگی براہِ راست سیلر کے ساتھ آف لائن طے ہوتی ہے۔ کسی بھی مسئلے کی صورت میں آرڈرز پیج پر ریکارڈ اور ڈسپیوٹ سسٹم استعمال کریں۔"
                : "Offline payments for REMOTE services are arranged directly with the seller. Keep transfer references and raise any issue through Saudavo order disputes."}
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
            href="/privacy"
            className="rounded-xl border border-border-subtle px-4 py-2 text-xs font-semibold text-ink-primary hover:border-brand-primary"
          >
            {locale === "ur" ? "پرائیویسی پالیسی دیکھیں" : "Read Privacy Policy"}
          </Link>
        </div>
      </div>
    </main>
  );
}
