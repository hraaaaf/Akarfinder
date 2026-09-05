import type { MetadataRoute } from "next";
import { isSeoEligibleGeoPair } from "@/lib/geo/geo-entity-registry";
import { getSeoCityIndexability } from "@/lib/seo/city-indexability";
import { getSeoNeighborhoodIndexability } from "@/lib/seo/neighborhood-indexability";
import { siteConfig } from "@/lib/seo/site";
import { getAllCities } from "@/lib/seo-city-pages/city-seo-data";
import { getAllNeighborhoods } from "@/lib/seo-neighborhood-pages/neighborhood-seo-data";

// Inventory eligibility is live data. Do not freeze the sitemap at build time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Stable public product/index routes only. Search and Neuf stay crawlable but
  // noindex until their own publication gates are satisfied.
  const baseRoutes = [
    "/",
    "/acheter",
    "/louer",
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
  const eligibleCitySlugs = new Set<string>(
    cityDecisions.filter(({ decision }) => decision.eligible).map(({ city }) => city.slug),
  );

  const cityRoutes = cityDecisions
    .filter(({ decision }) => decision.eligible)
    .map(({ city }) => `/immobilier/${city.slug}`);

  const cityIntentRoutes = cityDecisions.flatMap(({ city, decision }) => {
    const routes: string[] = [];
    if (decision.acheter.eligible) routes.push(`/immobilier/${city.slug}/acheter`);
    if (decision.louer.eligible) routes.push(`/immobilier/${city.slug}/louer`);
    return routes;
  });

  const neighborhoodCandidates = getAllNeighborhoods().filter(
    (neighborhood) =>
      eligibleCitySlugs.has(neighborhood.citySlug) &&
      isSeoEligibleGeoPair(neighborhood.citySlug, neighborhood.slug),
  );
  const neighborhoodDecisions = await Promise.all(
    neighborhoodCandidates.map(async (neighborhood) => ({
      neighborhood,
      decision: await getSeoNeighborhoodIndexability({
        citySlug: neighborhood.citySlug,
        neighborhoodSlug: neighborhood.slug,
      }),
    })),
  );
  const neighborhoodRoutes = neighborhoodDecisions
    .filter(({ decision }) => decision.eligible)
    .map(({ neighborhood }) => `/immobilier/${neighborhood.citySlug}/${neighborhood.slug}`);

  // Do not emit a synthetic lastModified timestamp. Google expects <lastmod>
  // to represent the page's last significant change, not sitemap generation time.
  return [...baseRoutes, ...cityRoutes, ...cityIntentRoutes, ...neighborhoodRoutes].map((route) => ({
    url: `${siteConfig.siteUrl}${route}`,
  }));
}
