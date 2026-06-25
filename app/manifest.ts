import type { MetadataRoute } from "next";

// PWA manifest — identité officielle AkarFinder (brand board).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AkarFinder — Intelligence immobilière au Maroc",
    short_name: "AkarFinder",
    description:
      "La plateforme immobilière premium du Maroc. Cherchez moins. Trouvez mieux.",
    start_url: "/",
    display: "standalone",
    background_color: "#071B33",
    theme_color: "#071B33",
    lang: "fr",
    icons: [
      { src: "/brand/favicon-64.png", sizes: "64x64", type: "image/png" },
      { src: "/brand/favicon-128.png", sizes: "128x128", type: "image/png" },
      { src: "/brand/favicon-256.png", sizes: "256x256", type: "image/png" },
      { src: "/brand/app-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/app-icon-1024.png", sizes: "1024x1024", type: "image/png" },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
