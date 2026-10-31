import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {safeURL,robotAllowed,plan,collect} from '../../acquisition/public-raw-collector-v1.mjs';
const M='https://www.mubawab.ma/fr/a/8441516/detail',M2='https://www.mubawab.ma/fr/a/8441517/detail';
const A='https://www.avito.ma/fr/ville/appartements/test_58945147.htm',A2='https://www.avito.ma/fr/ville/appartements/test_58945148.htm';
const ROBOTS=Buffer.from('User-agent: *\nAllow: /\nDisallow: /api/\n');
const page=Buffer.from('<html><title>Appartement</title><h1>Fiche publique</h1></html>');
const response=(status=200,bytes=page,contentType='text/html')=>({status,bytes,contentType});
const fetcher=overrides=>async url=>url.endsWith('/robots.txt')?response(200,ROBOTS,'text/plain'):(overrides[url]??response());

test('URL public allowlist excludes auth and restricted routes',()=>{
 assert.equal(safeURL(M),M);
 for(const url of ['https://user:pass@www.avito.ma/test','https://www.mubawab.ma/api/private','http://www.mubawab.ma/fr/a/8441516','https://evil.example.com/listings/12345'])assert.equal(safeURL(url),null);
});
test('robots path-specific allow and forbid',()=>{
 assert.equal(robotAllowed(ROBOTS.toString(),'/fr/a/8441516'),true);
 assert.equal(robotAllowed(ROBOTS.toString(),'/api/private'),false);
 assert.equal(robotAllowed('User-agent: *\nDisallow: /','/fr/a/8441516'),false);
 assert.equal(robotAllowed('User-agent: *\nAllow: /\nDisallow: /*','/fr/a/8441516'),false);
});
test('round-robin and duplicate input removal',()=>{
 assert.deepEqual(plan([{origin_url:M},{origin_url:M2},{origin_url:A},{origin_url:A}].map(JSON.stringify),4),[M,A,M2]);
 assert.throws(()=>plan([JSON.stringify({origin_url:M})],100));
});
test('403 blocks only affected host, RAW of other host is private',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'akar-raw-'));
 try{
  const s=await collect([M,M2,A],{folder:dir,request:fetcher({[M]:response(403,null)}),pause:async()=>{},minIntervalMs:0});
  assert.equal(s.stored,1);assert.equal(s.blocked_hosts[0].host,'www.mubawab.ma');
  const list=(await readFile(join(dir,'manifest.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(list.map(x=>x.status),['blocked_access_denied_403','skipped_host_blocked','raw_stored']);
  assert.equal((await stat(join(dir,'raw-private'))).mode&0o777,0o700);
  assert.equal((await stat(resolve(dir,list[2].relative_path))).mode&0o777,0o600);
  assert.deepEqual(await readFile(resolve(dir,list[2].relative_path)),page);
  assert.equal(s.db_writes,0);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('429 isolates source without stopping others',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'akar-raw-'));
 try{const s=await collect([A,A2,M],{folder:dir,request:fetcher({[A]:response(429,null)}),pause:async()=>{},minIntervalMs:0});assert.equal(s.stored,1);assert.equal(s.blocked_hosts[0].host,'www.avito.ma');}
 finally{await rm(dir,{recursive:true,force:true})}
});
test('HTTP 200 captcha challenge isolates host',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'akar-raw-'));
 try{
  const c=Buffer.from('<html><title>Just a moment...</title>captcha</html>');
  const s=await collect([A,A2,M],{folder:dir,request:fetcher({[A]:response(200,c)}),pause:async()=>{},minIntervalMs:0});
  assert.equal(s.stored,1);assert.deepEqual(s.blocked_hosts.map(x=>x.host),['www.avito.ma']);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('robots single URL exclusion does not block remaining paths',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'akar-raw-'));
 try{
  const req=async url=>url.endsWith('/robots.txt')?response(200,Buffer.from('User-agent: *\nAllow: /\nDisallow: /fr/a/8441516\n'),'text/plain'):response();
  const s=await collect([M,M2,A],{folder:dir,request:req,pause:async()=>{},minIntervalMs:0});
  assert.equal(s.stored,2);assert.equal(s.blocked_hosts.length,0);
  const rows=(await readFile(join(dir,'manifest.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(rows[0].status,'skipped_robots_disallow');assert.equal(rows[1].status,'raw_stored');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('404, 503 logged; other public source continues',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'akar-raw-'));
 try{
  const s=await collect([M,M2,A],{folder:dir,request:fetcher({[M]:response(404,null),[M2]:response(503,null)}),pause:async()=>{},minIntervalMs:0});
  assert.equal(s.stored,1);assert.equal(s.http_failures,2);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('robots unavailable blocks one host, not entire run',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'akar-raw-'));
 try{
  const req=async url=>url==='https://www.mubawab.ma/robots.txt'?response(500,null):url.endsWith('/robots.txt')?response(200,ROBOTS,'text/plain'):response();
  const s=await collect([M,A],{folder:dir,request:req,pause:async()=>{},minIntervalMs:0});
  assert.equal(s.stored,1);assert.equal(s.blocked_hosts[0].host,'www.mubawab.ma');
 }finally{await rm(dir,{recursive:true,force:true})}
});
