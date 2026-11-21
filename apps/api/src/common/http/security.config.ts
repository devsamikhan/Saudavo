import type { NextFunction, Request, Response } from "express";

/**
 * Resolves the permitted browser origin for CORS, failing closed in production.
 */
export function resolveWebOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.WEB_ORIGIN?.trim();
  if (configured) {
    return configured;
  }
  if (env.NODE_ENV === "production") {
    throw new Error("WEB_ORIGIN is required in production.");
  }
  return "http://localhost:3000";
}

/**
 * Resolves Express trust-proxy setting so rate limits and audit logs preserve client IPs behind proxies.
 */
export function resolveTrustProxy(
  env: NodeJS.ProcessEnv = process.env
): boolean | number | string {
  const raw = env.TRUST_PROXY?.trim();
  if (!raw) {
    return env.NODE_ENV === "production" ? 1 : false;
  }
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  const asNum = Number(raw);
  if (Number.isInteger(asNum) && asNum >= 0) {
    return asNum;
  }
  return raw;
}

/**
 * Applies defensive HTTP security headers on API responses.
 */
export function applySecurityHeaders(isProduction: boolean) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'"
    );
    if (isProduction) {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }
    next();
  };
}
