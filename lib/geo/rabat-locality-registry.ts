// C8B — Rabat locality registry.
// Taxonomy/provenance only. Deliberately not wired into public map eligibility,
// Search ranking, C3 metrics, or runtime geo resolution.

export type RabatTaxonomyStatus = "certified" | "candidate" | "rejected";
export type RabatGeometryStatus = "certified_polygon" | "point_proxy" | "unresolved";
export type RabatMetricsAvailability = "legacy_c3_available" | "not_assessed";
export type RabatContextAvailability = "first_party_available" | "not_assessed";
export type RabatActivationStatus = "legacy_active" | "blocked";

export type RabatAuthoritySourceId =
  | "akarfinder_geo_registry_v1"
  | "akarfinder_morocco_centroids_v1"
  | "akarfinder_district_dictionary_v1"
  | "akarfinder_rabat_market_zones_v1"
  | "hcp_rabat_admin_statistical_nomenclature"
  | "aurs_rabat_first_party"
  | "commune_rabat_first_party"
  | "poste_maroc_postal_names";

export type RabatAdminParent = {
  id: string;
  display_name: string;
  normalized_name: string;
  authority_kind: "hcp_admin_statistical_unit";
  source_id: "hcp_rabat_admin_statistical_nomenclature";
};

export type RabatProductLocality = {
  id: string;
  slug: string;
  city: "Rabat";
  display_name: string;
  normalized_name: string;
  aliases: string[];
  admin_parent_id: string | null;
  taxonomy_status: RabatTaxonomyStatus;
  market_map_eligible: boolean;
  geometry_status: RabatGeometryStatus;
  geometry_source: RabatAuthoritySourceId | null;
  geometry_version: string | null;
  metrics_availability: RabatMetricsAvailability;
  context_availability: RabatContextAvailability;
  activation_status: RabatActivationStatus;
  fail_closed_reason: "taxonomy_candidate" | "geometry_unresolved" | null;
  data_sources: RabatAuthoritySourceId[];
};

export const RABAT_ADMIN_PARENTS: readonly RabatAdminParent[] = [
  { id: "admin_rabat_agdal_riyad", display_name: "Agdal Riyad", normalized_name: "agdal riyad", authority_kind: "hcp_admin_statistical_unit", source_id: "hcp_rabat_admin_statistical_nomenclature" },
  { id: "admin_rabat_hassan", display_name: "Hassan", normalized_name: "hassan", authority_kind: "hcp_admin_statistical_unit", source_id: "hcp_rabat_admin_statistical_nomenclature" },
  { id: "admin_rabat_souissi", display_name: "Souissi", normalized_name: "souissi", authority_kind: "hcp_admin_statistical_unit", source_id: "hcp_rabat_admin_statistical_nomenclature" },
  { id: "admin_rabat_yacoub_el_mansour", display_name: "Yacoub El Mansour", normalized_name: "yacoub el mansour", authority_kind: "hcp_admin_statistical_unit", source_id: "hcp_rabat_admin_statistical_nomenclature" },
  { id: "admin_rabat_youssoufia", display_name: "Youssoufia", normalized_name: "youssoufia", authority_kind: "hcp_admin_statistical_unit", source_id: "hcp_rabat_admin_statistical_nomenclature" },
  { id: "admin_rabat_touarga", display_name: "Touarga", normalized_name: "touarga", authority_kind: "hcp_admin_statistical_unit", source_id: "hcp_rabat_admin_statistical_nomenclature" },
] as const;

const LEGACY_COMMON = {
  city: "Rabat" as const,
  taxonomy_status: "certified" as const,
  metrics_availability: "legacy_c3_available" as const,
  context_availability: "first_party_available" as const,
  data_sources: ["akarfinder_geo_registry_v1", "akarfinder_rabat_market_zones_v1", "aurs_rabat_first_party"] as RabatAuthoritySourceId[],
};

