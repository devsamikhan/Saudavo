import type { SearchResponse } from "@saudavo/contracts";
import type { MetadataRoute } from "next";
import { fetchPublicMetadataJson, getPublicSiteUrl } from "../lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getPublicSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4
    }
  ];

  const searchRes = await fetchPublicMetadataJson<SearchResponse>("/search?limit=50");
  if (!searchRes?.data) {
    return staticEntries;
  }

  const seenStores = new Set<string>();
  const dynamicEntries: MetadataRoute.Sitemap = [];

  for (const item of searchRes.data) {
    dynamicEntries.push({
      url: `${siteUrl}/${item.type === "SERVICE" ? "services" : "products"}/${encodeURIComponent(item.slug)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8
    });
    if (!seenStores.has(item.store.slug)) {
      seenStores.add(item.store.slug);
      dynamicEntries.push({
        url: `${siteUrl}/stores/${encodeURIComponent(item.store.slug)}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7
      });
    }
  }

  return [...staticEntries, ...dynamicEntries];
}
