"use client";

import type {
  CategoryDto,
  DistrictDto,
  PublicSearchItem
} from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HeroMarketplaceIllustration } from "../components/illustrations";
import { useAppContext } from "../components/locale-provider";
import { CategoryArtwork, SkeletonCard, TrustPill } from "../components/ui-primitives";
import {
  fetchCategories,
  fetchDistricts,
  searchListings
} from "../lib/api-client";
import { formatPkrFromPaisa, parseWholeRupeesToPaisa } from "../lib/money";

type SortMode = "NEWEST" | "PRICE_ASC" | "PRICE_DESC";

export default function HomePage() {
  const { locale, t } = useAppContext();

  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [items, setItems] = useState<PublicSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  const [queryText, setQueryText] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | "PRODUCT" | "SERVICE">("ALL");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [minPkrText, setMinPkrText] = useState("");
  const [maxPkrText, setMaxPkrText] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("NEWEST");

  const activeDistrict = districts[0] ?? null;

  const parsePriceFilter = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return parseWholeRupeesToPaisa(trimmed);
  };

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const minPrice = parsePriceFilter(minPkrText);
      const maxPrice = parsePriceFilter(maxPkrText);
      const res = await searchListings({
        q: queryText.trim() || undefined,
        type: selectedType,
        districtId: activeDistrict?.id,
        areaZoneId: selectedZoneId || undefined,
        categoryId: selectedCategoryId || undefined,
        ...(minPrice !== undefined ? { minPrice } : {}),
        ...(maxPrice !== undefined ? { maxPrice } : {}),
        sort: sortMode,
        limit: 24
      });
      setItems(res.data);
      setApiUnavailable(false);
    } catch {
      setItems([]);
      setApiUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [
    activeDistrict?.id,
    maxPkrText,
    minPkrText,
    queryText,
    selectedCategoryId,
    selectedType,
    selectedZoneId,
    sortMode
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const initialQ = sp.get("q");
      if (initialQ) {
        setQueryText(initialQ);
      }
    }
    let active = true;
    async function init() {
      try {
        const [distRes, catRes] = await Promise.all([
          fetchDistricts(),
          fetchCategories()
        ]);
        if (!active) return;
        setDistricts(distRes.data);
        setCategories(catRes.data);
        setApiUnavailable(false);
      } catch {
        if (!active) return;
        setApiUnavailable(true);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void loadResults();
  };

  return (
    <main className="fade-slide">
      {/* Corporate Memphis 2-Column Hero */}
      <section className="hero-dot-pattern border-b border-border-subtle bg-brand-primary-soft/50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-card px-3.5 py-1.5 text-xs font-bold tracking-wide text-brand-primary shadow-sm">
                <span className="h-2 w-2 rounded-full bg-brand-accent" />
                {t.heroBadge}
              </span>

              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-ink-primary sm:text-5xl">
                {t.heroTitle}
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-ink-secondary sm:text-base">
                {t.heroSubtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="#catalog"
                  className="rounded-2xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-primary-hover"
                >
                  {t.exploreMarketplaceBtn}
                </a>
                <Link
                  href="/auth"
                  className="rounded-2xl border border-border-subtle bg-surface-card px-6 py-3 text-sm font-semibold text-ink-primary shadow-sm transition hover:border-brand-primary"
                >
                  {t.openAuthBtn}
                </Link>
              </div>

              <div className="grid max-w-md grid-cols-3 gap-3 pt-2">
                <div className="rounded-2xl border border-border-subtle bg-surface-card p-3.5 shadow-card">
                  <div className="text-base font-extrabold text-brand-primary">
                    0%
                  </div>
                  <div className="text-[11px] font-medium text-ink-secondary">
                    {locale === "ur" ? "بیٹا کمیشن" : "Beta Commission"}
                  </div>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-card p-3.5 shadow-card">
                  <div className="text-base font-extrabold text-brand-accent">
                    COD
                  </div>
                  <div className="text-[11px] font-medium text-ink-secondary">
                    {locale === "ur" ? "محفوظ ادائیگی" : "Verified Cash"}
                  </div>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-card p-3.5 shadow-card">
                  <div className="text-base font-extrabold text-brand-primary">
                    100%
                  </div>
                  <div className="text-[11px] font-medium text-ink-secondary">
                    {locale === "ur" ? "مقامی تحفظ" : "Privacy First"}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative overflow-hidden rounded-3xl border-2 border-white bg-surface-card p-3 shadow-soft">
                <HeroMarketplaceIllustration />
                <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-canvas px-4 py-2.5 text-xs">
                  <div>
                    <p className="font-bold text-ink-primary">
                      {t.verifiedStoreBadge}
                    </p>
                    <p className="text-ink-secondary">
                      {t.privacyShieldBadge}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-accent-soft px-3 py-1 font-bold text-brand-accent">
                    {t.pilotBadge}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Compact Feature Highlight Cards */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              setSelectedType("PRODUCT");
              document
                .getElementById("catalog")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-3xl border border-border-subtle bg-surface-card p-5 text-start shadow-card transition hover:-translate-y-0.5 hover:border-brand-primary"
          >
            <h2 className="text-base font-bold text-ink-primary">
              {t.pattern1Title}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
              {t.pattern1Body}
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType("SERVICE");
              document
                .getElementById("catalog")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-3xl border border-border-subtle bg-surface-card p-5 text-start shadow-card transition hover:-translate-y-0.5 hover:border-brand-accent"
          >
            <h2 className="text-base font-bold text-ink-primary">
              {t.pattern2Title}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
              {t.pattern2Body}
            </p>
          </button>

          <Link
            href="/seller"
            className="rounded-3xl border border-border-subtle bg-surface-card p-5 text-start shadow-card transition hover:-translate-y-0.5 hover:border-brand-primary"
          >
            <h2 className="text-base font-bold text-ink-primary">
              {t.pattern3Title}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
              {t.pattern3Body}
            </p>
          </Link>
        </div>
      </section>

      {/* Catalog & Search */}
      <div
        id="catalog"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 rounded-3xl border border-border-subtle bg-surface-card p-4 shadow-card sm:flex-row sm:items-center"
        >
          <input
            type="search"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="w-full flex-1 rounded-2xl border border-border-subtle bg-surface-canvas px-4 py-3 text-sm text-ink-primary placeholder:text-ink-secondary focus:border-brand-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-2xl bg-brand-accent px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
          >
            {t.searchButton}
          </button>
        </form>

      {/* Area Zones & Category Filters */}
      <section aria-label="Marketplace filters" className="mt-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedZoneId("")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              selectedZoneId === ""
                ? "bg-brand-primary text-white"
                : "border border-border-subtle bg-surface-card text-ink-primary hover:bg-surface-muted"
            }`}
          >
            {t.allAreasLabel}
          </button>

          {(activeDistrict?.areaZones ?? []).map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => setSelectedZoneId(zone.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedZoneId === zone.id
                  ? "bg-brand-primary text-white"
                  : "border border-border-subtle bg-surface-card text-ink-primary hover:bg-surface-muted"
              }`}
            >
              {locale === "ur" ? zone.nameUr : zone.nameEn}
            </button>
          ))}

          <span className="mx-1 hidden h-4 w-px bg-border-subtle sm:inline-block" />

          {(["ALL", "PRODUCT", "SERVICE"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setSelectedType(kind)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedType === kind
                  ? "bg-brand-accent text-white"
                  : "border border-border-subtle bg-surface-card text-ink-secondary hover:bg-surface-muted"
              }`}
            >
              {kind === "ALL"
                ? t.allCategoriesLabel
                : kind === "PRODUCT"
                  ? t.productsFilter
                  : t.servicesFilter}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategoryId("")}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${
                selectedCategoryId === ""
                  ? "bg-brand-primary-soft text-brand-primary"
                  : "bg-surface-muted text-ink-secondary"
              }`}
            >
              {t.allCategoriesLabel}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  selectedCategoryId === cat.id
                    ? "bg-brand-primary-soft text-brand-primary"
                    : "bg-surface-muted text-ink-secondary hover:text-ink-primary"
                }`}
              >
                {locale === "ur" ? cat.nameUr : cat.nameEn}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <input
            type="number"
            min={0}
            value={minPkrText}
            onChange={(e) => setMinPkrText(e.target.value)}
            placeholder={t.minPriceLabel}
            aria-label={t.minPriceLabel}
            className="w-28 rounded-xl border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
          />
          <input
            type="number"
            min={0}
            value={maxPkrText}
            onChange={(e) => setMaxPkrText(e.target.value)}
            placeholder={t.maxPriceLabel}
            aria-label={t.maxPriceLabel}
            className="w-28 rounded-xl border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
          />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            aria-label="Sort listings"
            className="rounded-xl border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-medium text-ink-primary"
          >
            <option value="NEWEST">{t.sortNewest}</option>
            <option value="PRICE_ASC">{t.sortPriceAsc}</option>
            <option value="PRICE_DESC">{t.sortPriceDesc}</option>
          </select>
          {(queryText ||
            selectedType !== "ALL" ||
            selectedZoneId ||
            selectedCategoryId ||
            minPkrText ||
            maxPkrText ||
            sortMode !== "NEWEST") && (
            <button
              type="button"
              onClick={() => {
                setQueryText("");
                setSelectedType("ALL");
                setSelectedZoneId("");
                setSelectedCategoryId("");
                setMinPkrText("");
                setMaxPkrText("");
                setSortMode("NEWEST");
              }}
              className="rounded-xl border border-border-subtle px-3 py-1.5 text-xs font-semibold text-brand-accent hover:bg-brand-accent-soft"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      </section>

      {/* Listings Grid */}
      <section className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-10 text-center">
            <h2 className="text-lg font-semibold text-ink-primary">
              {t.emptyListingsTitle}
            </h2>
            <p className="mt-2 text-sm text-ink-secondary">{t.emptyListingsBody}</p>
            {apiUnavailable && (
              <p className="mt-3 text-xs text-brand-accent">
                {locale === "ur"
                  ? "نوٹ: لوکل API سرور (localhost:4000) ابھی کنیکٹ نہیں ہے۔"
                  : "Note: Local API server (localhost:4000/api/v1) is not currently reachable."}
              </p>
            )}
            <div className="mt-5 flex justify-center gap-3">
              <Link
                href="/seller"
                className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover"
              >
                {t.navSeller}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const detailHref =
                item.type === "PRODUCT"
                  ? `/products/${item.slug}`
                  : `/services/${item.slug}`;

              const badgeText =
                item.type === "PRODUCT"
                  ? t.codBadge
                  : item.serviceMode === "REMOTE"
                    ? t.remoteBadge
                    : item.serviceMode === "HYBRID"
                      ? t.hybridBadge
                      : t.onSiteBadge;

              const isAccent =
                item.type === "SERVICE" && item.serviceMode === "REMOTE";

              return (
                <article
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-border-subtle bg-surface-card p-4 shadow-sm transition hover:border-brand-primary hover:shadow-md"
                >
                  <div>
                    <div className="h-44 w-full overflow-hidden rounded-xl">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <CategoryArtwork
                          type={item.type}
                          label={
                            item.type === "PRODUCT"
                              ? t.productsFilter
                              : t.servicesFilter
                          }
                        />
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                            isAccent
                              ? "bg-brand-accent-soft text-brand-accent"
                              : "bg-brand-primary-soft text-brand-primary"
                          }`}
                        >
                          {badgeText}
                        </span>
                        {item.store.privacyProtected && (
                          <TrustPill
                            label={t.privacyShieldBadge}
                            variant="privacy"
                          />
                        )}
                      </div>

                      <h2
                        dir="auto"
                        className="text-lg font-semibold text-ink-primary"
                      >
                        {item.title}
                      </h2>

                      <Link
                        href={`/stores/${item.store.slug}`}
                        dir="auto"
                        className="block text-xs font-medium text-ink-secondary hover:text-brand-primary"
                      >
                        {item.store.displayName} •{" "}
                        {item.store.serviceAreas.join(", ")}
                      </Link>

                      {item.reviewCount > 0 && item.ratingAvg !== null && (
                        <p className="text-xs font-semibold text-brand-accent">
                          ★ {item.ratingAvg.toFixed(1)} ({item.reviewCount}{" "}
                          {t.reviewsCountLabel})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
                    <span className="text-lg font-bold text-brand-primary">
                      {formatPkrFromPaisa(item.pricePaisa, locale)}
                    </span>
                    <Link
                      href={detailHref}
                      className="rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover"
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
      </div>
    </main>
  );
}
