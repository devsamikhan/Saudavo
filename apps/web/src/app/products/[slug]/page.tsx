"use client";

import type { PublicProductDetailDto } from "@saudavo/contracts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppContext } from "../../../components/locale-provider";
import { ReportListingButton, TrustPill } from "../../../components/ui-primitives";
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
  const { locale, t, user } = useAppContext();

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
      setFeedback("Added to this store's saved cart.");
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
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 rounded-2xl border border-border-subtle bg-surface-card p-6 sm:p-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex h-72 items-center justify-center overflow-hidden rounded-2xl bg-brand-primary-soft text-sm font-semibold text-brand-primary lg:h-96">
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
              locale === "ur" ? product.category.nameUr : product.category.nameEn
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-semibold text-brand-primary">
              {t.codBadge}
            </span>
            {isPrivacyProtected && (
              <TrustPill label={t.privacyShieldBadge} variant="privacy" />
            )}
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
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-20 rounded-xl border border-border-subtle px-3 py-2 text-sm"
            />
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
            className="w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
          >
            {t.addToCart}
          </button>

          <ReportListingButton targetType="PRODUCT" targetId={product.id} />
        </div>
      </div>
    </main>
  );
}
