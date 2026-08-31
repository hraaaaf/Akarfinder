import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const baseMigration = readFileSync(
  resolve("supabase/migrations/20260830230000_commoncrawl_recent_confirmation_v1.sql"),
  "utf8",
);
const normalizationMigration = readFileSync(
  resolve("supabase/migrations/20260830235900_commoncrawl_recent_confirmation_v1_1_normalization.sql"),
  "utf8",
);
const cityRecoveryMigration = readFileSync(
  resolve("supabase/migrations/20260831094500_commoncrawl_recent_confirmation_v1_2_city_recovery.sql"),
  "utf8",
);

function baseIncludes(fragment: string, message: string) {
  assert.ok(baseMigration.includes(fragment), message);
}
function normalizationIncludes(fragment: string, message: string) {
  assert.ok(normalizationMigration.includes(fragment), message);
}
function cityIncludes(fragment: string, message: string) {
  assert.ok(cityRecoveryMigration.includes(fragment), message);
}

baseIncludes("odm_commoncrawl_recent_confirmation_snapshot_v1", "reversible snapshot table is required");
baseIncludes("odm_prepare_commoncrawl_recent_confirmation_v1", "prepare function is required");
baseIncludes("odm_rollback_commoncrawl_recent_confirmation_v1", "rollback function is required");
baseIncludes("p_limit_per_source integer default 10", "canary must default to 10 rows per source");
baseIncludes("p_require_balanced boolean default true", "canary must default to balanced sources");

for (const domain of ["agenz.ma", "masaken.ma", "kawtarimmobilier.com"]) {
  baseIncludes(`'${domain}'`, `source allowlist must include ${domain}`);
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
  baseIncludes(guard, `missing fail-closed guard: ${guard}`);
}

for (const fragment of [
  "public.odm04_normalize_property_type(public.odm_10e_type_from_url(s.canonical_url))",
  "public.odm04_normalize_intent(public.odm_10e_intent_from_url(s.canonical_url))",
  "normalized_property_type = public.odm04_normalize_property_type(public.odm_10e_type_from_url(d.canonical_url))",
  "normalized_intent = public.odm04_normalize_intent(public.odm_10e_intent_from_url(d.canonical_url))",
  "d.normalized_property_type is distinct from public.odm04_normalize_property_type(public.odm_10e_type_from_url(d.canonical_url))",
  "d.normalized_intent is distinct from public.odm04_normalize_intent(public.odm_10e_intent_from_url(d.canonical_url))",
  "'canonical_dimensions',true",
]) {
  normalizationIncludes(fragment, `missing canonical normalization contract: ${fragment}`);
}

for (const [needle, label] of [
  ["dar[ -]?bouazza", "Dar Bouazza"],
  ["benslimane", "Benslimane"],
  ["bouznika", "Bouznika"],
] as const) {
  cityIncludes(needle, `missing safe city recovery for ${label}`);
  cityIncludes(`then '${label}'`, `missing canonical city value for ${label}`);
}
assert.ok(!/then\s+'M'?diq/i.test(cityRecoveryMigration), "ambiguous M'diq-Fnideq URL must remain fail-closed");

normalizationIncludes("freshness_status = 'fresh_confirmed'", "activation must explicitly confirm freshness");
normalizationIncludes("fresh_last_seen_at = s.last_observed_at", "freshness timestamp must come from persisted CDX observation");
normalizationIncludes("commoncrawl_recent_cdx", "dedicated freshness channel is required");
normalizationIncludes("'method','recent_cdx_200_html'", "freshness evidence method must be explicit");
normalizationIncludes("'no_detail_fetch',true", "freshness evidence must record no detail fetch");
normalizationIncludes("'content_reuse',false", "freshness evidence must record no content reuse");
normalizationIncludes("document_kind = 'LISTING'", "activation must require listing document kind");
normalizationIncludes("document_kind_confidence = 'HIGH'", "listing activation must remain HIGH confidence");
normalizationIncludes("if v_after <> v_before + v_prepared", "activation must assert exact strict-serving delta");

const combined = `${baseMigration}\n${normalizationMigration}\n${cityRecoveryMigration}`;
assert.ok(!/\b(insert|update|delete)\s+(into\s+|from\s+)?public\.property_listings\b/i.test(combined), "must not mutate property_listings");
assert.ok(!/\b(insert|update|delete)\s+(into\s+|from\s+)?public\.listing_sources\b/i.test(combined), "must not mutate listing_sources");
assert.ok(!/\b(fetch|curl|wget|http_get|net\.http)\s*\(/i.test(combined), "migrations must not perform network access");

console.log("commoncrawl recent confirmation v1.2 contract: PASS");
