import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const script=resolve(fileURLToPath(new URL('../../acquisition/feenway-n01-sitemap-audit.mjs',import.meta.url)));
const xml=(id)=>'<urlset><!-- é --><url><loc>https://www.feenway.com/listings/'+id+'</loc></url></urlset>';
const run=(bad=false)=>{
 const dir=mkdtempSync(join(tmpdir(),'feenway-n01-'));const out=join(dir,'report.json');
 const preload="globalThis.fetch=async url=>{const n=Number(url.match(/listings-(\\d)\\.xml/)[1]);if("+bad+"&&n===2)return new Response('down',{status:503});const id=n%2+100;return new Response('<urlset><!-- é --><url><loc>https://www.feenway.com/listings/'+id+'</loc></url></urlset>',{status:200,headers:{'content-type':'application/xml'}})}";
 const process=spawnSync(globalThis.process.execPath,['--import','data:text/javascript,'+encodeURIComponent(preload),script,out],{encoding:'utf8',timeout:10000});
 const report=JSON.parse(readFileSync(out,'utf8'));rmSync(dir,{recursive:true,force:true});return {process,report};
};
test('six XML: bytes SHA-256, deduplication and read-only URL bounds',()=>{
 const {process,report}=run();
 assert.equal(process.status,0,process.stderr);assert.equal(report.complete,true);
 assert.equal(report.files.length,6);assert.equal(report.unique_listing_urls,2);assert.equal(report.duplicate_urls,4);
 assert.equal(report.files[0].raw_sha256,createHash('sha256').update(Buffer.from(xml(100))).digest('hex'));
});
test('HTTP 503 fails closed and retains error report',()=>{
 const {process,report}=run(true);
 assert.equal(process.status,1,process.stderr);assert.equal(report.complete,false);
 assert.equal(report.errors.length,1);assert.equal(report.files.length,5);
});
