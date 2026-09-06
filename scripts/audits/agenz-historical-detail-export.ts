import fs from 'node:fs/promises';
import path from 'node:path';
import { classifyReservoirCandidate } from '../data-mass/reservoir-qualification';

const OUT=process.env.AGENZ_EXPORT_OUT??'.tmp/agenz-historical-detail-export';
const PAGE=1000;
function env(n:string){const v=process.env[n];if(!v)throw new Error(`missing ${n}`);return v;}
const canon=(raw:string)=>{try{const u=new URL(raw);u.hash='';u.hostname=u.hostname.toLowerCase().replace(/^www\./,'');if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,'');return u.toString();}catch{return raw.trim();}};
async function rest<T>(table:string,params:Record<string,string>):Promise<T[]>{const u=new URL(`/rest/v1/${table}`,env('SUPABASE_URL'));for(const[k,v]of Object.entries(params))u.searchParams.set(k,v);const key=env('SUPABASE_SERVICE_ROLE_KEY');for(let a=1;a<=3;a++){const r=await fetch(u,{headers:{apikey:key,authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)});if(r.ok)return r.json() as Promise<T[]>;const body=await r.text();if(a===3||!(r.status===429||r.status>=500))throw new Error(`${table} ${r.status} ${body}`);await new Promise(res=>setTimeout(res,500*a));}return[];}
type D={id:string,source_domain:string,source_url:string,canonical_url:string|null,title:string|null,snippet:string|null,discovery_query:string|null,content_fingerprint:string|null,last_seen_at:string|null};

async function main(){
  const uniq=new Map<string,D>();
  let last='';
  for(;;){
    const q:Record<string,string>={select:'id,source_domain,source_url,canonical_url,title,snippet,discovery_query,content_fingerprint,last_seen_at',order:'id.asc',limit:String(PAGE)};
    if(last)q.id=`gt.${last}`;
    const p=await rest<D>('discovery_candidates',q);
    for(const r of p){
      if((r.source_domain||'').trim().toLowerCase().replace(/^www\./,'')!=='agenz.ma')continue;
      const raw=r.canonical_url||r.source_url;if(!raw)continue;
      const u=canon(raw);const e=uniq.get(u);
      if(!e||(r.last_seen_at??'')>(e.last_seen_at??''))uniq.set(u,r);
    }
    if(p.length<PAGE)break;
    const n=p.at(-1)?.id;if(!n||n===last)throw new Error('keyset stalled');last=n;
  }
  const details:string[]=[];
  for(const [url,r] of uniq){
    const c=classifyReservoirCandidate({sourceDomain:'agenz.ma',url,title:r.title,snippet:r.snippet,discoveryQuery:r.discovery_query,contentFingerprint:r.content_fingerprint});
    if(c.likelyRealEstate&&c.pageKind==='LIKELY_LISTING_DETAIL'&&c.geographyScope==='MOROCCO_LIKELY')details.push(url);
  }
  details.sort();
  await fs.mkdir(OUT,{recursive:true});
  await fs.writeFile(path.join(OUT,'agenz-historical-detail-urls.txt'),details.join('\n')+'\n');
  await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify({readOnly:true,databaseWrites:0,sourceNetworkRequests:0,detailPageFetches:0,paginationMode:'UUID_KEYSET_GLOBAL_SCAN_LOCAL_FILTER',detailDistinct:details.length},null,2)+'\n');
  console.log(JSON.stringify({detailDistinct:details.length,zeroDbWrites:true,zeroSourceFetches:true,paginationMode:'UUID_KEYSET_GLOBAL_SCAN_LOCAL_FILTER'},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
