import type { CanonicalCitySlug, CanonicalNeighborhoodEntity } from "./geo-entity-registry";
import {
  getDistrictPriority,
  getPrioritizedDistrictsForCity,
} from "./territory-district-priorities";
import {
  VERIFIED_LANDMARKS,
  type VerifiedLandmarkEntry,
} from "./territory-landmark-registry";

export type LocalTerritoryVisibility = {
  districts: CanonicalNeighborhoodEntity[];
  landmarks: VerifiedLandmarkEntry[];
};

export type LocalVisibilityInput = {
  citySlug: CanonicalCitySlug;
  zoom: number;
  maxDistrictLabels: number;
  maxLandmarkLabels: number;
};

export function selectLocalTerritoryVisibility({
  citySlug,
  zoom,
  maxDistrictLabels,
  maxLandmarkLabels,
}: LocalVisibilityInput): LocalTerritoryVisibility {
  if (!Number.isFinite(zoom)) return { districts: [], landmarks: [] };
  if (!Number.isInteger(maxDistrictLabels) || maxDistrictLabels <= 0) {
    return { districts: [], landmarks: [] };
  }
  if (!Number.isInteger(maxLandmarkLabels) || maxLandmarkLabels < 0) {
    return { districts: [], landmarks: [] };
  }

  const districts = getPrioritizedDistrictsForCity(citySlug)
    .filter((district) => zoom >= getDistrictPriority(district).minZoom)
    .slice(0, maxDistrictLabels);

  const visibleDistrictIds = new Set(districts.map((district) => district.id));

  const landmarks = VERIFIED_LANDMARKS
    .filter(({ entity }) =>
      entity.citySlug === citySlug &&
      visibleDistrictIds.has(entity.parentId) &&
      zoom >= entity.visibility.minZoom,
    )
    .sort((a, b) => {
      if (a.entity.visibility.retainPriority !== b.entity.visibility.retainPriority) {
        return a.entity.visibility.retainPriority ? -1 : 1;
      }
      return b.entity.importance.score - a.entity.importance.score;
    })
    .slice(0, maxLandmarkLabels);

  return { districts, landmarks };
}
