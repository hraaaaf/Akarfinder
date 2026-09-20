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
  ];
  const clauses = filters.map((filter) => `nwr(area.district)${filter};`).join("");
  return `[out:json][timeout:45];area(${areaId})->.district;(${clauses});out center tags;`;
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


export type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type DistrictBoundaryCandidate = {
  osmType: "node" | "way" | "relation";
  osmId: number;
  displayName: string;
  geometry: GeoJsonGeometry;
  importance: number;
};

export function buildNominatimDistrictSearchUrl(city: string, district: string): string {
  const q = encodeURIComponent(`${district}, ${city}, Morocco`);
  return `https://nominatim.openstreetmap.org/search?q=${q}&format=jsonv2&countrycodes=ma&addressdetails=1&polygon_geojson=1&limit=5`;
}

export function normalizeNominatimBoundary(raw: any): DistrictBoundaryCandidate | null {
  const geometry = raw?.geojson;
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) return null;
  const osmType = raw?.osm_type;
  if (!["node", "way", "relation"].includes(osmType) || !Number.isFinite(Number(raw?.osm_id))) return null;
  return {
    osmType,
    osmId: Number(raw.osm_id),
    displayName: String(raw.display_name ?? ""),
    geometry,
    importance: Number(raw.importance ?? 0),
  };
}

export function toMultiPolygon(geometry: GeoJsonGeometry): MultiPolygon {
  return geometry.type === "Polygon"
    ? [geometry.coordinates as unknown as Polygon]
    : geometry.coordinates as unknown as MultiPolygon;
}

export function overpassAreaId(osmType: DistrictBoundaryCandidate["osmType"], osmId: number): number | null {
  if (osmType === "relation") return 3_600_000_000 + osmId;
  if (osmType === "way") return 2_400_000_000 + osmId;
  return null;
}

export function assignCandidatesToBoundary(candidates: readonly PoiCandidate[], boundary: GeoJsonGeometry): PoiCandidate[] {
  const geometry = toMultiPolygon(boundary);
  return candidates.filter((candidate) => pointInMultiPolygon([candidate.lng, candidate.lat], geometry));
}

function normalizeCandidateText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function haversineMeters(a: LonLat, b: LonLat): number {
  const r = 6_371_000;
  const toRad = (v: number) => v * Math.PI / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function candidateDedupKey(candidate: PoiCandidate): string {
  return normalizeCandidateText(candidate.name);
}

export function dedupePoiCandidates(candidates: readonly PoiCandidate[], nearMeters = 35): PoiCandidate[] {
  const retained: PoiCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidateDedupKey(candidate);
    const duplicate = retained.some((prior) => {
      if (candidateDedupKey(prior) !== key) return false;
      return haversineMeters([prior.lng, prior.lat], [candidate.lng, candidate.lat]) <= nearMeters;
    });
    if (!duplicate) retained.push(candidate);
  }
  return retained;
}

export function rankDistrictsForDiscovery(limit = 10) {
  return canonicalDistrictDensity().slice(0, Math.max(0, limit));
}
