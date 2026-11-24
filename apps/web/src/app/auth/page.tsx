"use client";

import type { LocaleCode } from "@saudavo/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthSplitIllustration } from "../../components/illustrations";
import { useAppContext } from "../../components/locale-provider";
import {
  ApiClientError,
  loginAccount,
  registerAccount,
  verifyAdminMfa
} from "../../lib/api-client";

export default function AuthPage() {
  const router = useRouter();
  const { locale, t, user, setUser, refreshUser, showToast } = useAppContext();

  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [accountIntent, setAccountIntent] = useState<"BUYER" | "SELLER">("BUYER");
  const [identifier, setIdentifier] = useState("");
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
        router.push("/");
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to sign in."
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
      showToast(
        locale === "ur"
          ? "آپ کا سوداو اکاؤنٹ بن گیا!"
          : "Saudavo account created!"
      );
      router.push(accountIntent === "SELLER" ? "/seller" : "/");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Registration failed. Check email or Pakistani phone (+923XXXXXXXXX / 03XXXXXXXXX)."
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
        err instanceof ApiClientError ? err.message : "Invalid MFA code."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const visualCopy =
    mode === "LOGIN"
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
    <main className="fade-slide mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-border-subtle bg-surface-card shadow-soft lg:grid-cols-12">
        {/* Split-Screen Left Visual Panel (Saudavo Emerald #0F6B52) */}
        <section className="flex flex-col justify-between gap-6 bg-brand-primary p-7 text-white sm:p-10 lg:col-span-6">
          <div className="space-y-3">
            <span className="inline-block rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold tracking-wide text-white">
              {visualCopy.badge}
            </span>
            <h1 className="text-2xl font-extrabold leading-snug sm:text-3xl">
              {visualCopy.heading}
            </h1>
            <p className="text-sm leading-relaxed text-brand-primary-soft">
              {visualCopy.body}
            </p>
          </div>

          <div className="py-2">
            <AuthSplitIllustration />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="font-bold text-white">{t.codBadge}</p>
              <p className="mt-0.5 text-brand-primary-soft">
                {locale === "ur"
                  ? "ڈلیوری کے بعد نقد ادائیگی"
                  : "Pay on verified delivery"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="font-bold text-white">{t.privacyShieldBadge}</p>
              <p className="mt-0.5 text-brand-primary-soft">
                {locale === "ur"
                  ? "ذاتی تفصیلات مکمل محفوظ"
                  : "Private contact protection"}
              </p>
            </div>
          </div>
        </section>

        {/* Split-Screen Right Form Panel */}
        <section className="p-6 sm:p-10 lg:col-span-6">
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

          {errorMsg && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
            >
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mt-4 rounded-2xl border border-brand-primary/30 bg-brand-primary-soft px-4 py-3 text-xs font-semibold text-brand-primary">
              {successMsg}
            </div>
          )}

          {mode === "LOGIN" ? (
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
                <label
                  htmlFor="auth-login-password"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  {locale === "ur" ? "پاس ورڈ" : "Password"}
                </label>
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
                className="w-full rounded-2xl bg-brand-primary py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-primary-hover disabled:opacity-50"
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
