#!/usr/bin/env -S npx tsx
import fs from "node:fs";
import {
  GEO_CITIES,
  GEO_NEIGHBORHOODS,
  normalizeGeoText,
  type CanonicalCitySlug,
} from "../../lib/geo/geo-entity-registry";
import {
  CANONICAL_CITY_REGION,
  MOROCCO_REGIONS,
  getMoroccoRegion,
} from "../../lib/geo/morocco-region-registry";

type LocalityCenter = {
  osm_id: number;
  name?: string | null;
  "name:fr"?: string | null;
  "name:ar"?: string | null;
  place?: string | null;
  lat?: number | null;
  lon?: number | null;
};

type ProductCandidate = {
  osm_id: number;
  name?: string | null;
  "name:fr"?: string | null;
  "name:ar"?: string | null;
  place?: string | null;
  urban_locality_hint?: {
    status: "HINT_ONLY";
    name: string;
    place: string;
    osm_id: number;
    distance_km: number;
  } | null;
};

type Inventory = {
  schema_version: number;
  source_control?: Record<string, unknown>;
  urban_centers: LocalityCenter[];
  product_candidates: ProductCandidate[];
};

type Crosswalk = {
  schema_version: number;
  evidence_role: string;
  activation_allowed: boolean;
  geometry_promotion_allowed: boolean;
};

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) throw new Error(`Missing ${name}`);
  return process.argv[i + 1];
}

function names(row: LocalityCenter): string[] {
  return [row.name, row["name:fr"], row["name:ar"]]
    .filter((v): v is string => Boolean(v?.trim()))
    .map((v) => v.trim());
}

function matchesCanonicalCity(center: LocalityCenter): CanonicalCitySlug | null {
  const normalized = names(center).map(normalizeGeoText);
  const matches = GEO_CITIES.filter((city) => {
    const variants = [city.canonical_name, city.slug, ...city.aliases].map(normalizeGeoText);
    return normalized.some((n) => variants.includes(n));
  });
  return matches.length === 1 ? matches[0].slug : null;
}

const inventory = JSON.parse(fs.readFileSync(arg("--inventory"), "utf8")) as Inventory;
const crosswalk = JSON.parse(fs.readFileSync(arg("--crosswalk"), "utf8")) as Crosswalk;
const out = arg("--out");

if (inventory.schema_version !== 3) throw new Error(`Expected inventory schema v3, got ${inventory.schema_version}`);
if (crosswalk.schema_version !== 2 || crosswalk.evidence_role !== "CANDIDATE_CROSSWALK_ONLY") {
  throw new Error("Expected fail-closed canonical crosswalk v2");
}
if (crosswalk.activation_allowed || crosswalk.geometry_promotion_allowed) {
  throw new Error("Crosswalk unexpectedly allows activation or geometry promotion");
}

const centerClassifications = inventory.urban_centers.map((center) => {
  const citySlug = matchesCanonicalCity(center);
  if (citySlug) {
    return {
      osm_id: center.osm_id,
      name: center.name ?? center["name:fr"] ?? center["name:ar"] ?? null,
      place: center.place ?? null,
      role: "CANONICAL_CITY_HUB" as const,
      city_slug: citySlug,
      region_slug: CANONICAL_CITY_REGION[citySlug],
      publication: "VERIFIED_CANONICAL_IDENTITY" as const,
    };
  }

  return {
    osm_id: center.osm_id,
    name: center.name ?? center["name:fr"] ?? center["name:ar"] ?? null,
    place: center.place ?? null,
    role:
      center.place === "village"
        ? ("ATTACHMENT_CANDIDATE" as const)
        : ("SECONDARY_URBAN_CENTER_CANDIDATE" as const),
    city_slug: null,
    region_slug: null,
    publication: "EXCLUDED_FROM_NATIONAL_MAP_DETAIL" as const,
  };
});

