#!/usr/bin/env -S npx tsx
import fs from "node:fs";
import {
  GEO_CITIES,
  GEO_NEIGHBORHOODS,
  normalizeGeoText,
  type CanonicalCityEntity,
  type CanonicalNeighborhoodEntity,
} from "../../lib/geo/geo-entity-registry";

type Candidate = {
  osm_type: string;
  osm_id: number;
  name?: string | null;
  "name:fr"?: string | null;
  "name:ar"?: string | null;
  alt_name?: string | null;
  official_name?: string | null;
  admin_level_8_containment?: {
    status: "HINT_ONLY";
    ambiguous: boolean;
    matches: Array<{
      osm_id: number;
      osm_source_type: string;
      name?: string | null;
      "name:fr"?: string | null;
      "name:ar"?: string | null;
      official_name?: string | null;
    }>;
  } | null;
};

type Inventory = {
  schema_version: number;
  source_control?: Record<string, unknown>;
  product_candidates: Candidate[];
};

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) throw new Error(`Missing ${name}`);
  return process.argv[i + 1];
}

function names(value: {
  name?: string | null;
  "name:fr"?: string | null;
  "name:ar"?: string | null;
  alt_name?: string | null;
  official_name?: string | null;
}): string[] {
  return Array.from(
    new Set(
      [value.name, value["name:fr"], value["name:ar"], value.alt_name, value.official_name]
        .filter((v): v is string => Boolean(v?.trim()))
        .map((v) => v.trim()),
    ),
  );
}

function cityVariants(city: CanonicalCityEntity): string[] {
  return Array.from(new Set([city.canonical_name, city.slug, ...city.aliases].map(normalizeGeoText).filter(Boolean)));
}

function adminCityMatches(candidate: Candidate): CanonicalCityEntity[] {
  const containment = candidate.admin_level_8_containment;
  if (!containment || containment.ambiguous || containment.matches.length !== 1) return [];
  const admin = containment.matches[0];
  const adminNames = names(admin).map(normalizeGeoText).filter(Boolean);
  return GEO_CITIES.filter((city) => {
    const variants = cityVariants(city);
    return adminNames.some((adminName) =>
      variants.some((variant) => adminName === variant || adminName.startsWith(`${variant} `)),
    );
  });
}

function neighborhoodVariants(n: CanonicalNeighborhoodEntity): string[] {
  return Array.from(new Set([n.canonical_name, n.slug, ...n.aliases].map(normalizeGeoText).filter(Boolean)));
}

function candidateMatchesNeighborhood(candidate: Candidate, n: CanonicalNeighborhoodEntity): boolean {
  const candidateNames = names(candidate).map(normalizeGeoText).filter(Boolean);
  const variants = neighborhoodVariants(n);
  return candidateNames.some((name) => variants.includes(name));
}

const inventoryPath = arg("--inventory");
const outPath = arg("--out");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8")) as Inventory;
if (inventory.schema_version !== 3) throw new Error(`Expected inventory schema v3, got ${inventory.schema_version}`);

const candidateContext = inventory.product_candidates.map((candidate) => ({
  candidate,
  cityMatches: adminCityMatches(candidate),
}));

