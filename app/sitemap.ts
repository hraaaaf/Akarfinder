import type { MetadataRoute } from "next";
import { isSeoEligibleGeoPair } from "@/lib/geo/geo-entity-registry";
import { getSeoCityIndexability } from "@/lib/seo/city-indexability";
import { siteConfig } from "@/lib/seo/site";
import { getAllCities } from "@/lib/seo-city-pages/city-seo-data";
import { getAllNeighborhoods } from "@/lib/seo-neighborhood-pages/neighborhood-seo-data";

// Inventory eligibility is live data. Do not freeze the sitemap at build time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const cityCandidates = getAllCities();
  const cityDecisions = await Promise.all(
    cityCandidates.map(async (city) => ({
      city,
      decision: await getSeoCityIndexability(city.displayName),
    })),
  );
  const eligibleCitySlugs = new Set(
    cityDecisions.filter(({ decision }) => decision.eligible).map(({ city }) => city.slug),
  );

  const cityRoutes = cityDecisions
    .filter(({ decision }) => decision.eligible)
    .map(({ city }) => `/immobilier/${city.slug}`);
  const neighborhoodRoutes = getAllNeighborhoods()
    .filter((n) => eligibleCitySlugs.has(n.citySlug) && isSeoEligibleGeoPair(n.citySlug, n.slug))
    .map((n) => `/immobilier/${n.citySlug}/${n.slug}`);

  // Do not emit a synthetic lastModified timestamp. Google expects <lastmod>
  // to represent the page's last significant change, not sitemap generation time.
  return [...baseRoutes, ...cityRoutes, ...neighborhoodRoutes].map((route) => ({
    url: `${siteConfig.siteUrl}${route}`,
  }));
}
