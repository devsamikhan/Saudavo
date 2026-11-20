"use client";

import type {
  CategoryDto,
  DistrictDto,
  PublicSearchItem
} from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../components/locale-provider";
import {
  fetchCategories,
  fetchDistricts,
  searchListings
} from "../lib/api-client";
import { formatPkrFromPaisa } from "../lib/money";

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

  const activeDistrict = districts[0] ?? null;

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchListings({
        q: queryText.trim() || undefined,
        type: selectedType,
        districtId: activeDistrict?.id,
        areaZoneId: selectedZoneId || undefined,
        categoryId: selectedCategoryId || undefined,
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
    queryText,
    selectedCategoryId,
    selectedType,
    selectedZoneId
  ]);

  useEffect(() => {
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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Banner matching Gate D Figma frame 8:2 / 8:64 */}
      <section className="rounded-2xl bg-brand-primary p-6 text-white shadow-sm sm:p-9">
        <span className="inline-block rounded-full bg-brand-accent px-3.5 py-1 text-xs font-semibold tracking-wide text-white">
          {t.heroBadge}
        </span>
        <h1 className="mt-4 max-w-3xl text-2xl font-bold leading-snug sm:text-4xl">
          {t.heroTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-brand-primary-soft sm:text-base">
          {t.heroSubtitle}
        </p>

        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <input
            type="search"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="w-full rounded-xl border border-border-subtle bg-surface-card px-4 py-3 text-sm text-ink-primary placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand-accent sm:max-w-lg"
          />
          <button
            type="submit"
            className="rounded-xl bg-brand-accent px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
          >
            {t.searchButton}
          </button>
        </form>
      </section>

      {/* Area Zones & Category Filters */}
      <section aria-label="Marketplace filters" className="mt-6 space-y-3">
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
      </section>

      {/* Listings Grid */}
      <section className="mt-8">
        {loading ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-10 text-center text-sm text-ink-secondary">
            {t.loadingText}
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
                  className="flex flex-col justify-between rounded-2xl border border-border-subtle bg-surface-card p-4 shadow-sm transition hover:border-brand-primary"
                >
                  <div>
                    <div
                      className={`h-40 w-full rounded-xl ${
                        isAccent ? "bg-brand-accent-soft" : "bg-brand-primary-soft"
                      } flex items-center justify-center text-xs font-semibold ${
                        isAccent ? "text-brand-accent" : "text-brand-primary"
                      }`}
                    >
                      {item.type}
                    </div>

                    <div className="mt-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          isAccent
                            ? "bg-brand-accent-soft text-brand-accent"
                            : "bg-brand-primary-soft text-brand-primary"
                        }`}
                      >
                        {badgeText}
                      </span>

                      <h2
                        dir="auto"
                        className="mt-2.5 text-lg font-semibold text-ink-primary"
                      >
                        {item.title}
                      </h2>

                      <Link
                        href={`/stores/${item.store.slug}`}
                        dir="auto"
                        className="mt-1 block text-xs font-medium text-ink-secondary hover:text-brand-primary"
                      >
                        {item.store.displayName} •{" "}
                        {item.store.serviceAreas.join(", ")}
                      </Link>
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
    </main>
  );
}
