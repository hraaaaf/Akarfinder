import { GEO_NEIGHBORHOODS } from "../../lib/geo/geo-entity-registry";
import { VERIFIED_LANDMARKS } from "../../lib/geo/territory-landmark-registry";

export type LonLat = readonly [number, number];
export type Ring = readonly LonLat[];
export type Polygon = readonly Ring[];
export type MultiPolygon = readonly Polygon[];

export type PoiCandidate = {
  osmType: "node" | "way" | "relation";
  osmId: number;
  name: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
};

export function pointInRing([x, y]: LonLat, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(point: LonLat, polygon: Polygon): boolean {
  if (!polygon.length || !pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

export function pointInMultiPolygon(point: LonLat, geometry: MultiPolygon): boolean {
  return geometry.some((polygon) => pointInPolygon(point, polygon));
}

export function normalizeOsmElement(raw: any): PoiCandidate | null {
  const name = raw?.tags?.name || raw?.tags?.["name:fr"] || raw?.tags?.["name:ar"];
  const lat = raw?.lat ?? raw?.center?.lat;
  const lng = raw?.lon ?? raw?.center?.lon;
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!["node", "way", "relation"].includes(raw.type)) return null;
  return { osmType: raw.type, osmId: raw.id, name, lat, lng, tags: raw.tags ?? {} };
}

export function buildOverpassPoiQuery(areaId: number): string {
  const filters = [
    '["tourism"~"museum|attraction|gallery|hotel"]',
    '["historic"]',
    '["leisure"~"park|stadium|sports_centre|garden"]',
    '["amenity"~"place_of_worship|theatre|arts_centre|university|hospital|marketplace"]',
    '["shop"="mall"]',
    '["man_made"~"tower|lighthouse"]',
  ].join("");
  return `[out:json][timeout:45];area(${areaId})->.district;(nwr(area.district)${filters};);out center tags;`;
}

export function existingLandmarkKeys(): Set<string> {
  return new Set(VERIFIED_LANDMARKS.flatMap(({ entity }) => [
    entity.id.toLowerCase(),
    entity.canonicalName.toLowerCase(),
    ...entity.aliases.map((alias) => alias.toLowerCase()),
  ]));
}

export function canonicalDistrictDensity(): Array<{ districtId: string; city: string; district: string; count: number }> {
  const counts = new Map<string, number>();
  for (const { entity } of VERIFIED_LANDMARKS) counts.set(entity.parentId, (counts.get(entity.parentId) ?? 0) + 1);
  return GEO_NEIGHBORHOODS
    .map((district) => ({ districtId: district.id, city: district.city_slug, district: district.canonical_name, count: counts.get(district.id) ?? 0 }))
    .sort((a, b) => a.count - b.count || a.city.localeCompare(b.city) || a.district.localeCompare(b.district));
}

export function isDuplicateCandidate(candidate: PoiCandidate, keys = existingLandmarkKeys()): boolean {
  return keys.has(candidate.name.trim().toLowerCase());
}
