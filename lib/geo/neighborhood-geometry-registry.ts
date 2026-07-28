export type GeoPosition = readonly [longitude: number, latitude: number];

export type GeoPolygon = {
  type: "Polygon";
  coordinates: readonly (readonly GeoPosition[])[];
};

export type GeoMultiPolygon = {
  type: "MultiPolygon";
  coordinates: readonly (readonly (readonly GeoPosition[])[])[];
};

export type NeighborhoodGeometry = GeoPolygon | GeoMultiPolygon;

export type NeighborhoodGeometrySource = {
  provider: string;
  dataset: string;
  sourceUrl: string;
  licenseId: string;
  licenseUrl: string;
  attribution: string;
  retrievedAt: string;
};

export type NeighborhoodGeometryRecord = {
  version: "v1";
  cityCanonicalId: string;
  neighborhoodCanonicalId: string;
  displayName: string;
  aliases: readonly string[];
  geometry: NeighborhoodGeometry;
  source: NeighborhoodGeometrySource;
  publicationStatus: "shadow" | "canary" | "published";
  reviewed: boolean;
};

export type NeighborhoodGeometryCandidateRecord = {
  version: "v1";
  cityCanonicalId: string;
  neighborhoodCanonicalId: string;
  displayName: string;
  aliases: readonly string[];
  sourceEntityType: "osm_relation";
  sourceEntityId: number;
  sourceAdminLevel: string;
  source: NeighborhoodGeometrySource;
  geometryStatus: "reference_only" | "materialized";
  publicationStatus: "shadow";
  reviewed: boolean;
};

export type NeighborhoodGeometryValidationIssue = {
  code:
    | "missing_canonical_id"
    | "missing_source"
    | "missing_license"
    | "missing_attribution"
    | "invalid_geometry_type"
    | "invalid_coordinate"
    | "unclosed_ring"
    | "production_without_review"
    | "invalid_source_entity";
  message: string;
};

function validateSharedMetadata(
  record: Pick<NeighborhoodGeometryRecord, "cityCanonicalId" | "neighborhoodCanonicalId" | "source">,
  issues: NeighborhoodGeometryValidationIssue[],
): void {
  if (!record.cityCanonicalId.trim() || !record.neighborhoodCanonicalId.trim()) {
    issues.push({ code: "missing_canonical_id", message: "Les identifiants canoniques ville et quartier sont obligatoires." });
  }
  if (!record.source.provider.trim() || !record.source.dataset.trim() || !record.source.sourceUrl.trim()) {
    issues.push({ code: "missing_source", message: "La provenance de la géométrie est obligatoire." });
  }
  if (!record.source.licenseId.trim() || !record.source.licenseUrl.trim()) {
    issues.push({ code: "missing_license", message: "La licence et son URL sont obligatoires." });
  }
  if (!record.source.attribution.trim()) {
    issues.push({ code: "missing_attribution", message: "Une attribution affichable est obligatoire." });
  }
}

function isFinitePosition(value: unknown): value is GeoPosition {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === "number" && Number.isFinite(value[0]) && value[0] >= -180 && value[0] <= 180 && typeof value[1] === "number" && Number.isFinite(value[1]) && value[1] >= -90 && value[1] <= 90;
}

function positionsEqual(a: GeoPosition, b: GeoPosition): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function validateRing(ring: readonly unknown[], issues: NeighborhoodGeometryValidationIssue[]): void {
  const positions = ring.filter(isFinitePosition);
  if (positions.length !== ring.length || positions.length < 4) {
    issues.push({ code: "invalid_coordinate", message: "Chaque anneau doit contenir au moins quatre positions longitude/latitude valides." });
    return;
  }
  if (!positionsEqual(positions[0], positions[positions.length - 1])) {
    issues.push({ code: "unclosed_ring", message: "Chaque anneau GeoJSON doit être fermé." });
  }
}

export function validateNeighborhoodGeometryRecord(record: NeighborhoodGeometryRecord): NeighborhoodGeometryValidationIssue[] {
  const issues: NeighborhoodGeometryValidationIssue[] = [];
  validateSharedMetadata(record, issues);
  if (record.publicationStatus !== "shadow" && !record.reviewed) {
    issues.push({ code: "production_without_review", message: "Une géométrie ne peut quitter Shadow sans revue explicite." });
  }
  if (record.geometry.type === "Polygon") {
    for (const ring of record.geometry.coordinates) validateRing(ring, issues);
  } else if (record.geometry.type === "MultiPolygon") {
    for (const polygon of record.geometry.coordinates) for (const ring of polygon) validateRing(ring, issues);
  } else {
    issues.push({ code: "invalid_geometry_type", message: "Seuls Polygon et MultiPolygon sont acceptés." });
  }
  return issues;
}

export function validateNeighborhoodGeometryCandidateRecord(record: NeighborhoodGeometryCandidateRecord): NeighborhoodGeometryValidationIssue[] {
  const issues: NeighborhoodGeometryValidationIssue[] = [];
  validateSharedMetadata(record, issues);
  if (!Number.isSafeInteger(record.sourceEntityId) || record.sourceEntityId <= 0 || record.sourceEntityType !== "osm_relation") {
    issues.push({ code: "invalid_source_entity", message: "Chaque candidat doit pointer vers une relation OSM positive et vérifiable." });
  }
  return issues;
}

export function normalizeGeometryAlias(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();
}

export function resolveNeighborhoodGeometry(records: readonly NeighborhoodGeometryRecord[], input: { cityCanonicalId: string; neighborhood: string }): NeighborhoodGeometryRecord | null {
  const needle = normalizeGeometryAlias(input.neighborhood);
  const matches = records.filter((record) => record.cityCanonicalId === input.cityCanonicalId && [record.displayName, record.neighborhoodCanonicalId, ...record.aliases].map(normalizeGeometryAlias).includes(needle));
  return matches.length === 1 ? matches[0] : null;
}

export function resolveNeighborhoodGeometryCandidate(records: readonly NeighborhoodGeometryCandidateRecord[], input: { cityCanonicalId: string; neighborhood: string }): NeighborhoodGeometryCandidateRecord | null {
  const needle = normalizeGeometryAlias(input.neighborhood);
  const matches = records.filter((record) => record.cityCanonicalId === input.cityCanonicalId && [record.displayName, record.neighborhoodCanonicalId, ...record.aliases].map(normalizeGeometryAlias).includes(needle));
  return matches.length === 1 ? matches[0] : null;
}

export function geometryRegistryChangesRanking(): false {
  return false;
}
