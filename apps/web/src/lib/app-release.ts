export const LATEST_ANDROID_VERSION_CODE = 4;
export const LATEST_ANDROID_VERSION_NAME = "1.0.3";

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da > db ? 1 : -1;
  }
  return 0;
}

export function getAndroidReleaseVersionName(): string {
  const envVersion = process.env.NEXT_PUBLIC_ANDROID_APK_VERSION?.trim();
  if (
    envVersion &&
    /^\d+\.\d+\.\d+/.test(envVersion) &&
    compareSemver(envVersion, LATEST_ANDROID_VERSION_NAME) > 0
  ) {
    return envVersion;
  }
  return LATEST_ANDROID_VERSION_NAME;
}

export function getGitHubApkAssetUrl(): string {
  const version = getAndroidReleaseVersionName();
  return (
    process.env.GITHUB_APK_ASSET_URL?.trim() ||
    `https://github.com/devsamikhan/Saudavo/releases/download/v${version}/saudavo-v${version}.apk`
  );
}

export function getLiveWebBuildId(): string {
  return (
    process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_BUILD_ID?.trim() ||
    "local-dev"
  );
}
