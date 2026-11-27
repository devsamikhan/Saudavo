import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_GITHUB_APK_URL =
  "https://github.com/devsamikhan/Saudavo/releases/download/v1.0.1/saudavo-v1.0.1.apk";

/**
 * Streams the official Saudavo Android APK directly from the Saudavo domain
 * so users never leave the website or get redirected to GitHub UI.
 */
export async function GET(): Promise<Response> {
  const upstreamUrl =
    process.env.GITHUB_APK_ASSET_URL?.trim() || DEFAULT_GITHUB_APK_URL;
  const appVersion =
    process.env.NEXT_PUBLIC_ANDROID_APK_VERSION?.trim() || "1.0.1";
  const safeVersion = appVersion.replace(/[^0-9A-Za-z._-]/g, "");

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Saudavo-Web-APK-Downloader/1.0"
      }
    });

    if (!upstream.ok || !upstream.body) {
      console.error(
        `APK upstream fetch failed: status=${upstream.status} url=${upstreamUrl}`
      );
      return NextResponse.json(
        {
          error: {
            code: "APK_UNAVAILABLE",
            message:
              "Android APK release is currently being prepared. Please install the Web App or try again shortly."
          }
        },
        { status: 502 }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/vnd.android.package-archive");
    headers.set(
      "Content-Disposition",
      `attachment; filename="Saudavo-v${safeVersion}.apk"`
    );
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "public, max-age=300");

    return new Response(upstream.body, {
      status: 200,
      headers
    });
  } catch (err: unknown) {
    console.error("APK stream error:", err);
    return NextResponse.json(
      {
        error: {
          code: "APK_DOWNLOAD_ERROR",
          message: "Unable to stream Android APK right now."
        }
      },
      { status: 502 }
    );
  }
}
