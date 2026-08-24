import {
  validateNeighborhoodPoiV1,
  type NeighborhoodPoiV1,
} from "@/lib/neighborhood-context/poi-registry";

export const NEIGHBORHOOD_POI_SNAPSHOT_SCHEMA_VERSION = "NeighborhoodPoiSnapshotV1" as const;

export type NeighborhoodPoiPilotStatus = "available" | "insufficient" | "external_degraded";
export type NeighborhoodPoiAcquisitionMode = "live" | "certified_seed" | "none";

export type NeighborhoodPoiPilotSnapshotV1 = {
  canonical_neighborhood_id: string;
  city: string;
  neighborhood: string;
  query_origin: { latitude: number; longitude: number };
  query_radius_m: number;
  status: NeighborhoodPoiPilotStatus;
  acquisition_mode: NeighborhoodPoiAcquisitionMode;
  provider_id: string | null;
  observed_at: string | null;
  endpoint_used: string | null;
  poi_count: number;
  categories: string[];
  pois: NeighborhoodPoiV1[];
  diagnostics: string[];
};

export type NeighborhoodPoiSnapshotV1 = {
  schema_version: typeof NEIGHBORHOOD_POI_SNAPSHOT_SCHEMA_VERSION;
  generated_at: string;
  production_provider_claim: false;
  source_policy: {
    source_id: "openstreetmap";
    attribution: "© OpenStreetMap contributors";
    license_policy: "odbl_attribution_required";
    license_url: "https://www.openstreetmap.org/copyright";
    acquisition_mode: "explicit_batch_only";
  };
  pilots: NeighborhoodPoiPilotSnapshotV1[];
};

export type NeighborhoodPoiSnapshotValidation = {
  valid: boolean;
  errors: string[];
};

function finiteCoordinate(value: { latitude: number; longitude: number }): boolean {
  return (
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

export function validateNeighborhoodPoiSnapshotV1(
  snapshot: NeighborhoodPoiSnapshotV1,
  now = new Date(snapshot.generated_at),
): NeighborhoodPoiSnapshotValidation {
  const errors: string[] = [];
  const generated = Date.parse(snapshot.generated_at);

  if (snapshot.schema_version !== NEIGHBORHOOD_POI_SNAPSHOT_SCHEMA_VERSION) errors.push("schema_version");
  if (!Number.isFinite(generated)) errors.push("generated_at");
  if (snapshot.production_provider_claim !== false) errors.push("production_provider_claim");
  if (snapshot.source_policy.source_id !== "openstreetmap") errors.push("source_id");
  if (!snapshot.source_policy.attribution.toLowerCase().includes("openstreetmap")) errors.push("attribution");
  if (snapshot.source_policy.license_policy !== "odbl_attribution_required") errors.push("license_policy");
  if (snapshot.source_policy.acquisition_mode !== "explicit_batch_only") errors.push("acquisition_mode");

  const seenPilots = new Set<string>();
  for (const pilot of snapshot.pilots) {
    if (!pilot.canonical_neighborhood_id.trim()) errors.push("pilot_neighborhood_id");
    if (seenPilots.has(pilot.canonical_neighborhood_id)) errors.push(`duplicate_pilot:${pilot.canonical_neighborhood_id}`);
    seenPilots.add(pilot.canonical_neighborhood_id);
    if (!pilot.city.trim() || !pilot.neighborhood.trim()) errors.push(`pilot_label:${pilot.canonical_neighborhood_id}`);
    if (!finiteCoordinate(pilot.query_origin)) errors.push(`pilot_coordinate:${pilot.canonical_neighborhood_id}`);
    if (!Number.isFinite(pilot.query_radius_m) || pilot.query_radius_m <= 0) errors.push(`pilot_radius:${pilot.canonical_neighborhood_id}`);
    if (pilot.poi_count !== pilot.pois.length) errors.push(`pilot_count:${pilot.canonical_neighborhood_id}`);

    const expectedCategories = Array.from(new Set(pilot.pois.map((poi) => poi.category))).sort();
    if (JSON.stringify([...pilot.categories].sort()) !== JSON.stringify(expectedCategories)) {
      errors.push(`pilot_categories:${pilot.canonical_neighborhood_id}`);
    }

    if (pilot.status === "available" && pilot.pois.length === 0) errors.push(`available_empty:${pilot.canonical_neighborhood_id}`);
    if (pilot.status !== "available" && pilot.pois.length > 0) errors.push(`non_available_with_pois:${pilot.canonical_neighborhood_id}`);
    if (pilot.status === "available" && (!pilot.provider_id || !pilot.observed_at)) errors.push(`available_provenance:${pilot.canonical_neighborhood_id}`);
    if (pilot.status === "available" && pilot.acquisition_mode === "none") errors.push(`available_without_mode:${pilot.canonical_neighborhood_id}`);
    if (pilot.status !== "available" && pilot.acquisition_mode !== "none") errors.push(`non_available_with_mode:${pilot.canonical_neighborhood_id}`);
    if (pilot.acquisition_mode === "live" && !pilot.endpoint_used) errors.push(`live_without_endpoint:${pilot.canonical_neighborhood_id}`);
    if (pilot.acquisition_mode === "certified_seed" && pilot.endpoint_used != null) errors.push(`seed_with_endpoint:${pilot.canonical_neighborhood_id}`);

    for (const poi of pilot.pois) {
      const validation = validateNeighborhoodPoiV1(poi, now);
      if (!validation.valid) {
        errors.push(`poi:${pilot.canonical_neighborhood_id}:${poi.poi_id}:${validation.errors.join("|")}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function readNeighborhoodPoiSnapshot(
  snapshot: NeighborhoodPoiSnapshotV1,
  now = new Date(snapshot.generated_at),
): NeighborhoodPoiSnapshotV1 {
  const validation = validateNeighborhoodPoiSnapshotV1(snapshot, now);
  if (!validation.valid) {
    throw new Error(`Invalid NeighborhoodPoiSnapshotV1: ${validation.errors.join(", ")}`);
  }
  return JSON.parse(JSON.stringify(snapshot)) as NeighborhoodPoiSnapshotV1;
}

export function summarizeNeighborhoodPoiSnapshot(snapshot: NeighborhoodPoiSnapshotV1) {
  const available = snapshot.pilots.filter((pilot) => pilot.status === "available");
  const live = available.filter((pilot) => pilot.acquisition_mode === "live");
  const seeded = available.filter((pilot) => pilot.acquisition_mode === "certified_seed");
  const insufficient = snapshot.pilots.filter((pilot) => pilot.status === "insufficient");
  const degraded = snapshot.pilots.filter((pilot) => pilot.status === "external_degraded");
  const allPois = available.flatMap((pilot) => pilot.pois);
  return {
    pilot_count: snapshot.pilots.length,
    available_pilots: available.length,
    live_pilots: live.length,
    certified_seed_pilots: seeded.length,
    insufficient_pilots: insufficient.length,
    external_degraded_pilots: degraded.length,
    total_pois: allPois.length,
    unique_pois: new Set(allPois.map((poi) => poi.poi_id)).size,
    categories: Array.from(new Set(allPois.map((poi) => poi.category))).sort(),
  };
}
