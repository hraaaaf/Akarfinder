import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,stat,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const folder=dirname(fileURLToPath(import.meta.url));
const cli=resolve(folder,'../../acquisition/listing-pulper-v1.mjs');
test('end-to-end RAW retention, dedup, JSON molds, no copied contacts', async()=>{
 const root=await mkdtemp(join(tmpdir(),'akar-pulper-test-'));
 try{
  const item={source:'mubawab.ma',source_identity:'a:8399673',source_url:'https://www.mubawab.ma/fr/a/8399673/detail',final_url:'https://www.mubawab.ma/fr/a/8399673/detail',observed_at:'2026-10-27T09:00:00Z',http_status:200,title:'Appartement à louer à Casablanca',markdown:'### 11 000 DH\n90m²\n### Casablanca Finance City à Casablanca\n### 11 000 DH\n90m²\n#### Contacter l\u0027annonceur\nAppelez +212612345678\n'};
  const input=join(root,'data.jsonl'),raw=join(root,'private'),out=join(root,'out');
  const line=JSON.stringify(item);await writeFile(input,line+'\n'+line+'\n');
  const r=spawnSync(process.execPath,[cli,'--input='+input,'--raw-private-dir='+raw,'--out='+out],{encoding:'utf8',timeout:12000});
  assert.equal(r.status,0,r.stderr);
  const meta=JSON.parse(await readFile(join(out,'summary.json'),'utf8'));
  assert.equal(meta.processed_snapshots,1);assert.equal(meta.duplicate_raw_events,1);assert.equal(meta.raw_private_created,1);assert.equal(meta.eligible_count,0);
  const rows=(await readFile(join(out,'molds.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(rows.length,1);assert.equal(rows[0].status.eligible,false);
  assert.ok(rows[0].provenance.snapshot_sha256);assert.ok(!JSON.stringify(rows[0]).includes('612345678'));
  const d=await readdir(raw),files=await readdir(join(raw,d[0]));assert.equal(files.length,1);
  const privateFile=join(raw,d[0],files[0]);assert.equal((await stat(privateFile)).mode & 0o777,0o600);
  assert.equal((await readFile(privateFile,'utf8')).trim(),line);
 }finally{await rm(root,{recursive:true,force:true})}
});