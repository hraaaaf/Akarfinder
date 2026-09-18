import {
  GEO_CITIES,
  GEO_NEIGHBORHOODS,
  type CanonicalCitySlug,
} from "./geo-entity-registry";
import { VERIFIED_LANDMARKS } from "./territory-landmark-registry";

export type TerritoryCityCoverage = {
  citySlug: CanonicalCitySlug;
  canonicalDistrictCount: number;
  districtsWithVerifiedLandmark: number;
  verifiedLandmarkCount: number;
  landmarkCoverageRatio: number;
  missingLandmarkDistrictIds: string[];
};

export function getTerritoryCityCoverage(citySlug: CanonicalCitySlug): TerritoryCityCoverage {
  const districts = GEO_NEIGHBORHOODS.filter((district) => district.city_slug === citySlug);
  const landmarks = VERIFIED_LANDMARKS.filter((entry) => entry.entity.citySlug === citySlug);
  const coveredDistrictIds = new Set<string>(landmarks.map((entry) => entry.entity.parentId));
  const coveredCount = districts.filter((district) => coveredDistrictIds.has(district.id)).length;

  return {
    citySlug,
    canonicalDistrictCount: districts.length,
    districtsWithVerifiedLandmark: coveredCount,
    verifiedLandmarkCount: landmarks.length,
    landmarkCoverageRatio: districts.length === 0
      ? 0
      : Number((coveredCount / districts.length).toFixed(4)),
    missingLandmarkDistrictIds: districts
      .filter((district) => !coveredDistrictIds.has(district.id))
      .map((district) => district.id),
  };
}

export function getTerritoryCoverageReport(): TerritoryCityCoverage[] {
  return GEO_CITIES
    .map((city) => getTerritoryCityCoverage(city.slug))
    .sort((a, b) => {
      if (a.canonicalDistrictCount !== b.canonicalDistrictCount) {
        return b.canonicalDistrictCount - a.canonicalDistrictCount;
      }
      return a.citySlug.localeCompare(b.citySlug);
    });
}

export function getCitiesNeedingLandmarkEnrichment(): TerritoryCityCoverage[] {
  return getTerritoryCoverageReport().filter(
    (entry) =>
      entry.canonicalDistrictCount > 0 &&
      entry.districtsWithVerifiedLandmark < entry.canonicalDistrictCount,
  );
}
