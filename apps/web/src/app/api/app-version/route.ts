import { NextResponse } from "next/server";
import {
  getAndroidReleaseVersionName,
  getLiveWebBuildId,
  LATEST_ANDROID_VERSION_CODE
} from "../../../lib/app-release";
import { getPublicSiteUrl } from "../../../lib/seo";

export const dynamic = "force-dynamic";

/**
 * Exposes the current live website build identifier and latest native Android APK version
 * so the Android WebView app and PWA automatically sync website changes and prompt for APK upgrades.
 */
export async function GET(): Promise<Response> {
  const siteUrl = getPublicSiteUrl().replace(/\/+$/g, "");
  return NextResponse.json(
    {
      webBuildId: getLiveWebBuildId(),
      androidVersionCode: LATEST_ANDROID_VERSION_CODE,
      androidVersionName: getAndroidReleaseVersionName(),
      apkDownloadUrl: `${siteUrl}/api/download-apk`,
      downloadPageUrl: `${siteUrl}/download`,
      releaseNotes:
        "Removed Sauda Buddy widget and enabled automatic website & APK updates."
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
      }
    }
  );
}
