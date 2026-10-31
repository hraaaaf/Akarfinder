#!/usr/bin/env node
// AkarFinder public RAW collector V1: one blocked origin NEVER stops other origins.
// Private local storage only. No DB, no credentials, no CAPTCHA bypass or retries.
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,open} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const HOSTS=new Set(['www.feenway.com','www.mubawab.ma','mubawab.ma','www.avito.ma','avito.ma','agenz.ma','www.masaken.ma','masaken.ma','yakeey.com','www.yakeey.com','sarouty.ma','www.sarouty.ma']);
export const SHA=b=>createHash('sha256').update(b).digest('hex');
export function safeURL(value) {
  if(typeof value!=='string'||value.length>750)return null;
  try{
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!HOSTS.has(u.hostname))return null;
    if(/\/(?:api|admin|auth|login|logout|account|profile|checkout|paiement|payment|samsar)(?:\/|$)/i.test(u.pathname))return null;
    if(u.hostname==='www.feenway.com'&&(!/^\/listings\/[1-9]\d{0,11}\/?$/.test(u.pathname)||u.search))return null;
    return u.href;
  }catch{return null}
}
export function robotAllowed(body,pathname) {
  if(typeof body!=='string'||body.length>150000)return false;
  let agents=[],rules=[],groups=[];
  const commit=()=>{if(agents.length)groups.push({agents,rules});agents=[];rules=[];};
  for(const source of body.split(/\r?\n/)){
    const line=source.replace(/#.*$/,'').trim(); if(!line)continue;
    const m=line.match(/^(user-agent|allow|disallow)\s*:\s*(.*)$/i);if(!m)continue;
    const name=m[1].toLowerCase(),value=m[2].trim();
    if(name==='user-agent'){if(rules.length)commit();agents.push(value.toLowerCase());}
    else if(agents.length)rules.push({name,value});
  }
  commit();
  let best=-1;for(const g of groups)for(const a of g.agents){const len=a==='*'?0:a==='akarfinder-raw-v1'?a.length:-1;if(len>best)best=len;}
  if(best<0)return true;
  let matched=false,allowed=true,matchLen=-1;
  for(const g of groups){
    const selected=g.agents.some(a=>(a==='*'&&best===0)||(a==='akarfinder-raw-v1'&&best>0));
    if(!selected)continue;
    for(const {name,value} of g.rules){
      if(value.includes('*')||value.includes('$'))return false; // ambiguous robots = skip site
      if(!value||!pathname.startsWith(value))continue;
      matched=true;
      if(value.length>matchLen||(value.length===matchLen&&name==='allow')){allowed=name==='allow';matchLen=value.length;}
    }
  }
  return matched?allowed:true;
}
function challenge(buf){
  const t=buf.subarray(0,14000).toString('utf8').toLowerCase();
  return /<title>\s*(?:just a moment|attention required|access denied|captcha challenge)/.test(t)
    || /cf-chl-setup|cf_chl_opt|g-recaptcha-response/.test(t);
}
async function grab(url,maxBytes=2200000) {
  const result=await fetch(url,{redirect:'manual',headers:{'User-Agent':'AkarFinder-RAW-V1 (+https://akarfinder.ma)','Accept':'text/html,text/plain'},signal:AbortSignal.timeout(20000)});
  if(result.status!==200)return{status:result.status,contentType:result.headers.get('content-type')||'',bytes:null};
  if(Number(result.headers.get('content-length')||0)>maxBytes)throw Error('body_too_large');
  const pieces=[];let bytes=0;
  for await(const chunk of result.body){bytes+=chunk.byteLength;if(bytes>maxBytes)throw Error('body_too_large');pieces.push(chunk);}
  return{status:200,contentType:result.headers.get('content-type')||'',bytes:Buffer.concat(pieces)};
}
export function plan(lines,limit=48) {
  if(!Number.isSafeInteger(limit)||limit<1||limit>60)throw Error('bad_limit');
  const hosts=new Map(),seen=new Set();
  for(const line of lines){
    const q=JSON.parse(line),url=safeURL(q.origin_url||q.url||q.feenway_url);
    if(!url||seen.has(url))continue;
    seen.add(url);const h=new URL(url).host;if(!hosts.has(h))hosts.set(h,[]);hosts.get(h).push(url);
  }
  const groups=[...hosts.values()],output=[];
  while(output.length<limit&&groups.some(a=>a.length))for(const q of groups)if(q.length&&output.length<limit)output.push(q.shift());
  return output;
}
export async function collect(targets,{folder,request=grab,pause=async()=>{},minIntervalMs=1200}={}) {
  if(!folder||!Array.isArray(targets)||targets.length>60)throw Error('bad_options');
  const rawDir=resolve(folder,'raw-private');await mkdir(rawDir,{recursive:true,mode:0o700});
  const states=new Map(),results=[];
  const summary={attempted:targets.length,stored:0,blocked_hosts:[],skipped:0,http_failures:0,db_writes:0,publications:0,raw_storage:'private_local_only'};
  for(const input of targets){
    const url=safeURL(input),u=url?new URL(url):null,host=u?.host;
    if(!url){results.push({status:'skipped_invalid_url'});summary.skipped++;continue;}
    if(states.get(host)?.blocked){results.push({url,status:'skipped_host_blocked'});summary.skipped++;continue;}
    if(!states.has(host)){
      let state={blocked:false,robots:null};
      try{
        const r=await request(u.origin+'/robots.txt',150000);
        if(r.status!==200||!r.bytes){state.blocked=true;state.reason='robots_unavailable';}
        else state.robots=r.bytes.toString('utf8');
      }catch{state.blocked=true;state.reason='robots_fetch_failure';}
      states.set(host,state);
    }
    const state=states.get(host);
    if(!state.blocked&&!robotAllowed(state.robots,u.pathname)){results.push({url,status:'skipped_robots_disallow'});summary.skipped++;continue;}
    if(state.blocked){results.push({url,status:'blocked_'+state.reason});summary.skipped++;continue;}
    if(minIntervalMs>0)await pause(minIntervalMs,host);
    try{
      const r=await request(url);
      if([401,403,429].includes(r.status)){state.blocked=true;state.reason='access_denied_'+r.status;results.push({url,status:'blocked_'+state.reason});summary.skipped++;continue;}
      if(r.status!==200){results.push({url,status:'http_'+r.status});summary.http_failures++;continue;}
      if(!/^text\/html\b|^application\/xhtml\+xml\b|^text\/plain\b/i.test(r.contentType)||!Buffer.isBuffer(r.bytes)||r.bytes.length>2200000||!r.bytes.length){results.push({url,status:'invalid_body'});summary.skipped++;continue;}
      if(challenge(r.bytes)){state.blocked=true;state.reason='challenge';results.push({url,status:'blocked_challenge'});summary.skipped++;continue;}
      const digest=SHA(r.bytes),file=resolve(rawDir,digest.slice(0,2),digest+'.html');
      await mkdir(resolve(rawDir,digest.slice(0,2)),{recursive:true,mode:0o700});
      try{const f=await open(file,'wx',0o600);await f.writeFile(r.bytes);await f.close();}catch(e){if(e.code!=='EEXIST')throw e;}
      results.push({url,status:'raw_stored',sha256:digest,bytes:r.bytes.length,relative_path:'raw-private/'+digest.slice(0,2)+'/'+digest+'.html',observed_at:new Date().toISOString()});summary.stored++;
    }catch(e){results.push({url,status:'request_failure'});summary.http_failures++;}
  }
  summary.blocked_hosts=[...states].filter(([_,v])=>v.blocked).map(([host,s])=>({host,reason:s.reason}));
  await writeFile(resolve(folder,'manifest.jsonl'),results.map(JSON.stringify).join('\n')+'\n',{flag:'wx',mode:0o600});
  await writeFile(resolve(folder,'summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
  return summary;
}
async function main(){
  const args=process.argv.slice(2);const opt=k=>args.find(a=>a.startsWith(k+'='))?.slice(k.length+1);
  const input=opt('--input'),folder=opt('--out'),limit=Number(opt('--limit')||48);
  if(!input||!folder)throw Error('usage: --input=path.jsonl --out=private-dir --limit=48');
  const lines=(await readFile(resolve(input),'utf8')).split(/\r?\n/).filter(Boolean);
  const targets=plan(lines,limit);
  console.log(JSON.stringify(await collect(targets,{folder,pause:ms=>new Promise(r=>setTimeout(r,ms))})));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('collector_failed:'+e.message);process.exitCode=1;});
