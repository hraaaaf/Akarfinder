import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve("supabase/migrations/20260831212000_avito_openserp_promotion_v1.sql"),
  "utf8",
);

function includes(fragment: string, message: string) {
  assert.ok(migration.includes(fragment), message);
}

for (const fragment of [
  "odm_avito_openserp_promotion_snapshot_v1",
  "odm_avito_openserp_city_v1",
  "odm_avito_openserp_candidates_v1",
  "odm_prepare_avito_openserp_promotion_v1",
  "odm_activate_avito_openserp_promotion_v1",
  "odm_rollback_avito_openserp_promotion_v1",
]) includes(fragment, `missing reversible contract: ${fragment}`);

for (const guard of [
  "d.source_domain='avito.ma'",
  "d.provider='openserp'",
  "p.authorization_status='unverified'",
  "p.acquisition_mode='public_index_internal_only'",
  "p.discovery_policy='public_index_only'",
  "p.display_policy='canonical_link_only'",
  "p.machine_gate='canonical_link_only'",
  "p.ingestion_gate='canonical_link_only'",
  "p.display_gate='external_tail_link_only'",
  "p.no_bypass_required is true",
  "'public_index'=any(p.allowed_discovery_channels)",
  "p.max_revalidation_interval_days",
  "approved_discovery",
  "admission_confidence",
  "strong_individual_path",
  "classification_lane_quarantine",
  "classification_lane_reject_out_of_scope",
  "classification_lane_discovery_page",
  "transaction_type_inconsistent",
  "odm_avito_openserp_city_v1(l.canonical_url) is not null",
  "odm_10e_type_from_url(l.canonical_url) is not null",
]) includes(guard, `missing fail-closed guard: ${guard}`);

for (const locality of [
  "fnideq","inzegan","b%C3%A9ni_mellal","berrechid","bouskoura_centre","chefchaouen",
  "dar_bouazza","errachidia","guelmim","had_soualem","ksar_el_kebir","larache","martil",
  "ouarzazate","settat","sidi_kacem","sidi_slimane","taza","tit_mellil","tiznit","youssoufia",
]) includes(`when '${locality}'`, `missing isolated locality mapping: ${locality}`);

for (const excluded of ["autre_secteur","hay_zaytoun","imarat","azib_derai","sma%C3%A2la"]) {
  assert.ok(!migration.includes(`when '${excluded}'`), `ambiguous locality must remain fail-closed: ${excluded}`);
}

for (const fragment of [
  "'fresh_confirmed'",
  "array['public_index_openserp']",
  "'method','recent_public_index_observation'",
  "'direct_source_fetch',false",
  "'no_detail_fetch',true",
  "'content_reuse',false",
  "title=null,snippet=null,price_mad=null,surface_m2=null",
  "normalized_price_mad=null,normalized_surface_m2=null,normalized_price_m2=null",
  "document_kind='LISTING'",
  "document_kind_confidence='HIGH'",
  "document_kind_version='odm_avito_detail_precision_v1'",
  "if v_after<>v_before+v_prepared",
]) includes(fragment, `missing activation safety contract: ${fragment}`);

assert.ok(!/create or replace function public\.odm03_recover_city/i.test(migration), "must not replace global city recovery");
assert.ok(!/create or replace function public\.odm04_normalize_city/i.test(migration), "must not replace global city normalization");
assert.ok(!/\b(insert|update|delete)\s+(into\s+|from\s+)?public\.property_listings\b/i.test(migration), "must not mutate property_listings");
assert.ok(!/\b(insert|update|delete)\s+(into\s+|from\s+)?public\.listing_sources\b/i.test(migration), "must not mutate listing_sources");
assert.ok(!/\b(fetch|curl|wget|http_get|net\.http)\s*\(/i.test(migration), "migration must not perform network access");
assert.ok(!/metadata\s*#>>\s*'\{external_index,title\}'/i.test(migration), "must not reuse title");
assert.ok(!/metadata\s*#>>\s*'\{external_index,snippet\}'/i.test(migration), "must not reuse snippet");

console.log("avito openserp promotion v1 contract: PASS");
