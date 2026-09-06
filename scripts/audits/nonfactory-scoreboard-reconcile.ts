import fs from 'node:fs/promises';
import path from 'node:path';
import { classifyReservoirCandidate, summarizeDomainReservoir, type RegistryPolicySnapshot, type ReservoirCandidate } from '../data-mass/reservoir-qualification';

const OUT=process.env.NONFACTORY_RECON_OUT ?? '.tmp/nonfactory-scoreboard-reconcile';
const PAGE=1000;
function env(n:string){const v=process.env[n];if(!v)throw new Error(`missing ${n}`);return v;}
async function rest<T>(table:string,params:Record<string,string>):Promise<T[]>{
  const u=new URL(`/rest/v1/${table}`,env('SUPABASE_URL')); for(const[k,v]of Object.entries(params))u.searchParams.set(k,v);
  const key=env('SUPABASE_SERVICE_ROLE_KEY');
  for(let a=1;a<=3;a++){
    const r=await fetch(u,{headers:{apikey:key,authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)});
    if(r.ok)return r.json() as Promise<T[]>;
    const body=await r.text(); if(a===3||!(r.status===429||r.status>=500))throw new Error(`${table} ${r.status} ${body}`);
    await new Promise(res=>setTimeout(res,500*a));
  }
  return [];
}
const norm=(d:string)=>d.trim().toLowerCase().replace(/^www\./,'');
const canon=(raw:string)=>{try{const u=new URL(raw);u.hash='';u.hostname=u.hostname.toLowerCase().replace(/^www\./,'');if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,'');return u.toString();}catch{return raw.trim();}};
const lexical=/(?:immo|immobilier|property|properties|realty|estate|housing|homes?|maison|logement|sakane|sakan|beyti?|dar|annonce|annonces|classified|souq|souk|market)/i;
const existingLaneDomains=new Set([
'avito.ma','akaar.ma','mubawab.ma','marocannonces.com','sarouty.ma','agenz.ma','daragadir.com','limmobiliersansfrontieres.com','aykana.ma','atlasimmobilier.com','masaken.ma','soukimmobilier.com','mouldar.com','promoimmomarrakech.com','kawtarimmobilier.com','domio.ma','marrakechrealty.com','barnes-marrakech.com','1immo.ma','sakane.ma','milkiya.ma','expat.com','1000-annonces.com','housing.place','immodirect.ma','yakeey.com','christiesrealestatemorocco.com','immo-maroc.com','agadirimmobilier.ma','proimmobilier.ma','capital-properties.ma','valfoncier.ma','jibril.immo','swimmobilier.com','loco.ma'
]);
type D={id:string,source_domain:string,source_url:string,canonical_url:string|null,title:string|null,snippet:string|null,discovery_query:string|null,content_fingerprint:string|null,last_seen_at:string|null};
type R={source_domain:string,authorization_status:string|null,display_policy:string|null,display_gate:string|null,acquisition_mode:string|null,ingestion_gate:string|null};
type U={canonical_url:string}; type B={source_domain:string,canonical_url:string,reserve_lane:string|null};
async function readKeyset<T extends {id:string}>(table:string,select:string):Promise<T[]>{const out:T[]=[];let last='';for(;;){const q:Record<string,string>={select,order:'id.asc',limit:String(PAGE)};if(last)q.id=`gt.${last}`;const p=await rest<T>(table,q);out.push(...p);if(p.length<PAGE)break;const n=p.at(-1)?.id;if(!n||n===last)throw new Error(`${table} keyset stalled`);last=n;}return out;}
async function readOffset<T>(table:string,params:Record<string,string>):Promise<T[]>{const out:T[]=[];for(let offset=0;;offset+=PAGE){const p=await rest<T>(table,{...params,limit:String(PAGE),offset:String(offset)});out.push(...p);if(p.length<PAGE)break;}return out;}
async function main(){
 const [disc,thin,regs,seeds,b3]=await Promise.all([
   readKeyset<D>('discovery_candidates','id,source_domain,source_url,canonical_url,title,snippet,discovery_query,content_fingerprint,last_seen_at'),
   readOffset<U>('thin_index_search_documents',{select:'canonical_url'}),
   readOffset<R>('source_policy_registry',{select:'source_domain,authorization_status,display_policy,display_gate,acquisition_mode,ingestion_gate'}),
   readOffset<U>('source_offer_seeds',{select:'canonical_url'}),
   readOffset<B>('odm_b3_discovery_expansion_audit_v1',{select:'source_domain,canonical_url,reserve_lane',reserve_lane:'eq.policy_review_backlog'})
 ]);
 const thinSet=new Set(thin.map(x=>canon(x.canonical_url))); const seedSet=new Set(seeds.map(x=>canon(x.canonical_url)));
 const b3Strict=new Set(b3.filter(x=>norm(x.source_domain).endsWith('.ma')&&lexical.test(norm(x.source_domain))).map(x=>canon(x.canonical_url)).filter(x=>!seedSet.has(x)));
 const reg=new Map<string,RegistryPolicySnapshot>(); for(const x of regs){const d=norm(x.source_domain);reg.set(d,{sourceDomain:d,authorizationStatus:x.authorization_status,displayPolicy:x.display_policy,displayGate:x.display_gate,acquisitionMode:x.acquisition_mode,ingestionGate:x.ingestion_gate});}
 const unique=new Map<string,D>(); for(const x of disc){const raw=x.canonical_url||x.source_url;if(!raw)continue;const k=canon(raw);const e=unique.get(k);if(!e||(x.last_seen_at??'')>(e.last_seen_at??''))unique.set(k,x);}
 const byDomain=new Map<string,ReservoirCandidate[]>(); for(const[url,x]of unique){if(thinSet.has(url))continue;let d=norm(x.source_domain);if(!d){try{d=norm(new URL(url).hostname);}catch{continue;}}const a=byDomain.get(d)??[];a.push({sourceDomain:d,url,title:x.title,snippet:x.snippet,discoveryQuery:x.discovery_query,contentFingerprint:x.content_fingerprint});byDomain.set(d,a);}
 const factory=new Set<string>(); for(const[d,a]of byDomain){const s=summarizeDomainReservoir(d,a,reg.get(d)??null);if(s.massQueue==='SOURCE_FACTORY')factory.add(d);}
 const details:string[]=[]; for(const[d,a]of byDomain){if(factory.has(d))continue;for(const c of a){const x=classifyReservoirCandidate(c);if(x.likelyRealEstate&&x.pageKind==='LIKELY_LISTING_DETAIL'&&x.geographyScope==='MOROCCO_LIKELY')details.push(c.url);}}
 const uniq=[...new Set(details)]; let overlapSeed=0,overlapB3=0,excludedLane=0;const additive:string[]=[];const by=new Map<string,number>();
 for(const u of uniq){let d='';try{d=norm(new URL(u).hostname);}catch{continue;}if(seedSet.has(u)){overlapSeed++;continue;}if(b3Strict.has(u)){overlapB3++;continue;}if(existingLaneDomains.has(d)){excludedLane++;continue;}additive.push(u);by.set(d,(by.get(d)??0)+1);}
 const summary={generatedAt:new Date().toISOString(),unit:'URL_REPRESENTATION',paginationMode:'UUID_KEYSET',allNonFactoryDetailCandidates:uniq.length,overlapSourceOfferSeeds:overlapSeed,overlapB3Strict:overlapB3,excludedExistingLaneDomain:excludedLane,exactAdditiveNonFactory:additive.length,additiveDomains:by.size,zeroDbWrites:true,zeroSourceFetches:true,byDomain:[...by.entries()].sort((a,b)=>b[1]-a[1]).map(([sourceDomain,count])=>({sourceDomain,count}))};
 await fs.mkdir(OUT,{recursive:true});await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2)+'\n');await fs.writeFile(path.join(OUT,'exact-additive-nonfactory-urls.txt'),additive.sort().join('\n')+'\n');console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
