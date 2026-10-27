#!/usr/bin/env node
// AkarFinder bounded encrypted public RAW canary; each restricted host is skipped, others continue.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes,createCipheriv,publicEncrypt,constants} from 'node:crypto';
import {HOSTS,safeURL,plan,robotAllowed} from './public-raw-collector-v1.mjs';

const sha256=b=>createHash('sha256').update(b).digest('hex');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function encryptSnapshot(body,pem,meta){
 if(!Buffer.isBuffer(body)||body.length<1||body.length>2200000)throw Error('bad_raw_bytes');
 const key=randomBytes(32),iv=randomBytes(12);
 const aes=createCipheriv('aes-256-gcm',key,iv);aes.setAAD(Buffer.from('AKARFINDER_RAW_V1'));
 const ciphertext=Buffer.concat([aes.update(body),aes.final()]);
 const encryptedKey=publicEncrypt({key:pem,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},key);
 return {schema:'AKARFINDER_RAW_ENCRYPTED_V1',url:meta.url,observed_at:meta.observed_at,content_type:meta.content_type,plaintext_sha256:sha256(body),plaintext_bytes:body.length,iv:iv.toString('base64'),tag:aes.getAuthTag().toString('base64'),wrapped_key:encryptedKey.toString('base64'),ciphertext:ciphertext.toString('base64')};
}
export async function request(url,max=2200000){
 const u=new URL(url),valid=u.pathname==='/robots.txt'?HOSTS.has(u.hostname)&&!u.search:safeURL(url)!==null;
 if(!valid||u.protocol!=='https:'||u.username||u.password)throw Error('invalid_url');
 const res=await fetch(url,{redirect:'manual',headers:{'User-Agent':'AkarFinder-RAW-V1 (+https://akarfinder.ma)','Accept':'text/html,text/plain'},signal:AbortSignal.timeout(16000)});
 if(res.status!==200)return {status:res.status,bytes:null,type:res.headers.get('content-type')||''};
 if(Number(res.headers.get('content-length')||0)>max)throw Error('body_too_large');
 const chunks=[];let size=0;
 for await(const part of res.body){size+=part.length;if(size>max)throw Error('body_too_large');chunks.push(part);}
 return {status:200,bytes:Buffer.concat(chunks),type:res.headers.get('content-type')||''};
}
export async function collectEncrypted(input,{folder,pem,fetcher=request,waiter=wait}={}){
 if(!Array.isArray(input)||input.length>48||!folder||!pem)throw Error('invalid_configuration');
 const status=new Map(),log=[],out=resolve(folder);await mkdir(out,{recursive:true});
 let captured=0;
 for(const u0 of input){
  const url=safeURL(u0);if(!url){log.push({status:'invalid_url'});continue;}
  const u=new URL(url),host=u.host;
  if(status.get(host)==='blocked'){log.push({url,status:'skipped_host_blocked'});continue;}
  if(!status.has(host)){
   try{const rr=await fetcher(u.origin+'/robots.txt',150000);
    status.set(host,rr.status===200&&rr.bytes?rr.bytes.toString('utf8'):'blocked');
   }catch{status.set(host,'blocked');}
  }
  if(status.get(host)==='blocked'){log.push({url,status:'robots_unavailable'});continue;}
  if(!robotAllowed(status.get(host),u.pathname)){log.push({url,status:'robots_denied'});continue;}
  await waiter(1600);
  try{
   const r=await fetcher(url);
   if([401,403,429].includes(r.status)){status.set(host,'blocked');log.push({url,status:'blocked_http_'+r.status});continue;}
   if(r.status!==200){log.push({url,status:'http_'+r.status});continue;}
   if(!Buffer.isBuffer(r.bytes)||!r.bytes.length||r.bytes.length>2200000||!/^text\/html\b|^application\/xhtml\+xml\b|^text\/plain\b/i.test(r.type)){log.push({url,status:'invalid_body'});continue;}
   const beginning=r.bytes.subarray(0,15000).toString('utf8').toLowerCase();
   if(/<title>\s*(?:just a moment|attention required|access denied|captcha challenge)|cf-chl-setup|cf_chl_opt|g-recaptcha-response/.test(beginning)){status.set(host,'blocked');log.push({url,status:'challenge'});continue;}
   const now=new Date().toISOString(),sealed=encryptSnapshot(r.bytes,pem,{url,observed_at:now,content_type:r.type}),file=sha256(url)+'.enc.json';
   await writeFile(resolve(out,file),JSON.stringify(sealed)+'\n',{flag:'wx',mode:0o600});
   captured++;log.push({url,status:'encrypted',sha256:sealed.plaintext_sha256,bytes:sealed.plaintext_bytes,artifact:file});
  }catch(e){log.push({url,status:'request_error'});}
 }
 const summary={schema:'AKARFINDER_ENCRYPTED_RAW_CANARY',requested:input.length,processed:log.length,encrypted:captured,skipped:log.length-captured,blocked_hosts:[...status].filter(x=>x[1]==='blocked').map(x=>x[0]),database_writes:0,production_publications:0};
 await writeFile(resolve(out,'manifest.jsonl'),log.map(JSON.stringify).join('\n')+'\n');
 await writeFile(resolve(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
 return summary;
}
async function main(){
 const path=resolve('docs/data/feenway-next238-origin-reconciled-neon-2026-10-27.jsonl');
 const rows=(await readFile(path,'utf8')).trim().split('\n');
 const targets=plan(rows,Number(process.env.AKAR_RAW_LIMIT||24));
 const pem=await readFile(resolve(dirname(fileURLToPath(import.meta.url)),'../../config/raw/akar_raw_public_2026-10-27.pem'),'utf8');
 console.log(JSON.stringify(await collectEncrypted(targets,{folder:resolve('.tmp/akar-encrypted-raw-canary'),pem})));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
