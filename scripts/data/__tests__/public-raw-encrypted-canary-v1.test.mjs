import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,privateDecrypt,createDecipheriv,constants} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {encryptSnapshot,collectEncrypted} from '../../acquisition/public-raw-encrypted-canary-v1.mjs';
const keys=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const M='https://www.mubawab.ma/fr/a/8441516/detail',A='https://www.avito.ma/fr/ville/appartement_58945147.htm';
const response=(status=200,bytes=Buffer.from('<html>Private RAW</html>'),type='text/html')=>({status,bytes,type});
const fetcher=(overrides={})=>async url=>url.endsWith('/robots.txt')?response(200,Buffer.from('User-agent: *\nAllow: /\n'),'text/plain'):(overrides[url]||response());
test('encrypt then recover raw byte-for-byte',()=>{
 const original=Buffer.from('RAW immobilier \n  \u00e9, 9000 DH; contenu brut');
 const item=encryptSnapshot(original,keys.publicKey,{url:M,observed_at:'2026-10-27T10:00:00Z',content_type:'text/html'});
 const key=privateDecrypt({key:keys.privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(item.wrapped_key,'base64'));
 const aes=createDecipheriv('aes-256-gcm',key,Buffer.from(item.iv,'base64'));
 aes.setAAD(Buffer.from('AKARFINDER_RAW_V1'));aes.setAuthTag(Buffer.from(item.tag,'base64'));
 const result=Buffer.concat([aes.update(Buffer.from(item.ciphertext,'base64')),aes.final()]);
 assert.deepEqual(result,original);assert.equal(item.plaintext_bytes,original.byteLength);
 assert.ok(!JSON.stringify(item).includes(original.toString()));
});
test('403 blocks Mubawab but Avito RAW is encrypted',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'akar-crypt-'));
 try{
  const s=await collectEncrypted([M,A],{folder:dir,pem:keys.publicKey,fetcher:fetcher({[M]:response(403,null)}),waiter:async()=>{}});
  assert.equal(s.encrypted,1);assert.deepEqual(s.blocked_hosts,['www.mubawab.ma']);assert.equal(s.database_writes,0);
  const d=(await readFile(join(dir,'manifest.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(d.map(x=>x.status),['blocked_http_403','encrypted']);
  const raw=await readFile(join(dir,d[1].artifact),'utf8');
  assert.equal(JSON.parse(raw).schema,'AKARFINDER_RAW_ENCRYPTED_V1');
  assert.ok(!raw.includes('<html>Private RAW</html>'));
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('robots ban blocks one domain only',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'akar-crypt-'));
 try{
  const f=async u=>u.includes('mubawab.ma')&&u.endsWith('/robots.txt')?response(200,Buffer.from('User-agent: *\nDisallow: /\n'),'text/plain'):fetcher()(u);
  const s=await collectEncrypted([M,A],{folder:dir,pem:keys.publicKey,fetcher:f,waiter:async()=>{}});
  assert.equal(s.encrypted,1);assert.equal(s.skipped,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('rate limit skips one domain; another continues',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'akar-crypt-'));
 try{
  const s=await collectEncrypted([M,A],{folder:dir,pem:keys.publicKey,fetcher:fetcher({[M]:response(429,null)}),waiter:async()=>{}});
  assert.equal(s.encrypted,1);assert.deepEqual(s.blocked_hosts,['www.mubawab.ma']);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('no plaintext or DB calls when all sources unavailable',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'akar-crypt-'));
 try{
  const s=await collectEncrypted([M,A],{folder:dir,pem:keys.publicKey,fetcher:fetcher({[M]:response(403,null),[A]:response(403,null)}),waiter:async()=>{}});
  assert.equal(s.encrypted,0);assert.equal(s.database_writes,0);
 }finally{await rm(dir,{recursive:true,force:true})}
});