#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const ledger=arg("--ledger");
const freezeDir=arg("--freeze-dir");
const usedDir=arg("--used-dir");
const outDir=arg("--out-dir");
if(!ledger||!freezeDir||!usedDir||!outDir)throw new Error("missing args");

const EXPECTED_LEDGER=180117;
const EXPECTED_USED=87397;
const EXPECTED_REMAINING=92720;
const EXPECTED_READY=3769;
const ALLOWED_PT=new Set(["apartment","studio","land","villa","house","riad","office","commercial"]);

function canon(raw){
  const u=new URL(String(raw).trim());
  u.protocol="https:";
  u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
  u.hash="";
  for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|msclkid|yclid)$/i.test(k))u.searchParams.delete(k);
  u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
  return u.toString();
}
function sha(s){return crypto.createHash("sha256").update(s).digest("hex")}
function fp(u){return sha("representation|"+u)}
function dec(v){try{return decodeURIComponent(String(v))}catch{return String(v)}}
function titleCase(s){return s.toLowerCase().split(/\s+/).map(w=>w?w[0].toUpperCase()+w.slice(1):w).join(" ")}
function normCity(v){
  if(v==null)return null;
  const s=dec(v).trim(); if(!s)return null;
  const k=s.toLowerCase().replace(/_/g," ").replace(/\s+/g," ").trim();
  const a={
    casablanca:"Casablanca",casa:"Casablanca",rabat:"Rabat",marrakech:"Marrakech",marrakesh:"Marrakech",
    tanger:"Tanger",tangier:"Tanger",fes:"Fès","fès":"Fès",fez:"Fès",agadir:"Agadir",
    meknes:"Meknès","meknès":"Meknès",kenitra:"Kénitra","kénitra":"Kénitra",mohammedia:"Mohammedia",
    oujda:"Oujda",tetouan:"Tétouan","tétouan":"Tétouan",sale:"Salé","salé":"Salé",
    temara:"Témara","témara":"Témara",essaouira:"Essaouira",bouskoura:"Bouskoura",bouznika:"Bouznika",
    "el jadida":"El Jadida","el-jadida":"El Jadida","dar bouazza":"Dar Bouazza","dar-bouazza":"Dar Bouazza"
  };
  return a[k]||titleCase(s.replace(/[-_]+/g," ").replace(/\s+/g," ").trim());
}
function normPt(v){
  if(v==null)return null;
  const s=String(v).toLowerCase().trim();
  const m={
    apartment:"apartment",appartement:"apartment",flat:"apartment",studio:"studio",
    land:"land",terrain:"land",villa:"villa",house:"house",maison:"house",
    riad:"riad",office:"office",bureau:"office",commercial:"commercial",
    commerce:"commercial","local commercial":"commercial"
  };
  const x=m[s]||s;
  return ALLOWED_PT.has(x)?x:null;
}
function normTx(v){
  if(v==null)return null;
  const s=String(v).toLowerCase().trim();
  if(["sale","vente","buy","achat"].includes(s))return "sale";
  if(["rent","location","rental"].includes(s))return "rent";
  return null;
}
function intOrNull(v){
  if(v==null||v==="")return null;
  const n=Number(v); if(!Number.isFinite(n))return null;
  return Math.round(n);
}
function nonEmpty(v){return v!=null&&String(v).trim()!==""}
function pick(field,sources,normalizer=x=>x){
  for(const [name,obj,key] of sources){
    if(obj&&nonEmpty(obj[key])){
      const value=normalizer(obj[key]);
      if(value!=null&&nonEmpty(value))return {value,source:name,raw:obj[key]};
    }
  }
  return {value:null,source:null,raw:null};
}
async function* gzJsonl(file){
  const rl=readline.createInterface({input:fs.createReadStream(file).pipe(zlib.createGunzip()),crlfDelay:Infinity});
  for await(const line of rl)if(line.trim())yield JSON.parse(line);
}
function loadJsonl(file){
  return fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
}
function addUsed(set,file,domainFilter=null){
  for(const r of loadJsonl(file)){
    if(domainFilter&&r.source_name!==domainFilter)continue;
    set.add(canon(r.listing_url));
  }
}

fs.mkdirSync(outDir,{recursive:true});

const verified=new Map();
for(const r of loadJsonl(ledger)){
  const u=canon(r.canonical_url);
  if(verified.has(u))throw new Error("duplicate ledger URL");
  verified.set(u,{...r,canonical_url:u});
}
if(verified.size!==EXPECTED_LEDGER)throw new Error("ledger count "+verified.size);

const used=new Set();
addUsed(used,path.join(usedDir,"wave2.jsonl"));
addUsed(used,path.join(usedDir,"wave3.jsonl"));
addUsed(used,path.join(usedDir,"wave4b.jsonl"));
addUsed(used,path.join(usedDir,"wave5.jsonl"));
addUsed(used,path.join(usedDir,"wave5-old.jsonl"),"promoimmomarrakech.com");
if(used.size!==EXPECTED_USED)throw new Error("used count "+used.size);