export const RABAT_CERTIFIED_PRODUCT_LOCALITIES: readonly RabatProductLocality[] = [
  {
    ...LEGACY_COMMON,
    id: "district_rabat_agdal", slug: "agdal", display_name: "Agdal", normalized_name: "agdal", aliases: [],
    admin_parent_id: "admin_rabat_agdal_riyad", market_map_eligible: true,
    geometry_status: "point_proxy", geometry_source: "akarfinder_morocco_centroids_v1", geometry_version: "c0-c7-point-proxy",
    activation_status: "legacy_active", fail_closed_reason: null,
    data_sources: ["akarfinder_geo_registry_v1", "akarfinder_morocco_centroids_v1", "akarfinder_rabat_market_zones_v1", "hcp_rabat_admin_statistical_nomenclature", "aurs_rabat_first_party"],
  },
  {
    ...LEGACY_COMMON,
    id: "district_rabat_hay_riad", slug: "hay-riad", display_name: "Hay Riad", normalized_name: "hay riad", aliases: ["Hay Ryad", "Riad"],
    admin_parent_id: "admin_rabat_agdal_riyad", market_map_eligible: true,
    geometry_status: "point_proxy", geometry_source: "akarfinder_morocco_centroids_v1", geometry_version: "c0-c7-point-proxy",
    activation_status: "legacy_active", fail_closed_reason: null,
    data_sources: ["akarfinder_geo_registry_v1", "akarfinder_morocco_centroids_v1", "akarfinder_rabat_market_zones_v1", "hcp_rabat_admin_statistical_nomenclature", "aurs_rabat_first_party"],
  },
  {
    ...LEGACY_COMMON,
    id: "district_rabat_hassan", slug: "hassan", display_name: "Hassan", normalized_name: "hassan", aliases: [],
    admin_parent_id: "admin_rabat_hassan", market_map_eligible: true,
    geometry_status: "point_proxy", geometry_source: "akarfinder_morocco_centroids_v1", geometry_version: "c0-c7-point-proxy",
    activation_status: "legacy_active", fail_closed_reason: null,
    data_sources: ["akarfinder_geo_registry_v1", "akarfinder_morocco_centroids_v1", "akarfinder_rabat_market_zones_v1", "hcp_rabat_admin_statistical_nomenclature", "aurs_rabat_first_party"],
  },
  {
    ...LEGACY_COMMON,
    id: "district_rabat_souissi", slug: "souissi", display_name: "Souissi", normalized_name: "souissi", aliases: [],
    admin_parent_id: "admin_rabat_souissi", market_map_eligible: false,
    geometry_status: "unresolved", geometry_source: null, geometry_version: null,
    activation_status: "blocked", fail_closed_reason: "geometry_unresolved",
    data_sources: ["akarfinder_geo_registry_v1", "akarfinder_rabat_market_zones_v1", "hcp_rabat_admin_statistical_nomenclature", "aurs_rabat_first_party"],
  },
  {
    id: "district_rabat_ocean", slug: "ocean", city: "Rabat", display_name: "Océan", normalized_name: "ocean", aliases: ["Ocean"],
    admin_parent_id: "admin_rabat_hassan", taxonomy_status: "certified", market_map_eligible: false,
    geometry_status: "unresolved", geometry_source: null, geometry_version: null,
    metrics_availability: "not_assessed", context_availability: "first_party_available",
    activation_status: "blocked", fail_closed_reason: "geometry_unresolved",
    data_sources: ["akarfinder_geo_registry_v1", "akarfinder_district_dictionary_v1", "aurs_rabat_first_party"],
  },
] as const;

