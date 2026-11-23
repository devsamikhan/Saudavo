"use client";

import type { PublicSearchItem, PublicStoreDto, ReviewDto } from "@saudavo/contracts";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppContext } from "../../../components/locale-provider";
import { StoreShareAndQrCard } from "../../../components/qr-poster";
import { ReportListingButton, TrustPill } from "../../../components/ui-primitives";
import {
  ApiClientError,
  fetchPublicStoreCatalog,
  fetchStoreReviews
} from "../../../lib/api-client";
import { formatPkrFromPaisa } from "../../../lib/money";

export default function PublicStorePage() {
  const params = useParams<{ slug: string }>();
  const { locale, t } = useAppContext();

  const [store, setStore] = useState<PublicStoreDto | null>(null);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [products, setProducts] = useState<PublicSearchItem[]>([]);
  const [services, setServices] = useState<PublicSearchItem[]>([]);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [catalogRes, revRes] = await Promise.all([
          fetchPublicStoreCatalog(params.slug),
          fetchStoreReviews(params.slug).catch(() => ({ data: [] }))
        ]);
        if (!active) return;
        setStore(catalogRes.data.store);
        setRatingAvg(catalogRes.data.ratingAvg);
        setReviewCount(catalogRes.data.reviewCount);
        setProducts(catalogRes.data.products);
        setServices(catalogRes.data.services);
        setReviews(revRes.data);
      } catch (err: unknown) {
        if (!active) return;
        setErrorMsg(
          err instanceof ApiClientError ? err.message : "Store not found."
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [params.slug]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-ink-secondary">
        {t.loadingText}
      </main>
    );
  }

  if (!store) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-red-700">
        {errorMsg ?? "Store not found."}
      </main>
    );
  }

  const districtName =
    locale === "ur" ? store.districtNameUr : store.districtNameEn;
  const isPrivacyProtected =
    !store.publicContactPhone && !store.publicBusinessAddress;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <section className="rounded-2xl border border-border-subtle bg-surface-card p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-semibold text-brand-primary">
              {districtName}
            </span>
            <TrustPill label={t.verifiedStoreBadge} variant="verified" />
            {isPrivacyProtected && (
              <TrustPill label={t.privacyShieldBadge} variant="privacy" />
            )}
          </div>
          {ratingAvg !== null && reviewCount > 0 && (
            <span className="text-sm font-bold text-brand-accent">
              ★ {ratingAvg.toFixed(1)} ({reviewCount} {t.reviewsCountLabel})
            </span>
          )}
        </div>

        <h1 dir="auto" className="text-2xl font-bold text-ink-primary sm:text-3xl">
          {store.displayName}
        </h1>
        {store.description && (
          <p dir="auto" className="text-sm leading-relaxed text-ink-secondary">
            {store.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {store.serviceAreas.map((sa) => (
            <span
              key={sa.id}
              className="rounded-full border border-border-subtle bg-surface-muted px-3 py-1 text-xs font-medium text-ink-primary"
            >
              {locale === "ur" ? sa.areaZoneNameUr : sa.areaZoneNameEn}
            </span>
          ))}
          <span className="rounded-full bg-brand-accent-soft px-3 py-1 text-xs font-semibold text-brand-accent">
            {locale === "ur" ? "ڈلیوری فیس:" : "Default Delivery:"}{" "}
            {formatPkrFromPaisa(store.defaultDeliveryFeePaisa, locale)}
          </span>
        </div>

        {(store.publicContactPhone || store.publicBusinessAddress) && (
          <div className="rounded-xl bg-surface-muted p-4 text-xs text-ink-secondary space-y-1">
            {store.publicContactPhone && (
              <p>Public Phone: {store.publicContactPhone}</p>
            )}
            {store.publicBusinessAddress && (
              <p dir="auto">Business Address: {store.publicBusinessAddress}</p>
            )}
          </div>
        )}

        <StoreShareAndQrCard
          storeSlug={store.slug}
          storeDisplayName={store.displayName}
          districtName={districtName}
        />

        <div className="pt-1">
          <ReportListingButton targetType="STORE" targetId={store.id} />
        </div>
      </section>

      {/* Store Active Products */}
      <section className="rounded-2xl border border-border-subtle bg-surface-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-ink-primary">
          {t.storeCatalogProducts} ({products.length})
        </h2>
        {products.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            {locale === "ur"
              ? "اس اسٹور میں ابھی کوئی فعال پروڈکٹ موجود نہیں۔"
              : "No active products listed by this store yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((prod) => (
              <article
                key={prod.id}
                className="flex flex-col justify-between rounded-xl border border-border-subtle p-4 transition hover:border-brand-primary"
              >
                <div className="space-y-2">
                  <div className="h-36 w-full overflow-hidden rounded-lg bg-brand-primary-soft flex items-center justify-center text-xs font-semibold text-brand-primary">
                    {prod.thumbnailUrl ? (
                      <img
                        src={prod.thumbnailUrl}
                        alt={prod.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      t.codBadge
                    )}
                  </div>
                  <h3 dir="auto" className="text-base font-bold text-ink-primary">
                    {prod.title}
                  </h3>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
                  <span className="font-bold text-brand-primary">
                    {formatPkrFromPaisa(prod.pricePaisa, locale)}
                  </span>
                  <Link
                    href={`/products/${prod.slug}`}
                    className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover"
                  >
                    {t.viewDetails}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Store Active Services */}
      <section className="rounded-2xl border border-border-subtle bg-surface-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-ink-primary">
          {t.storeCatalogServices} ({services.length})
        </h2>
        {services.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            {locale === "ur"
              ? "اس اسٹور میں ابھی کوئی فعال سروس موجود نہیں۔"
              : "No active services listed by this store yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <article
                key={svc.id}
                className="flex flex-col justify-between rounded-xl border border-border-subtle p-4 transition hover:border-brand-accent"
              >
                <div className="space-y-2">
                  <span className="inline-block rounded-full bg-brand-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand-accent">
                    {svc.serviceMode === "REMOTE"
                      ? t.remoteBadge
                      : svc.serviceMode === "HYBRID"
                        ? t.hybridBadge
                        : t.onSiteBadge}
                  </span>
                  <h3 dir="auto" className="text-base font-bold text-ink-primary">
                    {svc.title}
                  </h3>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
                  <span className="font-bold text-brand-primary">
                    {formatPkrFromPaisa(svc.pricePaisa, locale)}
                  </span>
                  <Link
                    href={`/services/${svc.slug}`}
                    className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover"
                  >
                    {t.viewDetails}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Verified Buyer Reviews */}
      <section className="rounded-2xl border border-border-subtle bg-surface-card p-6">
        <h2 className="text-lg font-bold text-ink-primary">
          {locale === "ur" ? "تصدیق شدہ خریدار تبصرے" : "Verified Buyer Reviews"} (
          {reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-sm text-ink-secondary">
            {locale === "ur"
              ? "ابھی تک کوئی شائع شدہ تبصرہ موجود نہیں۔"
              : "No published reviews yet."}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-xl border border-border-subtle p-4"
              >
                <div className="flex items-center justify-between text-xs">
                  <span dir="auto" className="font-semibold text-ink-primary">
                    {rev.reviewerDisplayName}
                  </span>
                  <span className="font-bold text-brand-accent">
                    {"★".repeat(rev.rating)}
                  </span>
                </div>
                {rev.comment && (
                  <p dir="auto" className="mt-2 text-sm text-ink-secondary">
                    {rev.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