const remaining=new Set([...verified.keys()].filter(u=>!used.has(u)));
if(remaining.size!==EXPECTED_REMAINING)throw new Error("remaining count "+remaining.size);

const oldSource=new Map();
for await(const r of gzJsonl(path.join(freezeDir,"listing_sources.jsonl.gz"))){
  const u=canon(r.listing_url);
  if(remaining.has(u))oldSource.set(u,r);
}
const propIds=new Set([...oldSource.values()].map(r=>r.property_listing_id));
const oldProps=new Map();
for await(const r of gzJsonl(path.join(freezeDir,"property_listings.jsonl.gz"))){
  if(propIds.has(r.id))oldProps.set(r.id,r);
}
const minimal=new Map();
for await(const r of gzJsonl(path.join(freezeDir,"minimal_live_search_documents_v1.jsonl.gz"))){
  const u=canon(r.canonical_url); if(remaining.has(u))minimal.set(u,r);
}
const thin=new Map();
for await(const r of gzJsonl(path.join(freezeDir,"thin_index_search_documents.jsonl.gz"))){
  const u=canon(r.canonical_url); if(remaining.has(u))thin.set(u,r);
}
const reps=new Map();
for await(const r of gzJsonl(path.join(freezeDir,"listing_representations.jsonl.gz"))){
  const u=canon(r.canonical_url); if(remaining.has(u))reps.set(u,r);
}

const candidates=[];
const rejected=[];
const byDomain={};
const provenanceCombos={};

for(const u of remaining){
  const ev=verified.get(u);
  const os=oldSource.get(u)||null;
  const op=os?oldProps.get(os.property_listing_id)||null:null;
  const mi=minimal.get(u)||null;
  const th=thin.get(u)||null;
  const rp=reps.get(u)||null;

  const title=pick("title",[
    ["old_property",op,"title"],["minimal_live",mi,"title"],["thin_index",th,"title"],["listing_representation",rp,"title"]
  ],v=>String(v).trim());
  const city=pick("city",[
    ["old_property",op,"city"],["minimal_live",mi,"city"],["thin_index",th,"normalized_city"],["thin_index_raw",th,"city"],["listing_representation",rp,"city"]
  ],normCity);
  const ptype=pick("property_type",[
    ["old_property",op,"property_type"],["thin_index",th,"normalized_property_type"],["minimal_live",mi,"property_type"],["listing_representation",rp,"property_type"]
  ],normPt);
  const tx=pick("transaction_type",[
    ["old_property",op,"transaction_type"],["thin_index",th,"normalized_intent"],["minimal_live",mi,"transaction_type"],["listing_representation",rp,"transaction_type"]
  ],normTx);

  const reasons=[];
  if(!title.value||title.value.length<12)reasons.push("missing_or_weak_title");
  if(!city.value)reasons.push("missing_city");
  if(!ptype.value)reasons.push("missing_property_type");
  if(!tx.value)reasons.push("missing_transaction_type");
  if(reasons.length){rejected.push({canonical_url:u,source_domain:ev.source_domain,reasons});continue}

  const price=pick("price_mad",[
    ["old_property",op,"price_mad"],["minimal_live",mi,"price_mad"],["thin_index",th,"normalized_price_mad"],["listing_representation",rp,"price_mad"]
  ],intOrNull);
  const surface=pick("surface_m2",[
    ["old_property",op,"surface_m2"],["minimal_live",mi,"surface_m2"],["thin_index",th,"normalized_surface_m2"],["listing_representation",rp,"surface_m2"]
  ],intOrNull);
  const bedrooms=pick("bedrooms_count",[["old_property",op,"bedrooms_count"]],intOrNull);
  const district=pick("district",[
    ["old_property",op,"district"],["minimal_live",mi,"district"],["listing_representation",rp,"district"]
  ],v=>String(v).trim());
  const description=pick("description_snippet",[["old_property",op,"description_snippet"],["thin_index",th,"snippet"],["listing_representation",rp,"snippet"]],v=>String(v).trim().slice(0,500));

  const coreSources=[title.source,city.source,ptype.source,tx.source].filter(Boolean).sort();
  const combo=[...new Set(coreSources)].join("+");
  provenanceCombos[combo]=(provenanceCombos[combo]||0)+1;
  byDomain[ev.source_domain]=(byDomain[ev.source_domain]||0)+1;

  const quality=80+(price.value!=null?5:0)+(surface.value!=null?5:0)+(district.value?3:0)+(bedrooms.value!=null?3:0)+(description.value?4:0);
  candidates.push({
    canonical_fingerprint:fp(u),
    title:title.value,
    price_mad:price.value,
    city:city.value,
    district:district.value,
    property_type:ptype.value,
    transaction_type:tx.value,
    surface_m2:surface.value,
    rooms_count:op?intOrNull(op.rooms_count):null,
    bedrooms_count:bedrooms.value,
    bathrooms_count:op?intOrNull(op.bathrooms_count):null,
    description_snippet:description.value,
    images_count:op?intOrNull(op.images_count):null,
    seller_name:op&&nonEmpty(op.seller_name)?String(op.seller_name).trim():null,
    data_completeness_score:Math.min(100,quality),
    field_confidence:{
      certification:"v4.11_wave6_freeze_enrichment",
      existence_evidence:ev.evidence||[],
      title:{source:title.source,raw:title.raw},
      city:{source:city.source,raw:city.raw,normalized:city.value},
      property_type:{source:ptype.source,raw:ptype.raw,normalized:ptype.value},
      transaction_type:{source:tx.source,raw:tx.raw,normalized:tx.value},
      price_mad:{source:price.source,raw:price.raw,normalized:price.value},
      surface_m2:{source:surface.source,raw:surface.raw,normalized:surface.value},
      bedrooms_count:{source:bedrooms.source,raw:bedrooms.raw,normalized:bedrooms.value},
      freeze_artifact_id:10869399865,
      representation_identity:"source_url_level",
      cross_source_merge_performed:false
    },
    source_name:ev.source_domain,
    listing_url:u,
    source_url:"https://"+ev.source_domain,
    first_seen_at:os?.first_seen_at||null,
    last_seen_at:os?.last_seen_at||mi?.updated_at||th?.updated_at||rp?.updated_at||null,
    source_offer_key:os?.source_offer_key||null,
    origin_type:"legacy_import",
    compliance_status:"recovery_verified_v4_11_wave6",
    content_fingerprint:fp(u),
    ingestion_run_id:"clean-corpus-v4.11-wave6",
    displayed_price:price.value,
    price_currency:price.value!=null?"MAD":null,
    price_period:null,
    price_status:price.value!=null?"valid":"not_disclosed",
    approved_for_import:false
  });
}

