import {
  classifyLivingHereCategory,
  type LivingHereCategory,
} from "@/lib/geo/living-here";
import {
  hasFreshProviderEvidence,
  type NearbyProviderResult,
} from "@/lib/geo/provider-contracts";

export const NEIGHBORHOOD_POI_SCHEMA_VERSION = "NeighborhoodPoiV1" as const;
export const NEIGHBORHOOD_POI_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const OSM_SOURCE_ID = "openstreetmap" as const;
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors" as const;
export const OSM_LICENSE_URL = "https://www.openstreetmap.org/copyright" as const;

export type NeighborhoodPoiFreshnessStatus = "fresh" | "stale";
export type NeighborhoodPoiStatus = "active" | "stale" | "rejected";
export type NeighborhoodPoiConfidence = "source_verified";
export type NeighborhoodPoiLicensePolicy = "odbl_attribution_required";

export type NeighborhoodPoiV1 = {
  schema_version: typeof NEIGHBORHOOD_POI_SCHEMA_VERSION;
  poi_id: string;
  source_id: string;
  source_entity_id: string;
  provider_id: string;
  name: string;
  normalized_name: string;
  category: LivingHereCategory;
  latitude: number;
  longitude: number;
  source_url: string | null;
  attribution: string;
  license_policy: NeighborhoodPoiLicensePolicy;
  license_url: string;
  observed_at: string;
  freshness_status: NeighborhoodPoiFreshnessStatus;
  confidence: NeighborhoodPoiConfidence;
  status: NeighborhoodPoiStatus;
};

export type NeighborhoodPoiValidation = {
  valid: boolean;
  errors: string[];
};

export type NeighborhoodPoiReject = {
  source_poi_id: string | null;
  reason: string;
};

export type NeighborhoodPoiAdapterResult = {
  status: "available" | "unavailable";
  provider_id: string;
  attribution: string | null;
  observed_at: string | null;
  pois: NeighborhoodPoiV1[];
  rejected: NeighborhoodPoiReject[];
  unavailable_reason: string | null;
};

