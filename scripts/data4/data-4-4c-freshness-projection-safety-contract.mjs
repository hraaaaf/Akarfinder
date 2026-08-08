import assert from 'node:assert/strict';
import fs from 'node:fs';

const file = 'supabase/migrations/20260808113000_data_4_4c_freshness_projection_safety.sql';
const sql = fs.readFileSync(file, 'utf8').toLowerCase();

for (const required of [
  'create or replace function public.sync_thin_index_search_document_row()',
  "coalesce(new.metadata, '{}'::jsonb) - 'freshness_evidence'",
  "coalesce(old.metadata, '{}'::jsonb) - 'freshness_evidence'",
  'new.canonical_url is not distinct from old.canonical_url',
  'new.source_domain is not distinct from old.source_domain',
  'new.seed_provider is not distinct from old.seed_provider',
  'set freshness_status = new.freshness_status',
  'where seed_id = new.id',
  'return new;',
]) {
  assert.ok(sql.includes(required), `missing safety token: ${required}`);
}

const safetyStart = sql.indexOf('-- data-4.4c safety gate');
const rebuildStart = sql.indexOf("evidence_text := concat_ws");
assert.ok(safetyStart >= 0 && rebuildStart > safetyStart, 'freshness-only fast path must precede sparse-metadata rebuild');

const safetyBlock = sql.slice(safetyStart, rebuildStart);
for (const forbidden of [
  'title=',
  'snippet=',
  'normalized_city=',
  'normalized_property_type=',
  'normalized_intent=',
  'normalized_price_mad=',
  'normalized_surface_m2=',
  'quality_tier=',
  'quality_score=',
  'display_eligibility=',
  'delete from public.thin_index_search_documents',
]) {
  assert.ok(!safetyBlock.includes(forbidden), `freshness-only path must not mutate projection field: ${forbidden}`);
}

assert.ok(sql.includes("if tg_op = 'delete' then"), 'delete synchronization must remain');
assert.ok(sql.includes('on conflict (seed_id) do update set'), 'normal synchronization path must remain');

console.log('DATA-4.4C freshness projection safety contract passed');
