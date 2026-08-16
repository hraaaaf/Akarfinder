// C8B — Rabat locality registry.
// This module is taxonomy/provenance only. It is deliberately not wired into
// public map eligibility, Search ranking, C3 metrics, or runtime geo resolution.

export type RabatTaxonomyStatus = "certified" | "candidate" | "rejected";
export type RabatGeometryStatus = "certified_polygon" | "point_proxy" | "unresolved";

export type RabatAuthoritySourceId =
  | "akarfinder_geo_registry_v1"
  | "akarfinder_morocco_centroids_v1"
  | "hcp_rabat_admin_statistical_nomenclature"
  | "aurs_rabat_planning"
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
  data_sources: RabatAuthoritySourceId[];
};

/**
 * Official administrative/statistical context is kept separate from product
 * localities. Presence here never creates a public market neighborhood.
 */
export const RABAT_ADMIN_PARENTS: readonly RabatAdminParent[] = [
  {
    id: "admin_rabat_agdal_riyad",
    display_name: "Agdal Riyad",
    normalized_name: "agdal riyad",
    authority_kind: "hcp_admin_statistical_unit",
    source_id: "hcp_rabat_admin_statistical_nomenclature",
  },
  {
    id: "admin_rabat_hassan",
    display_name: "Hassan",
    normalized_name: "hassan",
    authority_kind: "hcp_admin_statistical_unit",
    source_id: "hcp_rabat_admin_statistical_nomenclature",
  },
  {
    id: "admin_rabat_souissi",
    display_name: "Souissi",
    normalized_name: "souissi",
    authority_kind: "hcp_admin_statistical_unit",
    source_id: "hcp_rabat_admin_statistical_nomenclature",
  },
  {
    id: "admin_rabat_yacoub_el_mansour",
    display_name: "Yacoub El Mansour",
    normalized_name: "yacoub el mansour",
    authority_kind: "hcp_admin_statistical_unit",
    source_id: "hcp_rabat_admin_statistical_nomenclature",
  },
  {
    id: "admin_rabat_youssoufia",
    display_name: "Youssoufia",
    normalized_name: "youssoufia",
    authority_kind: "hcp_admin_statistical_unit",
    source_id: "hcp_rabat_admin_statistical_nomenclature",
  },
  {
    id: "admin_rabat_touarga",
    display_name: "Touarga",
    normalized_name: "touarga",
    authority_kind: "hcp_admin_statistical_unit",
    source_id: "hcp_rabat_admin_statistical_nomenclature",
  },
] as const;

/**
 * Existing C0–C7 product entities are copied losslessly into the richer C8B
 * model. The current point proxies are explicitly not certified polygons.
 */
export const RABAT_CERTIFIED_PRODUCT_LOCALITIES: readonly RabatProductLocality[] = [
  {
    id: "district_rabat_agdal",
    city: "Rabat",
    display_name: "Agdal",
    normalized_name: "agdal",
    aliases: [],
    admin_parent_id: "admin_rabat_agdal_riyad",
    taxonomy_status: "certified",
    market_map_eligible: true,
    geometry_status: "point_proxy",
    geometry_source: "akarfinder_morocco_centroids_v1",
    geometry_version: "c0-c7-point-proxy",
    data_sources: ["akarfinder_geo_registry_v1", "akarfinder_morocco_centroids_v1", "hcp_rabat_admin_statistical_nomenclature"],
  },
  {
    id: "district_rabat_hay_riad",
    city: "Rabat",
    display_name: "Hay Riad",
    normalized_name: "hay riad",
    aliases: ["Hay Ryad", "Riad"],
    admin_parent_id: "admin_rabat_agdal_riyad",
    taxonomy_status: "certified",
    market_map_eligible: true,
    geometry_status: "point_proxy",
    geometry_source: "akarfinder_morocco_centroids_v1",
    geometry_version: "c0-c7-point-proxy",
    data_sources: ["akarfinder_geo_registry_v1", "akarfinder_morocco_centroids_v1", "hcp_rabat_admin_statistical_nomenclature"],
  },
  {
    id: "district_rabat_hassan",
    city: "Rabat",
    display_name: "Hassan",
    normalized_name: "hassan",
    aliases: [],
    admin_parent_id: "admin_rabat_hassan",
    taxonomy_status: "certified",
    market_map_eligible: true,
    geometry_status: "point_proxy",
    geometry_source: "akarfinder_morocco_centroids_v1",
    geometry_version: "c0-c7-point-proxy",
    data_sources: ["akarfinder_geo_registry_v1", "akarfinder_morocco_centroids_v1", "hcp_rabat_admin_statistical_nomenclature"],
  },
  {
    id: "district_rabat_souissi",
    city: "Rabat",
    display_name: "Souissi",
    normalized_name: "souissi",
    aliases: [],
    admin_parent_id: "admin_rabat_souissi",
    taxonomy_status: "certified",
    market_map_eligible: false,
    geometry_status: "unresolved",
    geometry_source: null,
    geometry_version: null,
    data_sources: ["akarfinder_geo_registry_v1", "hcp_rabat_admin_statistical_nomenclature"],
  },
  {
    id: "district_rabat_ocean",
    city: "Rabat",
    display_name: "Océan",
    normalized_name: "ocean",
    aliases: ["Ocean"],
    admin_parent_id: null,
    taxonomy_status: "certified",
    market_map_eligible: false,
    geometry_status: "unresolved",
    geometry_source: null,
    geometry_version: null,
    data_sources: ["akarfinder_geo_registry_v1"],
  },
] as const;

/**
 * Source-backed names that may become product localities only after product
 * semantics are reviewed. Candidate status never grants map eligibility.
 */
export const RABAT_PRODUCT_LOCALITY_CANDIDATES: readonly RabatProductLocality[] = [
  {
    id: "candidate_rabat_yacoub_el_mansour",
    city: "Rabat",
    display_name: "Yacoub El Mansour",
    normalized_name: "yacoub el mansour",
    aliases: ["Yaacoub El Mansour"],
    admin_parent_id: "admin_rabat_yacoub_el_mansour",
    taxonomy_status: "candidate",
    market_map_eligible: false,
    geometry_status: "unresolved",
    geometry_source: null,
    geometry_version: null,
    data_sources: ["hcp_rabat_admin_statistical_nomenclature"],
  },
  {
    id: "candidate_rabat_youssoufia",
    city: "Rabat",
    display_name: "Youssoufia",
    normalized_name: "youssoufia",
    aliases: [],
    admin_parent_id: "admin_rabat_youssoufia",
    taxonomy_status: "candidate",
    market_map_eligible: false,
    geometry_status: "unresolved",
    geometry_source: null,
    geometry_version: null,
    data_sources: ["hcp_rabat_admin_statistical_nomenclature"],
  },
  {
    id: "candidate_rabat_touarga",
    city: "Rabat",
    display_name: "Touarga",
    normalized_name: "touarga",
    aliases: [],
    admin_parent_id: "admin_rabat_touarga",
    taxonomy_status: "candidate",
    market_map_eligible: false,
    geometry_status: "unresolved",
    geometry_source: null,
    geometry_version: null,
    data_sources: ["hcp_rabat_admin_statistical_nomenclature"],
  },
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
