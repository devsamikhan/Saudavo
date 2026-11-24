"use client";

import type { LocaleCode } from "@saudavo/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppContext } from "../../components/locale-provider";
import {
  ApiClientError,
  loginAccount,
  registerAccount,
  verifyAdminMfa
} from "../../lib/api-client";

export default function AuthPage() {
  const router = useRouter();
  const { locale, user, setUser, refreshUser } = useAppContext();

  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
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
        setSuccessMsg("Signed in. Please complete Staff TOTP MFA verification below.");
      } else {
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
      router.push("/");
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
      router.push("/admin");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Invalid MFA code."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm sm:p-8">
        <div className="flex gap-2 rounded-xl bg-surface-muted p-1">
          <button
            type="button"
            onClick={() => {
              setMode("LOGIN");
              setErrorMsg(null);
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              mode === "LOGIN"
                ? "bg-surface-card text-brand-primary shadow-sm"
                : "text-ink-secondary"
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
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              mode === "REGISTER"
                ? "bg-surface-card text-brand-primary shadow-sm"
                : "text-ink-secondary"
            }`}
          >
            {locale === "ur" ? "نیا اکاؤنٹ" : "Create Account"}
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mt-4 rounded-xl border border-brand-primary/30 bg-brand-primary-soft px-4 py-3 text-sm text-brand-primary">
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
                className="mt-1.5 w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
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
                  className="w-full rounded-xl border border-border-subtle px-3.5 py-2.5 pe-16 text-sm focus:border-brand-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 end-2 my-auto h-fit rounded-md px-2 py-1 text-xs font-semibold text-brand-primary hover:bg-surface-muted"
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
              className="w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50"
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
            <p className="text-xs text-ink-secondary">
              {locale === "ur"
                ? "ای میل یا فون نمبر میں سے کم از کم ایک درج کریں (دونوں لازمی نہیں)۔"
                : "Provide at least Email OR Pakistani Mobile Number (both are not required per PQ-05)."}
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
                className="mt-1.5 w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="auth-reg-email"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  Email (Optional)
                </label>
                <input
                  id="auth-reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ali@saudavo.pk"
                  className="mt-1.5 w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="auth-reg-phone"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  Mobile Phone (Optional)
                </label>
                <input
                  id="auth-reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  className="mt-1.5 w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
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
                  className="w-full rounded-xl border border-border-subtle px-3.5 py-2.5 pe-16 text-sm focus:border-brand-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 end-2 my-auto h-fit rounded-md px-2 py-1 text-xs font-semibold text-brand-primary hover:bg-surface-muted"
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
                Preferred Language
              </label>
              <select
                id="auth-reg-locale"
                value={preferredLocale}
                onChange={(e) =>
                  setPreferredLocale(e.target.value === "ur" ? "ur" : "en")
                }
                className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2.5 text-sm"
              >
                <option value="en">English (LTR)</option>
                <option value="ur">اردو (RTL)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50"
            >
              {submitting
                ? "..."
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
              Staff TOTP MFA Verification Required (PQ-06)
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
              className="w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white"
            >
              Verify Staff MFA
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
