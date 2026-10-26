// Read-only invariants over the FeenWay 81 source-evidence snapshot.
// Never construe a green test as availability, physical uniqueness, or republication rights.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const evidence = resolve(dir, '../../../docs/data/feenway-canary81-source-fivefields-2026-10-26.jsonl');
const rows = readFileSync(evidence, 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
const count = gate => rows.filter(row => row.quality_gate === gate).length;

test('81 records, unique local and source identities', () => {
  assert.equal(rows.length, 81);
  assert.equal(new Set(rows.map(row => row.feenway_id)).size, 81);
  assert.equal(new Set(rows.map(row => row.original_source + '|' + row.original_identity)).size, 81);
});

test('closed, disjoint and conservative quality gates', () => {
  assert.equal(count('review_source_5of5_matches_feenway'), 49);
  assert.equal(count('review_incomplete_or_conflicting'), 27);
  assert.equal(count('review_economic_semantics'), 1);
  assert.equal(count('quarantine_source_unavailable'), 4);
  assert.equal(49 + 27 + 1 + 4, rows.length);
});

test('five-field matches require strict anchored primary source evidence', () => {
  for (const row of rows.filter(x => x.quality_gate === 'review_source_5of5_matches_feenway')) {
    assert.equal(row.source_id_in_final_url, true);
    assert.equal(row.source_five_fields_strict, true);
    assert.ok(row.source_city && row.source_district && row.transaction);
    assert.ok(row.source_price_mad > 0 && row.source_surface_m2 > 0);
    assert.equal(row.source_price_matches_feenway, true);
    assert.equal(row.source_surface_matches_feenway, true);
    assert.equal(row.source_city_matches_feenway_title, true);
  }
});

test('economic and source contradictions cannot pass the gate', () => {
  assert.equal(rows.find(x => x.feenway_id === 236104)?.quality_gate, 'review_economic_semantics');
  for (const id of [175135, 175793]) {
    const r = rows.find(x => x.feenway_id === id);
    assert.equal(r?.source_price_matches_feenway, false);
    assert.notEqual(r?.quality_gate, 'review_source_5of5_matches_feenway');
  }
  for (const id of [175135, 175793, 235644]) {
    assert.equal(rows.find(x => x.feenway_id === id)?.source_surface_matches_feenway, false);
  }
});

test('no observations are promoted to a commercial claim', () => {
  for (const row of rows) {
    assert.equal(row.publishable_certified, false);
    assert.equal(row.availability_verified, false);
    assert.equal(row.physically_unique_verified, false);
    assert.equal(row.rights_verified, false);
    assert.ok(!row.original_url.includes('/api/'));
  }
});

test('evidence dates are metadata only, not freshness proof', () => {
  const dated = rows.filter(x => x.source_date_metadata);
  assert.equal(dated.length, 35);
  assert.ok(dated.every(x => Number.isFinite(Date.parse(x.source_date_metadata))));
  assert.ok(dated.every(x => x.availability_verified === false));
});

test('do not assert physical uniqueness from equal four-field signatures', () => {
  const sig = new Map();
  for (const x of rows.filter(row => row.source_five_fields_strict)) {
    const key = [x.source_city, x.source_district, x.transaction, x.source_price_mad, x.source_surface_m2]
      .map(v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()).join('|');
    sig.set(key, [...(sig.get(key) ?? []), x.feenway_id]);
  }
  assert.deepEqual([...sig.values()].filter(g => g.length > 1), []);
  assert.ok(rows.every(x => x.physically_unique_verified === false));
});
