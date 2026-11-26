import type { PublicServiceDetailDto } from "@saudavo/contracts";
import type { Metadata } from "next";
import { formatPkrFromPaisa } from "../../../lib/money";
import { fetchPublicMetadataJson } from "../../../lib/seo";
import { ServiceDetailClient } from "./service-detail-client";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await fetchPublicMetadataJson<{ data: PublicServiceDetailDto }>(
    `/services/${encodeURIComponent(slug)}`
  );

  if (!res?.data) {
    return {
      title: "Local Service — Saudavo Mianwali",
      description:
        "Book trusted on-site, hybrid, and remote services from verified Mianwali providers on Saudavo."
    };
  }

  const service = res.data;
  const minPrice = service.packages[0]
    ? formatPkrFromPaisa(service.packages[0].pricePaisa, "en")
    : "PKR";
  const title = `${service.title} (${minPrice}) — ${service.store.displayName}`;
  const description = `${service.description.slice(0, 145)} • ${service.serviceMode} service in ${service.store.districtNameEn}.`;

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

export default function ServiceDetailPage() {
  return <ServiceDetailClient />;
}
