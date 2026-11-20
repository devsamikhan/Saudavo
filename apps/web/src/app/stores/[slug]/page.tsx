"use client";

import type { PublicStoreDto, ReviewDto } from "@saudavo/contracts";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppContext } from "../../../components/locale-provider";
import {
  ApiClientError,
  fetchPublicStore,
  fetchStoreReviews
} from "../../../lib/api-client";
import { formatPkrFromPaisa } from "../../../lib/money";

export default function PublicStorePage() {
  const params = useParams<{ slug: string }>();
  const { locale, t } = useAppContext();

  const [store, setStore] = useState<PublicStoreDto | null>(null);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [storeRes, revRes] = await Promise.all([
          fetchPublicStore(params.slug),
          fetchStoreReviews(params.slug).catch(() => ({ data: [] }))
        ]);
        if (!active) return;
        setStore(storeRes.data);
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <section className="rounded-2xl border border-border-subtle bg-surface-card p-6 sm:p-8">
        <span className="inline-block rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-semibold text-brand-primary">
          {locale === "ur" ? store.districtNameUr : store.districtNameEn}
        </span>
        <h1 dir="auto" className="mt-3 text-2xl font-bold text-ink-primary">
          {store.displayName}
        </h1>
        {store.description && (
          <p dir="auto" className="mt-2 text-sm text-ink-secondary">
            {store.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {store.serviceAreas.map((sa) => (
            <span
              key={sa.id}
              className="rounded-full border border-border-subtle bg-surface-muted px-3 py-1 text-xs font-medium text-ink-primary"
            >
              {locale === "ur" ? sa.areaZoneNameUr : sa.areaZoneNameEn}
            </span>
          ))}
          <span className="rounded-full bg-brand-accent-soft px-3 py-1 text-xs font-semibold text-brand-accent">
            Default Delivery: {formatPkrFromPaisa(store.defaultDeliveryFeePaisa, locale)}
          </span>
        </div>

        {(store.publicContactPhone || store.publicBusinessAddress) && (
          <div className="mt-4 rounded-xl bg-surface-muted p-4 text-xs text-ink-secondary space-y-1">
            {store.publicContactPhone && (
              <p>Public Phone: {store.publicContactPhone}</p>
            )}
            {store.publicBusinessAddress && (
              <p dir="auto">Business Address: {store.publicBusinessAddress}</p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface-card p-6">
        <h2 className="text-lg font-bold text-ink-primary">
          Verified Buyer Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-sm text-ink-secondary">No published reviews yet.</p>
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
