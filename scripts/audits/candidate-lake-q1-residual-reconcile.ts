import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { classifyReservoirCandidate, type ReservoirCandidate } from '../data-mass/reservoir-qualification';

const OUT=process.env.Q1_RESIDUAL_OUT ?? '.tmp/candidate-lake-q1-residual';
const ROOT=process.env.Q1_PROOFS_ROOT ?? '.tmp/q1-residual-proofs';
const PAGE=1000;
const EXPECTED_TOTAL=27440;
const EXPECTED:Record<string,number>={
  public_sitemap:6270, aykana_mass_x5:509, atlas_masaken_souk:2163, mouldar_mass_x5:1081,
  promo_mass_x5:943, kawtar_mass_x5:188, data_4_9b:2326, current_seed_lanes:2920,
  b3_strict:5797, immodirect:4, yakeey:82, mass_x2:73, mass1_additive:1613, oneimmo_historical:3471,
};
function env(n:string){const v=process.env[n];if(!v)throw new Error(`missing ${n}`);return v;}
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function page<T>(table:string, params:Record<string,string>):Promise<T[]>{
  const u=new URL(`/rest/v1/${table}`,env('SUPABASE_URL'));for(const[k,v]of Object.entries(params))u.searchParams.set(k,v);
  const key=env('SUPABASE_SERVICE_ROLE_KEY');
  for(let a=1;a<=3;a++){const r=await fetch(u,{headers:{apikey:key,authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)});if(r.ok)return r.json() as Promise<T[]>;const b=await r.text();if(a===3||!(r.status===429||r.status>=500))throw new Error(`${table} ${r.status} ${b}`);await delay(250*a);}throw new Error(`${table} read failed`);
}
async function all<T>(table:string,params:Record<string,string>):Promise<T[]>{const out:T[]=[];for(let offset=0;;offset+=PAGE){const p=await page<T>(table,{...params,limit:String(PAGE),offset:String(offset)});out.push(...p);if(p.length<PAGE)return out;}}
async function allById<T extends {id:string}>(table:string,params:Record<string,string>):Promise<T[]>{const out:T[]=[];let last:string|null=null;for(;;){const q={...params,order:'id.asc',limit:String(PAGE)} as Record<string,string>;if(last)q.id=`gt.${last}`;const p=await page<T>(table,q);out.push(...p);if(p.length<PAGE)return out;const n=p.at(-1)?.id??null;if(!n||n===last)throw new Error(`${table} keyset stalled`);last=n;}}
const norm=(d:string)=>d.trim().toLowerCase().replace(/^www\./,'');
const canon=(raw:string)=>{try{const u=new URL(raw.trim());u.hash='';u.hostname=u.hostname.toLowerCase();if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,'');return u.toString();}catch{return raw.trim();}};
const sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const lexical=/(?:immo|immobilier|property|properties|realty|estate|housing|homes?|maison|logement|sakane|sakan|beyti?|dar|annonce|annonces|classified|souq|souk|market)/i;

