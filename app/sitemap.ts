import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/site";
import { getAllCities } from "@/lib/seo-city-pages/city-seo-data";

// SEO-FOUNDATION-1 — sitemap indexant les routes publiques.
//
// Routes incluses :
// - / /pro /profil-recherche (core pages)
// - /immobilier, /immobilier/[city] (SEO-CITY-INTENT-PAGES-1)
//
// Routes exclues intentionnellement :
// - /demo/** : noindex (pages partenaire mockup)
// - /search : noindex (résultats Gateway dynamiques)
// - /listings/**: 404 par doctrine (no internal detail pages for Gateway)
export default function sitemap(): MetadataRoute.Sitemap {
  const baseRoutes = ["/", "/pro", "/profil-recherche", "/immobilier"];

  // Add city pages
  const cities = getAllCities();
  const cityRoutes = cities.map((city) => `/immobilier/${city.slug}`);

  const allRoutes = [...baseRoutes, ...cityRoutes];

  return allRoutes.map((route) => ({
    url: `${siteConfig.siteUrl}${route}`,
    lastModified: new Date(),
  }));
}
