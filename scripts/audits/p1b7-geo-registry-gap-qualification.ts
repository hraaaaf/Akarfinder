#!/usr/bin/env tsx
// P1B.7 — Geo Registry Gap Qualification
// Read-only qualification of the P1B.6 explicit-district Registry gap.
// No DB/Registry mutation, no source-site request, no alias/entity creation,
// no fuzzy matching and no title/snippet inference.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { runP1B6GeoCoverageDepthAudit } from "@/scripts/audits/p1b6-geo-coverage-depth-audit";

const OUTPUT_PATH = join(process.cwd(), "data/audits/runtime/p1b7-geo-registry-gap-qualification.json");

type Entity = {
  id: string;
  entity_type: string;
  parent_id: string | null;
  canonical_name: string;
  normalized_name: string | null;
  validation_status: string;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export async function runP1B7GeoRegistryGapQualification() {
  const p1b6 = await runP1B6GeoCoverageDepthAudit();
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("geo_entities")
    .select("id,entity_type,parent_id,canonical_name,normalized_name,validation_status");
  if (error) throw new Error(`P1B.7 geo_entities read failed: ${error.message}`);

  const entities = (data ?? []) as Entity[];
  const entityById = new Map(entities.map((entity) => [entity.id, entity] as const));
  const validatedNeighborhoods = entities.filter(
    (entity) => entity.entity_type === "neighborhood" && entity.validation_status === "validated",
  );

  const rows = p1b6.explicit_district_gap.pairs.map((pair) => {
    const normalizedDistrict = normalize(pair.district);
    const exactEntities = validatedNeighborhoods.filter(
      (entity) =>
        normalize(entity.canonical_name) === normalizedDistrict ||
        normalize(entity.normalized_name) === normalizedDistrict,
    );
    const exactUnderCity = exactEntities.filter((entity) => {
      const parent = entity.parent_id ? entityById.get(entity.parent_id) : null;
      return (
        parent?.entity_type === "city" &&
        parent.validation_status === "validated" &&
        normalize(parent.canonical_name) === normalize(pair.city)
      );
    });

    let decision:
      | "REASSESS_EXISTING_ALIAS"
      | "EXISTING_ENTITY_ALIAS_GAP"
      | "REJECT_PROVIDER_BUCKET"
      | "PARENT_MISMATCH_REVIEW"
      | "PRIORITY_EXTERNAL_VALIDATION"
      | "SINGLE_SOURCE_REPEAT_NEEDS_AUTHORITY"
      | "SINGLETON_NEEDS_AUTHORITY";

    if (pair.confidence_one_alias_matches > 0) decision = "REASSESS_EXISTING_ALIAS";
    else if (exactUnderCity.length > 0) decision = "EXISTING_ENTITY_ALIAS_GAP";
    else if (normalizedDistrict.startsWith("autres ")) decision = "REJECT_PROVIDER_BUCKET";
    else if (exactEntities.length > 0) decision = "PARENT_MISMATCH_REVIEW";
    else if (pair.source_domains.length >= 2) decision = "PRIORITY_EXTERNAL_VALIDATION";
    else if (pair.rows >= 2) decision = "SINGLE_SOURCE_REPEAT_NEEDS_AUTHORITY";
    else decision = "SINGLETON_NEEDS_AUTHORITY";

    return {
      city: pair.city,
      district: pair.district,
      rows: pair.rows,
      source_domains: pair.source_domains,
      exact_validated_entity_name_matches: exactEntities.length,
      exact_validated_entity_under_city_matches: exactUnderCity.length,
      confidence_one_alias_matches: pair.confidence_one_alias_matches,
      decision,
    };
  });

  const decisionCounts = Object.fromEntries(
    [...new Set(rows.map((row) => row.decision))]
      .sort()
      .map((decision) => [
        decision,
        {
          pairs: rows.filter((row) => row.decision === decision).length,
          listing_rows: rows
            .filter((row) => row.decision === decision)
            .reduce((sum, row) => sum + row.rows, 0),
        },
      ]),
  );

  const report = {
    schema_version: "p1b7-geo-registry-gap-qualification-v1",
    generated_at: new Date().toISOString(),
    input_contract: "P1B.6 explicit-district unresolved Registry gap",
    contract: {
      read_only: true,
      db_mutation: false,
      registry_mutation: false,
      source_site_request: false,
      source_network_request: false,
      alias_creation: false,
      entity_creation: false,
      geo_resolution_write: false,
      fuzzy_matching: false,
      title_snippet_inference: false,
      commercial_recurrence_is_not_geo_truth: true,
    },
    p1b6_baseline: {
      eligible_listings: p1b6.search.eligible_listings,
      bridged_rows: p1b6.search.bridged_rows,
      currently_resolved: p1b6.search.currently_resolved,
      unresolved: p1b6.search.unresolved,
      explicit_district_rows: p1b6.explicit_district_gap.rows,
      explicit_district_pairs: p1b6.explicit_district_gap.distinct_city_district_pairs,
    },
    decision_counts: decisionCounts,
    rows,
    verdict: "EXTERNAL_AUTHORITY_REQUIRED_BEFORE_REGISTRY_WRITE",
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const invokedAsScript = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) {
  runP1B7GeoRegistryGapQualification().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