function candidate(
  id: string,
  slug: string,
  display_name: string,
  normalized_name: string,
  aliases: string[],
  admin_parent_id: string | null,
  data_sources: RabatAuthoritySourceId[],
  context_availability: RabatContextAvailability = "not_assessed",
): RabatProductLocality {
  return {
    id, slug, city: "Rabat", display_name, normalized_name, aliases, admin_parent_id,
    taxonomy_status: "candidate", market_map_eligible: false,
    geometry_status: "unresolved", geometry_source: null, geometry_version: null,
    metrics_availability: "not_assessed", context_availability,
    activation_status: "blocked", fail_closed_reason: "taxonomy_candidate", data_sources,
  };
}

export const RABAT_PRODUCT_LOCALITY_CANDIDATES: readonly RabatProductLocality[] = [
  candidate("candidate_rabat_yacoub_el_mansour", "yacoub-el-mansour", "Yacoub El Mansour", "yacoub el mansour", ["Yaacoub El Mansour"], "admin_rabat_yacoub_el_mansour", ["hcp_rabat_admin_statistical_nomenclature", "akarfinder_district_dictionary_v1", "aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_youssoufia", "youssoufia", "Youssoufia", "youssoufia", [], "admin_rabat_youssoufia", ["hcp_rabat_admin_statistical_nomenclature", "aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_touarga", "touarga", "Touarga", "touarga", [], "admin_rabat_touarga", ["hcp_rabat_admin_statistical_nomenclature"]),
  candidate("candidate_rabat_les_orangers", "les-orangers", "Les Orangers", "les orangers", [], null, ["akarfinder_district_dictionary_v1"]),
  candidate("candidate_rabat_aviation", "aviation", "Aviation", "aviation", [], null, ["akarfinder_district_dictionary_v1", "aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_akkari", "akkari", "Akkari", "akkari", [], "admin_rabat_hassan", ["akarfinder_district_dictionary_v1", "aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_medina", "medina", "Medina", "medina", ["Médina"], null, ["akarfinder_district_dictionary_v1", "aurs_rabat_first_party", "commune_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_mabella", "mabella", "Mabella", "mabella", [], null, ["aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_takaddoum", "takaddoum", "Takaddoum", "takaddoum", [], null, ["aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_kbibat", "kbibat", "Kbibat", "kbibat", [], null, ["aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_douar_doum", "douar-doum", "Douar Doum", "douar doum", ["Douars Doum"], null, ["aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_el_kora", "el-kora", "El Kora", "el kora", [], null, ["aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_el_garaa", "el-garaa", "El Garaa", "el garaa", [], null, ["aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_al_boustane", "al-boustane", "Al Boustane", "al boustane", [], null, ["aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_hay_nahda", "hay-nahda", "Hay Nahda", "hay nahda", ["Hay Nahda I"], "admin_rabat_youssoufia", ["commune_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_diour_jamaa", "diour-jamaa", "Diour Jamaa", "diour jamaa", ["Diour Jamaâ", "Diour Jemaa", "Habous Diour Jamaa"], null, ["commune_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_oudayas", "oudayas", "Oudayas", "oudayas", ["Casbah des Oudayas", "Kasbah des Oudayas"], null, ["commune_rabat_first_party", "aurs_rabat_first_party"], "first_party_available"),
  candidate("candidate_rabat_mellah", "mellah", "Mellah", "mellah", [], null, ["aurs_rabat_first_party"], "first_party_available"),
] as const;

export const RABAT_ALL_PRODUCT_LOCALITIES: readonly RabatProductLocality[] = [
  ...RABAT_CERTIFIED_PRODUCT_LOCALITIES,
  ...RABAT_PRODUCT_LOCALITY_CANDIDATES,
];

export function getRabatProductLocality(id: string): RabatProductLocality | null {
  return RABAT_ALL_PRODUCT_LOCALITIES.find((locality) => locality.id === id) ?? null;
}

export function getRabatMapEligibleLocalities(): RabatProductLocality[] {
  return RABAT_CERTIFIED_PRODUCT_LOCALITIES.filter(
    (locality) => locality.taxonomy_status === "certified" && locality.market_map_eligible,
  );
}
