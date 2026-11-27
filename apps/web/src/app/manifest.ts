import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Saudavo — Mianwali Local Marketplace",
    short_name: "Saudavo",
    description:
      "Shop verified local stores and services across Mianwali, Isakhel, and Piplan with Cash on Delivery.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAF9",
    theme_color: "#0F6B52",
    lang: "en",
    dir: "auto",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
