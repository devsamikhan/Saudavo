import type { PublicProductDetailDto } from "@saudavo/contracts";
import type { Metadata } from "next";
import { formatPkrFromPaisa } from "../../../lib/money";
import { fetchPublicMetadataJson } from "../../../lib/seo";
import { ProductDetailClient } from "./product-detail-client";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await fetchPublicMetadataJson<{ data: PublicProductDetailDto }>(
    `/products/${encodeURIComponent(slug)}`
  );

  if (!res?.data) {
    return {
      title: "Local Product — Mianwali Cash on Delivery",
      description:
        "Browse verified local products from Mianwali District sellers on Saudavo with Cash on Delivery."
    };
  }

  const product = res.data;
  const priceLabel = formatPkrFromPaisa(product.basePricePaisa, "en");
  const title = `${product.title} (${priceLabel}) — ${product.store.displayName}`;
  const description = `${product.description.slice(0, 145)} • Cash on Delivery in ${product.store.districtNameEn}.`;

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

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}
