"use client";

import type { AddressDto, DistrictDto } from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyInboxSpot, SpotState } from "../../components/illustrations";
import { useAppContext } from "../../components/locale-provider";
import { ConfirmActionButton } from "../../components/ui-primitives";
import {
  ApiClientError,
  createAddress,
  deleteAddress,
  fetchAddresses,
  fetchCustomerProfile,
  fetchDistricts,
  updateAddress,
  updateCustomerProfile
} from "../../lib/api-client";

export default function CustomerAccountPage() {
  const { locale, setLocale, t, user, authLoading, showToast } = useAppContext();

  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [defaultDistrictId, setDefaultDistrictId] = useState("");
  const [defaultAreaZoneId, setDefaultAreaZoneId] = useState("");

  // New / Edit address state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [areaZoneId, setAreaZoneId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [isDefault, setIsDefault] = useState(true);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const loadAccountData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const [distRes, profileRes, addrRes] = await Promise.all([
        fetchDistricts(),
        fetchCustomerProfile(),
        fetchAddresses()
      ]);
      setDistricts(distRes.data);
      const firstDistrict = distRes.data[0];
      const nextDistId = profileRes.data.defaultDistrictId ?? firstDistrict?.id ?? "";
      const nextZoneId =
        profileRes.data.defaultAreaZoneId ??
        firstDistrict?.areaZones[0]?.id ??
        "";
      setDefaultDistrictId(nextDistId);
      setDefaultAreaZoneId(nextZoneId);
      setAddresses(addrRes.data);
      if (!areaZoneId && firstDistrict?.areaZones[0]) {
        setAreaZoneId(firstDistrict.areaZones[0].id);
      }
      if (!recipientName && user.displayName) {
        setRecipientName(user.displayName);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Unable to load account details."
      );
    } finally {
      setLoading(false);
    }
  }, [areaZoneId, recipientName, user]);

  useEffect(() => {
    void loadAccountData();
  }, [loadAccountData]);

  const activeDistrict =
    districts.find((d) => d.id === defaultDistrictId) ?? districts[0];
  const areaZones = activeDistrict?.areaZones ?? [];

  const resetAddressForm = () => {
    setEditingId(null);
    setLabel("");
    setRecipientName(user?.displayName ?? "");
    setRecipientPhone("");
    setStreetAddress("");
    setLandmark("");
    setIsDefault(addresses.length === 0);
    if (areaZones[0]) {
      setAreaZoneId(areaZones[0].id);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      await updateCustomerProfile({
        preferredLocale: locale,
        defaultDistrictId: defaultDistrictId || null,
        defaultAreaZoneId: defaultAreaZoneId || null
      });
      const msg =
        locale === "ur"
          ? "پروفائل اور ترجیحی علاقہ محفوظ ہو گیا۔"
          : "Account preferences saved.";
      setNoticeMsg(msg);
      showToast(msg);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to save preferences."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const targetDistrictId = defaultDistrictId || districts[0]?.id;
    const targetZoneId = areaZoneId || areaZones[0]?.id;
    if (!targetDistrictId || !targetZoneId) {
      setErrorMsg("Please select a Mianwali area zone.");
      return;
    }

    setSavingAddress(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      if (editingId) {
        await updateAddress(editingId, {
          label: label.trim() || null,
          districtId: targetDistrictId,
          areaZoneId: targetZoneId,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          streetAddress: streetAddress.trim(),
          landmark: landmark.trim() || null,
          isDefault
        });
        showToast(locale === "ur" ? "پتہ اپ ڈیٹ ہو گیا۔" : "Address updated.");
      } else {
        await createAddress({
          ...(label.trim() ? { label: label.trim() } : {}),
          districtId: targetDistrictId,
          areaZoneId: targetZoneId,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          streetAddress: streetAddress.trim(),
          ...(landmark.trim() ? { landmark: landmark.trim() } : {}),
          isDefault
        });
        showToast(locale === "ur" ? "نیا پتہ محفوظ ہو گیا۔" : "Saved delivery address.");
      }
      resetAddressForm();
      await loadAccountData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Check Pakistani mobile format (03XXXXXXXXX) and address details."
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handleStartEdit = (addr: AddressDto) => {
    setEditingId(addr.id);
    setLabel(addr.label ?? "");
    setAreaZoneId(addr.areaZoneId ?? areaZones[0]?.id ?? "");
    setRecipientName(addr.recipientName);
    setRecipientPhone(addr.recipientPhone);
    setStreetAddress(addr.streetAddress);
    setLandmark(addr.landmark ?? "");
    setIsDefault(addr.isDefault);
  };

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-ink-secondary">
        {t.loadingText}
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 pb-24">
        <SpotState
          illustration={<EmptyInboxSpot />}
          badge={locale === "ur" ? "میرا اکاؤنٹ" : "My Account"}
          title={
            locale === "ur"
              ? "اپنے پتے اور پروفائل دیکھنے کے لیے لاگ ان کریں"
              : "Sign in to manage your account & saved addresses"
          }
          description={
            locale === "ur"
              ? "میانوالی ڈلیوری کے محفوظ پتے اور ترجیحات صرف آپ کے نجی اکاؤنٹ میں رہتے ہیں۔"
              : "Save Mianwali delivery addresses for faster single-seller COD checkout."
          }
          actions={
            <Link
              href="/auth"
              className="rounded-2xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover"
            >
              {t.openAuthBtn}
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-3 py-6 pb-24 sm:px-6 md:pb-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-primary">
            {locale === "ur" ? "میرا اکاؤنٹ اور ڈلیوری پتے" : "My Account & Saved Addresses"}
          </h1>
          <p className="text-xs text-ink-secondary">
            {user.displayName} •{" "}
            {user.emailVerified
              ? locale === "ur"
                ? "تصدیق شدہ ای میل"
                : "Verified Email"
              : user.phoneVerified
                ? locale === "ur"
                  ? "تصدیق شدہ موبائل"
                  : "Verified Mobile"
                : locale === "ur"
                  ? "سوداو ممبر"
                  : "Saudavo Member"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/orders"
            className="rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2 text-xs font-semibold text-ink-primary hover:border-brand-primary"
          >
            {t.navOrders}
          </Link>
          <Link
            href="/cart"
            className="rounded-xl bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover"
          >
            {t.navCart}
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {errorMsg}
        </div>
      )}
      {noticeMsg && (
        <div role="status" className="rounded-2xl border border-brand-primary/30 bg-brand-primary-soft px-4 py-3 text-xs font-semibold text-brand-primary">
          {noticeMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Preferences */}
        <section className="rounded-3xl border border-border-subtle bg-surface-card p-5 shadow-card lg:col-span-5">
          <h2 className="text-base font-bold text-ink-primary">
            {locale === "ur" ? "زبان اور ڈیفالٹ علاقہ" : "Locale & Default Area"}
          </h2>
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary">
                {locale === "ur" ? "ترجیحی زبان" : "Preferred Language"}
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value === "ur" ? "ur" : "en")}
                className="mt-1 w-full rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2.5 text-sm"
              >
                <option value="en">English (LTR)</option>
                <option value="ur">اردو (RTL)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary">
                {locale === "ur" ? "پائلٹ ضلع" : "Pilot District"}
              </label>
              <select
                value={defaultDistrictId}
                onChange={(e) => setDefaultDistrictId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2.5 text-sm"
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {locale === "ur" ? d.nameUr : d.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary">
                {locale === "ur" ? "ڈیفالٹ تحصیل / زون" : "Default Mianwali Area Zone"}
              </label>
              <select
                value={defaultAreaZoneId}
                onChange={(e) => setDefaultAreaZoneId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2.5 text-sm"
              >
                {areaZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {locale === "ur" ? z.nameUr : z.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full rounded-xl bg-brand-primary py-2.5 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50"
            >
              {savingProfile
                ? "..."
                : locale === "ur"
                  ? "ترجیحات محفوظ کریں"
                  : "Save Preferences"}
            </button>
          </form>
        </section>

        {/* Address Book */}
        <section className="space-y-5 rounded-3xl border border-border-subtle bg-surface-card p-5 shadow-card lg:col-span-7">
          <h2 className="text-base font-bold text-ink-primary">
            {locale === "ur"
              ? `محفوظ ڈلیوری پتے (${addresses.length})`
              : `Saved Delivery Addresses (${addresses.length})`}
          </h2>

          {addresses.length === 0 ? (
            <p className="rounded-2xl bg-surface-muted/60 px-4 py-3 text-xs text-ink-secondary">
              {locale === "ur"
                ? "ابھی تک کوئی ڈلیوری پتہ محفوظ نہیں ہے۔ تیز COD چیک آؤٹ کے لیے نیچے نیا پتہ شامل کریں۔"
                : "No delivery addresses saved yet. Add one below for instant COD checkout."}
            </p>
          ) : (
            <div className="space-y-2.5">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border-subtle p-3.5"
                >
                  <div className="space-y-0.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink-primary">
                        {addr.label || addr.recipientName}
                      </span>
                      {addr.isDefault && (
                        <span className="rounded-full bg-brand-primary-soft px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                          {locale === "ur" ? "ڈیفالٹ" : "Default"}
                        </span>
                      )}
                      <span className="text-ink-secondary">
                        {addr.areaZoneName ?? addr.districtName}
                      </span>
                    </div>
                    <p dir="auto" className="text-ink-primary">
                      {addr.recipientName} • {addr.recipientPhone}
                    </p>
                    <p dir="auto" className="text-ink-secondary">
                      {addr.streetAddress}
                      {addr.landmark ? ` (${addr.landmark})` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() =>
                          void updateAddress(addr.id, { isDefault: true }).then(loadAccountData)
                        }
                        className="rounded-lg border border-border-subtle px-2.5 py-1 text-[11px] font-semibold text-brand-primary hover:border-brand-primary"
                      >
                        {locale === "ur" ? "ڈیفالٹ بنائیں" : "Set Default"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(addr)}
                      className="rounded-lg bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-ink-primary"
                    >
                      {locale === "ur" ? "ترمیم" : "Edit"}
                    </button>
                    <ConfirmActionButton
                      label={locale === "ur" ? "حذف" : "Delete"}
                      confirmLabel={t.confirmYesBtn}
                      cancelLabel={t.cancelBtn}
                      onConfirm={() => {
                        void deleteAddress(addr.id).then(loadAccountData);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSaveAddress}
            className="grid grid-cols-1 gap-3 border-t border-border-subtle pt-4 sm:grid-cols-2"
          >
            <p className="text-xs font-bold text-ink-primary sm:col-span-2">
              {editingId
                ? locale === "ur"
                  ? "منتخب پتہ اپ ڈیٹ کریں"
                  : "Edit Selected Address"
                : locale === "ur"
                  ? "نیا ڈلیوری پتہ شامل کریں"
                  : "Add New Delivery Address"}
            </p>
            <input
              type="text"
              placeholder={locale === "ur" ? "لیبل (مثلاً گھر / دفتر)" : "Label (e.g. Home / Office)"}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-xl border border-border-subtle px-3 py-2 text-xs"
            />
            <select
              value={areaZoneId}
              onChange={(e) => setAreaZoneId(e.target.value)}
              className="rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
            >
              {areaZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {locale === "ur" ? z.nameUr : z.nameEn}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              minLength={2}
              placeholder={locale === "ur" ? "وصول کنندہ کا نام" : "Recipient Name"}
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="rounded-xl border border-border-subtle px-3 py-2 text-xs"
            />
            <input
              type="tel"
              required
              placeholder="03001234567"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="rounded-xl border border-border-subtle px-3 py-2 text-xs"
            />
            <input
              type="text"
              required
              minLength={5}
              placeholder={locale === "ur" ? "گلی / محلہ / گھر نمبر" : "Street / Mohalla / House details"}
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              className="rounded-xl border border-border-subtle px-3 py-2 text-xs sm:col-span-2"
            />
            <input
              type="text"
              placeholder={locale === "ur" ? "قریبی مشہور جگہ (اختیاری)" : "Nearest landmark (optional)"}
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="rounded-xl border border-border-subtle px-3 py-2 text-xs sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-xs text-ink-secondary sm:col-span-2">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              {locale === "ur" ? "ڈیفالٹ ڈلیوری پتہ مقرر کریں" : "Set as default delivery address"}
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={savingAddress}
                className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50"
              >
                {savingAddress
                  ? "..."
                  : editingId
                    ? locale === "ur"
                      ? "تبدیلیاں محفوظ کریں"
                      : "Save Address Changes"
                    : locale === "ur"
                      ? "پتہ محفوظ کریں"
                      : "Save New Address"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetAddressForm}
                  className="rounded-xl border border-border-subtle px-4 py-2 text-xs font-semibold text-ink-secondary"
                >
                  {t.cancelBtn}
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
