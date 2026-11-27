import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/app-version/route";

describe("GET /api/app-version", () => {
  const originalDeploymentId = process.env.VERCEL_DEPLOYMENT_ID;
  const originalApkVersion = process.env.NEXT_PUBLIC_ANDROID_APK_VERSION;

  afterEach(() => {
    if (originalDeploymentId === undefined) {
      delete process.env.VERCEL_DEPLOYMENT_ID;
    } else {
      process.env.VERCEL_DEPLOYMENT_ID = originalDeploymentId;
    }
    if (originalApkVersion === undefined) {
      delete process.env.NEXT_PUBLIC_ANDROID_APK_VERSION;
    } else {
      process.env.NEXT_PUBLIC_ANDROID_APK_VERSION = originalApkVersion;
    }
    vi.restoreAllMocks();
  });

  it("returns no-store live build metadata and never downgrades below code release version", async () => {
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_test_auto_update_123";
    process.env.NEXT_PUBLIC_ANDROID_APK_VERSION = "1.0.1";
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");

    const body = (await res.json()) as {
      webBuildId: string;
      androidVersionCode: number;
      androidVersionName: string;
      apkDownloadUrl: string;
    };
    expect(body.webBuildId).toBe("dpl_test_auto_update_123");
    expect(body.androidVersionCode).toBeGreaterThanOrEqual(3);
    expect(body.androidVersionName).toBe("1.0.2");
    expect(body.apkDownloadUrl).toMatch(/\/api\/download-apk$/);
  });
});
