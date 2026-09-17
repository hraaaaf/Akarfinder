// VIVRE-ICI-TERRITORY-DICTIONARY-LOT1 — priority/zoom contract layered over canonical geo identity
import type { CanonicalCitySlug } from "./geo-entity-registry";

export type TerritoryEntityType = "city" | "district" | "landmark";
export type TerritoryImportanceTier = "flagship" | "major" | "regional" | "local";
export type TerritoryImportanceBasis =
  | "product_priority"
  | "urban_prominence"
  | "market_relevance"
  | "orientation_value";

export type TerritoryCoordinatePrecision =
  | "city_centroid"
  | "neighborhood_centroid"
  | "verified_landmark_point";

export type TerritoryCoordinates = {
  lat: number;
  lng: number;
  precision: TerritoryCoordinatePrecision;
};

export type TerritoryImportance = {
  score: number;
  tier: TerritoryImportanceTier;
  basis: TerritoryImportanceBasis[];
};

export type TerritoryZoomPolicy = {
  minZoom: number;
  maxZoom?: number;
  retainPriority: boolean;
};

type TerritoryBase = {
  id: string;
  canonicalName: string;
  aliases: string[];
  importance: TerritoryImportance;
  visibility: TerritoryZoomPolicy;
  coordinates?: TerritoryCoordinates;
};

export type CityTerritoryEntity = TerritoryBase & {
  type: "city";
  citySlug: CanonicalCitySlug;
  parentId: null;
};

export type DistrictTerritoryEntity = TerritoryBase & {
  type: "district";
  citySlug: CanonicalCitySlug;
  districtSlug: string;
  parentId: `city_${string}`;
};

export type LandmarkCategory =
  | "heritage"
  | "transport"
  | "park"
  | "beach"
  | "retail"
  | "university"
  | "hospital"
  | "major_road"
  | "civic"
  | "business"
  | "other";

export type LandmarkTerritoryEntity = TerritoryBase & {
  type: "landmark";
  citySlug: CanonicalCitySlug;
  districtSlug: string;
  landmarkSlug: string;
  category: LandmarkCategory;
  parentId: `district_${string}`;
};

export type TerritoryEntity =
  | CityTerritoryEntity
  | DistrictTerritoryEntity
  | LandmarkTerritoryEntity;

export type TerritoryDictionary = readonly TerritoryEntity[];

export type TerritoryValidationIssue = {
  entityId: string;
  field: string;
  message: string;
};

const MAX_MAP_ZOOM = 24;

function isFiniteCoordinate(value: number): boolean {
  return Number.isFinite(value);
}

export function validateTerritoryEntity(entity: TerritoryEntity): TerritoryValidationIssue[] {
  const issues: TerritoryValidationIssue[] = [];

  if (!entity.id.trim()) {
    issues.push({ entityId: entity.id, field: "id", message: "id is required" });
  }

  if (!entity.canonicalName.trim()) {
    issues.push({ entityId: entity.id, field: "canonicalName", message: "canonicalName is required" });
  }

  if (!Number.isInteger(entity.importance.score) || entity.importance.score < 0 || entity.importance.score > 100) {
    issues.push({ entityId: entity.id, field: "importance.score", message: "importance score must be an integer from 0 to 100" });
  }

  if (entity.importance.basis.length === 0) {
    issues.push({ entityId: entity.id, field: "importance.basis", message: "at least one importance basis is required" });
  }

  const { minZoom, maxZoom } = entity.visibility;
  if (!Number.isFinite(minZoom) || minZoom < 0 || minZoom > MAX_MAP_ZOOM) {
    issues.push({ entityId: entity.id, field: "visibility.minZoom", message: "minZoom must be between 0 and 24" });
  }

  if (maxZoom !== undefined && (!Number.isFinite(maxZoom) || maxZoom < minZoom || maxZoom > MAX_MAP_ZOOM)) {
    issues.push({ entityId: entity.id, field: "visibility.maxZoom", message: "maxZoom must be >= minZoom and <= 24" });
  }

  if (entity.type === "district" && !entity.parentId.startsWith("city_")) {
    issues.push({ entityId: entity.id, field: "parentId", message: "district parentId must reference a city entity" });
  }

  if (entity.type === "landmark" && !entity.parentId.startsWith("district_")) {
    issues.push({ entityId: entity.id, field: "parentId", message: "landmark parentId must reference a district entity" });
  }

  if (entity.coordinates) {
    const { lat, lng } = entity.coordinates;
    if (!isFiniteCoordinate(lat) || lat < -90 || lat > 90) {
      issues.push({ entityId: entity.id, field: "coordinates.lat", message: "latitude must be between -90 and 90" });
    }
    if (!isFiniteCoordinate(lng) || lng < -180 || lng > 180) {
      issues.push({ entityId: entity.id, field: "coordinates.lng", message: "longitude must be between -180 and 180" });
    }
    if (entity.type !== "landmark" && entity.coordinates.precision === "verified_landmark_point") {
      issues.push({ entityId: entity.id, field: "coordinates.precision", message: "verified landmark precision is reserved for landmarks" });
    }
    if (entity.type === "landmark" && entity.coordinates.precision !== "verified_landmark_point") {
      issues.push({ entityId: entity.id, field: "coordinates.precision", message: "landmark coordinates must be explicitly verified" });
    }
  }

  return issues;
}

export function validateTerritoryDictionary(dictionary: TerritoryDictionary): TerritoryValidationIssue[] {
  const issues = dictionary.flatMap(validateTerritoryEntity);
  const seen = new Set<string>();

  for (const entity of dictionary) {
    if (seen.has(entity.id)) {
      issues.push({ entityId: entity.id, field: "id", message: "duplicate territory entity id" });
    }
    seen.add(entity.id);

    if (entity.parentId && !dictionary.some((candidate) => candidate.id === entity.parentId)) {
      issues.push({ entityId: entity.id, field: "parentId", message: "parent entity is missing from dictionary" });
    }
  }

  return issues;
}

export function isTerritoryVisibleAtZoom(entity: TerritoryEntity, zoom: number): boolean {
  if (zoom < entity.visibility.minZoom) return false;
  if (entity.visibility.maxZoom !== undefined && zoom > entity.visibility.maxZoom) return false;
  return true;
}

export function compareTerritoryPriority(a: TerritoryEntity, b: TerritoryEntity): number {
  if (a.importance.score !== b.importance.score) {
    return b.importance.score - a.importance.score;
  }

  if (a.visibility.retainPriority !== b.visibility.retainPriority) {
    return a.visibility.retainPriority ? -1 : 1;
  }

  return a.canonicalName.localeCompare(b.canonicalName, "fr");
}
