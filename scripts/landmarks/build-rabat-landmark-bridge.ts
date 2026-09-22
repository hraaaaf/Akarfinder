#!/usr/bin/env -S npx tsx
import fs from "node:fs";
import { RABAT_ALL_PRODUCT_LOCALITIES } from "../../lib/geo/rabat-locality-registry";
import { getRabatLocalityGeometryDecision } from "../../lib/geo/rabat-locality-geometry-registry";
import { getRabatC8DPublicationReadiness } from "../../lib/geo/rabat-locality-publication-readiness";

type CrosswalkRow = {
  canonical: {
    id: string;
    city_slug: string;
    slug: string;
    canonical_name: string;
  };
  status:
    | "CANDIDATE_EXACT_MATCH"
    | "MULTI_SCALE_OSM_MATCH"
    | "AMBIGUOUS_CANDIDATE_MATCH"
    | "OUT_OF_CITY_NAME_COLLISION"
    | "NO_OSM_CANDIDATE_MATCH";
};

type Crosswalk = {
  schema_version: number;
  evidence_role: string;
  activation_allowed: boolean;
  geometry_promotion_allowed: boolean;
  rows: CrosswalkRow[];
};

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) throw new Error(`Missing ${name}`);
  return process.argv[i + 1];
}

const input = arg("--crosswalk");
const out = arg("--out");
const crosswalk = JSON.parse(fs.readFileSync(input, "utf8")) as Crosswalk;

if (crosswalk.schema_version !== 2) throw new Error(`Expected crosswalk schema v2, got ${crosswalk.schema_version}`);
if (crosswalk.evidence_role !== "CANDIDATE_CROSSWALK_ONLY") throw new Error("Unexpected crosswalk evidence role");
if (crosswalk.activation_allowed || crosswalk.geometry_promotion_allowed) throw new Error("Crosswalk is not fail-closed");

const rabatRows = crosswalk.rows.filter((row) => row.canonical.city_slug === "rabat");
const localities = new Map(RABAT_ALL_PRODUCT_LOCALITIES.map((locality) => [locality.id, locality]));

const rows = rabatRows.map((row) => {
  const locality = localities.get(row.canonical.id);
  if (!locality) {
    return {
      canonical: row.canonical,
      national_osm_diagnostic: row.status,
      registry_found: false,
      landmark_factory_verdict: "REGISTRY_GAP_HOLD",
      activation_allowed: false,
      product_boundary_promotion_allowed: false,
    };
  }

  const geometryDecision = getRabatLocalityGeometryDecision(locality.id);
  const readiness = getRabatC8DPublicationReadiness(locality.id);

  let geometryVerdict:
    | "ANALYTICAL_POLYGON_REFERENCE_ONLY"
    | "LEGACY_POINT_PROXY_NOT_PRODUCT_BOUNDARY"
    | "GEOMETRY_HOLD";

  if (geometryDecision.status === "certified") {
    geometryVerdict = "ANALYTICAL_POLYGON_REFERENCE_ONLY";
  } else if (locality.geometry_status === "point_proxy") {
    geometryVerdict = "LEGACY_POINT_PROXY_NOT_PRODUCT_BOUNDARY";
  } else {
    geometryVerdict = "GEOMETRY_HOLD";
  }

  const osmGapDoesNotDemoteTaxonomy =
    row.status === "NO_OSM_CANDIDATE_MATCH" && locality.taxonomy_status === "certified";

  return {
    canonical: row.canonical,
    national_osm_diagnostic: row.status,
    registry_found: true,
    registry: {
      taxonomy_status: locality.taxonomy_status,
      admin_parent_id: locality.admin_parent_id,
      market_map_eligible: locality.market_map_eligible,
      geometry_status: locality.geometry_status,
      geometry_source: locality.geometry_source,
      geometry_version: locality.geometry_version,
      activation_status: locality.activation_status,
      fail_closed_reason: locality.fail_closed_reason,
      data_sources: locality.data_sources,
    },
    c8_geometry: geometryDecision.status === "certified"
      ? {
          status: "certified",
          semantic_type: geometryDecision.certification.semanticType,
          official_boundary: geometryDecision.certification.officialBoundary,
          certification_status: geometryDecision.certification.certificationStatus,
          c8_public_activation: geometryDecision.certification.c8PublicActivation,
          source_market_zone_id: geometryDecision.certification.sourceMarketZoneId,
        }
      : {
          status: "unresolved",
          reason: geometryDecision.reason,
        },
    publication_readiness: readiness,
    bridge_rules: {
      osm_gap_does_not_demote_certified_taxonomy: osmGapDoesNotDemoteTaxonomy,
      market_map_eligibility_does_not_certify_product_boundary: true,
      point_proxy_is_not_product_boundary: locality.geometry_status === "point_proxy",
      analytical_market_zone_is_not_product_boundary:
        geometryDecision.status === "certified" && geometryDecision.certification.officialBoundary === false,
    },
    landmark_factory_verdict:
      locality.taxonomy_status !== "certified"
        ? "TAXONOMY_HOLD"
        : geometryVerdict,
    activation_allowed: false,
    product_boundary_promotion_allowed: false,
  };
});

const summary = {
  canonical_rabat_count: rows.length,
  registry_found_count: rows.filter((row) => row.registry_found).length,
  certified_taxonomy_count: rows.filter((row: any) => row.registry?.taxonomy_status === "certified").length,
  national_no_osm_match_count: rows.filter((row) => row.national_osm_diagnostic === "NO_OSM_CANDIDATE_MATCH").length,
  no_osm_but_registry_certified_count: rows.filter(
    (row: any) => row.bridge_rules?.osm_gap_does_not_demote_certified_taxonomy === true,
  ).length,
  analytical_reference_only_count: rows.filter(
    (row) => row.landmark_factory_verdict === "ANALYTICAL_POLYGON_REFERENCE_ONLY",
  ).length,
  point_proxy_reference_only_count: rows.filter(
    (row) => row.landmark_factory_verdict === "LEGACY_POINT_PROXY_NOT_PRODUCT_BOUNDARY",
  ).length,
  geometry_hold_count: rows.filter((row) => row.landmark_factory_verdict === "GEOMETRY_HOLD").length,
};

const output = {
  schema_version: 1,
  evidence_role: "RABAT_LANDMARK_BRIDGE_ONLY",
  activation_allowed: false,
  product_boundary_promotion_allowed: false,
  doctrine: [
    "National OSM discovery is supplementary and cannot demote certified Rabat taxonomy backed by stronger registry sources.",
    "Legacy point proxies are not product polygons.",
    "C8 certified analytical market-zone polygons have officialBoundary=false and remain reference-only for Landmark Factory product boundaries.",
    "Public/map eligibility in an older subsystem does not equal Landmark Factory boundary certification.",
  ],
  summary,
  rows,
};

fs.writeFileSync(out, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(output, null, 2));
