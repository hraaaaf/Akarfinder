import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/site";

// SEO-FOUNDATION-1 — robots.txt.
//
// /demo n'est PAS bloqué ici volontairement : les pages demo portent déjà
// un <meta name="robots" content="noindex, nofollow"> (voir chaque
// app/demo/**/page.tsx). Google doit pouvoir crawler ces pages pour LIRE ce
// noindex ; un Disallow ici l'empêcherait de le voir et pourrait laisser les
// URLs indexées sans description via d'autres signaux (liens externes).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  };
}
