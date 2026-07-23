import type { MetadataRoute } from "next";
import { isSeoEligibleGeoPair } from "@/lib/geo/geo-entity-registry";
import { siteConfig } from "@/lib/seo/site";
import { getAllCities } from "@/lib/seo-city-pages/city-seo-data";
import { getAllNeighborhoods } from "@/lib/seo-neighborhood-pages/neighborhood-seo-data";

export default function sitemap(): MetadataRoute.Sitemap {
  // Stable public product/index routes only. Search stays dynamic/noindex;
  // demos and user workspaces are intentionally excluded.
  const baseRoutes = [
    "/",
    "/acheter",
    "/louer",
    "/neuf",
    "/vendre",
    "/pro",
    "/pro/agences",
    "/promoteurs",
    "/immobilier",
    "/map",
  ];

  const cityRoutes = getAllCities().map((city) => `/immobilier/${city.slug}`);
  const neighborhoodRoutes = getAllNeighborhoods()
    .filter((n) => isSeoEligibleGeoPair(n.citySlug, n.slug))
    .map((n) => `/immobilier/${n.citySlug}/${n.slug}`);

  return [...baseRoutes, ...cityRoutes, ...neighborhoodRoutes].map((route) => ({
    url: `${siteConfig.siteUrl}${route}`,
    lastModified: new Date(),
  }));
}
