import { CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW } from "@/lib/geo/casablanca-neighborhood-geometry-shadow";
import type { LivingHereCategory } from "@/lib/geo/living-here";
import {
  ANN_L5_CERTIFIED_SEED_OBSERVED_AT,
  ANN_L5_CERTIFIED_SEED_PROVIDER_ID,
  ANN_L5_CERTIFIED_SEED_RUN_ID,
  getAnnL5CertifiedSeedPois,
} from "@/lib/neighborhood-context/certified-seed";
import {
  selectNeighborhoodAnchors,
  validateNeighborhoodAnchorSelection,
  type NeighborhoodAnchorSelectionStatus,
  type NeighborhoodAnchorV1,
} from "@/lib/neighborhood-context/poi-assignment";
import { getNeighborhoodContextL1Pilots } from "@/lib/neighborhood-context/pilot-neighborhoods";
import type { NeighborhoodPoiV1 } from "@/lib/neighborhood-context/poi-registry";
import type { NeighborhoodPoiPilotSnapshotV1 } from "@/lib/neighborhood-context/poi-snapshot";

export const NEIGHBORHOOD_CONTEXT_READ_MODEL_VERSION = "NeighborhoodContextReadModelV1" as const;
export const NEIGHBORHOOD_CONTEXT_RUNTIME_SOURCE = "ann-l5-certified-seed" as const;

const NON_PUBLISHABLE_POI_NAMES = new Set([
  "crastelf 2",
  "n/a",
  "null",
  "sans nom",
  "undefined",
  "unknown",
  "unnamed",
]);

export function isPublishableNeighborhoodPoiName(name: string): boolean {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return normalized.length > 0 && !NON_PUBLISHABLE_POI_NAMES.has(normalized);
}

export type NeighborhoodContextCoverageStatus = "covered" | "partial" | "insufficient" | "unavailable";

export type NeighborhoodContextAnchorReadV1 = {
  poi_id: string;
  name: string;
  category: LivingHereCategory;
  rank: number;
  role: NeighborhoodAnchorV1["role"];
  latitude: number;
  longitude: number;
  relation: NeighborhoodAnchorV1["relation"];
  territorial_wording: NeighborhoodAnchorV1["territorial_wording"];
  distance_to_reference_m: number | null;
  source_id: string;
  source_url: string | null;
  attribution: string;
  license_policy: string;
  license_url: string | null;
  observed_at: string;
  freshness_status: "fresh";
};

export type NeighborhoodContextReadModelV1 = {
  version: typeof NEIGHBORHOOD_CONTEXT_READ_MODEL_VERSION;
  canonical_neighborhood_id: string;
  city: string;
  city_slug: string;
  neighborhood: string;
  neighborhood_slug: string;
  coverage_status: NeighborhoodContextCoverageStatus;
  selection_status: NeighborhoodAnchorSelectionStatus;
  generated_at: string;
  source: {
    mode: typeof NEIGHBORHOOD_CONTEXT_RUNTIME_SOURCE;
    provider_id: typeof ANN_L5_CERTIFIED_SEED_PROVIDER_ID;
    certified_run_id: typeof ANN_L5_CERTIFIED_SEED_RUN_ID;
    observed_at: typeof ANN_L5_CERTIFIED_SEED_OBSERVED_AT;
    production_provider_claim: false;
  };
  anchor_count: number;
  categories: LivingHereCategory[];
  anchors: NeighborhoodContextAnchorReadV1[];
  diagnostics: string[];
};

function coverageFromSelection(status: NeighborhoodAnchorSelectionStatus, anchorCount: number): NeighborhoodContextCoverageStatus {
  if (status === "ready") return "covered";
  if (status === "partial_context") return "partial";
  return anchorCount > 0 ? "insufficient" : "unavailable";
}

function geometryFor(city: string, neighborhood: string) {
  if (city !== "Casablanca") return null;
  return CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW.find((entry) =>
    entry.displayName.localeCompare(neighborhood, "fr", { sensitivity: "base" }) === 0,
  ) ?? null;
}

function pilotSnapshot(
  pilot: ReturnType<typeof getNeighborhoodContextL1Pilots>[number],
  pois: NeighborhoodPoiV1[],
): NeighborhoodPoiPilotSnapshotV1 {
  return {
    canonical_neighborhood_id: pilot.canonical_neighborhood_id,
    city: pilot.city,
    neighborhood: pilot.neighborhood,
    query_origin: pilot.query_origin,
    query_radius_m: pilot.query_radius_m,
    status: pois.length ? "available" : "insufficient",
    acquisition_mode: pois.length ? "certified_seed" : "none",
    provider_id: pois.length ? ANN_L5_CERTIFIED_SEED_PROVIDER_ID : null,
    observed_at: pois.length ? ANN_L5_CERTIFIED_SEED_OBSERVED_AT : null,
    endpoint_used: null,
    poi_count: pois.length,
    categories: Array.from(new Set(pois.map((poi) => poi.category))).sort(),
    pois,
    diagnostics: pois.length ? [`Runtime baseline: ANN-L5 run ${ANN_L5_CERTIFIED_SEED_RUN_ID}`] : ["No fresh certified runtime POI"],
  };
}

