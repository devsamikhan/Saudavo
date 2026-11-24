"use client";

import type {
  AddressDto,
  OrderCreatedSummary,
  PublicServiceDetailDto
} from "@saudavo/contracts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppContext } from "../../../components/locale-provider";
import { OrderConfirmedModal } from "../../../components/order-confirmed-modal";
import { ReportListingButton, TrustPill } from "../../../components/ui-primitives";
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
  const { locale, t, user, showToast } = useAppContext();

  const [service, setService] = useState<PublicServiceDetailDto | null>(null);
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderCreatedSummary | null>(
    null
  );

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
      const res = await createServiceOrder({
        serviceListingId: service.id,
        servicePackageId: selectedPkgId,
        ...(service.serviceMode !== "REMOTE" && selectedAddressId
          ? { addressId: selectedAddressId }
          : {}),
        customerRequirements: requirements
      });
      setConfirmedOrder(res.data);
      showToast(
        locale === "ur"
          ? "سروس آرڈر جمع ہو گیا۔"
          : "Service order booked successfully.",
        "primary"
      );
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
  const selectedPkg =
    service.packages.find((p) => p.id === selectedPkgId) ?? service.packages[0];
  const isPrivacyProtected =
    !service.store.publicContactPhone && !service.store.publicBusinessAddress;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:px-6 md:pb-8 lg:px-8 space-y-4">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-secondary">
        <Link href="/" className="font-semibold text-brand-primary hover:underline">
          {t.navStorefront}
        </Link>{" "}
        /{" "}
        <Link
          href={`/stores/${service.store.slug}`}
          dir="auto"
          className="font-semibold text-brand-primary hover:underline"
        >
          {service.store.displayName}
        </Link>{" "}
        / <span dir="auto">{service.title}</span>
      </nav>

      <div className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full bg-brand-accent-soft px-3 py-1 text-xs font-semibold text-brand-accent">
            {isRemote
              ? t.remoteBadge
              : service.serviceMode === "HYBRID"
                ? t.hybridBadge
                : t.onSiteBadge}
          </span>
          {isPrivacyProtected && (
            <TrustPill label={t.privacyShieldBadge} variant="privacy" />
          )}
        </div>

        <h1 dir="auto" className="text-2xl font-bold text-ink-primary">
          {service.title}
        </h1>
        <Link
          href={`/stores/${service.store.slug}`}
          dir="auto"
          className="inline-block text-sm font-semibold text-brand-primary hover:underline"
        >
          {service.store.displayName} •{" "}
          {locale === "ur"
            ? service.store.districtNameUr
            : service.store.districtNameEn}
        </Link>

        <p dir="auto" className="text-sm text-ink-secondary">
          {service.description}
        </p>

        {isRemote && (
          <div
            dir={locale === "ur" ? "rtl" : "ltr"}
            className="rounded-xl bg-brand-accent-soft px-4 py-3 text-xs leading-relaxed text-brand-accent"
          >
            {locale === "ur"
              ? "ریموٹ آف لائن سروس (PQ-14): اس سروس کے لیے کوئی فزیکل ڈلیوری نہیں بنے گی۔ ادائیگی براہِ راست سیلر کے ساتھ آف لائن طے ہوگی (کیش، بینک ٹرانسفر، جیز کیش/ایزی پیسہ)۔ سوداو آن لائن پیمنٹ گیٹ وے، والیٹ یا ایسکرو نہیں چلاتا — کسی تنازعے کی صورت میں اپنی ادائیگی کی رسید محفوظ رکھیں۔"
              : "Remote Offline Service (PQ-14): No shipping delivery record is created. Payment is arranged directly with the seller offline (Cash, Bank Transfer, JazzCash/Easypaisa). Saudavo does not hold funds, wallets, or escrow — keep your transfer receipt in case of a dispute."}
          </div>
        )}

        <form
          id="service-order-form"
          onSubmit={handleBookService}
          className="space-y-5 pt-2"
        >
          <div>
            <label className="block text-xs font-semibold text-ink-secondary">
              {t.comparePackages}
            </label>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {service.packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`rounded-xl border p-4 text-start transition ${
                    selectedPkgId === pkg.id
                      ? "border-brand-primary bg-brand-primary-soft/50 ring-1 ring-brand-primary"
                      : "border-border-subtle bg-surface-card hover:border-brand-primary/50"
                  }`}
                >
                  <div className="text-sm font-bold text-ink-primary">
                    {pkg.tierName}
                  </div>
                  <div className="mt-1 text-lg font-bold text-brand-primary">
                    {formatPkrFromPaisa(pkg.pricePaisa, locale)}
                  </div>
                  <p dir="auto" className="mt-1.5 text-xs text-ink-secondary">
                    {pkg.description}
                  </p>
                  <div className="mt-2 text-[11px] font-medium text-ink-secondary">
                    {pkg.deliveryEstimateDays} {t.daysDelivery} • {pkg.maxRevisions}{" "}
                    {t.revisionsIncluded}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {!isRemote && (
            <div>
              <label className="block text-xs font-semibold text-ink-secondary">
                {locale === "ur"
                  ? "سروس کا پتہ (ضلع میانوالی)"
                  : "Service Location (Mianwali Address)"}
              </label>
              {addresses.length === 0 ? (
                <p className="mt-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                  {locale === "ur"
                    ? "کوئی محفوظ پتہ موجود نہیں۔ "
                    : "No saved address yet. "}
                  <Link href="/cart" className="font-bold underline">
                    {locale === "ur"
                      ? "کارٹ صفحے پر پتہ شامل کریں"
                      : "Save a Mianwali address in Cart"}
                  </Link>
                </p>
              ) : (
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
              )}
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
            {locale === "ur"
              ? "سروس آرڈر جمع کرائیں"
              : "Place Single-Seller Service Order"}
          </button>
        </form>

        <ReportListingButton targetType="SERVICE" targetId={service.id} />
      </div>

      {/* Mobile Sticky Service Booking Bar */}
      {selectedPkg && (
        <div className="fixed inset-x-0 bottom-[56px] z-20 flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-card/95 px-4 py-2.5 backdrop-blur md:hidden">
          <div>
            <p className="text-[10px] font-medium text-ink-secondary">
              {selectedPkg.tierName}
            </p>
            <p className="text-base font-bold text-brand-primary">
              {formatPkrFromPaisa(selectedPkg.pricePaisa, locale)}
            </p>
          </div>
          <button
            type="submit"
            form="service-order-form"
            className="rounded-xl bg-brand-accent px-4 py-2 text-xs font-bold text-white"
          >
            {locale === "ur" ? "سروس بک کریں" : "Book Service"}
          </button>
        </div>
      )}

      {confirmedOrder && (
        <OrderConfirmedModal
          order={confirmedOrder}
          onClose={() => setConfirmedOrder(null)}
        />
      )}
    </main>
  );
}
