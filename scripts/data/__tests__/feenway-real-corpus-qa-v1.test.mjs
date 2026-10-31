import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePrimary} from '../../acquisition/feenway-primary-parser-v1.mjs';
const input=resolve(dirname(fileURLToPath(import.meta.url)),'../fixtures/feenway-primary-real-minimal-v2.json');
const examples=JSON.parse(readFileSync(input,'utf8'));
const check=e=>parsePrimary({...e,identity:e.source_key});
test('12 observed primary blocks are read-only, not proof of availability',()=>{
 assert.equal(examples.length,12);
 for(const e of examples){const r=check(e);assert.equal(r.identity_verified,true,e.source_key);assert.equal(r.eligible,false);assert.equal(r.availability_verified,false);assert.equal(r.reuse_rights_verified,false);}
});
test('three Mubawab headlines are exact despite Unicode space and repeated price',()=>{
 const e={'a:8399673':[11000,90,'Casablanca','Casablanca Finance City'],'a:8403457':[7500,65,'Dar Bouazza',null],'a:8422270':[8100000,525,'Marrakech','Route Amizmiz']};
 for(const x of examples.filter(x=>x.source==='mubawab.ma')){const r=check(x);assert.deepEqual([r.price_mad,r.surface_m2,r.city,r.district],e[x.source_key],x.source_key);}
});
test('three Avito headers are exact without description or recommended ads',()=>{
 const e={'avito:58918533':[360000,52,'Casablanca','Sidi Bernoussi'],'avito:58673563':[570000,63,'Tanger','Tanja Balia'],'avito:58433605':[8000,180,'Casablanca','Mers Sultan']};
 for(const x of examples.filter(x=>x.source==='avito.ma')){const r=check(x);assert.deepEqual([r.price_mad,r.surface_m2,r.city,r.district],e[x.source_key],x.source_key);}
});
test('Agenz must retain transaction from its explicitly named vente route',()=>{
 for(const x of examples.filter(x=>x.source==='agenz.ma')){const r=check(x);assert.equal(r.transaction,'sale',x.source_key);assert.ok(r.price_mad>0&&r.surface_m2>0&&r.city&&r.district,x.source_key);}
});
test('Sarouty without primary price never borrows a recommended price',()=>{
 for(const x of examples.filter(x=>x.source==='sarouty.ma')){const r=check(x);assert.equal(r.price_mad,null);assert.equal(r.fields_5_present,false);}
});
test('Masaken daily price is not a normal monthly rent',()=>{
 const x=examples.find(x=>x.source_key==='masaken:15332');assert.ok(x);
 const r=check(x);assert.equal(r.price_mad,400);assert.equal(r.surface_m2,70);assert.equal(r.district,null);
 assert.ok(r.issues.includes('daily_or_nightly_rent'));assert.equal(r.price_period,null);
});
