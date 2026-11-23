import type { NextFunction, Request, Response } from "express";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads local `.env` files (package-local `.env`, then monorepo root `../../.env`)
 * without overriding already-set process environment variables.
 */
export function loadLocalEnvFiles(
  cwd: string = process.cwd(),
  targetEnv: NodeJS.ProcessEnv = process.env
): void {
  const candidates = [resolve(cwd, ".env"), resolve(cwd, "../../.env")];
  for (const filePath of candidates) {
    if (!existsSync(filePath)) {
      continue;
    }
    try {
      const raw = readFileSync(filePath, "utf8");
      for (const rawLine of raw.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) {
          continue;
        }
        const eqIdx = line.indexOf("=");
        if (eqIdx <= 0) {
          continue;
        }
        const key = line.slice(0, eqIdx).trim();
        let value = line.slice(eqIdx + 1).trim();
        if (
          value.length >= 2 &&
          ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'")))
        ) {
          value = value.slice(1, -1);
        }
        if (key && targetEnv[key] === undefined) {
          targetEnv[key] = value;
        }
      }
    } catch {
      // Ignore unreadable local env files on startup
    }
  }
}

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
