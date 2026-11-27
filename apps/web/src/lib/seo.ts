import { getApiBaseUrl } from "./api-client";

export function getPublicSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/g, "");
  }
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) {
    return `https://${vercelProd}`;
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }
  return "http://localhost:3000";
}

function getServerApiBaseUrl(): string {
  const publicBase = getApiBaseUrl();
  if (publicBase.startsWith("http://") || publicBase.startsWith("https://")) {
    return publicBase.replace(/\/+$/g, "");
  }
  const proxyTarget = process.env.API_PROXY_TARGET?.trim().replace(/\/+$/g, "");
  if (proxyTarget) {
    return `${proxyTarget}${publicBase.startsWith("/") ? publicBase : `/${publicBase}`}`;
  }
  return "http://localhost:4000/api/v1";
}

/**
 * Fetches public JSON metadata safely during SSR/build with a short timeout
 * so offline builds never crash when the API is unreachable.
 */
export async function fetchPublicMetadataJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getServerApiBaseUrl()}${path}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(2500)
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
