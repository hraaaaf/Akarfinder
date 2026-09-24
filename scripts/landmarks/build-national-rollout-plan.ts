#!/usr/bin/env -S npx tsx
import fs from "node:fs";

type CanonicalRow = {
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

type CitySummary = {
  city_slug: string;
  canonical_name: string;
  candidate_count: number;
  canonical_neighborhood_count: number;
  exact_match_count: number;
  unresolved_canonical_count: number;
};

type Crosswalk = {
  schema_version: number;
  source_inventory: Record<string, unknown>;
  evidence_role: string;
  activation_allowed: boolean;
  geometry_promotion_allowed: boolean;
  candidate_counts_by_canonical_city: CitySummary[];
  rows: CanonicalRow[];
};

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) throw new Error(`Missing ${name}`);
  return process.argv[i + 1];
}

const input = arg("--crosswalk");
const out = arg("--out");
const crosswalk = JSON.parse(fs.readFileSync(input, "utf8")) as Crosswalk;

if (crosswalk.schema_version !== 2) {
  throw new Error(`Expected crosswalk schema v2, got ${crosswalk.schema_version}`);
}
if (crosswalk.evidence_role !== "CANDIDATE_CROSSWALK_ONLY") {
  throw new Error("Crosswalk evidence role is not fail-closed");
}
if (crosswalk.activation_allowed || crosswalk.geometry_promotion_allowed) {
  throw new Error("Crosswalk must not allow activation or geometry promotion");
}

type RolloutState =
  | "REFERENCE_IMPLEMENTATION"
  | "CANONICAL_MATCHED"
  | "MIXED_CANONICAL_EVIDENCE"
  | "CANONICAL_GAP_REVIEW"
  | "DISCOVERY_ONLY";

function stateFor(city: CitySummary): RolloutState {
  if (city.city_slug === "casablanca") return "REFERENCE_IMPLEMENTATION";
  if (city.canonical_neighborhood_count === 0) return "DISCOVERY_ONLY";
  if (city.unresolved_canonical_count === 0 && city.exact_match_count > 0) return "CANONICAL_MATCHED";
  if (city.exact_match_count > 0) return "MIXED_CANONICAL_EVIDENCE";
  return "CANONICAL_GAP_REVIEW";
}

const stateOrder: Record<RolloutState, number> = {
  REFERENCE_IMPLEMENTATION: 0,
  CANONICAL_MATCHED: 1,
  MIXED_CANONICAL_EVIDENCE: 2,
  CANONICAL_GAP_REVIEW: 3,
  DISCOVERY_ONLY: 4,
};

function nextAction(state: RolloutState): string {
  switch (state) {
    case "REFERENCE_IMPLEMENTATION":
      return "Finish Casablanca product-boundary evidence using the reference doctrine, then reuse the certified process nationally.";
    case "CANONICAL_MATCHED":
      return "Collect independent modern product-geography evidence for each canonical neighborhood before any geometry promotion.";
    case "MIXED_CANONICAL_EVIDENCE":
      return "Resolve unresolved canonical neighborhoods first, while independently validating exact OSM matches as product geography.";
    case "CANONICAL_GAP_REVIEW":
      return "Resolve canonical taxonomy gaps with public product sources and official geography; OSM absence is not evidence of invalidity.";
    case "DISCOVERY_ONLY":
      return "Triage OSM micro-zones against independent real-estate/product sources before proposing any new canonical neighborhood.";
  }
}

const cities = crosswalk.candidate_counts_by_canonical_city.map((city) => {
  const rows = crosswalk.rows.filter((row) => row.canonical.city_slug === city.city_slug);
  const exact = rows.filter((row) => row.status === "CANDIDATE_EXACT_MATCH");
  const unresolved = rows.filter((row) => row.status !== "CANDIDATE_EXACT_MATCH");
  const state = stateFor(city);

  return {
    city_slug: city.city_slug,
    canonical_name: city.canonical_name,
    rollout_state: state,
    candidate_count: city.candidate_count,
    canonical_neighborhood_count: city.canonical_neighborhood_count,
    exact_match_count: city.exact_match_count,
    unresolved_canonical_count: city.unresolved_canonical_count,
    exact_canonical_neighborhoods: exact.map((row) => ({
      id: row.canonical.id,
      slug: row.canonical.slug,
      name: row.canonical.canonical_name,
    })),
    unresolved_canonical_neighborhoods: unresolved.map((row) => ({
      id: row.canonical.id,
      slug: row.canonical.slug,
      name: row.canonical.canonical_name,
      diagnostic: row.status,
    })),
    next_action: nextAction(state),
    activation_allowed: false,
    geometry_promotion_allowed: false,
  };
});

cities.sort(
  (a, b) =>
    stateOrder[a.rollout_state] - stateOrder[b.rollout_state] ||
    b.exact_match_count - a.exact_match_count ||
    a.canonical_name.localeCompare(b.canonical_name, "fr"),
);

const summary = {
  city_count: cities.length,
  reference_implementation_count: cities.filter((c) => c.rollout_state === "REFERENCE_IMPLEMENTATION").length,
  canonical_matched_count: cities.filter((c) => c.rollout_state === "CANONICAL_MATCHED").length,
  mixed_canonical_evidence_count: cities.filter((c) => c.rollout_state === "MIXED_CANONICAL_EVIDENCE").length,
  canonical_gap_review_count: cities.filter((c) => c.rollout_state === "CANONICAL_GAP_REVIEW").length,
  discovery_only_count: cities.filter((c) => c.rollout_state === "DISCOVERY_ONLY").length,
  unresolved_canonical_neighborhood_count: cities.reduce((sum, c) => sum + c.unresolved_canonical_count, 0),
};

const payload = {
  schema_version: 1,
  evidence_role: "ROLLOUT_PLAN_ONLY",
  source_crosswalk: {
    schema_version: crosswalk.schema_version,
    source_inventory: crosswalk.source_inventory,
  },
  activation_allowed: false,
  geometry_promotion_allowed: false,
  sequencing_rule:
    "REFERENCE_IMPLEMENTATION -> CANONICAL_MATCHED -> MIXED_CANONICAL_EVIDENCE -> CANONICAL_GAP_REVIEW -> DISCOVERY_ONLY",
  guardrails: [
    "Rollout state controls evidence work only; it does not certify a neighborhood or boundary.",
    "Candidate count is discovery workload, not a count of valid product neighborhoods.",
    "No city or neighborhood is added to the canonical registry by this plan.",
    "Exact OSM matches still require independent modern product-geography corroboration before geometry promotion.",
    "Unknown or unresolved cases remain explicit instead of being inferred from proximity or administrative containment alone.",
  ],
  summary,
  cities,
};

fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ summary, cities }, null, 2));
