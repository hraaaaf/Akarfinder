import {
  computeNeighborhoodPoiFreshness,
  NEIGHBORHOOD_POI_SCHEMA_VERSION,
  normalizeNeighborhoodPoiName,
  OSM_ATTRIBUTION,
  OSM_LICENSE_URL,
  type NeighborhoodPoiV1,
} from "@/lib/neighborhood-context/poi-registry";

export const MAARIF_COUCHE2_REFRESH_RUN_ID = 35523711412 as const;
export const MAARIF_COUCHE2_REFRESH_OBSERVED_AT = "2026-09-20T00:00:00.000Z" as const;
export const MAARIF_COUCHE2_REFRESH_PROVIDER_ID = "landmark-factory-casablanca-20260920" as const;

type MaarifCouche2SeedRow = {
  osm_type: "node" | "way";
  osm_id: number;
  name: string;
  category: NeighborhoodPoiV1["category"];
  latitude: number;
  longitude: number;
};

// Exact points extracted from the archived Casablanca offline PBF artifact
// produced by Landmark Factory run 35523711412 on 2026-09-20.
// They are proximity context only; no "inside Maârif" claim is made.
const MAARIF_COUCHE2_SEED: readonly MaarifCouche2SeedRow[] = [
  {
    osm_type: "node",
    osm_id: 13107398659,
    name: "Marché Central du Maârif",
    category: "groceries",
    latitude: 33.5851575,
    longitude: -7.634629,
  },
  {
    osm_type: "node",
    osm_id: 2714951127,
    name: "Clinique Badr مصحة بدر",
    category: "health",
    latitude: 33.5948697,
    longitude: -7.6410981,
  },
  {
    osm_type: "way",
    osm_id: 1308072043,
    name: "Parc du Vélodrome",
    category: "green_sport",
    latitude: 33.5894107,
    longitude: -7.64563765,
  },
  {
    osm_type: "node",
    osm_id: 13107612252,
    name: "Université Mundiapolis",
    category: "education",
    latitude: 33.5811382,
    longitude: -7.633562,
  },
] as const;

export function isMaarifCouche2RefreshAvailable(now = new Date()): boolean {
  const observed = Date.parse(MAARIF_COUCHE2_REFRESH_OBSERVED_AT);
  return Number.isFinite(observed) && observed <= now.getTime();
}

export function getMaarifCouche2SeedPois(now = new Date()): NeighborhoodPoiV1[] {
  return MAARIF_COUCHE2_SEED.map((row) => {
    const sourceEntityId = `${row.osm_type}/${row.osm_id}`;
    const freshness = computeNeighborhoodPoiFreshness(MAARIF_COUCHE2_REFRESH_OBSERVED_AT, now);
    return {
      schema_version: NEIGHBORHOOD_POI_SCHEMA_VERSION,
      poi_id: `osm:${row.osm_type}:${row.osm_id}`,
      source_id: "openstreetmap",
      source_entity_id: sourceEntityId,
      provider_id: MAARIF_COUCHE2_REFRESH_PROVIDER_ID,
      name: row.name,
      normalized_name: normalizeNeighborhoodPoiName(row.name),
      category: row.category,
      latitude: row.latitude,
      longitude: row.longitude,
      source_url: `https://www.openstreetmap.org/${sourceEntityId}`,
      attribution: OSM_ATTRIBUTION,
      license_policy: "odbl_attribution_required",
      license_url: OSM_LICENSE_URL,
      observed_at: MAARIF_COUCHE2_REFRESH_OBSERVED_AT,
      freshness_status: freshness,
      confidence: "source_verified",
      status: freshness === "fresh" ? "active" : "stale",
    };
  });
}
