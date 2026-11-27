"use client";

/**
 * Sauda Buddy floating helper has been intentionally disabled per founder request.
 * Returning null keeps layout clean without breaking imports or translations.
 */
export const SAUDA_BUDDY_ENABLED = false;

export function SaudaBuddy() {
  if (!SAUDA_BUDDY_ENABLED) {
    return null;
  }
  return null;

  /*
  Original floating Sauda Buddy helper implementation commented out/disabled:
  - Previously rendered fixed bottom-start helper chip and tip dialog with quick links to /cart, /orders, and /seller.
  */
}