type Rec={representation_key:string,source_family:string,source_domain:string,source_id:string|null,canonical_url:string|null,lane:string,layer:string,evidence_kind:string,temporal_cohort:string,evidence_run:string|null,evidence_artifact:string|null,provenance_uri:string,exact_fingerprint:string,soft_fingerprint_v1:null,attribute_coverage:'identity_only'|'identity_plus_observation',cluster_input_eligible:boolean};
function rec(lane:string,url:string|null,id:string|null,domain:string,meta:Partial<Rec>={}):Rec{const d=norm(domain);const cu=url?canon(url):null;const identity=cu?`url:${cu}`:`id:${d}:${id}`;return {representation_key:`${d}|${identity}`,source_family:d,source_domain:d,source_id:id,canonical_url:cu,lane,layer:'L0',evidence_kind:'historical_or_public_identity',temporal_cohort:'historical_or_snapshot',evidence_run:null,evidence_artifact:null,provenance_uri:cu??`${d}:${id}`,exact_fingerprint:sha(`${d}|${identity}`),soft_fingerprint_v1:null,attribute_coverage:'identity_only',cluster_input_eligible:false,...meta};}
async function files(dir:string):Promise<string[]>{const out:string[]=[];async function walk(d:string){for(const e of await fs.readdir(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())await walk(p);else out.push(p);}}await walk(dir);return out;}
async function urlsFromDir(dir:string):Promise<string[]>{const set=new Set<string>();for(const p of await files(dir)){if(!/\.(txt|csv|json|jsonl|ndjson|tsv)$/i.test(p))continue;const s=await fs.readFile(p,'utf8').catch(()=> '');for(const m of s.matchAll(/https?:\/\/[^\s"'<>\\]+/g)){let u=m[0].replace(/[),.;]+$/,'');try{set.add(canon(u));}catch{}}}return [...set];}
function domainOf(u:string){try{return norm(new URL(u).hostname)}catch{return ''}}
function candidate(x:D,url:string):ReservoirCandidate{return {sourceDomain:norm(x.source_domain||domainOf(url)),url,title:x.title,snippet:x.snippet,discoveryQuery:x.discovery_query,contentFingerprint:x.content_fingerprint};}
function isDetailMorocco(x:D,url:string){const c=classifyReservoirCandidate(candidate(x,url));return c.likelyRealEstate&&c.pageKind==='LIKELY_LISTING_DETAIL'&&c.geographyScope==='MOROCCO_LIKELY';}
function data49bMatch(domain:string,url:string){let p='';try{p=new URL(url).pathname.toLowerCase()}catch{return false}switch(domain){case 'valfoncier.ma':return p.startsWith('/biens/');case 'christiesrealestatemorocco.com':return /\/fr-ma\/(ventes|location)\/detail\//.test(p);case 'immo-maroc.com':return /^\/fr\/details-/.test(p);case 'agadirimmobilier.ma':return /^\/agadir(?:-[^/]+)?\/(appartement|villa|maison|terrain|riad)s?\/\d/.test(p);case 'proimmobilier.ma':case 'capital-properties.ma':return /^\/propriete?s?\/(appartement|villa|maison|terrain|riad)s?\/\d/.test(p);default:return false;}}

type D={id:string,source_domain:string,source_url:string,canonical_url:string|null,title:string|null,snippet:string|null,discovery_query:string|null,content_fingerprint:string|null,last_seen_at:string|null};
type U={canonical_url:string};
type B={source_domain:string,canonical_url:string,reserve_lane:string|null};
type S={observation_id:string,seed_id:string|null,canonical_url:string,source_domain:string,observed_at:string|null};

async function main(){
  const [disc,seeds,b3,sitemap]=await Promise.all([
    allById<D>('discovery_candidates',{select:'id,source_domain,source_url,canonical_url,title,snippet,discovery_query,content_fingerprint,last_seen_at'}),
    all<U>('source_offer_seeds',{select:'canonical_url',order:'canonical_url.asc'}),
    all<B>('odm_b3_discovery_expansion_audit_v1',{select:'source_domain,canonical_url,reserve_lane',reserve_lane:'eq.policy_review_backlog',order:'canonical_url.asc'}),
    all<S>('odm_canonical_link_coverage_expansion_shadow_v2',{select:'observation_id,seed_id,canonical_url,source_domain,observed_at',v2_shadow_eligible:'eq.true',order:'canonical_url.asc'}),
  ]);
  const seedSet=new Set(seeds.map(x=>canon(x.canonical_url)));
  const uniqueDisc=new Map<string,D>();for(const x of disc){const raw=x.canonical_url||x.source_url;if(!raw)continue;const u=canon(raw);const e=uniqueDisc.get(u);if(!e||(x.last_seen_at??'')>(e.last_seen_at??''))uniqueDisc.set(u,x);}
  const lanes=new Map<string,Rec[]>();const put=(lane:string,rs:Rec[])=>lanes.set(lane,rs);

  // 1) historical public-sitemap shadow rows, exact DB identities.
  const sm=sitemap.filter(x=>['daragadir.com','limmobiliersansfrontieres.com','aykana.ma'].includes(norm(x.source_domain))).map(x=>rec('public_sitemap',x.canonical_url,x.observation_id,x.source_domain,{evidence_kind:'canonical_link_shadow_row',temporal_cohort:'2026-08-02',attribute_coverage:'identity_plus_observation',evidence_run:'PR#223',provenance_uri:`observation:${x.observation_id}`}));put('public_sitemap',sm);

  // 2) MASS-X5 exact sets and rescue artifacts.
  const mx5=await urlsFromDir(path.join(ROOT,'mass-x5'));
  const x4c=await urlsFromDir(path.join(ROOT,'x4c-c'));
  const masaken=await urlsFromDir(path.join(ROOT,'masaken'));
  const souk=await urlsFromDir(path.join(ROOT,'souk'));
  const mouldar=await urlsFromDir(path.join(ROOT,'mouldar'));
  const mx=(lane:string,arr:string[],domains:string[],artifact:string)=>arr.filter(u=>domains.includes(domainOf(u))).map(u=>rec(lane,u,null,domainOf(u),{evidence_run:'31762998799',evidence_artifact:artifact,provenance_uri:u}));
  put('aykana_mass_x5',mx('aykana_mass_x5',mx5,['aykana.ma'],'9205427369'));
  put('atlas_masaken_souk',[...mx('atlas_masaken_souk',x4c,['atlasimmobilier.com'],'9203620957'),...mx('atlas_masaken_souk',masaken,['masaken.ma'],'9205410118'),...mx('atlas_masaken_souk',souk,['soukimmobilier.com'],'9205361327')]);
  put('mouldar_mass_x5',mx('mouldar_mass_x5',mouldar,['mouldar.com'],'9205390731'));
  put('promo_mass_x5',mx('promo_mass_x5',x4c,['promoimmomarrakech.com'],'9203620957'));
  put('kawtar_mass_x5',mx('kawtar_mass_x5',mx5,['kawtarimmobilier.com'],'9205427369'));

  // 3) DATA-4.9B persisted discovery replay, never source fetch.
  const d49domains=new Set(['valfoncier.ma','christiesrealestatemorocco.com','immo-maroc.com','agadirimmobilier.ma','proimmobilier.ma','capital-properties.ma']);
  const d49:Rec[]=[];for(const [u,x] of uniqueDisc){const d=norm(x.source_domain||domainOf(u));if(d49domains.has(d)&&data49bMatch(d,u))d49.push(rec('data_4_9b',u,null,d,{evidence_run:'31370449455',evidence_kind:'structural_detail_replay'}));}put('data_4_9b',d49);

  // 4) current source_offer_seeds lanes.
  const seedExpected:Record<string,number>={'marrakechrealty.com':1944,'barnes-marrakech.com':282,'1immo.ma':201,'sakane.ma':191,'milkiya.ma':131,'expat.com':83,'1000-annonces.com':66,'housing.place':22};
  const seedRows=seeds.map(x=>canon(x.canonical_url)).filter(u=>domainOf(u) in seedExpected).map(u=>rec('current_seed_lanes',u,null,domainOf(u),{evidence_kind:'source_offer_seed_snapshot',temporal_cohort:'2026-09-05'}));put('current_seed_lanes',seedRows);

  // 5) B3 strict Morocco exact anti-overlap.
  const b3rows=b3.filter(x=>norm(x.source_domain).endsWith('.ma')&&lexical.test(norm(x.source_domain))).map(x=>canon(x.canonical_url)).filter(u=>!seedSet.has(u)).filter((u,i,a)=>a.indexOf(u)===i).map(u=>rec('b3_strict',u,null,domainOf(u),{evidence_kind:'policy_review_backlog_strict_morocco',temporal_cohort:'2026-09-05'}));put('b3_strict',b3rows);

  // 6) tiny artifact lanes.
  const immo=(await urlsFromDir(path.join(ROOT,'immodirect'))).filter(u=>domainOf(u)==='immodirect.ma').map(u=>rec('immodirect',u,null,'immodirect.ma',{evidence_artifact:'9974939355'}));put('immodirect',immo);
  const yp=(await urlsFromDir(path.join(ROOT,'yakeey-purchase'))).filter(u=>domainOf(u)==='yakeey.com');const yr=(await urlsFromDir(path.join(ROOT,'yakeey-rental'))).filter(u=>domainOf(u)==='yakeey.com');const yu=[...new Set([...yp,...yr])].map(u=>rec('yakeey',u,null,'yakeey.com',{evidence_run:'33989989300+33990176467',evidence_artifact:'9976337671+9976383551'}));put('yakeey',yu);

  // 7) MASS-X2 exact detail replay for Jibril/SW/Loco.
  const x2domains=new Set(['jibril.immo','swimmobilier.com','loco.ma']);const x2:Rec[]=[];for(const[u,x]of uniqueDisc){const d=norm(x.source_domain||domainOf(u));if(x2domains.has(d)&&isDetailMorocco(x,u)&&!seedSet.has(u))x2.push(rec('mass_x2',u,null,d,{evidence_kind:'historical_discovery_detail_replay',temporal_cohort:'2026-09-06'}));}put('mass_x2',x2);

  // 8) MASS-1 exact additive artifact.
  const m1=(await urlsFromDir(path.join(ROOT,'mass1'))).filter(u=>u.startsWith('http')).map(u=>rec('mass1_additive',u,null,domainOf(u),{evidence_run:'34029546664',evidence_artifact:'9988296190'}));put('mass1_additive',m1);

  // 9) 1immo historical detail replay anti-overlap current seeds.
  const one:Rec[]=[];for(const[u,x]of uniqueDisc){const d=norm(x.source_domain||domainOf(u));if(d==='1immo.ma'&&isDetailMorocco(x,u)&&!seedSet.has(u))one.push(rec('oneimmo_historical',u,null,d,{evidence_run:'34030138761',evidence_artifact:'9988514932',evidence_kind:'historical_discovery_detail_replay'}));}put('oneimmo_historical',one);

  const laneCounts:Record<string,number>={};for(const[k,v]of lanes)laneCounts[k]=new Map(v.map(r=>[r.representation_key,r])).size;
  const failures:string[]=[];for(const[k,n]of Object.entries(EXPECTED)){if(laneCounts[k]!==n)failures.push(`${k}: got ${laneCounts[k]??0}, expected ${n}`);}
  const allRows=[...lanes.values()].flat();const byKey=new Map<string,Rec>();const crossDuplicates:Record<string,string[]>={};for(const r of allRows){const e=byKey.get(r.representation_key);if(e){crossDuplicates[r.representation_key]=[e.lane,r.lane];}else byKey.set(r.representation_key,r);}
  const totalByLane=Object.values(laneCounts).reduce((a,b)=>a+b,0);if(totalByLane!==EXPECTED_TOTAL)failures.push(`totalByLane ${totalByLane} != ${EXPECTED_TOTAL}`);if(byKey.size!==EXPECTED_TOTAL)failures.push(`unique representation keys ${byKey.size} != ${EXPECTED_TOTAL}; cross-lane duplicates=${Object.keys(crossDuplicates).length}`);
  const summary={generatedAt:new Date().toISOString(),expectedTotal:EXPECTED_TOTAL,totalByLane,uniqueRepresentationKeys:byKey.size,laneCounts,failures,crossLaneDuplicateCount:Object.keys(crossDuplicates).length,databaseWrites:0,sourceSiteFetches:0,productionWrites:0,readOnly:true};
  await fs.mkdir(OUT,{recursive:true});await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2)+'\n');await fs.writeFile(path.join(OUT,'lane-counts.json'),JSON.stringify(laneCounts,null,2)+'\n');await fs.writeFile(path.join(OUT,'cross-lane-duplicates.json'),JSON.stringify(crossDuplicates,null,2)+'\n');await fs.writeFile(path.join(OUT,'residual-manifest.jsonl'),[...byKey.values()].sort((a,b)=>a.representation_key.localeCompare(b.representation_key)).map(r=>JSON.stringify(r)).join('\n')+'\n');console.log(JSON.stringify(summary,null,2));
  if(failures.length)throw new Error(`Q1 residual reconcile failed: ${failures.join('; ')}`);
}
main().catch(e=>{console.error(e);process.exit(1)});
