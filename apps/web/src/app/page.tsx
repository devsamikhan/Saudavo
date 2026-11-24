"use client";

import type {
  CategoryDto,
  DistrictDto,
  PublicSearchItem
} from "@saudavo/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  EmptyCartSpot,
  HeroMarketplaceIllustration,
  SpotState
} from "../components/illustrations";
import { useAppContext } from "../components/locale-provider";
import {
  CategoryArtwork,
  SkeletonCard,
  TrustPill
} from "../components/ui-primitives";
import {
  addCartItem,
  ApiClientError,
  fetchCategories,
  fetchDistricts,
  searchListings
} from "../lib/api-client";
import { formatPkrFromPaisa, parseWholeRupeesToPaisa } from "../lib/money";

type SortMode = "NEWEST" | "PRICE_ASC" | "PRICE_DESC";

const CLAY_TILE_TONES = [
  "from-[#0F6B52] to-[#1D8F70] text-white",
  "from-[#D96B27] to-[#EF8C4D] text-white",
  "from-[#0B5440] to-[#0F6B52] text-white",
  "from-[#E6A23C] to-[#D96B27] text-white"
];

export default function HomePage() {
  const router = useRouter();
  const {
    locale,
    t,
    user,
    refreshCartCount,
    wishlistIds,
    isWishlisted,
    toggleWishlist,
    showToast
  } = useAppContext();

  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [items, setItems] = useState<PublicSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  const [queryText, setQueryText] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | "PRODUCT" | "SERVICE">("ALL");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [minPkrText, setMinPkrText] = useState("");
  const [maxPkrText, setMaxPkrText] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("NEWEST");
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [addedQtyByProduct, setAddedQtyByProduct] = useState<Record<string, number>>({});

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
      if (sp.get("saved") === "1") {
        setOnlySaved(true);
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

  const handleQuickAddToCart = async (item: PublicSearchItem) => {
    if (!user) {
      showToast(
        locale === "ur"
          ? "کارٹ میں شامل کرنے کے لیے لاگ ان کریں۔"
          : "Sign in to add items to your store cart.",
        "accent"
      );
      router.push("/auth");
      return;
    }

    setAddingProductId(item.id);
    try {
      await addCartItem({ productId: item.id, quantity: 1 });
      await refreshCartCount();
      setAddedQtyByProduct((prev) => ({
        ...prev,
        [item.id]: (prev[item.id] ?? 0) + 1
      }));
      showToast(`${item.title} — ${t.inCartLabel}!`, "primary");
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === "VALIDATION_ERROR") {
        showToast(
          locale === "ur"
            ? "برائے مہربانی ویرینٹ منتخب کریں۔"
            : "Select a product option before adding to cart.",
          "accent"
        );
        router.push(`/products/${item.slug}`);
        return;
      }
      showToast(
        err instanceof ApiClientError ? err.message : "Unable to add to cart.",
        "accent"
      );
    } finally {
      setAddingProductId(null);
    }
  };

  const clearAllFilters = () => {
    setQueryText("");
    setSelectedType("ALL");
    setSelectedZoneId("");
    setSelectedCategoryId("");
    setOnlySaved(false);
    setMinPkrText("");
    setMaxPkrText("");
    setSortMode("NEWEST");
  };

  const visibleItems = onlySaved
    ? items.filter((item) => isWishlisted(item.id))
    : items;

  const hasActiveFilters = Boolean(
    queryText ||
      selectedType !== "ALL" ||
      selectedZoneId ||
      selectedCategoryId ||
      onlySaved ||
      minPkrText ||
      maxPkrText ||
      sortMode !== "NEWEST"
  );

  return (
    <main className="fade-slide">
      {/* Deep Emerald Hero Banner with Frosted Glass & Floating 3D Clay Visual */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#094232] via-[#0F6B52] to-[#073528] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 end-10 h-72 w-72 rounded-full bg-brand-accent/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 start-10 h-72 w-72 rounded-full bg-[#3CE2BE]/15 blur-3xl"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#FDE68A]">
                <span className="h-2 w-2 rounded-full bg-brand-accent" />
                {t.heroBadge}
              </span>

              <h1 className="text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl">
                {t.heroTitle}
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                {t.heroSubtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="#catalog"
                  className="rounded-2xl bg-brand-accent px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-brand-accent-hover"
                >
                  {t.exploreMarketplaceBtn}
                </a>
                <Link
                  href="/auth?intent=seller"
                  className="glass-promo rounded-2xl px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  {t.becomeSellerBtn}
                </Link>
                <Link
                  href="/auth"
                  className="rounded-2xl border border-white/25 px-5 py-3 text-sm font-semibold text-white/95 transition hover:bg-white/10"
                >
                  {t.openAuthBtn}
                </Link>
              </div>

              <div className="grid max-w-md grid-cols-3 gap-3 pt-2">
                <div className="glass-promo rounded-2xl p-3.5">
                  <div className="text-base font-extrabold text-[#FDE68A]">0%</div>
                  <div className="text-[11px] font-medium text-white/85">
                    {locale === "ur" ? "بیٹا کمیشن" : "Beta Commission"}
                  </div>
                </div>
                <div className="glass-promo rounded-2xl p-3.5">
                  <div className="text-base font-extrabold text-white">COD</div>
                  <div className="text-[11px] font-medium text-white/85">
                    {locale === "ur" ? "محفوظ ادائیگی" : "Verified Cash"}
                  </div>
                </div>
                <div className="glass-promo rounded-2xl p-3.5">
                  <div className="text-base font-extrabold text-[#A7F3D0]">100%</div>
                  <div className="text-[11px] font-medium text-white/85">
                    {locale === "ur" ? "مقامی تحفظ" : "Privacy First"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center lg:col-span-5">
              <div className="glass-promo w-full max-w-md rounded-[28px] p-3">
                <div className="overflow-hidden rounded-2xl bg-[#E7F4EF]">
                  <HeroMarketplaceIllustration />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-2xl bg-white/95 px-3.5 py-2.5 text-xs text-ink-primary">
                  <div>
                    <p className="font-extrabold text-brand-primary">
                      {t.verifiedStoreBadge}
                    </p>
                    <p className="text-[11px] text-ink-secondary">
                      {t.privacyShieldBadge}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-accent-soft px-3 py-1 text-[11px] font-bold text-brand-accent">
                    {t.pilotBadge}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Soft 3D Claymorphic Category Strip & Search */}
      <div
        id="catalog"
        className="mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 lg:px-8"
      >
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-extrabold text-ink-primary sm:text-2xl">
              {t.browseByCategoryTitle}
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              {t.browseByCategorySub}
            </p>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[360px]"
          >
            <div className="relative flex-1">
              <svg
                className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
                className="w-full rounded-2xl border border-border-subtle bg-surface-card py-2.5 pe-4 ps-10 text-sm text-ink-primary placeholder:text-ink-secondary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-brand-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-accent-hover"
            >
              {t.searchButton}
            </button>
          </form>
        </div>

        {/* Soft 3D Claymorphism Category Grid */}
        <section aria-label="Marketplace filters" className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                setSelectedType("ALL");
                setSelectedCategoryId("");
                setOnlySaved(false);
              }}
              className={`clay-pill flex items-center gap-3 p-3.5 text-start ${
                !onlySaved && selectedType === "ALL" && !selectedCategoryId
                  ? "clay-pill-active"
                  : ""
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#094232] to-[#0F6B52] text-white">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </span>
              <span>
                <span className="block text-xs font-extrabold text-ink-primary">
                  {t.allCategoriesLabel}
                </span>
                <span className="block text-[11px] text-ink-secondary">
                  {items.length} {locale === "ur" ? "اشیاء" : "listings"}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedType("PRODUCT");
                setOnlySaved(false);
              }}
              className={`clay-pill flex items-center gap-3 p-3.5 text-start ${
                !onlySaved && selectedType === "PRODUCT" ? "clay-pill-active" : ""
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D96B27] to-[#EF8C4D] text-white">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </span>
              <span>
                <span className="block text-xs font-extrabold text-ink-primary">
                  {t.productsFilter}
                </span>
                <span className="block text-[11px] text-ink-secondary">
                  {t.codBadge}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedType("SERVICE");
                setOnlySaved(false);
              }}
              className={`clay-pill flex items-center gap-3 p-3.5 text-start ${
                !onlySaved && selectedType === "SERVICE" ? "clay-pill-active" : ""
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F6B52] to-[#239B7B] text-white">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
                </svg>
              </span>
              <span>
                <span className="block text-xs font-extrabold text-ink-primary">
                  {t.servicesFilter}
                </span>
                <span className="block text-[11px] text-ink-secondary">
                  {locale === "ur" ? "مقامی و ریموٹ" : "Local & Remote"}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOnlySaved((prev) => !prev)}
              className={`clay-pill flex items-center gap-3 p-3.5 text-start ${
                onlySaved ? "clay-pill-active" : ""
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F4BD3E] to-[#D96B27] text-white">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </span>
              <span>
                <span className="block text-xs font-extrabold text-ink-primary">
                  {t.savedItemsFilter} ({wishlistIds.length})
                </span>
                <span className="block text-[11px] text-ink-secondary">
                  {locale === "ur" ? "پسندیدہ اشیاء" : "Wishlist items"}
                </span>
              </span>
            </button>
          </div>

          {/* Dynamic Category Clay Chips */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              {categories.map((cat, idx) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId((prev) =>
                      prev === cat.id ? "" : cat.id
                    );
                    setOnlySaved(false);
                  }}
                  className={`clay-pill flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-ink-primary ${
                    selectedCategoryId === cat.id ? "clay-pill-active" : ""
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${
                      CLAY_TILE_TONES[idx % CLAY_TILE_TONES.length]
                    }`}
                  />
                  <span>{locale === "ur" ? cat.nameUr : cat.nameEn}</span>
                </button>
              ))}
            </div>
          )}

          {/* Area Zones + Price + Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-card p-3 shadow-card">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedZoneId("")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedZoneId === ""
                    ? "bg-brand-primary text-white"
                    : "bg-surface-muted text-ink-primary hover:bg-brand-primary-soft"
                }`}
              >
                {t.allAreasLabel}
              </button>

              {(activeDistrict?.areaZones ?? []).map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    selectedZoneId === zone.id
                      ? "bg-brand-primary text-white"
                      : "bg-surface-muted text-ink-primary hover:bg-brand-primary-soft"
                  }`}
                >
                  {locale === "ur" ? zone.nameUr : zone.nameEn}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                value={minPkrText}
                onChange={(e) => setMinPkrText(e.target.value)}
                placeholder={t.minPriceLabel}
                aria-label={t.minPriceLabel}
                className="w-24 rounded-xl border border-border-subtle bg-surface-canvas px-3 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
              />
              <input
                type="number"
                min={0}
                value={maxPkrText}
                onChange={(e) => setMaxPkrText(e.target.value)}
                placeholder={t.maxPriceLabel}
                aria-label={t.maxPriceLabel}
                className="w-24 rounded-xl border border-border-subtle bg-surface-canvas px-3 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
              />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                aria-label="Sort listings"
                className="rounded-xl border border-border-subtle bg-surface-canvas px-3 py-1.5 text-xs font-semibold text-ink-primary focus:border-brand-primary focus:outline-none"
              >
                <option value="NEWEST">{t.sortNewest}</option>
                <option value="PRICE_ASC">{t.sortPriceAsc}</option>
                <option value="PRICE_DESC">{t.sortPriceDesc}</option>
              </select>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-xl border border-border-subtle px-3 py-1.5 text-xs font-bold text-brand-accent transition hover:bg-brand-accent-soft"
                >
                  {t.clearFilters}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Uncluttered Pure-White E-Commerce Product Grid */}
        <section className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : visibleItems.length === 0 ? (
            <div>
              <SpotState
                illustration={<EmptyCartSpot />}
                badge={onlySaved ? t.savedItemsFilter : t.pilotBadge}
                title={
                  onlySaved
                    ? locale === "ur"
                      ? "ابھی کوئی پسندیدہ آئٹم محفوظ نہیں"
                      : "No wishlist items saved yet"
                    : t.emptyListingsTitle
                }
                description={
                  apiUnavailable
                    ? locale === "ur"
                      ? "لوکل API سرور (localhost:4000) ابھی دستیاب نہیں ہے۔"
                      : "Local API server (localhost:4000/api/v1) is not currently reachable."
                    : t.emptyListingsBody
                }
                actions={
                  <>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="rounded-2xl bg-brand-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-accent-hover"
                      >
                        {t.clearFilters}
                      </button>
                    )}
                    <Link
                      href="/seller"
                      className="rounded-2xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-primary-hover"
                    >
                      {t.navSeller}
                    </Link>
                  </>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((item) => {
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
                const wished = isWishlisted(item.id);
                const addedQty = addedQtyByProduct[item.id] ?? 0;

                return (
                  <article
                    key={item.id}
                    className="flex flex-col justify-between rounded-3xl border border-border-subtle bg-surface-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-soft"
                  >
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-bold ${
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

                        <button
                          type="button"
                          onClick={() => toggleWishlist(item.id, item.title)}
                          aria-label={t.saveToWishlistLabel}
                          aria-pressed={wished}
                          className="rounded-xl p-2 transition hover:bg-brand-accent-soft"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill={wished ? "#D96B27" : "none"}
                            stroke="#D96B27"
                            strokeWidth="2.2"
                            className={wished ? "pop-heart" : ""}
                            aria-hidden="true"
                          >
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                          </svg>
                        </button>
                      </div>

                      <Link
                        href={detailHref}
                        className="block h-48 w-full overflow-hidden rounded-2xl bg-surface-canvas"
                      >
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
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
                      </Link>

                      <div className="mt-4 space-y-1.5">
                        <Link href={detailHref} className="block">
                          <h3
                            dir="auto"
                            className="text-base font-extrabold text-ink-primary transition hover:text-brand-primary"
                          >
                            {item.title}
                          </h3>
                        </Link>

                        <div className="flex items-center justify-between gap-2 text-xs text-ink-secondary">
                          <Link
                            href={`/stores/${item.store.slug}`}
                            dir="auto"
                            className="truncate font-medium hover:text-brand-primary"
                          >
                            {item.store.displayName} •{" "}
                            {item.store.serviceAreas.join(", ")}
                          </Link>

                          {item.reviewCount > 0 && item.ratingAvg !== null && (
                            <span className="shrink-0 font-bold text-ink-primary">
                              <span className="text-brand-accent">★</span>{" "}
                              {item.ratingAvg.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border-subtle pt-3.5">
                      <span className="text-lg font-extrabold text-brand-primary">
                        {formatPkrFromPaisa(item.pricePaisa, locale)}
                      </span>

                      {item.type === "PRODUCT" ? (
                        <button
                          type="button"
                          disabled={addingProductId === item.id}
                          onClick={() => void handleQuickAddToCart(item)}
                          className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition ${
                            addedQty > 0
                              ? "bg-brand-primary hover:bg-brand-primary-hover"
                              : "bg-brand-accent hover:bg-brand-accent-hover"
                          } disabled:opacity-60`}
                        >
                          {addedQty > 0
                            ? `${t.inCartLabel} (${addedQty})`
                            : t.addToCart}
                        </button>
                      ) : (
                        <Link
                          href={detailHref}
                          className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-primary-hover"
                        >
                          {t.viewDetails}
                        </Link>
                      )}
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
