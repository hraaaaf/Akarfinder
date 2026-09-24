import { GEO_CITIES, GEO_NEIGHBORHOODS, type CanonicalCitySlug } from "@/lib/geo/geo-entity-registry";
import { CANONICAL_CITY_REGION, MOROCCO_REGIONS, type MoroccoRegionSlug } from "@/lib/geo/morocco-region-registry";
import { CITY_CENTROIDS } from "@/lib/geo/morocco-centroids";
import { getVerifiedLandmarksForDistrict } from "@/lib/geo/territory-landmark-registry";
import { getNationalCountryHubPolicy, isNationalCountryHub } from "@/lib/map/national-map-product-policy";

export type PremiumMapQuartier = {
  name: string;
  slug: string;
  canonicalId: string;
  stats: {
    priceRepere?: number;
    landmarksVerified: number;
    status: "disponible" | "indisponible";
  };
};

export type PremiumMapCity = {
  name: string;
  slug: CanonicalCitySlug;
  signature?: string;
  coordinates: [number, number];
  quartiers: PremiumMapQuartier[];
};

export type PremiumMapRegion = {
  name: string;
  slug: MoroccoRegionSlug;
  iso: `MA-${string}`;
  cities: PremiumMapCity[];
};

const REGION_ISO: Readonly<Record<MoroccoRegionSlug, `MA-${string}`>> = {
  "tanger-tetouan-al-hoceima": "MA-01",
  oriental: "MA-02",
  "fes-meknes": "MA-03",
  "rabat-sale-kenitra": "MA-04",
  "beni-mellal-khenifra": "MA-05",
  "casablanca-settat": "MA-06",
  "marrakech-safi": "MA-07",
  "draa-tafilalet": "MA-08",
  "souss-massa": "MA-09",
  "guelmim-oued-noun": "MA-10",
  "laayoune-sakia-el-hamra": "MA-11",
  "dakhla-oued-ed-dahab": "MA-12",
};

function cityPoint(slug: CanonicalCitySlug): [number, number] | null {
  const point = CITY_CENTROIDS[slug];
  return point ? [point.lng, point.lat] : null;
}

function canonicalQuartiers(citySlug: CanonicalCitySlug): PremiumMapQuartier[] {
  return GEO_NEIGHBORHOODS
    .filter((district) =>
      district.city_slug === citySlug &&
      district.validation_status === "validated" &&
      district.map_eligible,
    )
    .map((district) => ({
      name: district.canonical_name,
      slug: district.slug,
      canonicalId: district.id,
      stats: {
        landmarksVerified: getVerifiedLandmarksForDistrict(district.id).length,
        status: "disponible" as const,
      },
    }));
}

export function buildCanonicalPremiumMapData(): PremiumMapRegion[] {
  const countryHubSlugs = new Set(
    GEO_CITIES.filter((city) => isNationalCountryHub(city.slug)).map((city) => city.slug),
  );

  return MOROCCO_REGIONS.map((region) => {
    const cities = GEO_CITIES
      .filter((city) => countryHubSlugs.has(city.slug) && CANONICAL_CITY_REGION[city.slug] === region.slug)
      .flatMap((city): PremiumMapCity[] => {
        const coordinates = cityPoint(city.slug);
        if (!coordinates) return [];
        return [{
          name: city.canonical_name,
          slug: city.slug,
          signature: getNationalCountryHubPolicy(city.slug)?.descriptor,
          coordinates,
          quartiers: canonicalQuartiers(city.slug),
        }];
      })
      .sort((a, b) =>
        (getNationalCountryHubPolicy(a.slug)?.order ?? 999) -
        (getNationalCountryHubPolicy(b.slug)?.order ?? 999),
      );

    return {
      name: region.canonical_name,
      slug: region.slug,
      iso: REGION_ISO[region.slug],
      cities,
    };
  });
}

export const CANONICAL_PREMIUM_MAP_SUMMARY = {
  regionCount: MOROCCO_REGIONS.length,
  countryHubCount: 8,
  canonicalNeighborhoodCount: GEO_NEIGHBORHOODS.filter(
    (district) => district.validation_status === "validated" && district.map_eligible,
  ).length,
  syntheticPriceCount: 0,
} as const;
