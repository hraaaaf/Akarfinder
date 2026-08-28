import {
  computeNeighborhoodPoiFreshness,
  NEIGHBORHOOD_POI_SCHEMA_VERSION,
  normalizeNeighborhoodPoiName,
  OSM_ATTRIBUTION,
  OSM_LICENSE_URL,
  type NeighborhoodPoiV1,
} from "@/lib/neighborhood-context/poi-registry";

export const ANN_L5_CERTIFIED_SEED_RUN_ID = 31943502557 as const;
export const ANN_L5_CERTIFIED_SEED_OBSERVED_AT = "2026-08-16T11:08:32.249Z" as const;
export const ANN_L5_CERTIFIED_SEED_PROVIDER_ID = "ann-l5-certified-seed" as const;

export type CertifiedNeighborhoodSeedRow = {
  canonical_neighborhood_id: string;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  name: string;
  category: NeighborhoodPoiV1["category"];
  latitude: number;
  longitude: number;
};

// Continuity seed extracted from the certified ANN-L5 live bake-off artifact.
// It contains only POIs that were <= 1.8 km from the current pilot reference
// and that map to the Lot 1 category scope. This is candidate context only:
// NO "inside neighborhood" claim is made here; territorial assignment is Lot 2.
// Low-quality source labels may be removed from this continuity subset rather
// than exposed to users; no replacement is invented without a certified run.
const ANN_L5_CERTIFIED_SEED: CertifiedNeighborhoodSeedRow[] = [
  { canonical_neighborhood_id: "district_rabat_agdal", osm_type: "node", osm_id: 313473516, name: "Paul Cézanne", category: "education", latitude: 33.992901, longitude: -6.8452232 },
  { canonical_neighborhood_id: "district_rabat_agdal", osm_type: "node", osm_id: 444380728, name: "Pharmacie Ibn Sina صيدلية ابن سينا", category: "health", latitude: 33.9962816, longitude: -6.8481761 },
  { canonical_neighborhood_id: "district_rabat_agdal", osm_type: "node", osm_id: 1824603903, name: "Hopital Ibn Sina /CHU Ibn SIna", category: "health", latitude: 33.9838968, longitude: -6.8504077 },
  { canonical_neighborhood_id: "district_rabat_agdal", osm_type: "node", osm_id: 1881124839, name: "Carrefour Market", category: "groceries", latitude: 34.0023902, longitude: -6.8519558 },

  { canonical_neighborhood_id: "district_casablanca_maarif", osm_type: "node", osm_id: 2714951127, name: "Clinique Badr مصحة بدر", category: "health", latitude: 33.5948697, longitude: -7.6410981 },
  { canonical_neighborhood_id: "district_casablanca_maarif", osm_type: "node", osm_id: 12328946044, name: "Promenade Maritime de la Mosquée Hassan II", category: "green_sport", latitude: 33.6046877, longitude: -7.6447275 },

  { canonical_neighborhood_id: "district_marrakech_gueliz", osm_type: "node", osm_id: 704482535, name: "Yochkad Supermarché", category: "groceries", latitude: 31.6327017, longitude: -8.0123764 },

  { canonical_neighborhood_id: "district_tanger_malabata", osm_type: "node", osm_id: 616475040, name: "Al Amana", category: "education", latitude: 35.7829139, longitude: -5.8189968 },
  { canonical_neighborhood_id: "district_tanger_malabata", osm_type: "node", osm_id: 2328215997, name: "Pharmacie Anegay صيدلية أنغاي", category: "health", latitude: 35.7851172, longitude: -5.8124517 },
  { canonical_neighborhood_id: "district_tanger_malabata", osm_type: "node", osm_id: 12729460358, name: "APEX Dental Clinic", category: "health", latitude: 35.7757254, longitude: -5.8046245 },
  { canonical_neighborhood_id: "district_tanger_malabata", osm_type: "node", osm_id: 5575040515, name: "Arrazi Radiologie", category: "health", latitude: 35.7762857, longitude: -5.8140609 },
  { canonical_neighborhood_id: "district_tanger_malabata", osm_type: "node", osm_id: 1855116478, name: "Supermarché Al Baraka", category: "groceries", latitude: 35.7724151, longitude: -5.8076345 },
];

export function getAnnL5CertifiedSeedNeighborhoodIds(): string[] {
  return Array.from(new Set(ANN_L5_CERTIFIED_SEED.map((row) => row.canonical_neighborhood_id))).sort();
}

export function getAnnL5CertifiedSeedPois(
  canonicalNeighborhoodId: string,
  now = new Date(),
): NeighborhoodPoiV1[] {
  return ANN_L5_CERTIFIED_SEED
    .filter((row) => row.canonical_neighborhood_id === canonicalNeighborhoodId)
    .map((row): NeighborhoodPoiV1 => {
      const sourceEntityId = `${row.osm_type}/${row.osm_id}`;
      const freshness = computeNeighborhoodPoiFreshness(ANN_L5_CERTIFIED_SEED_OBSERVED_AT, now);
      return {
        schema_version: NEIGHBORHOOD_POI_SCHEMA_VERSION,
        poi_id: `osm:${row.osm_type}:${row.osm_id}`,
        source_id: "openstreetmap",
        source_entity_id: sourceEntityId,
        provider_id: ANN_L5_CERTIFIED_SEED_PROVIDER_ID,
        name: row.name,
        normalized_name: normalizeNeighborhoodPoiName(row.name),
        category: row.category,
        latitude: row.latitude,
        longitude: row.longitude,
        source_url: `https://www.openstreetmap.org/${sourceEntityId}`,
        attribution: OSM_ATTRIBUTION,
        license_policy: "odbl_attribution_required",
        license_url: OSM_LICENSE_URL,
        observed_at: ANN_L5_CERTIFIED_SEED_OBSERVED_AT,
        freshness_status: freshness,
        confidence: "source_verified",
        status: freshness === "fresh" ? "active" : "stale",
      };
    });
}
