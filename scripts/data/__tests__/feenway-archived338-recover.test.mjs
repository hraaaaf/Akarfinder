import test from 'node:test';
import assert from 'node:assert/strict';
import {build,load} from '../feenway-archived338-recover.mjs';
test('recover actual 338 historical source records without fake freshness',()=>{
 const {rows,summary}=build(load());
 assert.equal(summary.rows,338);assert.equal(summary.distinct_original_source_identities,337);
 assert.equal(summary.strict_historical_five_fields,53);
 assert.equal(summary.strict_without_known_warning,50);
 assert.deepEqual([summary.signals60_identity_retained,summary.signals60_price_retained,summary.signals60_surface_retained,summary.signals60_both_retained],[55,30,43,18]);
 assert.ok(rows.every(x=>x.eligible_for_db===false&&x.current_availability_verified===false&&x.freshness_verified===false&&x.reuse_rights_verified===false));
});
test('unavailable and identity-lost sources never gain numeric fields',()=>{
 const {rows}=build(load());const partial=rows.filter(x=>x.evidence.includes('signal60')&&!x.identity_retained);
 assert.equal(partial.length,5);
 assert.ok(partial.every(x=>x.fields.price_number_mad===null&&x.fields.surface_number_m2===null));
 assert.equal(rows.filter(x=>x.source_portal===null).length,1);
});
test('fail-closed on duplicate source identity, contradictory rights and wrong corpus size',()=>{
 const sets=load(),dup=sets.map(s=>s.map(x=>({...x})));
 dup[1][0].rights_verified=true;
 assert.throws(()=>build(dup),/unsafe_full_claim/);
 const dup2=sets.map(s=>s.map(x=>({...x})));
 dup2[0][0].source_key=dup2[0][1].source_key;dup2[0][0].source=dup2[0][1].source;
 assert.throws(()=>build(dup2),/cross_id_source_collision/);
 assert.throws(()=>build([sets[0].slice(1),...sets.slice(1)]),/unexpected_input_size/);
});