import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "../lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/download", "/demands", "/products/", "/services/", "/stores/", "/terms", "/privacy"],
      disallow: ["/admin", "/seller", "/cart", "/orders", "/account", "/auth"]
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
