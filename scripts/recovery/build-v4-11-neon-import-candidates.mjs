#!/usr/bin/env node
import fs from "node:fs";
import zlib from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";

const CERT_DATE=new Date("2026-09-26T23:59:59Z");
function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const input=arg("--input"),output=arg("--output"),summaryPath=arg("--summary");
if(!input||!output||!summaryPath) throw new Error("missing args");

const PT={appartement:"apartment",apartment:"apartment",studio:"studio",villa:"villa",terrain:"land",land:"land",maison:"house",house:"house",bureau:"office",office:"office",riad:"riad",commerce:"commercial",local:"commercial"};
const TX={louer:"rent",location:"rent",rent:"rent",vendre:"sale",vente:"sale",acheter:"sale",sale:"sale"};

function routeMap(row){
  const u=new URL(row.canonical_url);
  const seg=decodeURIComponent(u.pathname).toLowerCase().replace(/^\/+|\/+$/g,"").split("/").filter(Boolean);
  let property_type=null,transaction_type=null;
  if(row.source_domain==="domio.ma" && seg.length>=3){
    property_type=PT[seg[1]]||null; transaction_type=TX[seg[2]]||null;
  } else if(row.source_domain==="marocimmo.com" && seg.length>=3){
    transaction_type=TX[seg[1]]||null; property_type=PT[seg[2]]||null;
  } else if(row.source_domain==="sarout.ma"){
    const slug=seg[3]||"";
    const toks=slug.split(/[-_]+/).filter(Boolean);
    for(const t of toks){
      if(!property_type && PT[t]) property_type=PT[t];
      if(!transaction_type && TX[t]) transaction_type=TX[t];
    }
  }
  return {property_type,transaction_type};
}
function ageDays(s){
  if(!s) return null;
  const d=/^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(s+"T00:00:00Z"):new Date(s);
  if(!Number.isFinite(d.getTime())) return null;
  return Math.floor((CERT_DATE-d)/86400000);
}
function fp(url){return crypto.createHash("sha256").update("representation|"+url).digest("hex")}
async function* rows(){
  const rl=readline.createInterface({input:fs.createReadStream(input).pipe(zlib.createGunzip()),crlfDelay:Infinity});
  for await(const line of rl) if(line.trim()) yield JSON.parse(line);
}

const approved=[], rejected=[];
for await(const r of rows()){
  const reasons=[];
  if(r.classification!=="KEEP") reasons.push("not_keep");
  if(r.scope_eligible!==true) reasons.push("not_scope_eligible");
  if(!Array.isArray(r.deep_http_statuses)||!r.deep_http_statuses.includes(200)) reasons.push("no_direct_http200");
  if(Array.isArray(r.contradiction_flags)&&r.contradiction_flags.length) reasons.push("contradiction");
  const m=routeMap(r);
  if(!m.property_type) reasons.push("unmapped_property_type");
  if(!m.transaction_type) reasons.push("unmapped_transaction_type");
  if(!r.title||String(r.title).trim().length<12) reasons.push("missing_or_weak_title");
  if(!r.city) reasons.push("missing_city");
  const days=ageDays(r.published_at);
  if(days===null||days<0||days>365) reasons.push("invalid_or_stale_published_at");

  if(reasons.length){ 
    if(r.classification==="KEEP"&&r.scope_eligible===true&&r.deep_http_statuses?.includes(200)&&!(r.contradiction_flags?.length)) rejected.push({canonical_url:r.canonical_url,source_domain:r.source_domain,reasons});
    continue;
  }

  let score=25+15+15+15+15;
  if(r.address) score+=10;
  if(r.price_mad!=null) score+=5;
  const source_listing_id=r.source_listing_id?String(r.source_listing_id):null;
  approved.push({
    canonical_fingerprint:fp(r.canonical_url),
    source_listing_id,
    title:r.title,
    price_mad:r.price_mad??null,
    city:r.city,
    district:r.district??null,
    property_type:m.property_type,
    transaction_type:m.transaction_type,
    surface_m2_raw:r.surface_m2??null,
    surface_m2:r.surface_m2==null?null:Math.round(Number(r.surface_m2)),
    rooms_count:null,
    bedrooms_count:r.bedrooms_count??null,
    bathrooms_count:null,
    description_snippet:r.description?String(r.description).slice(0,500):null,
    images_count:null,
    seller_name:null,
    data_completeness_score:score,
    field_confidence:{
      canonical_url:1,classification:1,scope:1,http_200:1,title:1,city:1,
      property_type:1,transaction_type:1,published_at:1,
      address:r.address?0.95:0,price_mad:r.price_mad!=null?0.95:0,
      surface_m2:r.surface_m2!=null?0.9:0,surface_m2_transform:r.surface_m2!=null?"rounded_to_nearest_integer_for_neon_schema":null,district:r.district?0.9:0,
      bedrooms_count:r.bedrooms_count!=null?0.9:0
    },
    source_name:r.source_domain,
    listing_url:r.canonical_url,
    source_url:"https://"+r.source_domain,
    first_seen_at:r.published_at,
    last_seen_at:"2026-09-26T23:59:59Z",
    origin_type:"external_index_seed",
    compliance_status:"recovery_certified_v4_11",
    ingestion_run_id:"clean-corpus-v4.11",
    displayed_price:r.price_mad??null,
    price_currency:r.price_mad!=null?"MAD":null,
    price_period:null,
    price_status:r.price_mad!=null?"valid":"not_disclosed",
    approved_for_import:false
  });
}

const urls=new Set(approved.map(x=>x.listing_url)),fps=new Set(approved.map(x=>x.canonical_fingerprint));
if(urls.size!==approved.length||fps.size!==approved.length) throw new Error("candidate dedup invariant failed");
const byDomain=approved.reduce((m,r)=>(m[r.source_name]=(m[r.source_name]||0)+1,m),{});
const scores=approved.map(x=>x.data_completeness_score);
if(approved.length!==8388) throw new Error("expected 8388 candidates, got "+approved.length);
if(byDomain["marocimmo.com"]!==4492||byDomain["domio.ma"]!==3464||byDomain["sarout.ma"]!==432) throw new Error("domain invariant failed");
if(Math.min(...scores)<95) throw new Error("quality floor failed");
if(approved.some(x=>x.approved_for_import!==false)) throw new Error("approval must remain false");

fs.writeFileSync(output,approved.map(x=>JSON.stringify(x)).join("\n")+"\n");
const summary={
  schema_version:"akarfinder-v4.11-neon-import-candidates-20260926",
  candidates:approved.length,
  by_domain:byDomain,
  excluded_from_live_subset:rejected.length,
  excluded_reason_counts:rejected.flatMap(x=>x.reasons).reduce((m,x)=>(m[x]=(m[x]||0)+1,m),{}),
  quality_min:Math.min(...scores),quality_max:Math.max(...scores),
  approved_for_import_rows:0,
  database_access:0,database_writes:0,
  input_gzip_sha256:"e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953",
  output_sha256:crypto.createHash("sha256").update(fs.readFileSync(output)).digest("hex"),
  doctrine:[
    "KEEP","scope_eligible","direct HTTP200","no contradiction",
    "deterministic source-route property_type + transaction_type",
    "title present","city present","published_at <=365d"
  ]
};
fs.writeFileSync(summaryPath,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
