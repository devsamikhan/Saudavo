"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppContext } from "../../components/locale-provider";
import { SaudavoMark } from "../../components/saudavo-mark";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DIRECT_APK_ENDPOINT = "/api/download-apk";

export function DownloadAppClient() {
  const { locale, showToast } = useAppContext();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installingPwa, setInstallingPwa] = useState(false);

  const apkDownloadUrl =
    process.env.NEXT_PUBLIC_DIRECT_APK_URL?.trim() || DIRECT_APK_ENDPOINT;
  const appVersion =
    process.env.NEXT_PUBLIC_ANDROID_APK_VERSION?.trim() || "1.0.1";

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) {
      showToast(
        locale === "ur"
          ? "اپنے موبائل براؤزر مینو (⋮ یا Share) سے 'Add to Home Screen' منتخب کریں۔"
          : "Open your mobile browser menu and tap 'Install App' or 'Add to Home Screen'.",
        "primary"
      );
      return;
    }

    setInstallingPwa(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        showToast(
          locale === "ur"
            ? "سوداو ایپ آپ کے موبائل پر انسٹال ہو رہی ہے!"
            : "Installing Saudavo App to your home screen!",
          "primary"
        );
        setDeferredPrompt(null);
      }
    } finally {
      setInstallingPwa(false);
    }
  };

  return (
    <main className="fade-slide">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#094232] via-[#0F6B52] to-[#073528] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 end-10 h-72 w-72 rounded-full bg-brand-accent/25 blur-3xl"
        />
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#FDE68A]">
                <span className="h-2 w-2 rounded-full bg-brand-accent" />
                {locale === "ur"
                  ? `آفیشل موبائل ایپ • ورژن v${appVersion}`
                  : `Official Mobile App • Release v${appVersion}`}
              </span>

              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {locale === "ur"
                  ? "سوداو موبائل ایپ ڈاؤنلوڈ کریں — میانوالی کی مقامی مارکیٹ"
                  : "Download Saudavo App for Android & Mobile"}
              </h1>

              <p className="max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
                {locale === "ur"
                  ? "بلا واسطہ گِٹ ہب ریلیز سے اینڈرائیڈ APK ڈاؤنلوڈ کریں یا ایک کلک میں لائٹ ویٹ ویب ایپ (PWA) انسٹال کریں۔ اردو وائس میسنجر، کیش آن ڈیلیوری اور لائیو آرڈر ٹریکنگ کے ساتھ۔"
                  : "Get the fast Saudavo marketplace app directly from GitHub Releases (APK) or install the lightweight Web App in one tap. Built for Mianwali local stores, Urdu Voice Notes, Flash Deals, and verified Cash on Delivery."}
              </p>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
                <a
                  href={apkDownloadUrl}
                  download={`Saudavo-v${appVersion}.apk`}
                  onClick={() =>
                    showToast(
                      locale === "ur"
                        ? `Saudavo-v${appVersion}.apk ڈاؤنلوڈ شروع ہو گئی ہے!`
                        : `Downloading Saudavo-v${appVersion}.apk directly...`,
                      "primary"
                    )
                  }
                  className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-2xl bg-brand-accent px-6 py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-brand-accent-hover"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>
                    {locale === "ur"
                      ? `اینڈرائیڈ APK ڈاؤنلوڈ کریں (v${appVersion})`
                      : `Download Android APK (v${appVersion})`}
                  </span>
                </a>

                <button
                  type="button"
                  disabled={installingPwa}
                  onClick={() => void handleInstallPwa()}
                  className="glass-promo inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-60"
                >
                  <span>
                    {deferredPrompt
                      ? locale === "ur"
                        ? "ابھی ہوم اسکرین پر انسٹال کریں (PWA)"
                        : "Install Web App Now (1-Click)"
                      : locale === "ur"
                      ? "موبائل ویب ایپ انسٹال طریقہ"
                      : "Install Fast Web App (PWA)"}
                  </span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="glass-promo rounded-3xl p-6 text-white">
                <div className="flex items-center gap-3.5">
                  <SaudavoMark width={52} height={52} />
                  <div>
                    <h2 className="text-lg font-extrabold">
                      {locale === "ur" ? "سوداو (Saudavo)" : "Saudavo Mobile"}
                    </h2>
                    <p className="text-xs text-white/80">
                      {locale === "ur"
                        ? "اینڈرائیڈ 8.0+ • گِٹ ہب ویریفائیڈ ریلیز"
                        : "Android 8.0+ • Direct GitHub Release & PWA"}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <dt className="text-white/70">
                      {locale === "ur" ? "ورژن" : "Version"}
                    </dt>
                    <dd className="mt-0.5 font-extrabold text-[#FDE68A]">
                      v{appVersion}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <dt className="text-white/70">
                      {locale === "ur" ? "ادائیگی" : "Payment"}
                    </dt>
                    <dd className="mt-0.5 font-extrabold">
                      {locale === "ur" ? "کیش آن ڈیلیوری" : "Cash on Delivery"}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <dt className="text-white/70">
                      {locale === "ur" ? "میسنجر" : "Messenger"}
                    </dt>
                    <dd className="mt-0.5 font-extrabold">
                      {locale === "ur" ? "اردو وائس نوٹس" : "Urdu Voice Chat"}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <dt className="text-white/70">
                      {locale === "ur" ? "علاقہ" : "Coverage"}
                    </dt>
                    <dd className="mt-0.5 font-extrabold">
                      {locale === "ur" ? "ضلع میانوالی" : "Mianwali District"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-primary-soft text-sm font-extrabold text-brand-primary">
              1
            </span>
            <h2 className="mt-3 text-base font-extrabold text-ink-primary">
              {locale === "ur"
                ? "گِٹ ہب سے APK ڈاؤنلوڈ کریں"
                : "Download APK from GitHub"}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
              {locale === "ur"
                ? "اوپر دیے گئے 'اینڈرائیڈ APK ڈاؤنلوڈ' بٹن پر کلک کریں۔ فائل آفیشل گِٹ ہب ریلیز سے محفوظ طریقے سے ڈاؤنلوڈ ہوگی۔"
                : "Tap the Download Android APK button above to fetch the latest release directly from Saudavo's GitHub Releases channel."}
            </p>
          </article>

          <article className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-accent-soft text-sm font-extrabold text-brand-accent">
              2
            </span>
            <h2 className="mt-3 text-base font-extrabold text-ink-primary">
              {locale === "ur"
                ? "فون میں انسٹال کی اجازت دیں"
                : "Allow App Install on Android"}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
              {locale === "ur"
                ? "ڈاؤنلوڈ کے بعد فائل کھولیں۔ اگر اینڈرائیڈ 'Install unknown apps' پوچھے تو براؤزر یا فائل مینیجر کے لیے اجازت آن کر دیں۔"
                : "Open the downloaded file and allow your browser to install apps if prompted by Android security settings."}
            </p>
          </article>

          <article className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-primary-soft text-sm font-extrabold text-brand-primary">
              3
            </span>
            <h2 className="mt-3 text-base font-extrabold text-ink-primary">
              {locale === "ur"
                ? "یا بغیر ڈاؤنلوڈ کے فوراً چلائیں"
                : "Or Browse & Install Web App"}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
              {locale === "ur"
                ? "آپ ابھی براہِ راست مارکیٹ میں خریداری یا دکان کھولنے کے لیے ویب ایپ استعمال کر سکتے ہیں۔"
                : "Prefer zero APK download? Open Chrome or Safari and use Add to Home Screen, or start shopping immediately online."}
            </p>
            <Link
              href="/"
              className="mt-3 inline-flex text-xs font-extrabold text-brand-primary hover:underline"
            >
              {locale === "ur" ? "مارکیٹ کھولیں ←" : "Browse Marketplace →"}
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