function anchorRead(anchor: NeighborhoodAnchorV1, poi: NeighborhoodPoiV1): NeighborhoodContextAnchorReadV1 {
  if (poi.status !== "active" || poi.freshness_status !== "fresh") {
    throw new Error(`Refusing non-fresh POI in read model: ${poi.poi_id}`);
  }
  return {
    poi_id: poi.poi_id,
    name: poi.name,
    category: poi.category,
    rank: anchor.rank,
    role: anchor.role,
    latitude: poi.latitude,
    longitude: poi.longitude,
    relation: anchor.relation,
    territorial_wording: anchor.territorial_wording,
    distance_to_reference_m: anchor.distance_to_reference_m,
    source_id: poi.source_id,
    source_url: poi.source_url,
    attribution: poi.attribution,
    license_policy: poi.license_policy,
    license_url: poi.license_url,
    observed_at: poi.observed_at,
    freshness_status: "fresh",
  };
}

export function buildNeighborhoodContextRuntimeCatalog(now = new Date()): NeighborhoodContextReadModelV1[] {
  return getNeighborhoodContextL1Pilots().map((pilot) => {
    const pois = getAnnL5CertifiedSeedPois(pilot.canonical_neighborhood_id, now)
      .filter((poi) =>
        poi.status === "active" &&
        poi.freshness_status === "fresh" &&
        isPublishableNeighborhoodPoiName(poi.name)
      );
    const snapshot = pilotSnapshot(pilot, pois);
    const selection = selectNeighborhoodAnchors(snapshot, { geometry: geometryFor(pilot.city, pilot.neighborhood) });
    const selectionErrors = validateNeighborhoodAnchorSelection(selection);
    if (selectionErrors.length) throw new Error(`Invalid anchor selection ${pilot.canonical_neighborhood_id}: ${selectionErrors.join(",")}`);
    const poiById = new Map(pois.map((poi) => [poi.poi_id, poi]));
    const anchors = selection.anchors.map((anchor) => {
      const poi = poiById.get(anchor.poi_id);
      if (!poi) throw new Error(`Missing POI for anchor ${anchor.poi_id}`);
      return anchorRead(anchor, poi);
    });
    return {
      version: NEIGHBORHOOD_CONTEXT_READ_MODEL_VERSION,
      canonical_neighborhood_id: pilot.canonical_neighborhood_id,
      city: pilot.city,
      city_slug: pilot.city_slug,
      neighborhood: pilot.neighborhood,
      neighborhood_slug: pilot.neighborhood_slug,
      coverage_status: coverageFromSelection(selection.status, anchors.length),
      selection_status: selection.status,
      generated_at: now.toISOString(),
      source: {
        mode: NEIGHBORHOOD_CONTEXT_RUNTIME_SOURCE,
        provider_id: ANN_L5_CERTIFIED_SEED_PROVIDER_ID,
        certified_run_id: ANN_L5_CERTIFIED_SEED_RUN_ID,
        observed_at: ANN_L5_CERTIFIED_SEED_OBSERVED_AT,
        production_provider_claim: false,
      },
      anchor_count: anchors.length,
      categories: Array.from(new Set(anchors.map((anchor) => anchor.category))).sort(),
      anchors,
      diagnostics: [...snapshot.diagnostics, ...selection.diagnostics],
    };
  });
}

export function getNeighborhoodContextReadModelBySlugs(
  citySlug: string,
  neighborhoodSlug: string,
  now = new Date(),
): NeighborhoodContextReadModelV1 | null {
  return buildNeighborhoodContextRuntimeCatalog(now).find((entry) =>
    entry.city_slug === citySlug && entry.neighborhood_slug === neighborhoodSlug,
  ) ?? null;
}

export function validateNeighborhoodContextReadModel(model: NeighborhoodContextReadModelV1): string[] {
  const errors: string[] = [];
  if (model.version !== NEIGHBORHOOD_CONTEXT_READ_MODEL_VERSION) errors.push("version");
  if (!model.canonical_neighborhood_id || !model.city_slug || !model.neighborhood_slug) errors.push("identity");
  if (model.anchor_count !== model.anchors.length) errors.push("anchor_count");
  const seen = new Set<string>();
  model.anchors.forEach((anchor, index) => {
    if (anchor.rank !== index + 1) errors.push(`rank:${anchor.poi_id}`);
    if (seen.has(anchor.poi_id)) errors.push(`duplicate:${anchor.poi_id}`);
    seen.add(anchor.poi_id);
    if (anchor.freshness_status !== "fresh") errors.push(`stale:${anchor.poi_id}`);
    if (!anchor.source_id || !anchor.attribution || !anchor.observed_at) errors.push(`provenance:${anchor.poi_id}`);
    if (anchor.territorial_wording === "Dans le quartier" && anchor.relation !== "inside_certified_boundary") {
      errors.push(`false_inside:${anchor.poi_id}`);
    }
  });
  if (model.coverage_status === "covered" && model.anchor_count < 5) errors.push("covered_under_min");
  if (model.coverage_status === "unavailable" && model.anchor_count !== 0) errors.push("unavailable_with_anchors");
  return errors;
}