const rows = GEO_NEIGHBORHOODS.map((neighborhood) => {
  const sameCity = candidateContext.filter(
    ({ candidate, cityMatches }) =>
      cityMatches.length === 1 &&
      cityMatches[0].slug === neighborhood.city_slug &&
      candidateMatchesNeighborhood(candidate, neighborhood),
  );

  const global = candidateContext.filter(({ candidate }) => candidateMatchesNeighborhood(candidate, neighborhood));
  const outsideCity = global.filter(
    ({ cityMatches }) => cityMatches.length !== 1 || cityMatches[0].slug !== neighborhood.city_slug,
  );

  let status:
    | "CANDIDATE_EXACT_MATCH"
    | "MULTI_SCALE_OSM_MATCH"
    | "AMBIGUOUS_CANDIDATE_MATCH"
    | "OUT_OF_CITY_NAME_COLLISION"
    | "NO_OSM_CANDIDATE_MATCH";

  if (sameCity.length === 1) status = "CANDIDATE_EXACT_MATCH";
  else if (sameCity.length > 1) {
    const scales = new Set(sameCity.map(({ candidate }) => candidate.place ?? "(none)"));
    status = scales.size > 1 ? "MULTI_SCALE_OSM_MATCH" : "AMBIGUOUS_CANDIDATE_MATCH";
  } else if (outsideCity.length > 0) status = "OUT_OF_CITY_NAME_COLLISION";
  else status = "NO_OSM_CANDIDATE_MATCH";

  const serialize = ({ candidate, cityMatches }: (typeof candidateContext)[number]) => ({
    osm_type: candidate.osm_type,
    osm_id: candidate.osm_id,
    place: candidate.place ?? null,
    names: names(candidate),
    admin8_city_matches: cityMatches.map((c) => ({ slug: c.slug, canonical_name: c.canonical_name })),
    admin8_containment: candidate.admin_level_8_containment ?? null,
  });

  return {
    canonical: {
      id: neighborhood.id,
      city_slug: neighborhood.city_slug,
      slug: neighborhood.slug,
      canonical_name: neighborhood.canonical_name,
      aliases: neighborhood.aliases,
      map_eligible: neighborhood.map_eligible,
      seo_eligible: neighborhood.seo_eligible,
    },
    status,
    exact_same_city_matches: sameCity.map(serialize),
    outside_or_unresolved_city_matches: outsideCity.map(serialize),
  };
});

const summary = {
  canonical_neighborhood_count: rows.length,
  exact_match_count: rows.filter((r) => r.status === "CANDIDATE_EXACT_MATCH").length,
  multi_scale_match_count: rows.filter((r) => r.status === "MULTI_SCALE_OSM_MATCH").length,
  ambiguous_match_count: rows.filter((r) => r.status === "AMBIGUOUS_CANDIDATE_MATCH").length,
  out_of_city_name_collision_count: rows.filter((r) => r.status === "OUT_OF_CITY_NAME_COLLISION").length,
  no_osm_candidate_match_count: rows.filter((r) => r.status === "NO_OSM_CANDIDATE_MATCH").length,
  candidates_with_unique_known_canonical_city: candidateContext.filter((x) => x.cityMatches.length === 1).length,
  candidates_with_ambiguous_known_canonical_city: candidateContext.filter((x) => x.cityMatches.length > 1).length,
  candidates_without_known_canonical_city: candidateContext.filter((x) => x.cityMatches.length === 0).length,
};

const candidateCountsByCanonicalCity = GEO_CITIES
  .map((city) => ({
    city_slug: city.slug,
    canonical_name: city.canonical_name,
    candidate_count: candidateContext.filter(
      ({ cityMatches }) => cityMatches.length === 1 && cityMatches[0].slug === city.slug,
    ).length,
    canonical_neighborhood_count: rows.filter((r) => r.canonical.city_slug === city.slug).length,
    exact_match_count: rows.filter(
      (r) => r.canonical.city_slug === city.slug && r.status === "CANDIDATE_EXACT_MATCH",
    ).length,
    unresolved_canonical_count: rows.filter(
      (r) => r.canonical.city_slug === city.slug && r.status !== "CANDIDATE_EXACT_MATCH",
    ).length,
  }))
  .filter((x) => x.candidate_count > 0 || x.canonical_neighborhood_count > 0)
  .sort((a, b) => b.candidate_count - a.candidate_count || a.canonical_name.localeCompare(b.canonical_name, "fr"));

const output = {
  schema_version: 2,
  source_inventory: {
    schema_version: inventory.schema_version,
    source_control: inventory.source_control ?? null,
  },
  evidence_role: "CANDIDATE_CROSSWALK_ONLY",
  activation_allowed: false,
  geometry_promotion_allowed: false,
  guardrails: [
    "Exact OSM name/alias + unique known admin8 city is only a candidate crosswalk, not taxonomy certification.",
    "No registry entity is added, removed, activated, or geometry-promoted by this artifact.",
    "MULTI_SCALE_OSM_MATCH preserves same-name OSM objects at different place scales instead of choosing one automatically.",
    "OUT_OF_CITY_NAME_COLLISION records generic same-name labels outside the canonical city without implying a city-scope error.",
    "OSM micro-zones remain discovery candidates until independent modern real-estate evidence supports them.",
  ],
  summary,
  candidate_counts_by_canonical_city: candidateCountsByCanonicalCity,
  rows,
};

fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
