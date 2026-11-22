"use client";

import type { AddressDto, PublicServiceDetailDto } from "@saudavo/contracts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppContext } from "../../../components/locale-provider";
import {
  ApiClientError,
  createServiceOrder,
  fetchAddresses,
  fetchPublicService
} from "../../../lib/api-client";
import { formatPkrFromPaisa } from "../../../lib/money";

export default function ServiceDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { locale, t, user } = useAppContext();

  const [service, setService] = useState<PublicServiceDetailDto | null>(null);
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetchPublicService(params.slug);
        if (!active) return;
        setService(res.data);
        setSelectedPkgId(res.data.packages[0]?.id ?? "");
        if (user) {
          const addrRes = await fetchAddresses().catch(() => ({ data: [] }));
          if (!active) return;
          setAddresses(addrRes.data);
          setSelectedAddressId(addrRes.data[0]?.id ?? "");
        }
      } catch (err: unknown) {
        if (!active) return;
        setErrorMsg(
          err instanceof ApiClientError ? err.message : "Service not found."
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [params.slug, user]);

  const handleBookService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!service) return;
    if (!user) {
      router.push("/auth");
      return;
    }
    setErrorMsg(null);
    try {
      await createServiceOrder({
        serviceListingId: service.id,
        servicePackageId: selectedPkgId,
        ...(service.serviceMode !== "REMOTE" && selectedAddressId
          ? { addressId: selectedAddressId }
          : {}),
        customerRequirements: requirements
      });
      router.push("/orders");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Unable to create service order."
      );
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-sm text-ink-secondary">
        {t.loadingText}
      </main>
    );
  }

  if (!service) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-sm text-red-700">
        {errorMsg ?? "Service not found."}
      </main>
    );
  }

  const isRemote = service.serviceMode === "REMOTE";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 sm:p-8">
        <span className="inline-block rounded-full bg-brand-accent-soft px-3 py-1 text-xs font-semibold text-brand-accent">
          {isRemote ? t.remoteBadge : t.onSiteBadge}
        </span>

        <h1 dir="auto" className="mt-3 text-2xl font-bold text-ink-primary">
          {service.title}
        </h1>
        <Link
          href={`/stores/${service.store.slug}`}
          dir="auto"
          className="mt-1 inline-block text-sm font-semibold text-brand-primary hover:underline"
        >
          {service.store.displayName} • {service.store.districtNameEn}
        </Link>

        <p dir="auto" className="mt-4 text-sm text-ink-secondary">
          {service.description}
        </p>

        {isRemote && (
          <div
            dir={locale === "ur" ? "rtl" : "ltr"}
            className="mt-4 rounded-xl bg-brand-accent-soft px-4 py-3 text-xs leading-relaxed text-brand-accent"
          >
            {locale === "ur"
              ? "ریموٹ آف لائن سروس (PQ-14): اس سروس کے لیے کوئی فزیکل ڈلیوری نہیں بنے گی۔ ادائیگی براہِ راست سیلر کے ساتھ آف لائن طے ہوگی (کیش، بینک ٹرانسفر، جیز کیش/ایزی پیسہ)۔ سوداو آن لائن پیمنٹ گیٹ وے، والیٹ یا ایسکرو نہیں چلاتا — کسی تنازعے کی صورت میں اپنی ادائیگی کی رسید محفوظ رکھیں۔"
              : "Remote Offline Service (PQ-14): No shipping delivery record is created. Payment is arranged directly with the seller offline (Cash, Bank Transfer, JazzCash/Easypaisa). Saudavo does not hold funds, wallets, or escrow — keep your transfer receipt in case of a dispute."}
          </div>
        )}

        <form onSubmit={handleBookService} className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary">
              Select Package Tier
            </label>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {service.packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selectedPkgId === pkg.id
                      ? "border-brand-primary bg-brand-primary-soft/50"
                      : "border-border-subtle bg-surface-card"
                  }`}
                >
                  <div className="text-sm font-bold text-ink-primary">
                    {pkg.tierName}
                  </div>
                  <div className="mt-1 text-lg font-bold text-brand-primary">
                    {formatPkrFromPaisa(pkg.pricePaisa, locale)}
                  </div>
                  <div className="mt-1 text-xs text-ink-secondary">
                    {pkg.deliveryEstimateDays} days • {pkg.maxRevisions} revisions
                  </div>
                </button>
              ))}
            </div>
          </div>

          {!isRemote && (
            <div>
              <label className="block text-xs font-semibold text-ink-secondary">
                Service Location (Mianwali Address)
              </label>
              <select
                required
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2.5 text-sm"
              >
                <option value="">Select address...</option>
                {addresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.label ?? "Address"} — {addr.streetAddress} ({addr.areaZoneName})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-secondary">
              Project Requirements
            </label>
            <textarea
              required
              minLength={5}
              rows={3}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={
                service.requirementsPrompt ??
                "Describe what you need from this seller..."
              }
              className="mt-1.5 w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-sm"
            />
          </div>

          {errorMsg && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-xs text-red-700">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
          >
            Place Single-Seller Service Order
          </button>
        </form>
      </div>
    </main>
  );
}
