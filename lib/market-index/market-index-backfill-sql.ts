// AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1 — SQL artifact generation.
// Pure string-building functions: given the eligibility computation, produce
// the exact transactional apply/verify/rollback SQL text. No I/O, no
// randomness -- the same input always produces byte-identical SQL, which is
// what makes --expected-plan-sha256 / SQL hash pinning meaningful.

import type { EligibleSourceOfferEnrichment } from "./market-index-backfill-plan";

function sqlString(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNumber(value: number | null): string {
  if (value === null) return "NULL";
  if (!Number.isFinite(value)) return "NULL";
  return String(value);
}

export function buildApplySql(runId: string, eligible: EligibleSourceOfferEnrichment[]): string {
  const lines: string[] = [];
  lines.push("-- AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1 -- generated apply SQL.");
  lines.push(`-- run_id: ${runId}`);
  lines.push(`-- eligible source offers: ${eligible.length}`);
  lines.push("-- Purely additive: UPDATE only on the 9 whitelisted listing_sources columns");
  lines.push("-- (no legacy column touched), INSERT only into property_clusters /");
  lines.push("-- property_cluster_members. No DELETE, no TRUNCATE, no DROP, no");
  lines.push("-- property_listings write, no observation, no discovery_candidate.");
  lines.push("");
  lines.push("BEGIN;");
  lines.push("");
  lines.push("SET LOCAL lock_timeout = '5s';");
  lines.push("SET LOCAL statement_timeout = '60s';");
  lines.push("");
  lines.push("-- Precondition: discovery_candidates and source_offer_observations must");
  lines.push("-- never receive a row from this script (it creates 0 of either, always --");
  lines.push("-- this check would only fire if some OTHER process wrote to them, which");
  lines.push("-- this run must never build on top of silently).");
  lines.push("-- Deliberately NOT a blanket 'property_clusters/property_cluster_members");
  lines.push("-- must be empty' check: that would make this script inherently unsafe to");
  lines.push("-- re-run (a legitimate second run of the SAME script would always find");
  lines.push("-- non-empty tables from its own first run and hard-fail). Idempotency for");
  lines.push("-- property_clusters/property_cluster_members is instead guaranteed per-row");
  lines.push("-- by ON CONFLICT DO NOTHING (INSERT) and a NULL-guarded WHERE clause");
  lines.push("-- (UPDATE) below, and reverified by the postcondition check at the end.");
  lines.push("DO $$");
  lines.push("DECLARE");
  lines.push("  existing_count integer;");
  lines.push("BEGIN");
  lines.push("  SELECT count(*) INTO existing_count FROM discovery_candidates;");
  lines.push("  IF existing_count <> 0 THEN");
  lines.push("    RAISE EXCEPTION 'PRECONDITION FAILED: discovery_candidates is not empty (% rows) -- this script never writes here, something else did', existing_count;");
  lines.push("  END IF;");
  lines.push("  SELECT count(*) INTO existing_count FROM source_offer_observations;");
  lines.push("  IF existing_count <> 0 THEN");
  lines.push("    RAISE EXCEPTION 'PRECONDITION FAILED: source_offer_observations is not empty (% rows) -- this script never writes here, something else did', existing_count;");
  lines.push("  END IF;");
  lines.push("END $$;");
  lines.push("");

  for (const item of eligible) {
    lines.push(`-- source offer ${item.listing_source_id} (property_listing ${item.property_listing_id})`);
    lines.push(
      `UPDATE listing_sources SET ` +
        `origin_type = ${sqlString(item.origin_type)}, ` +
        `content_fingerprint = ${sqlString(item.content_fingerprint)}, ` +
        `ingestion_run_id = ${sqlString(runId)}, ` +
        `displayed_price = ${sqlNumber(item.displayed_price)}, ` +
        `price_currency = ${sqlString(item.price_currency)}, ` +
        `price_period = ${sqlString(item.price_period)}, ` +
        `price_status = ${sqlString(item.price_status)} ` +
        `WHERE id = ${item.listing_source_id} ` +
        `AND origin_type IS NULL AND content_fingerprint IS NULL AND ingestion_run_id IS NULL ` +
        `AND displayed_price IS NULL AND price_currency IS NULL AND price_period IS NULL AND price_status IS NULL;`,
    );
    lines.push(
      `INSERT INTO property_clusters (id, cluster_origin, legacy_property_listing_id, created_by, notes) VALUES (` +
        `${sqlString(item.cluster_id)}, 'legacy_one_to_one_projection', ${item.property_listing_id}, ` +
        `'market-index-controlled-backfill-1', 'single-source legacy projection, run ${runId}') ` +
        `ON CONFLICT (legacy_property_listing_id) DO NOTHING;`,
    );
    lines.push(
      `INSERT INTO property_cluster_members (id, property_cluster_id, source_offer_id, added_by, origin_type) VALUES (` +
        `${sqlString(item.membership_id)}, ${sqlString(item.cluster_id)}, ${item.listing_source_id}, ` +
        `'market-index-controlled-backfill-1', 'legacy_one_to_one_projection') ` +
        `ON CONFLICT (property_cluster_id, source_offer_id) DO NOTHING;`,
    );
    lines.push("");
  }

  lines.push("-- Postcondition: rowcounts must exactly match the plan, or the whole run aborts.");
  lines.push("DO $$");
  lines.push("DECLARE");
  lines.push("  cluster_count integer;");
  lines.push("  member_count integer;");
  lines.push("BEGIN");
  lines.push("  SELECT count(*) INTO cluster_count FROM property_clusters;");
  lines.push(`  IF cluster_count <> ${eligible.length} THEN`);
  lines.push(`    RAISE EXCEPTION 'POSTCONDITION FAILED: expected % property_clusters, found %', ${eligible.length}, cluster_count;`);
  lines.push("  END IF;");
  lines.push("  SELECT count(*) INTO member_count FROM property_cluster_members;");
  lines.push(`  IF member_count <> ${eligible.length} THEN`);
  lines.push(`    RAISE EXCEPTION 'POSTCONDITION FAILED: expected % property_cluster_members, found %', ${eligible.length}, member_count;`);
  lines.push("  END IF;");
  lines.push("END $$;");
  lines.push("");
  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

export function buildVerifySql(runId: string, eligible: EligibleSourceOfferEnrichment[]): string {
  const lines: string[] = [];
  lines.push("-- AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1 -- verification SQL (read-only).");
  lines.push(`-- run_id: ${runId}`);
  lines.push("");
  lines.push(`select 'property_clusters' as table_name, count(*) as row_count from property_clusters`);
  lines.push(`union all select 'property_cluster_members', count(*) from property_cluster_members`);
  lines.push(`union all select 'discovery_candidates', count(*) from discovery_candidates`);
  lines.push(`union all select 'source_offer_observations', count(*) from source_offer_observations;`);
  lines.push("");
  lines.push("-- every cluster created by this run has exactly one membership");
  lines.push("select pc.id as cluster_id, count(pcm.id) as membership_count");
  lines.push("from property_clusters pc");
  lines.push("left join property_cluster_members pcm on pcm.property_cluster_id = pc.id");
  lines.push(`where pc.created_by = 'market-index-controlled-backfill-1'`);
  lines.push("group by pc.id");
  lines.push("having count(pcm.id) <> 1;");
  lines.push("");
  lines.push("-- no ambiguous multi-source group was clustered");
  lines.push("select property_listing_id, count(*) from listing_sources");
  lines.push(`where property_listing_id in (${eligible.map((e) => e.property_listing_id).join(", ") || "-1"})`);
  lines.push("group by property_listing_id");
  lines.push("having count(*) <> 1;");
  lines.push("");
  return lines.join("\n");
}

export function buildRollbackSql(runId: string, eligible: EligibleSourceOfferEnrichment[]): string {
  const lines: string[] = [];
  lines.push("-- AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1 -- rollback SQL.");
  lines.push(`-- run_id: ${runId}`);
  lines.push("-- Only deletes clusters/memberships created by this exact run, and only");
  lines.push("-- resets listing_sources columns whose current value still matches what");
  lines.push("-- this run wrote (never overwrites a later, independent modification).");
  lines.push("");
  lines.push("BEGIN;");
  lines.push("");
  lines.push(`DELETE FROM property_cluster_members WHERE added_by = 'market-index-controlled-backfill-1';`);
  lines.push(`DELETE FROM property_clusters WHERE created_by = 'market-index-controlled-backfill-1';`);
  lines.push("");
  for (const item of eligible) {
    lines.push(
      `UPDATE listing_sources SET origin_type = NULL, content_fingerprint = NULL, ingestion_run_id = NULL, ` +
        `displayed_price = NULL, price_currency = NULL, price_period = NULL, price_status = NULL ` +
        `WHERE id = ${item.listing_source_id} ` +
        `AND origin_type = ${sqlString(item.origin_type)} ` +
        `AND content_fingerprint = ${sqlString(item.content_fingerprint)} ` +
        `AND ingestion_run_id = ${sqlString(runId)} ` +
        `AND (displayed_price ${item.displayed_price === null ? "IS NULL" : `= ${sqlNumber(item.displayed_price)}`}) ` +
        `AND (price_currency ${item.price_currency === null ? "IS NULL" : `= ${sqlString(item.price_currency)}`}) ` +
        `AND (price_period ${item.price_period === null ? "IS NULL" : `= ${sqlString(item.price_period)}`}) ` +
        `AND price_status = ${sqlString(item.price_status)};`,
    );
  }
  lines.push("");
  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}
