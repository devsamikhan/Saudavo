"use client";

import type { LocaleCode } from "@saudavo/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthSplitIllustration } from "../../components/illustrations";
import { useAppContext } from "../../components/locale-provider";
import {
  ApiClientError,
  confirmPasswordReset,
  loginAccount,
  registerAccount,
  requestPasswordReset,
  verifyAdminMfa
} from "../../lib/api-client";

function resolveAuthErrorMessage(
  err: unknown,
  locale: "en" | "ur",
  fallback: string
): string {
  if (err instanceof ApiClientError) {
    if (err.code === "API_UNREACHABLE") {
      return locale === "ur"
        ? "اس وقت سوداو API سرور سے رابطہ نہیں ہو سکا۔ یقینی بنائیں کہ بیک اینڈ سرور چل رہا ہے اور دوبارہ کوشش کریں۔"
        : "Cannot reach Saudavo API server right now. Check that the backend API (localhost:4000) is running and retry.";
    }
    if (err.code === "INVALID_OR_EXPIRED_TOKEN") {
      return locale === "ur"
        ? "یہ ریکوری ٹوکن غلط یا مدت ختم ہو چکی ہے۔ نیا ریکوری لنک/ٹوکن حاصل کریں۔"
        : "This recovery token is invalid or expired. Request or generate a fresh reset link.";
    }
    return err.message;
  }
  return fallback;
}

