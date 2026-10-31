// FeenWay historical overlap snapshot QA — read-only and never a physical dedup certificate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const data=resolve(here,'../../../docs/data/feenway-canary47-neon-historical-overlap-2026-10-26.jsonl');
const rows=readFileSync(data,'utf8').trim().split('\n').map(JSON.parse);
const has=(field)=>rows.filter(r=>Number(r[field])>0).length;

test('47 distinct references and correct archived context',()=>{
  assert.equal(rows.length,47);
  assert.equal(new Set(rows.map(r=>r.feenway_id)).size,47);
  assert.equal(new Set(rows.map(r=>r.origin_source+'|'+r.origin_identity)).size,47);
  assert.ok(rows.every(r=>r.archive_branch==='br-cold-mouse-b2a50yaa' && r.archive_properties_snapshot===151900));
});
test('exact overlap absent only in this historical snapshot',()=>{
  assert.ok(rows.every(r=>r.exact_identity_or_url_found===false));
});
test('weak and approximate signature matches are bounded by their gates',()=>{
  assert.equal(has('weak_city_transaction_price_area_5pct'),37);
  assert.equal(has('near_same_district_5pct'),10);
  assert.equal(has('high_near_same_district_2pct'),6);
  for(const r of rows){
    assert.ok(r.high_near_same_district_2pct<=r.near_same_district_5pct);
    assert.ok(r.near_same_district_5pct<=r.weak_city_transaction_price_area_5pct);
    const expected=r.high_near_same_district_2pct>0?'high_similarity_review'
      :r.near_same_district_5pct>0?'same_district_similarity_review'
      :r.weak_city_transaction_price_area_5pct>0?'city_price_area_similarity_review'
      :'no_weak_signature_match_observed';
    assert.equal(r.duplicate_review_gate,expected);
  }
});
test('unverified dates never become commercial or legal certification',()=>{
  assert.equal(rows.filter(r=>r.source_date_metadata).length,29);
  assert.ok(rows.every(r=>r.availability_verified===false && r.physical_duplicate_verified===false && r.rights_verified===false && r.eligibility_certified===false));
});