const hubs = GEO_CITIES.map((city) => {
  const exactCenters = centerClassifications.filter(
    (x) => x.role === "CANONICAL_CITY_HUB" && x.city_slug === city.slug,
  );
  const candidateAttachments = inventory.product_candidates.filter((candidate) => {
    const hint = candidate.urban_locality_hint;
    if (!hint || hint.status !== "HINT_ONLY") return false;
    const normalizedHint = normalizeGeoText(hint.name);
    const variants = [city.canonical_name, city.slug, ...city.aliases].map(normalizeGeoText);
    return variants.includes(normalizedHint);
  });

  return {
    region_slug: CANONICAL_CITY_REGION[city.slug],
    region_name: getMoroccoRegion(CANONICAL_CITY_REGION[city.slug]).canonical_name,
    city: {
      id: city.id,
      slug: city.slug,
      canonical_name: city.canonical_name,
      role: "CANONICAL_CITY_HUB" as const,
      validation_status: city.validation_status,
      map_policy: "SHOW_AT_COUNTRY_OR_REGION_LEVEL" as const,
      exact_osm_center_count: exactCenters.length,
    },
    canonical_neighborhoods: GEO_NEIGHBORHOODS
      .filter((n) => n.city_slug === city.slug)
      .map((n) => ({
        id: n.id,
        slug: n.slug,
        canonical_name: n.canonical_name,
        map_eligible: n.map_eligible,
        status: n.validation_status === "validated" ? "VERIFIED_CANONICAL_IDENTITY" : "HOLD",
      })),
    locality_attachment_candidates: candidateAttachments.map((candidate) => ({
      osm_id: candidate.osm_id,
      name: candidate.name ?? candidate["name:fr"] ?? candidate["name:ar"] ?? null,
      place: candidate.place ?? null,
      status: "HINT_ONLY",
      reason: "nearest_named_osm_urban_center",
      distance_km: candidate.urban_locality_hint?.distance_km ?? null,
      map_policy: "DO_NOT_RENDER_AS_INDEPENDENT_COUNTRY_LABEL",
    })),
  };
});

const regions = MOROCCO_REGIONS.map((region) => ({
  slug: region.slug,
  canonical_name: region.canonical_name,
  source: "HCP_12_REGION_FRAMEWORK",
  city_hubs: hubs
    .filter((hub) => hub.region_slug === region.slug)
    .map((hub) => hub.city.slug),
}));

const summary = {
  region_count: regions.length,
  canonical_city_hub_count: hubs.length,
  canonical_neighborhood_count: GEO_NEIGHBORHOODS.length,
  canonical_city_hubs_with_exact_osm_center: hubs.filter((h) => h.city.exact_osm_center_count > 0).length,
  secondary_urban_center_candidate_count: centerClassifications.filter(
    (x) => x.role === "SECONDARY_URBAN_CENTER_CANDIDATE",
  ).length,
  attachment_candidate_center_count: centerClassifications.filter(
    (x) => x.role === "ATTACHMENT_CANDIDATE",
  ).length,
  locality_attachment_hint_count: hubs.reduce(
    (sum, hub) => sum + hub.locality_attachment_candidates.length,
    0,
  ),
};

const payload = {
  schema_version: 1,
  scope: "Morocco",
  evidence_role: "NATIONAL_USEFUL_INVENTORY_ONLY",
  source_control: inventory.source_control ?? null,
  activation_allowed: false,
  geometry_promotion_allowed: false,
  region_framework: {
    authority: "Haut-Commissariat au Plan / Morocco 12-region administrative framework",
    role: "NAVIGATION_AND_GROUPING",
    geometry_claim: "NONE",
  },
  map_policy: {
    country_level: "SHOW_CANONICAL_CITY_HUBS; SUPPRESS_SMALL_LOCALITY_LABEL_NOISE",
    region_level: "SHOW_CITY_HUBS; EXPOSE_ATTACHMENT_COUNTS_WITHOUT_SYNTHETIC_BOUNDARIES",
    city_level: "SHOW_ONLY_CANONICAL_NEIGHBORHOODS_WITH_SEPARATE_GEOMETRY_CERTIFICATION",
    neighborhood_level: "SHOW_VERIFIED_LANDMARKS_AND_ONLY_SOURCED_MICRO_SECTORS",
  },
  guardrails: [
    "Canonical city identity is not a claim about a city influence polygon.",
    "Small-locality attachment candidates are data relationships only; they do not create map boundaries.",
    "Nearest urban-center hints remain HINT_ONLY and are never promoted to verified membership by this inventory.",
    "Secondary urban centers remain excluded from national map detail until product relevance is reviewed.",
    "No Voronoi, radius, midpoint, buffer, inferred polygon, or manual gap closure is created.",
    "Neighborhood geometry remains governed by the independent fail-closed geometry certification pipeline.",
  ],
  summary,
  regions,
  city_hubs: hubs,
  locality_center_classifications: centerClassifications,
};

fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
