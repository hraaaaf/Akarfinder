import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/site";
import { getAllCities } from "@/lib/seo-city-pages/city-seo-data";
import { getAllNeighborhoods } from "@/lib/seo-neighborhood-pages/neighborhood-seo-data";

// SEO-FOUNDATION-1 — sitemap indexant les routes publiques.
//
// Routes incluses :
// - / /pro /profil-recherche (core pages)
// - /immobilier, /immobilier/[city] (SEO-CITY-INTENT-PAGES-1)
// - /immobilier/[city]/[district] (SEO-NEIGHBORHOOD-GUIDES-1)
//
// Routes exclues intentionnellement :
// - /demo/** : noindex (pages partenaire mockup)
// - /search : noindex (résultats Gateway dynamiques)
// - /listings/**: 404 par doctrine (no internal detail pages for Gateway)
export default function sitemap(): MetadataRoute.Sitemap {
  const baseRoutes = ["/", "/pro", "/profil-recherche", "/immobilier"];

  const cities = getAllCities();
  const cityRoutes = cities.map((city) => `/immobilier/${city.slug}`);

  const neighborhoods = getAllNeighborhoods();
  const neighborhoodRoutes = neighborhoods.map(
    (n) => `/immobilier/${n.citySlug}/${n.slug}`,
  );

  const allRoutes = [...baseRoutes, ...cityRoutes, ...neighborhoodRoutes];

  return allRoutes.map((route) => ({
    url: `${siteConfig.siteUrl}${route}`,
    lastModified: new Date(),
  }));
}
