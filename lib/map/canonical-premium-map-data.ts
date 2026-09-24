import { GEO_CITIES, GEO_NEIGHBORHOODS, type CanonicalCitySlug } from "@/lib/geo/geo-entity-registry";
import { CANONICAL_CITY_REGION, MOROCCO_REGIONS, type MoroccoRegionSlug } from "@/lib/geo/morocco-region-registry";
import { CITY_CENTROIDS } from "@/lib/geo/morocco-centroids";
import { getVerifiedLandmarksForDistrict } from "@/lib/geo/territory-landmark-registry";
import { getDistrictPriority } from "@/lib/geo/territory-district-priorities";
import { getNationalCountryHubPolicy, isNationalCountryHub } from "@/lib/map/national-map-product-policy";

export type PremiumMapQuartier = {
  name: string;
  slug: string;
  canonicalId: string;
  mapAnchor?: {
    coordinates: [number, number];
    landmarkId: string;
    landmarkName: string;
    evidenceRole: "VERIFIED_LANDMARK_ANCHOR_ONLY";
  };
  priority: {
    score: number;
    tier: "flagship" | "major" | "regional" | "local";
  };
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
  coordinates?: [number, number];
  quartiers: PremiumMapQuartier[];
};

export type PremiumMapRegion = {
  name: string;
  slug: MoroccoRegionSlug;
  iso: `MA-${string}`;
  cities: PremiumMapCity[];
  regionalCities: PremiumMapCity[];
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
    .map((district) => {
      const priority = getDistrictPriority(district);
      const landmarks = getVerifiedLandmarksForDistrict(district.id);
      const anchor = landmarks[0]?.entity.coordinates;
      return {
        name: district.canonical_name,
        slug: district.slug,
        canonicalId: district.id,
        mapAnchor: anchor
          ? {
              coordinates: [anchor.lng, anchor.lat] as [number, number],
              landmarkId: landmarks[0]!.entity.id,
              landmarkName: landmarks[0]!.entity.canonicalName,
              evidenceRole: "VERIFIED_LANDMARK_ANCHOR_ONLY" as const,
            }
          : undefined,
        priority: { score: priority.score, tier: priority.tier },
        stats: {
          landmarksVerified: landmarks.length,
          status: "disponible" as const,
        },
      };
    })
    .sort((a, b) => b.priority.score - a.priority.score || a.name.localeCompare(b.name, "fr"));
}

export function buildCanonicalPremiumMapData(): PremiumMapRegion[] {
  const countryHubSlugs = new Set(
    GEO_CITIES.filter((city) => isNationalCountryHub(city.slug)).map((city) => city.slug),
  );

  return MOROCCO_REGIONS.map((region) => {
    const regionalCities = GEO_CITIES
      .filter((city) => CANONICAL_CITY_REGION[city.slug] === region.slug)
      .map((city): PremiumMapCity => ({
        name: city.canonical_name,
        slug: city.slug,
        signature: getNationalCountryHubPolicy(city.slug)?.descriptor,
        coordinates: cityPoint(city.slug) ?? undefined,
        quartiers: canonicalQuartiers(city.slug),
      }))
      .sort((a, b) => {
        const aHub = countryHubSlugs.has(a.slug) ? 0 : 1;
        const bHub = countryHubSlugs.has(b.slug) ? 0 : 1;
        if (aHub !== bHub) return aHub - bHub;
        return a.name.localeCompare(b.name, "fr");
      });

    const cities = regionalCities
      .filter((city): city is PremiumMapCity & { coordinates: [number, number] } =>
        countryHubSlugs.has(city.slug) && Boolean(city.coordinates),
      )
      .sort((a, b) =>
        (getNationalCountryHubPolicy(a.slug)?.order ?? 999) -
        (getNationalCountryHubPolicy(b.slug)?.order ?? 999),
      );

    return {
      name: region.canonical_name,
      slug: region.slug,
      iso: REGION_ISO[region.slug],
      cities,
      regionalCities,
    };
  });
}

export const CANONICAL_PREMIUM_MAP_SUMMARY = {
  regionCount: MOROCCO_REGIONS.length,
  countryHubCount: 8,
  canonicalNeighborhoodCount: GEO_NEIGHBORHOODS.filter(
    (district) => district.validation_status === "validated" && district.map_eligible,
  ).length,
  anchoredNeighborhoodCount: GEO_NEIGHBORHOODS.filter(
    (district) =>
      district.validation_status === "validated" &&
      district.map_eligible &&
      getVerifiedLandmarksForDistrict(district.id)[0]?.entity.coordinates,
  ).length,
  syntheticPriceCount: 0,
} as const;
