import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve("supabase/migrations/20260830230000_commoncrawl_recent_confirmation_v1.sql"),
  "utf8",
);

function includes(fragment: string, message: string) {
  assert.ok(migration.includes(fragment), message);
}

includes("odm_commoncrawl_recent_confirmation_snapshot_v1", "reversible snapshot table is required");
includes("odm_prepare_commoncrawl_recent_confirmation_v1", "prepare function is required");
includes("odm_activate_commoncrawl_recent_confirmation_v1", "activation function is required");
includes("odm_rollback_commoncrawl_recent_confirmation_v1", "rollback function is required");
includes("p_limit_per_source integer default 10", "canary must default to 10 rows per source");
includes("p_require_balanced boolean default true", "canary must default to balanced sources");

for (const domain of ["agenz.ma", "masaken.ma", "kawtarimmobilier.com"]) {
  includes(`'${domain}'`, `source allowlist must include ${domain}`);
}

for (const guard of [
  "s.seed_provider = 'commoncrawl_cdx'",
  "s.freshness_status = 'seed_only'",
  "p.no_bypass_required is true",
  "p.policy_effective_at <= p_now",
  "p.policy_expires_at > p_now",
  "p.discovery_policy = 'public_index_only'",
  "p.display_policy = 'canonical_link_only'",
  "p.machine_gate = 'canonical_link_only'",
  "p.ingestion_gate = 'canonical_link_only'",
  "p.display_gate = 'external_tail_link_only'",
  "p.max_revalidation_interval_days",
  "status_codes_observed' ? '200'",
  "text/html%",
  "d.title is null",
  "d.snippet is null",
  "d.normalized_price_mad is null",
  "d.normalized_surface_m2 is null",
  "not exists (\n      select 1\n      from public.listing_sources",
]) {
  includes(guard, `missing fail-closed guard: ${guard}`);
}

includes("freshness_status = 'fresh_confirmed'", "activation must explicitly confirm freshness");
includes("fresh_last_seen_at = s.last_observed_at", "freshness timestamp must come from persisted CDX observation");
includes("commoncrawl_recent_cdx", "dedicated freshness channel is required");
includes("'method','recent_cdx_200_html'", "freshness evidence method must be explicit");
includes("'no_detail_fetch',true", "freshness evidence must record no detail fetch");
includes("'content_reuse',false", "freshness evidence must record no content reuse");
includes("document_kind = 'LISTING'", "activation must require listing document kind");
includes("document_kind_confidence = 'HIGH'", "listing activation must remain HIGH confidence");
includes("certified_detail_pattern_recent_cdx_200_html", "classification reason must bind URL pattern and CDX evidence");
includes("if v_after <> v_before + v_prepared", "activation must assert exact strict-serving delta");
includes("rollback_available',true", "activation must remain reversible");

assert.ok(!/\b(insert|update|delete)\s+(into\s+|from\s+)?public\.property_listings\b/i.test(migration), "must not mutate property_listings");
assert.ok(!/\b(insert|update|delete)\s+(into\s+|from\s+)?public\.listing_sources\b/i.test(migration), "must not mutate listing_sources");
assert.ok(!/\b(fetch|curl|wget|http_get|net\.http)\s*\(/i.test(migration), "migration must not perform network access");

console.log("commoncrawl recent confirmation v1 contract: PASS");
