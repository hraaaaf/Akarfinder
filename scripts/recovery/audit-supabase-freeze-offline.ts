#!/usr/bin/env tsx
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const dir=resolve(process.argv[2]||".tmp/supabase-freeze");

function readJsonlGz(name:string){
  const p=resolve(dir,`${name}.jsonl.gz`);
  if(!existsSync(p)) throw new Error(`missing ${p}`);
  const txt=gunzipSync(readFileSync(p)).toString("utf8");
  return txt.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
}
function normUrl(raw:any){
  if(typeof raw!=="string"||!raw.trim()) return null;
  try{
    const u=new URL(raw.trim());
    if(!/^https?:$/.test(u.protocol)) return null;
    u.hash="";
    for(const k of [...u.searchParams.keys()]){
      if(/^utm_/i.test(k)||["fbclid","gclid","ref"].includes(k.toLowerCase())) u.searchParams.delete(k);
    }
    u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
    if(u.pathname.length>1) u.pathname=u.pathname.replace(/\/+$/,"");
    return u.toString();
  }catch{return null}
}
function host(raw:any){const n=normUrl(raw); if(!n) return null; return new URL(n).hostname}
function sha(v:string){return createHash("sha256").update(v).digest("hex")}

const manifest=JSON.parse(readFileSync(resolve(dir,"manifest.json"),"utf8"));
const discovery=readJsonlGz("discovery_candidates");
const reps=readJsonlGz("listing_representations");
const seeds=readJsonlGz("source_offer_seeds");
const thin=readJsonlGz("thin_index_search_documents");
const minimal=readJsonlGz("minimal_live_search_documents_v1");
const properties=readJsonlGz("property_listings");
const sources=readJsonlGz("listing_sources");

const all:any[]=[];
function add(rows:any[],table:string,fields:string[]){
  for(const row of rows){
    for(const field of fields){
      const u=normUrl(row[field]);
      if(u) all.push({table,field,url:u,host:host(u)});
    }
  }
}
add(discovery,"discovery_candidates",["canonical_url","source_url"]);
add(reps,"listing_representations",["canonical_url"]);
add(seeds,"source_offer_seeds",["canonical_url","source_url","listing_url"]);
add(thin,"thin_index_search_documents",["canonical_url","source_url","listing_url"]);
add(minimal,"minimal_live_search_documents_v1",["canonical_url"]);
add(sources,"listing_sources",["listing_url","source_url"]);

const byUrl=new Map<string,{count:number,tables:Set<string>,hosts:Set<string>}>();
for(const x of all){
  const cur=byUrl.get(x.url)??{count:0,tables:new Set<string>(),hosts:new Set<string>()};
  cur.count++;cur.tables.add(x.table);if(x.host)cur.hosts.add(x.host);byUrl.set(x.url,cur);
}

const domainCounts=new Map<string,number>();
for(const [url,v] of byUrl){
  const h=new URL(url).hostname;
  domainCounts.set(h,(domainCounts.get(h)??0)+1);
}
const exactDuplicateUrls=[...byUrl].filter(([,v])=>v.count>1).map(([url,v])=>({
  url,count:v.count,tables:[...v.tables].sort()
})).sort((a,b)=>b.count-a.count||a.url.localeCompare(b.url));

const missing={
  discovery_no_url:discovery.filter(r=>!normUrl(r.canonical_url)&&!normUrl(r.source_url)).length,
  reps_no_canonical:reps.filter(r=>!normUrl(r.canonical_url)).length,
  seeds_no_url:seeds.filter(r=>!normUrl(r.canonical_url)&&!normUrl(r.source_url)&&!normUrl(r.listing_url)).length,
  thin_no_url:thin.filter(r=>!normUrl(r.canonical_url)&&!normUrl(r.source_url)&&!normUrl(r.listing_url)).length,
  minimal_no_canonical:minimal.filter(r=>!normUrl(r.canonical_url)).length,
  listing_sources_no_url:sources.filter(r=>!normUrl(r.listing_url)&&!normUrl(r.source_url)).length,
};

const report={
  schema_version:"akarfinder-supabase-freeze-audit-v1",
  freeze_manifest_sha256:sha(JSON.stringify(manifest)),
  freeze_total_rows:manifest.total_rows,
  tables_loaded:{
    discovery_candidates:discovery.length,
    listing_representations:reps.length,
    source_offer_seeds:seeds.length,
    thin_index_search_documents:thin.length,
    minimal_live_search_documents_v1:minimal.length,
    property_listings:properties.length,
    listing_sources:sources.length
  },
  url_observations:all.length,
  exact_unique_normalized_urls:byUrl.size,
  exact_duplicate_url_count:exactDuplicateUrls.length,
  missing_url_fields:missing,
  top_domains:[...domainCounts].sort((a,b)=>b[1]-a[1]).slice(0,100).map(([domain,count])=>({domain,count})),
  discovery_status_counts:Object.entries(discovery.reduce((a:any,r:any)=>{const k=String(r.discovery_status??"NULL");a[k]=(a[k]??0)+1;return a;},{})),
  representation_eligibility_counts:Object.entries(reps.reduce((a:any,r:any)=>{const k=String(r.display_eligibility??"NULL");a[k]=(a[k]??0)+1;return a;},{})),
  minimal_city_missing:minimal.filter(r=>!r.city).length,
  minimal_price_missing:minimal.filter(r=>r.price_mad==null).length,
  minimal_surface_missing:minimal.filter(r=>r.surface_m2==null).length,
  property_price_missing:properties.filter(r=>r.price_mad==null).length,
  property_city_missing:properties.filter(r=>!r.city).length,
  property_type_missing:properties.filter(r=>!r.property_type).length,
  database_access:0,database_writes:0
};

writeFileSync(resolve(dir,"offline-audit.json"),JSON.stringify(report,null,2)+"\n");
writeFileSync(resolve(dir,"exact-duplicate-urls.jsonl"),exactDuplicateUrls.map(x=>JSON.stringify(x)).join("\n")+(exactDuplicateUrls.length?"\n":""));
console.log(JSON.stringify(report,null,2));