if(candidates.length!==EXPECTED_READY)throw new Error("candidate count "+candidates.length);
if(new Set(candidates.map(r=>r.listing_url)).size!==EXPECTED_READY)throw new Error("URL duplicate");
if(new Set(candidates.map(r=>r.canonical_fingerprint)).size!==EXPECTED_READY)throw new Error("fingerprint duplicate");

const sigGroups=new Map();
for(const r of candidates){
  if(r.price_mad==null||r.surface_m2==null||r.bedrooms_count==null)continue;
  const k=JSON.stringify([r.city.toLowerCase(),r.property_type,r.transaction_type,r.price_mad,r.surface_m2,r.bedrooms_count]);
  const a=sigGroups.get(k)||[];a.push(r);sigGroups.set(k,a);
}
const quarantine=new Set();
let ambiguousGroups=0;
for(const g of sigGroups.values()){
  if(g.length>1&&new Set(g.map(r=>r.source_name)).size>1){
    ambiguousGroups++;
    for(const r of g)quarantine.add(r.listing_url);
  }
}
const safe=candidates.filter(r=>!quarantine.has(r.listing_url));
if(ambiguousGroups!==0||quarantine.size!==0)throw new Error("unexpected identity ambiguity");

const body=safe.map(r=>JSON.stringify(r)).join("\n")+"\n";
const rejectedBody=rejected.map(r=>JSON.stringify(r)).join("\n")+(rejected.length?"\n":"");
fs.writeFileSync(path.join(outDir,"db-ready-wave6.jsonl"),body);
fs.writeFileSync(path.join(outDir,"rejected.jsonl"),rejectedBody);

const summary={
  schema_version:"akarfinder-v4.11-wave6-freeze-enrichment-20260927",
  ledger_rows:verified.size,
  already_certified_rows:used.size,
  remaining_verified_rows:remaining.size,
  freeze_matches:{
    listing_sources:oldSource.size,
    property_listings:oldProps.size,
    minimal_live:minimal.size,
    thin_index:thin.size,
    listing_representations:reps.size
  },
  pre_identity_candidates:candidates.length,
  identity_ambiguous_groups:ambiguousGroups,
  identity_quarantine_rows:quarantine.size,
  db_ready_rows:safe.length,
  by_domain:byDomain,
  core_provenance_combinations:provenanceCombos,
  output_sha256:sha(body),
  rejected_sha256:sha(rejectedBody),
  approved_for_import_rows:0,
  database_access:0,
  database_writes:0,
  production_neon_writes:0,
  vercel_deployment:false,
  source_freeze_artifact_id:10869399865,
  source_ledger_artifact_id:10930659218
};
fs.writeFileSync(path.join(outDir,"summary.json"),JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