export default function AuthPage() {
  const router = useRouter();
  const { locale, t, user, setUser, refreshUser, showToast } = useAppContext();

  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | "FORGOT">("LOGIN");
  const [resetStep, setResetStep] = useState<"REQUEST" | "CONFIRM">("REQUEST");
  const [accountIntent, setAccountIntent] = useState<"BUYER" | "SELLER">("BUYER");
  const [shopNamePrefill, setShopNamePrefill] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [preferredLocale, setPreferredLocale] = useState<LocaleCode>(locale);
  const [mfaCode, setMfaCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("intent") === "seller") {
      setAccountIntent("SELLER");
      setMode(sp.get("mode") === "login" ? "LOGIN" : "REGISTER");
    }
    const urlMode = sp.get("mode");
    const urlToken = sp.get("token");
    if (urlMode === "reset" || urlMode === "forgot" || urlToken) {
      setMode("FORGOT");
      if (urlToken) {
        setResetToken(urlToken);
        setResetStep("CONFIRM");
      }
    }
    try {
      const saved = window.sessionStorage.getItem("saudavo_prefill_store_name");
      if (saved) {
        setShopNamePrefill((prev) => prev || saved);
      }
    } catch {
      // Ignore storage unavailability
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await loginAccount({ identifier, password });
      setUser(res.data.user);
      if (res.data.user.mfaRequired && !res.data.user.mfaVerified) {
        setSuccessMsg(
          locale === "ur"
            ? "لاگ ان مکمل۔ برائے مہربانی نیچے MFA کوڈ درج کریں۔"
            : "Signed in. Complete Staff TOTP MFA verification below."
        );
      } else {
        showToast(
          locale === "ur" ? "سوداو میں خوش آمدید!" : "Welcome back to Saudavo!"
        );
        router.push(accountIntent === "SELLER" ? "/seller" : "/");
      }
    } catch (err: unknown) {
      setErrorMsg(
        resolveAuthErrorMessage(
          err,
          locale,
          locale === "ur" ? "لاگ ان نہیں ہو سکا۔" : "Unable to sign in."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await registerAccount({
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        password,
        displayName,
        preferredLocale
      });
      setUser(res.data.user);
      if (
        accountIntent === "SELLER" &&
        shopNamePrefill.trim().length > 0 &&
        typeof window !== "undefined"
      ) {
        try {
          window.sessionStorage.setItem(
            "saudavo_prefill_store_name",
            shopNamePrefill.trim()
          );
        } catch {
          // Ignore storage unavailability
        }
      }
      showToast(
        locale === "ur"
          ? "آپ کا سوداو اکاؤنٹ بن گیا!"
          : "Saudavo account created!"
      );
      router.push(accountIntent === "SELLER" ? "/seller" : "/");
    } catch (err: unknown) {
      setErrorMsg(
        resolveAuthErrorMessage(
          err,
          locale,
          locale === "ur"
            ? "رجسٹریشن مکمل نہیں ہو سکی۔ ای میل یا پاکستانی موبائل نمبر (+923XXXXXXXXX / 03XXXXXXXXX) چیک کریں۔"
            : "Registration failed. Check email or Pakistani phone (+923XXXXXXXXX / 03XXXXXXXXX)."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openForgotPassword = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (identifier.trim().length > 0 && !resetIdentifier.trim()) {
      setResetIdentifier(identifier.trim());
    }
    setResetStep("REQUEST");
    setMode("FORGOT");
  };

  const handleRequestPasswordReset = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const cleanId = resetIdentifier.trim();
    if (cleanId.length < 3) {
      setErrorMsg(
        locale === "ur"
          ? "برائے مہربانی درست ای میل یا موبائل نمبر درج کریں۔"
          : "Enter your registered email or Pakistani mobile number."
      );
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await requestPasswordReset({ identifier: cleanId });
      setSuccessMsg(
        locale === "ur"
          ? "اگر فعال اکاؤنٹ موجود ہوا تو 30 منٹ کے لیے ریکوری لنک/ٹوکن جاری کر دیا گیا ہے۔ ای میل انباکس چیک کریں (یا لوکل ڈویلپمنٹ میں CLI ریکوری لنک استعمال کریں) اور نیچے ٹوکن درج کریں۔"
          : "If a matching active account exists, a 30-minute reset link/token has been queued. Check your email (or use the local operator CLI reset link if email dispatch is not configured) and enter the token below."
      );
      setResetStep("CONFIRM");
    } catch (err: unknown) {
      setErrorMsg(
        resolveAuthErrorMessage(
          err,
          locale,
          locale === "ur"
            ? "اس وقت پاس ورڈ ریکوری کی درخواست مکمل نہیں ہو سکی۔"
            : "Unable to request password recovery right now."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPasswordReset = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const cleanToken = resetToken.trim();
    if (cleanToken.length < 16) {
      setErrorMsg(
        locale === "ur"
          ? "برائے مہربانی کم از کم 16 حروف کا درست ریکوری ٹوکن درج کریں۔"
          : "Enter a valid recovery token (at least 16 characters)."
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg(
        locale === "ur"
          ? "دونوں نئے پاس ورڈ آپس میں میل نہیں کھاتے۔"
          : "New passwords do not match."
      );
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await confirmPasswordReset({
        token: cleanToken,
        newPassword
      });
      if (resetIdentifier.trim().length > 0) {
        setIdentifier(resetIdentifier.trim());
      }
      setPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetToken("");
      setMode("LOGIN");
      const doneMsg =
        locale === "ur"
          ? "پاس ورڈ کامیابی سے تبدیل ہو گیا! اب نئے پاس ورڈ سے لاگ ان کریں۔"
          : "Password updated! Please sign in with your new password.";
      setSuccessMsg(doneMsg);
      showToast(doneMsg, "primary");
    } catch (err: unknown) {
      setErrorMsg(
        resolveAuthErrorMessage(
          err,
          locale,
          locale === "ur"
            ? "ریکوری ٹوکن غلط یا مدت ختم ہو چکی ہے۔ نیا ٹوکن حاصل کریں۔"
            : "Invalid or expired recovery token. Request a fresh token."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await verifyAdminMfa(mfaCode.trim());
      await refreshUser();
      showToast("Staff MFA verified.");
      router.push("/admin");
    } catch (err: unknown) {
      setErrorMsg(
        resolveAuthErrorMessage(
          err,
          locale,
          locale === "ur" ? "MFA کوڈ غلط ہے۔" : "Invalid MFA code."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const visualCopy =
    mode === "FORGOT"
      ? {
          badge: locale === "ur" ? "اکاؤنٹ ریکوری" : "Account Recovery",
          heading:
            locale === "ur"
              ? "اپنے اکاؤنٹ تک محفوظ رسائی واپس پائیں"
              : "Recover your Saudavo access safely",
          body:
            locale === "ur"
              ? "30 منٹ کے سنگل یوز ٹوکن کے ذریعے اپنا نیا پاس ورڈ مقرر کریں اور پرانے سیشن خودکار بند کریں۔"
              : "Reset your password with a single-use 30-minute recovery token — active sessions are revoked automatically."
        }
      : mode === "LOGIN"
        ? {
          badge: t.pilotBadge,
          heading:
            locale === "ur"
              ? "سوداو میں دوبارہ خوش آمدید"
              : "Welcome back to Saudavo",
          body:
            locale === "ur"
              ? "اپنے آرڈرز، پیغامات اور مقامی اسٹور فرنٹ تک محفوظ رسائی حاصل کریں۔"
              : "Sign in to track Cash on Delivery orders, message local shops, or manage your storefront."
        }
      : accountIntent === "SELLER"
        ? {
            badge: locale === "ur" ? "سیلر آن بورڈنگ" : "0% Beta Seller Launch",
            heading:
              locale === "ur"
                ? "اپنا مقامی اسٹور محفوظ طریقے سے کھولیں"
                : "Grow your local shop safely",
            body:
              locale === "ur"
                ? "اکاؤنٹ بنانے کے فوراً بعد اپنا اسٹور سیٹ اپ کریں — ذاتی نمبر اور پتہ پوشیدہ رہتا ہے۔"
                : "Register your account and launch straight into Seller Studio with full privacy protection."
          }
        : {
            badge: locale === "ur" ? "خریدار اکاؤنٹ" : "Mianwali Marketplace",
            heading:
              locale === "ur"
                ? "مقامی ہنرمندوں سے اعتماد کے ساتھ خریدیں"
                : "Shop trusted local stores",
            body:
              locale === "ur"
                ? "چند سیکنڈ میں ای میل یا موبائل نمبر کے ساتھ اپنا سوداو اکاؤنٹ بنائیں۔"
                : "Join in seconds with email or Pakistani mobile number and order locally on Cash on Delivery."
          };

  return (
    <main className="fade-slide mx-auto max-w-5xl px-3 py-5 pb-24 sm:px-6 sm:py-8 md:pb-8 lg:py-12">
      <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-border-subtle bg-surface-card shadow-soft lg:min-h-[590px] lg:grid-cols-12">
        {/* Split-Screen Left Visual Panel (Placed below form on phones for faster sign-in) */}
        <section className="relative order-2 flex flex-col justify-between gap-4 overflow-hidden bg-gradient-to-br from-[#094232] via-[#0F6B52] to-[#073528] p-5 text-white sm:gap-6 sm:p-8 lg:order-1 lg:col-span-6 lg:p-10">
          <div className="relative z-10 space-y-2.5 sm:space-y-3">
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide text-[#FDE68A] sm:px-3.5 sm:text-xs">
              {visualCopy.badge}
            </span>
            <h1 className="text-xl font-extrabold leading-snug sm:text-3xl">
              {visualCopy.heading}
            </h1>
            <p className="text-xs leading-relaxed text-white/85 sm:text-sm">
              {visualCopy.body}
            </p>
          </div>

          <div className="glass-promo relative z-10 rounded-2xl p-2.5 sm:rounded-3xl sm:p-3">
            <AuthSplitIllustration />
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-2.5 text-xs sm:gap-3">
            <div className="glass-promo rounded-2xl p-2.5 sm:p-3">
              <p className="font-bold text-white">{t.codBadge}</p>
              <p className="mt-0.5 text-[11px] text-white/80 sm:text-xs">
                {locale === "ur"
                  ? "ڈلیوری کے بعد نقد ادائیگی"
                  : "Pay on verified delivery"}
              </p>
            </div>
            <div className="glass-promo rounded-2xl p-2.5 sm:p-3">
              <p className="font-bold text-white">{t.privacyShieldBadge}</p>
              <p className="mt-0.5 text-[11px] text-white/80 sm:text-xs">
                {locale === "ur"
                  ? "ذاتی تفصیلات مکمل محفوظ"
                  : "Private contact protection"}
              </p>
            </div>
          </div>
        </section>

        {/* Split-Screen Right Form Panel (First on mobile viewports) */}
        <section className="order-1 p-5 sm:p-8 lg:order-2 lg:col-span-6 lg:p-10">
          {mode === "FORGOT" ? (
            <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-3">
              <div>
                <h2 className="text-base font-extrabold text-ink-primary">
                  {locale === "ur" ? "پاس ورڈ ریکور کریں" : "Recover Password"}
                </h2>
                <p className="text-xs text-ink-secondary">
                  {resetStep === "REQUEST"
                    ? locale === "ur"
                      ? "مرحلہ 1 از 2 • ریکوری لنک یا ٹوکن حاصل کریں"
                      : "Step 1 of 2 • Request recovery link or token"
                    : locale === "ur"
                      ? "مرحلہ 2 از 2 • ٹوکن اور نیا پاس ورڈ درج کریں"
                      : "Step 2 of 2 • Enter token & set new password"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode("LOGIN");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="min-h-[36px] rounded-xl border border-border-subtle px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:border-brand-primary"
              >
                {locale === "ur" ? "لاگ ان پر واپس" : "← Back to Sign In"}
              </button>
            </div>
          ) : (
          <div className="flex gap-2 rounded-2xl bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => {
                setMode("LOGIN");
                setErrorMsg(null);
              }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === "LOGIN"
                  ? "bg-surface-card text-brand-primary shadow-sm"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              {locale === "ur" ? "لاگ ان" : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("REGISTER");
                setErrorMsg(null);
              }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === "REGISTER"
                  ? "bg-surface-card text-brand-primary shadow-sm"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              {locale === "ur" ? "نیا اکاؤنٹ" : "Create Account"}
            </button>
          </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
            >
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div
              role="status"
              className="mt-4 rounded-2xl border border-brand-primary/30 bg-brand-primary-soft px-4 py-3 text-xs font-semibold text-brand-primary"
            >
              {successMsg}
            </div>
          )}

          {mode === "FORGOT" ? (
            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-muted p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setResetStep("REQUEST");
                    setErrorMsg(null);
                  }}
                  className={`rounded-xl py-2 transition ${
                    resetStep === "REQUEST"
                      ? "bg-surface-card text-brand-primary shadow-sm"
                      : "text-ink-secondary hover:text-ink-primary"
                  }`}
                >
                  {locale === "ur" ? "1. ریکوری طلب کریں" : "1. Request Token"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetStep("CONFIRM");
                    setErrorMsg(null);
                  }}
                  className={`rounded-xl py-2 transition ${
                    resetStep === "CONFIRM"
                      ? "bg-surface-card text-brand-primary shadow-sm"
                      : "text-ink-secondary hover:text-ink-primary"
                  }`}
                >
                  {locale === "ur" ? "2. نیا پاس ورڈ بنائیں" : "2. Set New Password"}
                </button>
              </div>

              {resetStep === "REQUEST" ? (
                <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                  <div>
                    <label
                      htmlFor="auth-reset-identifier"
                      className="block text-xs font-semibold text-ink-secondary"
                    >
                      {locale === "ur"
                        ? "رجسٹرڈ ای میل یا موبائل نمبر"
                        : "Registered Email or Pakistani Mobile Number"}
                    </label>
                    <input
                      id="auth-reset-identifier"
                      type="text"
                      required
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="name@example.com or 03001234567"
                      className="mt-1.5 w-full rounded-2xl border border-border-subtle px-4 py-3 text-sm focus:border-brand-primary focus:outline-none"
                    />
                  </div>

                  <p className="rounded-2xl bg-surface-muted/70 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-secondary">
                    {locale === "ur"
                      ? "ای میل والے اکاؤنٹس کو 30 منٹ کے لیے سنگل یوز ریکوری لنک جاری ہوتا ہے۔ اگر لوکل سرور پر ای میل سروس (Resend) سیٹ نہ ہو تو ایڈمن CLI کے ذریعے لنک جاری کیا جا سکتا ہے۔"
                      : "Email accounts receive a single-use 30-minute recovery link/token when email delivery (Resend) is configured. Phone-only accounts or unconfigured local dev environments use support/CLI recovery."}
                  </p>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-[44px] w-full rounded-2xl bg-brand-primary py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-primary-hover disabled:opacity-50"
                  >
                    {submitting
                      ? "..."
                      : locale === "ur"
                        ? "ریکوری لنک / ٹوکن بھیجیں"
                        : "Send Recovery Link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setResetStep("CONFIRM");
                    }}
                    className="w-full py-1 text-center text-xs font-semibold text-brand-primary hover:underline"
                  >
                    {locale === "ur"
                      ? "پہلے سے ریکوری ٹوکن موجود ہے؟ یہاں درج کریں"
                      : "I already have a reset token →"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
                  <div>
                    <label
                      htmlFor="auth-reset-token"
                      className="block text-xs font-semibold text-ink-secondary"
                    >
                      {locale === "ur" ? "ریکوری ٹوکن" : "Recovery Token"}
                    </label>
                    <input
                      id="auth-reset-token"
                      type="text"
                      required
                      minLength={16}
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder={
                        locale === "ur"
                          ? "ای میل یا ٹرمینل سے موصول ٹوکن پیسٹ کریں"
                          : "Paste your single-use recovery token"
                      }
                      className="mt-1.5 w-full rounded-2xl border border-border-subtle px-4 py-3 font-mono text-xs focus:border-brand-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-reset-new-password"
                      className="block text-xs font-semibold text-ink-secondary"
                    >
                      {locale === "ur"
                        ? "نیا پاس ورڈ (کم از کم 8 حروف)"
                        : "New Password (min 8 characters)"}
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="auth-reset-new-password"
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-2xl border border-border-subtle px-4 py-3 pe-16 text-sm focus:border-brand-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute inset-y-0 end-2 my-auto h-fit rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-primary hover:bg-surface-muted"
                      >
                        {showNewPassword
                          ? locale === "ur"
                            ? "چھپائیں"
                            : "Hide"
                          : locale === "ur"
                            ? "دکھائیں"
                            : "Show"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-reset-confirm-password"
                      className="block text-xs font-semibold text-ink-secondary"
                    >
                      {locale === "ur"
                        ? "نئے پاس ورڈ کی تصدیق"
                        : "Confirm New Password"}
                    </label>
                    <input
                      id="auth-reset-confirm-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="mt-1.5 w-full rounded-2xl border border-border-subtle px-4 py-3 text-sm focus:border-brand-primary focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-[44px] w-full rounded-2xl bg-brand-primary py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-primary-hover disabled:opacity-50"
                  >
                    {submitting
                      ? "..."
                      : locale === "ur"
                        ? "نیا پاس ورڈ محفوظ کریں"
                        : "Save New Password"}
                  </button>
                </form>
              )}
            </div>
          ) : mode === "LOGIN" ? (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="auth-login-identifier"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  {locale === "ur"
                    ? "ای میل یا موبائل نمبر (مثلاً 03001234567)"
                    : "Email or Pakistani Mobile Number (PQ-05)"}
                </label>
                <input
                  id="auth-login-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com or 03001234567"
                  className="mt-1.5 w-full rounded-2xl border border-border-subtle px-4 py-3 text-sm focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="auth-login-password"
                    className="block text-xs font-semibold text-ink-secondary"
                  >
                    {locale === "ur" ? "پاس ورڈ" : "Password"}
                  </label>
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-xs font-semibold text-brand-primary hover:underline"
                  >
                    {locale === "ur" ? "پاس ورڈ بھول گئے؟" : "Forgot password?"}
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <input
                    id="auth-login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-border-subtle px-4 py-3 pe-16 text-sm focus:border-brand-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 end-2 my-auto h-fit rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-primary hover:bg-surface-muted"
                  >
                    {showPassword
                      ? locale === "ur"
                        ? "چھپائیں"
                        : "Hide"
                      : locale === "ur"
                        ? "دکھائیں"
                        : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] w-full rounded-2xl bg-brand-primary py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-primary-hover disabled:opacity-50"
              >
                {submitting
                  ? "..."
                  : locale === "ur"
                    ? "لاگ ان کریں"
                    : "Sign In to Saudavo"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              {/* Buyer vs Local Seller Selector */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAccountIntent("BUYER")}
                  className={`rounded-2xl border p-3 text-start text-xs transition ${
                    accountIntent === "BUYER"
                      ? "border-brand-primary bg-brand-primary-soft/60 text-brand-primary"
                      : "border-border-subtle bg-surface-canvas text-ink-secondary"
                  }`}
                >
                  <p className="font-bold">
                    {locale === "ur" ? "خریدار" : "Shop Local"}
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-80">
                    {locale === "ur" ? "آرڈر اور سروسز" : "Buyer account"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountIntent("SELLER")}
                  className={`rounded-2xl border p-3 text-start text-xs transition ${
                    accountIntent === "SELLER"
                      ? "border-brand-accent bg-brand-accent-soft text-brand-accent"
                      : "border-border-subtle bg-surface-canvas text-ink-secondary"
                  }`}
                >
                  <p className="font-bold">
                    {locale === "ur" ? "مقامی دکاندار" : "Sell Locally"}
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-80">
                    {locale === "ur" ? "اسٹور شروع کریں" : "Open a store"}
                  </p>
                </button>
              </div>

              {accountIntent === "SELLER" && (
                <div>
                  <label
                    htmlFor="auth-reg-shop-name"
                    className="block text-xs font-semibold text-ink-secondary"
                  >
                    {locale === "ur"
                      ? "دکان یا کاروبار کا نام (اختیاری)"
                      : "Shop or Craft Name (Optional)"}
                  </label>
                  <input
                    id="auth-reg-shop-name"
                    type="text"
                    maxLength={80}
                    value={shopNamePrefill}
                    onChange={(e) => setShopNamePrefill(e.target.value)}
                    placeholder={
                      locale === "ur"
                        ? "مثلاً میانوالی ہینڈلوم اسٹوڈیو"
                        : "e.g. Indus Looms Studio"
                    }
                    className="mt-1.5 w-full rounded-2xl border border-brand-accent/40 bg-brand-accent-soft/40 px-4 py-2.5 text-sm focus:border-brand-accent focus:outline-none"
                  />
                </div>
              )}

              <p className="text-xs text-ink-secondary">
                {locale === "ur"
                  ? "ای میل یا فون نمبر میں سے کم از کم ایک درج کریں۔"
                  : "Enter at least Email OR Pakistani Mobile Number."}
              </p>

              <div>
                <label
                  htmlFor="auth-reg-display-name"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  {locale === "ur" ? "مکمل نام" : "Display Name"}
                </label>
                <input
                  id="auth-reg-display-name"
                  type="text"
                  required
                  minLength={2}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="auth-reg-email"
                    className="block text-xs font-semibold text-ink-secondary"
                  >
                    {locale === "ur" ? "ای میل (اختیاری)" : "Email (Optional)"}
                  </label>
                  <input
                    id="auth-reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ali@saudavo.pk"
                    className="mt-1.5 w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="auth-reg-phone"
                    className="block text-xs font-semibold text-ink-secondary"
                  >
                    {locale === "ur"
                      ? "موبائل نمبر (اختیاری)"
                      : "Mobile Phone (Optional)"}
                  </label>
                  <input
                    id="auth-reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03001234567"
                    className="mt-1.5 w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-reg-password"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  {locale === "ur"
                    ? "پاس ورڈ (کم از کم 8 حروف)"
                    : "Password (min 8 chars)"}
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="auth-reg-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 pe-16 text-sm focus:border-brand-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 end-2 my-auto h-fit rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-primary hover:bg-surface-muted"
                  >
                    {showPassword
                      ? locale === "ur"
                        ? "چھپائیں"
                        : "Hide"
                      : locale === "ur"
                        ? "دکھائیں"
                        : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-reg-locale"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  {locale === "ur" ? "پسندیدہ زبان" : "Preferred Language"}
                </label>
                <select
                  id="auth-reg-locale"
                  value={preferredLocale}
                  onChange={(e) =>
                    setPreferredLocale(e.target.value === "ur" ? "ur" : "en")
                  }
                  className="mt-1.5 w-full rounded-2xl border border-border-subtle bg-surface-card px-4 py-2.5 text-sm"
                >
                  <option value="en">English (LTR)</option>
                  <option value="ur">اردو (RTL)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-brand-primary py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-primary-hover disabled:opacity-50"
              >
                {submitting
                  ? "..."
                  : accountIntent === "SELLER"
                    ? locale === "ur"
                      ? "اکاؤنٹ بنائیں اور اسٹور کھولیں"
                      : "Join & Continue to Seller Studio"
                    : locale === "ur"
                      ? "اکاؤنٹ بنائیں"
                      : "Create Saudavo Account"}
              </button>
            </form>
          )}

          {user && user.mfaRequired && !user.mfaVerified && (
            <form
              onSubmit={handleMfaVerify}
              className="mt-6 space-y-3 border-t border-border-subtle pt-6"
            >
              <h2 className="text-sm font-bold text-brand-primary">
                Staff TOTP MFA Verification Required
              </h2>
              <label
                htmlFor="auth-mfa-code"
                className="block text-xs font-semibold text-ink-secondary"
              >
                6-Digit Authenticator Code
              </label>
              <input
                id="auth-mfa-code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                required
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="6-digit authenticator code"
                className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-brand-accent py-2.5 text-sm font-semibold text-white"
              >
                Verify Staff MFA
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
