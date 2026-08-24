import type { LivingHereCategory } from "@/lib/geo/living-here";
import {
  validateNeighborhoodGeometryRecord,
  type GeoMultiPolygon,
  type GeoPolygon,
  type GeoPosition,
  type NeighborhoodGeometry,
  type NeighborhoodGeometryRecord,
} from "@/lib/geo/neighborhood-geometry-registry";
import type { NeighborhoodPoiV1 } from "@/lib/neighborhood-context/poi-registry";
import type { NeighborhoodPoiPilotSnapshotV1 } from "@/lib/neighborhood-context/poi-snapshot";

export const NEIGHBORHOOD_POI_RELATION_VERSION = "NeighborhoodPoiRelationV1" as const;
export const NEIGHBORHOOD_ANCHOR_VERSION = "NeighborhoodAnchorV1" as const;
export const NEIGHBORHOOD_ANCHOR_MAX = 8;
export const NEIGHBORHOOD_ANCHOR_MAX_PER_CATEGORY = 2;
export const NEIGHBORHOOD_ANCHOR_READY_MIN = 5;
export const NEIGHBORHOOD_ANCHOR_PARTIAL_MIN = 3;

export type NeighborhoodPoiRelationKind =
  | "inside_certified_boundary"
  | "authority_linked"
  | "near_certified_reference"
  | "unresolved";

export type NeighborhoodPoiRelationConfidence = "high" | "medium" | "contextual" | "none";

export type NeighborhoodPoiRelationV1 = {
  version: typeof NEIGHBORHOOD_POI_RELATION_VERSION;
  canonical_neighborhood_id: string;
  poi_id: string;
  relation: NeighborhoodPoiRelationKind;
  distance_to_reference_m: number | null;
  evidence_method:
    | "published_reviewed_geometry"
    | "explicit_authority_link"
    | "certified_reference_radius"
    | "none";
  evidence_source: string | null;
  confidence: NeighborhoodPoiRelationConfidence;
  territorial_wording: "Dans le quartier" | "Rattaché au quartier" | "Autour du repère quartier" | null;
};

export type NeighborhoodAnchorRole = "structural" | "daily" | "contextual";
export type NeighborhoodAnchorSelectionStatus = "ready" | "partial_context" | "insufficient_context";

export type NeighborhoodAnchorV1 = {
  version: typeof NEIGHBORHOOD_ANCHOR_VERSION;
  canonical_neighborhood_id: string;
  poi_id: string;
  name: string;
  category: LivingHereCategory;
  rank: number;
  role: NeighborhoodAnchorRole;
  relation: NeighborhoodPoiRelationKind;
  distance_to_reference_m: number | null;
  territorial_wording: "Dans le quartier" | "Rattaché au quartier" | "Autour du repère quartier";
  selection_reason: string;
};

export type NeighborhoodAnchorSelectionV1 = {
  canonical_neighborhood_id: string;
  city: string;
  neighborhood: string;
  status: NeighborhoodAnchorSelectionStatus;
  candidate_count: number;
  eligible_count: number;
  anchors: NeighborhoodAnchorV1[];
  relations: NeighborhoodPoiRelationV1[];
  diagnostics: string[];
};

export type NeighborhoodAssignmentOptions = {
  geometry?: NeighborhoodGeometryRecord | null;
  authorityLinkedPoiIds?: ReadonlySet<string>;
};

const CATEGORY_PRIORITY: LivingHereCategory[] = [
  "transport",
  "education",
  "groceries",
  "health",
  "green_sport",
  "shopping",
  "coast",
  "banking",
  "parking",
  "food",
  "worship",
  "other",
];

const RELATION_PRIORITY: Record<NeighborhoodPoiRelationKind, number> = {
  inside_certified_boundary: 0,
  authority_linked: 1,
  near_certified_reference: 2,
  unresolved: 3,
};

