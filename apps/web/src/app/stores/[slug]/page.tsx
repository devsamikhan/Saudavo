import type { StoreCatalogResponse } from "@saudavo/contracts";
import type { Metadata } from "next";
import { fetchPublicMetadataJson } from "../../../lib/seo";
import { StoreDetailClient } from "./store-detail-client";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await fetchPublicMetadataJson<StoreCatalogResponse>(
    `/stores/${encodeURIComponent(slug)}/listings`
  );

  if (!res?.data?.store) {
    return {
      title: "Verified Local Store — Saudavo Mianwali",
      description:
        "Explore verified local shops and home-based makers in Mianwali District on Saudavo."
    };
  }

  const { store, products, services, ratingAvg } = res.data;
  const ratingText = ratingAvg !== null ? ` • ★ ${ratingAvg.toFixed(1)}` : "";
  const title = `${store.displayName} (${store.districtNameEn})${ratingText}`;
  const description =
    store.description?.slice(0, 145) ||
    `Verified Saudavo store in ${store.districtNameEn} with ${products.length} products and ${services.length} services.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website"
    }
  };
}

export default function PublicStorePage() {
  return <StoreDetailClient />;
}
