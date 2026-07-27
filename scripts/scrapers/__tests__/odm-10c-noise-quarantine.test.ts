import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  'supabase/migrations/20260727110000_odm_10c_noise_quarantine.sql',
  'utf8',
);

test('ODM-10C quarantines noise without deleting evidence', () => {
  assert.match(migration, /source_vertical_category_rules/);
  assert.match(migration, /vertical_classification/);
  assert.match(migration, /display_eligibility\s*=\s*case[\s\S]*'ineligible'/);
  assert.match(migration, /vertical_not_real_estate/);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.source_offer_seeds/i);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.thin_index_search_documents/i);
});

test('ODM-10C uses an explicit Avito real-estate allowlist', () => {
  for (const category of [
    'appartements',
    'locations_de_vacances',
    'terrains_et_fermes',
    'villas_et_riads',
    'local',
    'bureaux',
    'autre_immobilier',
    'maisons',
    'colocations',
    'maisons_et_villas',
    'chambre',
  ]) {
    assert.match(migration, new RegExp(`'avito\\.ma','${category}'`));
  }
});

test('ODM-10C report remains service-role only', () => {
  assert.match(migration, /revoke all on function public\.odm_10c_vertical_noise_report\(\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.odm_10c_vertical_noise_report\(\) to service_role/);
  assert.match(migration, /enable row level security/);
});