function roleForCategory(category: LivingHereCategory): NeighborhoodAnchorRole {
  if (category === "transport" || category === "coast") return "structural";
  if (category === "education" || category === "groceries" || category === "health") return "daily";
  return "contextual";
}

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const radius = 6_371_000;
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const lat1 = rad(a.latitude);
  const lat2 = rad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pointOnSegment(point: GeoPosition, a: GeoPosition, b: GeoPosition): boolean {
  const [px, py] = point;
  const [ax, ay] = a;
  const [bx, by] = b;
  const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
  if (Math.abs(cross) > 1e-10) return false;
  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay);
  if (dot < 0) return false;
  const lengthSq = (bx - ax) ** 2 + (by - ay) ** 2;
  return dot <= lengthSq;
}

function pointInRing(point: GeoPosition, ring: readonly GeoPosition[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j];
    const b = ring[i];
    if (pointOnSegment(point, a, b)) return true;
    const intersects = (b[1] > point[1]) !== (a[1] > point[1]) &&
      point[0] < ((a[0] - b[0]) * (point[1] - b[1])) / ((a[1] - b[1]) || Number.EPSILON) + b[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: GeoPosition, polygon: GeoPolygon): boolean {
  const [outer, ...holes] = polygon.coordinates;
  if (!outer || !pointInRing(point, outer)) return false;
  return !holes.some((hole) => pointInRing(point, hole));
}

function pointInMultiPolygon(point: GeoPosition, geometry: GeoMultiPolygon): boolean {
  return geometry.coordinates.some((coordinates) => pointInPolygon(point, { type: "Polygon", coordinates }));
}

export function pointInNeighborhoodGeometry(
  point: { latitude: number; longitude: number },
  geometry: NeighborhoodGeometry,
): boolean {
  const coordinate: GeoPosition = [point.longitude, point.latitude];
  return geometry.type === "Polygon"
    ? pointInPolygon(coordinate, geometry)
    : pointInMultiPolygon(coordinate, geometry);
}

export function isCertifiedNeighborhoodGeometry(
  geometry: NeighborhoodGeometryRecord | null | undefined,
  canonicalNeighborhoodId: string,
): geometry is NeighborhoodGeometryRecord {
  if (!geometry) return false;
  if (geometry.neighborhoodCanonicalId !== canonicalNeighborhoodId) return false;
  if (geometry.publicationStatus !== "published" || !geometry.reviewed) return false;
  return validateNeighborhoodGeometryRecord(geometry).length === 0;
}

export function buildNeighborhoodPoiRelation(
  pilot: Pick<NeighborhoodPoiPilotSnapshotV1, "canonical_neighborhood_id" | "query_origin" | "query_radius_m">,
  poi: NeighborhoodPoiV1,
  options: NeighborhoodAssignmentOptions = {},
): NeighborhoodPoiRelationV1 {
  const distance = Math.round(haversineMeters(pilot.query_origin, {
    latitude: poi.latitude,
    longitude: poi.longitude,
  }));

  if (isCertifiedNeighborhoodGeometry(options.geometry, pilot.canonical_neighborhood_id) &&
      pointInNeighborhoodGeometry({ latitude: poi.latitude, longitude: poi.longitude }, options.geometry.geometry)) {
    return {
      version: NEIGHBORHOOD_POI_RELATION_VERSION,
      canonical_neighborhood_id: pilot.canonical_neighborhood_id,
      poi_id: poi.poi_id,
      relation: "inside_certified_boundary",
      distance_to_reference_m: distance,
      evidence_method: "published_reviewed_geometry",
      evidence_source: options.geometry.source.sourceUrl,
      confidence: "high",
      territorial_wording: "Dans le quartier",
    };
  }

  if (options.authorityLinkedPoiIds?.has(poi.poi_id)) {
    return {
      version: NEIGHBORHOOD_POI_RELATION_VERSION,
      canonical_neighborhood_id: pilot.canonical_neighborhood_id,
      poi_id: poi.poi_id,
      relation: "authority_linked",
      distance_to_reference_m: distance,
      evidence_method: "explicit_authority_link",
      evidence_source: poi.source_url,
      confidence: "medium",
      territorial_wording: "Rattaché au quartier",
    };
  }

  if (distance <= pilot.query_radius_m) {
    return {
      version: NEIGHBORHOOD_POI_RELATION_VERSION,
      canonical_neighborhood_id: pilot.canonical_neighborhood_id,
      poi_id: poi.poi_id,
      relation: "near_certified_reference",
      distance_to_reference_m: distance,
      evidence_method: "certified_reference_radius",
      evidence_source: null,
      confidence: "contextual",
      territorial_wording: "Autour du repère quartier",
    };
  }

  return {
    version: NEIGHBORHOOD_POI_RELATION_VERSION,
    canonical_neighborhood_id: pilot.canonical_neighborhood_id,
    poi_id: poi.poi_id,
    relation: "unresolved",
    distance_to_reference_m: distance,
    evidence_method: "none",
    evidence_source: null,
    confidence: "none",
    territorial_wording: null,
  };
}

function compareCandidate(
  a: { poi: NeighborhoodPoiV1; relation: NeighborhoodPoiRelationV1 },
  b: { poi: NeighborhoodPoiV1; relation: NeighborhoodPoiRelationV1 },
): number {
  const relationDiff = RELATION_PRIORITY[a.relation.relation] - RELATION_PRIORITY[b.relation.relation];
  if (relationDiff !== 0) return relationDiff;
  const distanceDiff = (a.relation.distance_to_reference_m ?? Number.MAX_SAFE_INTEGER) -
    (b.relation.distance_to_reference_m ?? Number.MAX_SAFE_INTEGER);
  if (distanceDiff !== 0) return distanceDiff;
  const nameDiff = a.poi.normalized_name.localeCompare(b.poi.normalized_name, "fr");
  if (nameDiff !== 0) return nameDiff;
  return a.poi.poi_id.localeCompare(b.poi.poi_id, "en");
}

function selectionStatus(anchorCount: number): NeighborhoodAnchorSelectionStatus {
  if (anchorCount >= NEIGHBORHOOD_ANCHOR_READY_MIN) return "ready";
  if (anchorCount >= NEIGHBORHOOD_ANCHOR_PARTIAL_MIN) return "partial_context";
  return "insufficient_context";
}

export function selectNeighborhoodAnchors(
  pilot: NeighborhoodPoiPilotSnapshotV1,
  options: NeighborhoodAssignmentOptions = {},
): NeighborhoodAnchorSelectionV1 {
  const relations = pilot.pois.map((poi) => buildNeighborhoodPoiRelation(pilot, poi, options));
  const relationByPoi = new Map(relations.map((relation) => [relation.poi_id, relation]));
  const eligible = pilot.pois
    .filter((poi) => poi.status === "active" && poi.freshness_status === "fresh")
    .map((poi) => ({ poi, relation: relationByPoi.get(poi.poi_id)! }))
    .filter((candidate) => candidate.relation.relation !== "unresolved");

  const buckets = new Map<LivingHereCategory, Array<{ poi: NeighborhoodPoiV1; relation: NeighborhoodPoiRelationV1 }>>();
  for (const category of CATEGORY_PRIORITY) buckets.set(category, []);
  for (const candidate of eligible) {
    const bucket = buckets.get(candidate.poi.category) ?? [];
    bucket.push(candidate);
    buckets.set(candidate.poi.category, bucket);
  }
  for (const bucket of buckets.values()) bucket.sort(compareCandidate);

  const selected: Array<{ poi: NeighborhoodPoiV1; relation: NeighborhoodPoiRelationV1 }> = [];
  for (let pass = 0; pass < NEIGHBORHOOD_ANCHOR_MAX_PER_CATEGORY; pass += 1) {
    for (const category of CATEGORY_PRIORITY) {
      const candidate = buckets.get(category)?.[pass];
      if (!candidate) continue;
      selected.push(candidate);
      if (selected.length >= NEIGHBORHOOD_ANCHOR_MAX) break;
    }
    if (selected.length >= NEIGHBORHOOD_ANCHOR_MAX) break;
  }

  const anchors: NeighborhoodAnchorV1[] = selected.map(({ poi, relation }, index) => ({
    version: NEIGHBORHOOD_ANCHOR_VERSION,
    canonical_neighborhood_id: pilot.canonical_neighborhood_id,
    poi_id: poi.poi_id,
    name: poi.name,
    category: poi.category,
    rank: index + 1,
    role: roleForCategory(poi.category),
    relation: relation.relation,
    distance_to_reference_m: relation.distance_to_reference_m,
    territorial_wording: relation.territorial_wording!,
    selection_reason: `${roleForCategory(poi.category)} · ${relation.relation} · ${relation.distance_to_reference_m ?? "?"}m`,
  }));

  const diagnostics: string[] = [];
  const geometryDiagnostic = options.geometry
    ? `geometry_not_certifying:${options.geometry.publicationStatus}:${options.geometry.reviewed ? "reviewed" : "unreviewed"}`
    : null;
  if (pilot.status !== "available") diagnostics.push(`source_status:${pilot.status}`);
  if (eligible.length === 0) diagnostics.push("no_eligible_poi");
  if (anchors.length < NEIGHBORHOOD_ANCHOR_READY_MIN) diagnostics.push(`target_5_8_not_met:${anchors.length}`);
  if (geometryDiagnostic && !isCertifiedNeighborhoodGeometry(options.geometry, pilot.canonical_neighborhood_id)) {
    diagnostics.push(geometryDiagnostic);
  }

  return {
    canonical_neighborhood_id: pilot.canonical_neighborhood_id,
    city: pilot.city,
    neighborhood: pilot.neighborhood,
    status: selectionStatus(anchors.length),
    candidate_count: pilot.pois.length,
    eligible_count: eligible.length,
    anchors,
    relations,
    diagnostics,
  };
}

export function validateNeighborhoodAnchorSelection(selection: NeighborhoodAnchorSelectionV1): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const categoryCounts = new Map<LivingHereCategory, number>();

  if (selection.anchors.length > NEIGHBORHOOD_ANCHOR_MAX) errors.push("too_many_anchors");
  selection.anchors.forEach((anchor, index) => {
    if (anchor.rank !== index + 1) errors.push(`rank:${anchor.poi_id}`);
    if (seen.has(anchor.poi_id)) errors.push(`duplicate:${anchor.poi_id}`);
    seen.add(anchor.poi_id);
    if (anchor.relation === "unresolved") errors.push(`unresolved_anchor:${anchor.poi_id}`);
    if (!anchor.territorial_wording) errors.push(`missing_wording:${anchor.poi_id}`);
    const count = (categoryCounts.get(anchor.category) ?? 0) + 1;
    categoryCounts.set(anchor.category, count);
    if (count > NEIGHBORHOOD_ANCHOR_MAX_PER_CATEGORY) errors.push(`category_cap:${anchor.category}`);
    if (anchor.territorial_wording === "Dans le quartier" && anchor.relation !== "inside_certified_boundary") {
      errors.push(`false_inside_wording:${anchor.poi_id}`);
    }
  });

  if (selection.status === "ready" && selection.anchors.length < NEIGHBORHOOD_ANCHOR_READY_MIN) errors.push("ready_under_min");
  if (selection.status === "partial_context" && (selection.anchors.length < NEIGHBORHOOD_ANCHOR_PARTIAL_MIN || selection.anchors.length >= NEIGHBORHOOD_ANCHOR_READY_MIN)) {
    errors.push("partial_out_of_range");
  }
  if (selection.status === "insufficient_context" && selection.anchors.length >= NEIGHBORHOOD_ANCHOR_PARTIAL_MIN) errors.push("insufficient_over_range");

  return errors;
}
