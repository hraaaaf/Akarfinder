import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/site";

// SEO-FOUNDATION-1 — sitemap volontairement minimal.
//
// N'inclut QUE les routes publiques indexables aujourd'hui : /, /pro,
// /profil-recherche. Exclus intentionnellement :
// - /demo/** : noindex (pages partenaire mockup, non destinées à Google)
// - /search : noindex (résultats Gateway dynamiques, contenu dupliqué par
//   querystring — voir app/search/page.tsx)
// - /listings/**: pages annonces individuelles (aucune fiche interne
//   propriétaire pour l'instant ; /listings/137 = 404 par doctrine)
// Les futures pages SEO ville/quartier/prix (SEO-CITY-INTENT-PAGES-1)
// s'ajouteront ici une fois créées et validées, pas avant.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", "/pro", "/profil-recherche"];

  return routes.map((route) => ({
    url: `${siteConfig.siteUrl}${route}`,
    lastModified: new Date(),
  }));
}
