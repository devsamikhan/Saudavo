"use client";

import type { PublicProductDetailDto } from "@saudavo/contracts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppContext } from "../../../components/locale-provider";
import {
  CategoryArtwork,
  ReportListingButton,
  TrustPill
} from "../../../components/ui-primitives";
import {
  addCartItem,
  ApiClientError,
  fetchPublicProduct,
  fetchPublicProductImageSignedUrl
} from "../../../lib/api-client";
import { formatPkrFromPaisa } from "../../../lib/money";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { locale, t, user, refreshCartCount, isWishlisted, toggleWishlist, showToast } =
    useAppContext();

  const [product, setProduct] = useState<PublicProductDetailDto | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [activeImageId, setActiveImageId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setImageUrls({});
      setActiveImageId("");
      try {
        const res = await fetchPublicProduct(params.slug);
        if (!active) return;
        setProduct(res.data);
        if (res.data.variants.length > 0) {
          setSelectedVariantId(res.data.variants[0]?.id ?? "");
        }
        const primary =
          res.data.images.find((img) => img.isPrimary) ?? res.data.images[0];
        if (primary) {
          setActiveImageId(primary.mediaAssetId);
        }
        if (res.data.images.length > 0) {
          const signedPairs = await Promise.all(
            res.data.images.map(async (img) => {
              const urlRes = await fetchPublicProductImageSignedUrl(
                res.data.slug,
                img.mediaAssetId
              ).catch(() => null);
              return urlRes?.data.readUrl
                ? ([img.mediaAssetId, urlRes.data.readUrl] as const)
                : null;
            })
          );
          if (active) {
            const urlMap: Record<string, string> = {};
            for (const pair of signedPairs) {
              if (pair) urlMap[pair[0]] = pair[1];
            }
            setImageUrls(urlMap);
          }
        }
      } catch (err: unknown) {
        if (!active) return;
        setErrorMsg(
          err instanceof ApiClientError ? err.message : "Product not found."
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

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      router.push("/auth");
      return;
    }
    setErrorMsg(null);
    setFeedback(null);
    try {
      await addCartItem({
        productId: product.id,
        ...(selectedVariantId ? { productVariantId: selectedVariantId } : {}),
        quantity
      });
      await refreshCartCount();
      setFeedback("Added to this store's saved cart.");
      showToast(`${product.title} — ${t.inCartLabel}!`, "primary");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to add to cart."
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

  if (!product) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-8 text-center">
          <p className="text-sm text-red-700">{errorMsg ?? "Product not found."}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-semibold text-brand-primary underline"
          >
            Back to Storefront
          </Link>
        </div>
      </main>
    );
  }

  const activeVariant = product.variants.find((v) => v.id === selectedVariantId);
  const displayPrice = activeVariant?.pricePaisa ?? product.basePricePaisa;
  const activePhotoUrl = activeImageId ? (imageUrls[activeImageId] ?? null) : null;
  const isPrivacyProtected =
    !product.store.publicContactPhone && !product.store.publicBusinessAddress;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:px-6 md:pb-8 lg:px-8 space-y-4">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-secondary">
        <Link href="/" className="font-semibold text-brand-primary hover:underline">
          {t.navStorefront}
        </Link>{" "}
        /{" "}
        <Link
          href={`/stores/${product.store.slug}`}
          dir="auto"
          className="font-semibold text-brand-primary hover:underline"
        >
          {product.store.displayName}
        </Link>{" "}
        / <span dir="auto">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card sm:p-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="h-72 overflow-hidden rounded-2xl lg:h-96">
            {activePhotoUrl ? (
              <img
                src={activePhotoUrl}
                alt={product.title}
                onError={() =>
                  setImageUrls((prev) => {
                    const next = { ...prev };
                    delete next[activeImageId];
                    return next;
                  })
                }
                className="h-full w-full object-cover"
              />
            ) : (
              <CategoryArtwork
                type="PRODUCT"
                label={
                  locale === "ur"
                    ? product.category.nameUr
                    : product.category.nameEn
                }
              />
            )}
          </div>

          {product.images.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {product.images.map((img, idx) => {
                const thumbUrl = imageUrls[img.mediaAssetId];
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImageId(img.mediaAssetId)}
                    className={`h-14 w-14 overflow-hidden rounded-xl border-2 transition ${
                      activeImageId === img.mediaAssetId
                        ? "border-brand-primary"
                        : "border-border-subtle opacity-75 hover:opacity-100"
                    }`}
                    aria-label={`View image ${idx + 1}`}
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={img.altText ?? `${product.title} ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold">#{idx + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-semibold text-brand-primary">
                {t.codBadge}
              </span>
              {isPrivacyProtected && (
                <TrustPill label={t.privacyShieldBadge} variant="privacy" />
              )}
            </div>
            <button
              type="button"
              onClick={() => toggleWishlist(product.id, product.title)}
              aria-label={t.saveToWishlistLabel}
              aria-pressed={isWishlisted(product.id)}
              className="rounded-xl border border-border-subtle p-2 transition hover:border-brand-accent hover:bg-brand-accent-soft"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={isWishlisted(product.id) ? "#D96B27" : "none"}
                stroke="#D96B27"
                strokeWidth="2.2"
                className={isWishlisted(product.id) ? "pop-heart" : ""}
                aria-hidden="true"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>
          </div>

          <h1 dir="auto" className="text-2xl font-bold text-ink-primary">
            {product.title}
          </h1>

          <Link
            href={`/stores/${product.store.slug}`}
            dir="auto"
            className="inline-block text-sm font-semibold text-brand-primary hover:underline"
          >
            {product.store.displayName} •{" "}
            {locale === "ur"
              ? product.store.districtNameUr
              : product.store.districtNameEn}
          </Link>

          <p className="text-3xl font-bold text-brand-primary">
            {formatPkrFromPaisa(displayPrice, locale)}
          </p>

          <p dir="auto" className="text-sm leading-relaxed text-ink-secondary">
            {product.description}
          </p>

          {product.variants.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-ink-secondary">
                Select Variant
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2.5 text-sm"
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} — {formatPkrFromPaisa(v.pricePaisa, locale)} (Stock:{" "}
                    {v.stockQuantity})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-ink-secondary">
              Qty
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-surface-card text-sm font-bold hover:border-brand-primary"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-16 rounded-xl border border-border-subtle px-2 py-2 text-center text-sm font-bold"
              />
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-surface-card text-sm font-bold hover:border-brand-primary"
              >
                +
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-xs text-red-700">
              {errorMsg}
            </p>
          )}
          {feedback && (
            <p className="rounded-xl bg-brand-primary-soft px-4 py-2 text-xs font-semibold text-brand-primary">
              {feedback}{" "}
              <Link href="/cart" className="underline">
                Go to Cart
              </Link>
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleAddToCart()}
            className="w-full rounded-2xl bg-brand-accent py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-accent-hover"
          >
            {t.addToCart}
          </button>

          <ReportListingButton targetType="PRODUCT" targetId={product.id} />
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="fixed inset-x-0 bottom-[56px] z-20 flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-card/95 px-4 py-2.5 backdrop-blur md:hidden">
        <div>
          <p className="text-[10px] font-medium text-ink-secondary">{t.codBadge}</p>
          <p className="text-base font-bold text-brand-primary">
            {formatPkrFromPaisa(displayPrice, locale)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleAddToCart()}
          className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white"
        >
          {t.addToCart}
        </button>
      </div>
    </main>
  );
}
