// Immutable FeenWay 238 source-link canary gate. Read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../docs/data');
const file=resolve(root,'feenway-next238-origin-reconciled-neon-2026-10-27.jsonl');
const rows=readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const count=gate=>rows.filter(x=>x.quality_gate===gate).length;
test('238 unique FeenWay IDs and no source-key repetition',()=>{
 assert.equal(rows.length,238);
 assert.equal(new Set(rows.map(x=>x.feenway_id)).size,238);
 const keyed=rows.filter(x=>x.source_key).map(x=>x.source+'|'+x.source_key);
 assert.equal(keyed.length,237);
 assert.equal(new Set(keyed).size,237);
});
test('source origin and mutually exclusive quality gates',()=>{
 assert.equal(count('review_identity_absent_from_checked_snapshots'),231);
 assert.equal(count('review_previously_known_reference'),2);
 assert.equal(count('review_program_route'),4);
 assert.equal(count('quarantine_missing_source_link'),1);
 assert.equal(231+2+4+1,238);
 assert.ok(rows.filter(x=>x.quality_gate==='review_identity_absent_from_checked_snapshots').every(x=>x.origin_url&&!x.program_route&&!x.overlap_neon_archive_source_key&&!x.overlap_prior_canary100));
});
test('known snapshot source IDs cannot be treated as new',()=>{
 assert.deepEqual(rows.filter(x=>x.overlap_neon_archive_source_key).map(x=>x.feenway_id).sort((a,b)=>a-b),[191671,220237]);
 assert.ok(rows.every(x=>x.overlap_neon_archive_exact_url===false));
 assert.ok(rows.every(x=>x.overlap_prior_canary100===false));
});
test('no link, program and economic unknowns never become eligible',()=>{
 assert.equal(rows.filter(x=>!x.origin_url).length,1);
 assert.equal(rows.filter(x=>x.program_route).length,4);
 assert.ok(rows.every(x=>x.eligible===false && x.source_page_checked===false && x.five_fields_checked===false));
 assert.ok(rows.every(x=>x.availability_verified===false && x.physically_unique_verified===false && x.reuse_rights_verified===false));
 assert.ok(rows.every(x=>x.origin_url===null||/^https:\/\/(?:www\.)?(mubawab\.ma|avito\.ma|agenz\.ma|masaken\.ma|yakeey\.com|sarouty\.ma|domio\.ma)\//i.test(x.origin_url)));
});
