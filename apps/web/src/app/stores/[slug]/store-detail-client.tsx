"use client";

import type { PublicSearchItem, PublicStoreDto, ReviewDto } from "@saudavo/contracts";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyCartSpot, SpotState } from "../../../components/illustrations";
import { useAppContext } from "../../../components/locale-provider";
import { StoreShareAndQrCard } from "../../../components/qr-poster";
import {
  CategoryArtwork,
  ReportListingButton
} from "../../../components/ui-primitives";
import {
  ApiClientError,
  fetchPublicStoreCatalog,
  fetchStoreReviews,
  followStore,
  unfollowStore
} from "../../../lib/api-client";
import { formatPkrFromPaisa } from "../../../lib/money";

export function StoreDetailClient() {
  const params = useParams<{ slug: string }>();
  const { locale, t, user, isWishlisted, toggleWishlist, showToast } =
    useAppContext();

  const [store, setStore] = useState<PublicStoreDto | null>(null);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [products, setProducts] = useState<PublicSearchItem[]>([]);
  const [services, setServices] = useState<PublicSearchItem[]>([]);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [catalogTab, setCatalogTab] = useState<"ALL" | "PRODUCTS" | "SERVICES">("ALL");
  const [followBusy, setFollowBusy] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
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
        setIsFollowing(Boolean(catalogRes.data.store.isFollowing));
        setFollowerCount(catalogRes.data.store.followerCount ?? 0);
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
  const isPrivacyProtected = !store.publicBusinessAddress;

  const handleToggleFollow = async () => {
    if (!user) {
      showToast(
        locale === "ur"
          ? "اسٹور فالو کرنے کے لیے پہلے سائن ان کریں۔"
          : "Sign in to follow stores and get new listing alerts.",
        "accent"
      );
      return;
    }
    setFollowBusy(true);
    try {
      const res = isFollowing
        ? await unfollowStore(store.id)
        : await followStore(store.id);
      setIsFollowing(res.data.isFollowing);
      setFollowerCount(res.data.followerCount);
    } catch (err: unknown) {
      showToast(
        err instanceof ApiClientError
          ? err.message
          : "Unable to update store follow.",
        "accent"
      );
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-secondary">
        <Link href="/" className="font-semibold text-brand-primary hover:underline">
          {t.navStorefront}
        </Link>{" "}
        / <span dir="auto">{store.displayName}</span>
      </nav>

      <section className="overflow-hidden rounded-3xl border border-border-subtle bg-surface-card shadow-card">
        <div className="bg-gradient-to-br from-[#094232] via-[#0F6B52] to-[#073528] p-6 text-white sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="glass-promo inline-block rounded-full px-3 py-1 text-xs font-bold text-[#FDE68A]">
                {districtName}
              </span>
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                {t.verifiedStoreBadge}
              </span>
              {isPrivacyProtected && (
                <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-[#A7F3D0]">
                  {t.privacyShieldBadge}
                </span>
              )}
            </div>
            {ratingAvg !== null && reviewCount > 0 && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-extrabold text-[#FDE68A]">
                ★ {ratingAvg.toFixed(1)} ({reviewCount} {t.reviewsCountLabel})
              </span>
            )}
          </div>

          <h1 dir="auto" className="text-2xl font-extrabold sm:text-3xl">
            {store.displayName}
          </h1>
          {store.description && (
            <p dir="auto" className="max-w-2xl text-sm leading-relaxed text-white/85">
              {store.description}
            </p>
          )}
        </div>

        <div className="space-y-4 p-6 sm:px-8">
          <div className="flex flex-wrap gap-2">
            {store.completedOrdersCount > 0 && (
              <span className="rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-bold text-brand-primary">
                {locale === "ur"
                  ? `${store.completedOrdersCount} مکمل آرڈرز`
                  : `${store.completedOrdersCount} Completed Orders`}
              </span>
            )}
            {store.avgResponseMinutes !== null && (
              <span className="rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-bold text-brand-primary">
                {locale === "ur"
                  ? `اوسط جواب: ~${store.avgResponseMinutes} منٹ`
                  : `Replies in ~${store.avgResponseMinutes}m`}
              </span>
            )}
            {store.responseRatePercent !== null && (
              <span className="rounded-full border border-border-subtle bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-primary">
                {locale === "ur"
                  ? `جواب کی شرح: ${store.responseRatePercent}%`
                  : `Response rate: ${store.responseRatePercent}%`}
              </span>
            )}
            <span className="rounded-full border border-border-subtle bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-primary">
              {locale === "ur"
                ? `${followerCount} فالورز`
                : `${followerCount} Followers`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {store.serviceAreas.map((sa) => (
              <span
                key={sa.id}
                className="rounded-full border border-border-subtle bg-surface-muted px-3 py-1 text-xs font-medium text-ink-primary"
              >
                {locale === "ur" ? sa.areaZoneNameUr : sa.areaZoneNameEn}
              </span>
            ))}
            <span className="rounded-full bg-brand-accent-soft px-3 py-1 text-xs font-bold text-brand-accent">
              {locale === "ur" ? "ڈلیوری فیس:" : "Default Delivery:"}{" "}
              {formatPkrFromPaisa(store.defaultDeliveryFeePaisa, locale)}
            </span>
          </div>

          {store.publicBusinessAddress && (
            <div className="rounded-2xl bg-surface-muted p-4 text-xs text-ink-secondary space-y-1">
              <p dir="auto">Business Address: {store.publicBusinessAddress}</p>
            </div>
          )}

          <StoreShareAndQrCard
            storeSlug={store.slug}
            storeDisplayName={store.displayName}
            districtName={districtName}
          />

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={`/messages?storeId=${encodeURIComponent(store.id)}`}
              className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-primary-hover"
            >
              {locale === "ur" ? "اسٹور سے چیٹ کریں" : "Message Store"}
            </Link>
            <button
              type="button"
              disabled={followBusy}
              onClick={() => void handleToggleFollow()}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                isFollowing
                  ? "border border-brand-primary bg-brand-primary-soft text-brand-primary"
                  : "border border-border-subtle bg-surface-card text-ink-primary hover:border-brand-primary"
              }`}
            >
              {isFollowing
                ? locale === "ur"
                  ? "✓ فالو کیا ہوا ہے"
                  : "✓ Following"
                : locale === "ur"
                  ? "+ اسٹور فالو کریں"
                  : "+ Follow Store"}
            </button>
            <ReportListingButton targetType="STORE" targetId={store.id} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "ALL", label: `${t.allCategoriesLabel} (${products.length + services.length})` },
            { key: "PRODUCTS", label: `${t.storeCatalogProducts} (${products.length})` },
            { key: "SERVICES", label: `${t.storeCatalogServices} (${services.length})` }
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setCatalogTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              catalogTab === tab.key
                ? "bg-brand-primary text-white"
                : "border border-border-subtle bg-surface-card text-ink-secondary hover:text-ink-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Store Active Products */}
      {(catalogTab === "ALL" || catalogTab === "PRODUCTS") && (
      <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card space-y-4">
        <h2 className="text-lg font-extrabold text-ink-primary">
          {t.storeCatalogProducts} ({products.length})
        </h2>
        {products.length === 0 ? (
          <SpotState
            illustration={<EmptyCartSpot />}
            title={
              locale === "ur"
                ? "اس اسٹور میں ابھی کوئی فعال پروڈکٹ موجود نہیں۔"
                : "No active products listed by this store yet."
            }
            description={t.browseMarketplaceBtn}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((prod) => {
              const wished = isWishlisted(prod.id);
              return (
              <article
                key={prod.id}
                className="flex flex-col justify-between rounded-3xl border border-border-subtle p-4 transition hover:border-brand-primary hover:shadow-card"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-brand-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-primary">
                      {t.codBadge}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleWishlist(prod.id, prod.title)}
                      aria-label={t.saveToWishlistLabel}
                      className="rounded-xl p-1.5 hover:bg-brand-accent-soft"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill={wished ? "#D96B27" : "none"}
                        stroke="#D96B27"
                        strokeWidth="2.2"
                        aria-hidden="true"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                      </svg>
                    </button>
                  </div>
                  <div className="h-40 w-full overflow-hidden rounded-2xl">
                    {prod.thumbnailUrl ? (
                      <img
                        src={prod.thumbnailUrl}
                        alt={prod.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <CategoryArtwork type="PRODUCT" label={t.codBadge} />
                    )}
                  </div>
                  <h3 dir="auto" className="text-base font-extrabold text-ink-primary">
                    {prod.title}
                  </h3>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
                  <span className="font-extrabold text-brand-primary">
                    {formatPkrFromPaisa(prod.pricePaisa, locale)}
                  </span>
                  <Link
                    href={`/products/${prod.slug}`}
                    className="rounded-xl bg-brand-accent px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-accent-hover"
                  >
                    {t.viewDetails}
                  </Link>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>
      )}

      {/* Store Active Services */}
      {(catalogTab === "ALL" || catalogTab === "SERVICES") && (
      <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card space-y-4">
        <h2 className="text-lg font-extrabold text-ink-primary">
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
            {services.map((svc) => {
              const wished = isWishlisted(svc.id);
              return (
              <article
                key={svc.id}
                className="flex flex-col justify-between rounded-3xl border border-border-subtle p-4 transition hover:border-brand-accent hover:shadow-card"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-block rounded-full bg-brand-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-accent">
                      {svc.serviceMode === "REMOTE"
                        ? t.remoteBadge
                        : svc.serviceMode === "HYBRID"
                          ? t.hybridBadge
                          : t.onSiteBadge}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleWishlist(svc.id, svc.title)}
                      aria-label={t.saveToWishlistLabel}
                      className="rounded-xl p-1.5 hover:bg-brand-accent-soft"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill={wished ? "#D96B27" : "none"}
                        stroke="#D96B27"
                        strokeWidth="2.2"
                        aria-hidden="true"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                      </svg>
                    </button>
                  </div>
                  <h3 dir="auto" className="text-base font-extrabold text-ink-primary">
                    {svc.title}
                  </h3>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
                  <span className="font-extrabold text-brand-primary">
                    {formatPkrFromPaisa(svc.pricePaisa, locale)}
                  </span>
                  <Link
                    href={`/services/${svc.slug}`}
                    className="rounded-xl bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-primary-hover"
                  >
                    {t.viewDetails}
                  </Link>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>
      )}

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
                {rev.photoReadUrl && (
                  <img
                    src={rev.photoReadUrl}
                    alt="Verified customer photo review"
                    className="mt-2.5 h-32 w-32 rounded-xl border border-border-subtle object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
