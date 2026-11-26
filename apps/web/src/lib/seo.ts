import { getApiBaseUrl } from "./api-client";

export function getPublicSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

/**
 * Fetches public JSON metadata safely during SSR/build with a short timeout
 * so offline builds never crash when the API is unreachable.
 */
export async function fetchPublicMetadataJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
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
