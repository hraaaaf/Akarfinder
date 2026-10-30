import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseJsonl,qualify,sha256} from '../../acquisition/feenway-n03c-canary-review.mjs';
const rows=parseJsonl(readFileSync('docs/data/feenway-canary81-source-fivefields-2026-10-26.jsonl','utf8'));
test('real 81: 53 strict; 49 matches; 47 without known economics; no promotion',()=>{
 const {summary,out,jsonl}=qualify(rows);
 assert.equal(summary.rows,81);assert.equal(summary.source_identifiers,81);
 assert.equal(summary.strict_five_fields,53);assert.equal(summary.numeric_matches,49);
 assert.equal(summary.numeric_matches_without_known_warning,47);
 assert.equal(summary.economic_warnings,3);assert.equal(summary.source_dates_metadata_only,35);
 assert.deepEqual(summary.queues,{quarantine_source_unavailable:4,review_economic_semantics:3,review_incomplete_or_conflicting:27,review_numeric_match_not_commercial:47});
 assert.equal(summary.review_jsonl_sha256,sha256(jsonl));
 assert.ok(out.every(x=>x.eligibility==='review_only'&&!x.eligible_for_db&&!x.publishable&&!x.proof_flags.availability_certified&&!x.proof_flags.reuse_rights_certified));
});
test('three explicit economic traps remain review only',()=>{
 const {out}=qualify(rows);
 for(const [id,flag] of [[233683,'price_is_per_square_meter'],[234551,'price_is_daily_short_stay'],[236104,'pas_de_porte_not_monthly_rent']]){
  const a=out.find(x=>x.feenway_id===id);assert.equal(a.proof_flags.explicit_economic_warning,flag);
  assert.equal(a.review_queue,'review_economic_semantics');
  assert.equal(a.proof_flags.economic_semantics_certified,false);
 }
});
test('reject duplicate IDs and original identities',()=>{
 assert.throws(()=>qualify([...rows,rows[0]]),/invalid_duplicate_feenway_id/);
 assert.throws(()=>qualify([{...rows[0]}, {...rows[1],original_identity:rows[0].original_identity,original_source:rows[0].original_source}]),/duplicate_original_identity/);
});
test('reject rights, availability and unsupported economic classifications',()=>{
 assert.throws(()=>qualify([{...rows[0],rights_verified:true}]),/unproven_gate/);
 assert.throws(()=>qualify([{...rows[0],availability_verified:true}]),/unproven_gate/);
 assert.throws(()=>qualify([{...rows[0],explicit_economic_semantic_flag:'other'}]),/unknown_economic_flag/);
 const u=rows.find(x=>x.quality_gate==='quarantine_source_unavailable');
 assert.throws(()=>qualify([{...u,source_page_retrieved:true}]),/source_retrieval_gate_conflict/);
});
test('malformed ledger, invalid dates and inflated gates fail closed',()=>{
 assert.throws(()=>parseJsonl(''),/empty_or_invalid_source/);
 assert.throws(()=>parseJsonl('{"a":}'),/jsonl_line_1/);
 assert.throws(()=>qualify([{...rows[0],source_date_metadata:'not-a-date'}]),/invalid_source_date/);
 assert.throws(()=>qualify([{...rows[0],quality_gate:'eligible'}]),/invalid_provenance_gate/);
});