function validHttpUrl(value: string | null): boolean {
  if (value == null) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function finiteCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function normalizeNeighborhoodPoiName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function computeNeighborhoodPoiFreshness(
  observedAt: string,
  now = new Date(),
): NeighborhoodPoiFreshnessStatus {
  const observed = Date.parse(observedAt);
  if (!Number.isFinite(observed) || observed > now.getTime()) return "stale";
  return now.getTime() - observed <= NEIGHBORHOOD_POI_MAX_AGE_MS ? "fresh" : "stale";
}

export function validateNeighborhoodPoiV1(
  poi: NeighborhoodPoiV1,
  now = new Date(),
): NeighborhoodPoiValidation {
  const errors: string[] = [];

  if (poi.schema_version !== NEIGHBORHOOD_POI_SCHEMA_VERSION) errors.push("schema_version");
  if (!poi.poi_id.trim()) errors.push("poi_id");
  if (!poi.source_id.trim()) errors.push("source_id");
  if (!poi.source_entity_id.trim()) errors.push("source_entity_id");
  if (!poi.provider_id.trim()) errors.push("provider_id");
  if (!poi.name.trim()) errors.push("name");
  if (!poi.normalized_name.trim()) errors.push("normalized_name");
  if (poi.normalized_name !== normalizeNeighborhoodPoiName(poi.name)) errors.push("normalized_name_mismatch");
  if (!finiteCoordinate(poi.latitude, poi.longitude)) errors.push("coordinate");
  if (!validHttpUrl(poi.source_url)) errors.push("source_url");
  if (!poi.attribution.trim()) errors.push("attribution");
  if (!validHttpUrl(poi.license_url)) errors.push("license_url");

  const observed = Date.parse(poi.observed_at);
  if (!Number.isFinite(observed) || observed > now.getTime()) errors.push("observed_at");

  const expectedFreshness = computeNeighborhoodPoiFreshness(poi.observed_at, now);
  if (poi.freshness_status !== expectedFreshness) errors.push("freshness_status");
  if (poi.status === "active" && poi.freshness_status !== "fresh") errors.push("active_stale");
  if (poi.status === "stale" && poi.freshness_status !== "stale") errors.push("stale_fresh");
  if (poi.status === "rejected") errors.push("rejected_not_publishable");

  if (poi.source_id === OSM_SOURCE_ID) {
    if (poi.license_policy !== "odbl_attribution_required") errors.push("osm_license_policy");
    if (poi.license_url !== OSM_LICENSE_URL) errors.push("osm_license_url");
    if (!poi.attribution.toLowerCase().includes("openstreetmap")) errors.push("osm_attribution");
    if (!/^osm:(node|way|relation):\d+$/.test(poi.poi_id)) errors.push("osm_poi_id");
    if (!/^(node|way|relation)\/\d+$/.test(poi.source_entity_id)) errors.push("osm_source_entity_id");
    if (poi.source_url == null || !/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/.test(poi.source_url)) {
      errors.push("osm_source_url");
    }
  }

  return { valid: errors.length === 0, errors };
}

function parseOsmProviderId(value: string): {
  poiId: string;
  sourceEntityId: string;
  sourceUrl: string;
} | null {
  const match = value.match(/^osm:(node|way|relation):(\d+)$/);
  if (!match) return null;
  const type = match[1];
  const id = match[2];
  return {
    poiId: `osm:${type}:${id}`,
    sourceEntityId: `${type}/${id}`,
    sourceUrl: `https://www.openstreetmap.org/${type}/${id}`,
  };
}

function haversineMeters(a: NeighborhoodPoiV1, b: NeighborhoodPoiV1): number {
  const radius = 6_371_000;
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const lat1 = rad(a.latitude);
  const lat2 = rad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function dedupeNeighborhoodPois(input: NeighborhoodPoiV1[]): NeighborhoodPoiV1[] {
  const ordered = [...input].sort((a, b) => a.poi_id.localeCompare(b.poi_id, "en"));
  const accepted: NeighborhoodPoiV1[] = [];
  const seenIds = new Set<string>();

  for (const poi of ordered) {
    if (seenIds.has(poi.poi_id)) continue;
    const duplicate = accepted.some(
      (candidate) =>
        candidate.category === poi.category &&
        candidate.normalized_name === poi.normalized_name &&
        haversineMeters(candidate, poi) <= 80,
    );
    if (duplicate) continue;
    seenIds.add(poi.poi_id);
    accepted.push(poi);
  }

  return accepted;
}

export function adaptOsmNearbyResult(
  result: NearbyProviderResult,
  now = new Date(),
): NeighborhoodPoiAdapterResult {
  if (result.status !== "available") {
    return {
      status: "unavailable",
      provider_id: result.providerId,
      attribution: null,
      observed_at: null,
      pois: [],
      rejected: [],
      unavailable_reason: result.reason,
    };
  }

  if (!hasFreshProviderEvidence(result.evidence, now)) {
    return {
      status: "unavailable",
      provider_id: result.evidence.providerId,
      attribution: result.evidence.attribution,
      observed_at: result.evidence.fetchedAt,
      pois: [],
      rejected: [],
      unavailable_reason: "invalid_evidence",
    };
  }

  const accepted: NeighborhoodPoiV1[] = [];
  const rejected: NeighborhoodPoiReject[] = [];

  for (const sourcePoi of result.pois) {
    const parsed = parseOsmProviderId(sourcePoi.id);
    if (!parsed) {
      rejected.push({ source_poi_id: sourcePoi.id || null, reason: "invalid_osm_identity" });
      continue;
    }

    const name = sourcePoi.name.trim();
    if (!name) {
      rejected.push({ source_poi_id: sourcePoi.id, reason: "empty_name" });
      continue;
    }

    const freshness = computeNeighborhoodPoiFreshness(result.evidence.fetchedAt, now);
    const poi: NeighborhoodPoiV1 = {
      schema_version: NEIGHBORHOOD_POI_SCHEMA_VERSION,
      poi_id: parsed.poiId,
      source_id: OSM_SOURCE_ID,
      source_entity_id: parsed.sourceEntityId,
      provider_id: result.evidence.providerId,
      name,
      normalized_name: normalizeNeighborhoodPoiName(name),
      category: classifyLivingHereCategory(sourcePoi.category),
      latitude: sourcePoi.coordinate.latitude,
      longitude: sourcePoi.coordinate.longitude,
      source_url: parsed.sourceUrl,
      attribution: result.evidence.attribution.trim() || OSM_ATTRIBUTION,
      license_policy: "odbl_attribution_required",
      license_url: OSM_LICENSE_URL,
      observed_at: result.evidence.fetchedAt,
      freshness_status: freshness,
      confidence: "source_verified",
      status: freshness === "fresh" ? "active" : "stale",
    };

    const validation = validateNeighborhoodPoiV1(poi, now);
    if (!validation.valid) {
      rejected.push({ source_poi_id: sourcePoi.id, reason: validation.errors.join(",") });
      continue;
    }

    accepted.push(poi);
  }

  return {
    status: "available",
    provider_id: result.evidence.providerId,
    attribution: result.evidence.attribution,
    observed_at: result.evidence.fetchedAt,
    pois: dedupeNeighborhoodPois(accepted),
    rejected,
    unavailable_reason: null,
  };
}
