import type { NextFunction, Request, Response } from "express";
import {
  applySecurityHeaders,
  resolveTrustProxy,
  resolveWebOrigin
} from "../src/common/http/security.config";

describe("API HTTP Security Configuration", () => {
  it("fails closed in production when WEB_ORIGIN is missing", () => {
    expect(() => resolveWebOrigin({ NODE_ENV: "production" })).toThrow(
      "WEB_ORIGIN is required in production."
    );
    expect(
      resolveWebOrigin({
        NODE_ENV: "production",
        WEB_ORIGIN: "https://saudavo.pk"
      })
    ).toBe("https://saudavo.pk");
    expect(resolveWebOrigin({ NODE_ENV: "development" })).toBe(
      "http://localhost:3000"
    );
  });

  it("resolves trust proxy configuration safely across environments", () => {
    expect(resolveTrustProxy({ NODE_ENV: "production" })).toBe(1);
    expect(resolveTrustProxy({ NODE_ENV: "development" })).toBe(false);
    expect(resolveTrustProxy({ TRUST_PROXY: "2" })).toBe(2);
    expect(resolveTrustProxy({ TRUST_PROXY: "true" })).toBe(true);
    expect(resolveTrustProxy({ TRUST_PROXY: "loopback" })).toBe("loopback");
  });

  it("sets defensive response headers and HSTS only in production", () => {
    const devHeaders = new Map<string, string>();
    const devRes = {
      setHeader(name: string, value: string) {
        devHeaders.set(name, value);
      }
    } as unknown as Response;

    let devNextCalled = false;
    const next: NextFunction = () => {
      devNextCalled = true;
    };

    applySecurityHeaders(false)({} as Request, devRes, next);
    expect(devNextCalled).toBe(true);
    expect(devHeaders.get("X-Content-Type-Options")).toBe("nosniff");
    expect(devHeaders.get("X-Frame-Options")).toBe("DENY");
    expect(devHeaders.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'"
    );
    expect(devHeaders.has("Strict-Transport-Security")).toBe(false);

    const prodHeaders = new Map<string, string>();
    const prodRes = {
      setHeader(name: string, value: string) {
        prodHeaders.set(name, value);
      }
    } as unknown as Response;

    applySecurityHeaders(true)({} as Request, prodRes, () => undefined);
    expect(prodHeaders.get("Strict-Transport-Security")).toContain(
      "max-age=31536000"
    );
  });
});
