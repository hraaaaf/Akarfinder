import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {batchAudit} from '../../acquisition/feenway-primary-batch-v1.mjs';
const path=resolve(dirname(fileURLToPath(import.meta.url)),'../fixtures/feenway-primary-real-minimal-v2.json');
const source=JSON.parse(readFileSync(path,'utf8'));
test('12 observed public primary snippets; no commercial false positives',()=>{
 const x=batchAudit(source);
 assert.equal(x.rows.length,12);assert.equal(x.summary.rows,12);assert.equal(x.summary.db_writes,0);assert.equal(x.summary.published,0);
 assert.equal(x.summary.commercially_certified,0);
 assert.ok(x.rows.every(r=>r.eligible===false&&r.activity_verified===false&&r.reuse_rights_verified===false));
 assert.ok(x.rows.every(r=>!Object.hasOwn(r,'text')&&!Object.hasOwn(r,'description')&&!Object.hasOwn(r,'phone')));
});
test('duplicated original source identity quarantines ALL members',()=>{
 const x=batchAudit([source[0],{...source[0],feenway_id:987654321}]);
 assert.equal(x.summary.repeated_identity_rows,2);
 assert.ok(x.rows.every(r=>r.primary_gate==='quarantine_identity_collision'&&r.issues.includes('same_source_identity_repeated_in_batch')));
});
test('bad input is an explicit quarantine, not a guessed listing',()=>{
 const x=batchAudit([null,{source:'unknown',identity:'a:1234',text:'malformed'},source[0]]);
 assert.equal(x.rows.length,3);
 assert.ok(x.rows.slice(0,2).every(r=>r.eligible===false&&r.price_mad===null&&r.primary_gate.startsWith('quarantine')));
});
test('batch size bounded and deterministic on same evidence',()=>{
 assert.throws(()=>batchAudit([]),/batch_size/);
 assert.throws(()=>batchAudit(Array.from({length:1001},()=>source[0])),/batch_size/);
 assert.deepEqual(batchAudit(source),batchAudit(source));
});
test('economic cases and program routes stay outside admission',()=>{
 const item=source[0];
 const r=batchAudit([{...item,source_key:'pa:8399673',identity:'pa:8399673',
 original_url:item.original_url.replace('/a/','/pa/'),final_url:item.final_url.replace('/a/','/pa/')}]);
 assert.equal(r.rows[0].primary_gate,'review_program');assert.equal(r.rows[0].eligible,false);
});
