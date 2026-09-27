#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const input=arg("--input"), output=arg("--output"), quarantineOut=arg("--quarantine-output"), summaryOut=arg("--summary");
if(!input||!output||!quarantineOut||!summaryOut) throw new Error("missing args");

const CERTIFIED_AT="2026-09-27T08:40:00Z";
const ALLOWED=new Set(["apartment","land","villa","commercial","office","house","riad","studio"]);
const PT_MAP={office_commercial:"office",farm:"land"};

function fp(url){return crypto.createHash("sha256").update("representation|"+url).digest("hex")}
function sha(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}
function stripDiacritics(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function normSig(v){return typeof v==="string"?stripDiacritics(v).toLowerCase().trim().replace(/\s+/g," "):v}
function decodeSafe(s){try{return decodeURIComponent(s)}catch{return s}}
function titleCase(s){return s.toLowerCase().split(/\s+/).map(w=>w?w[0].toUpperCase()+w.slice(1):w).join(" ")}
const CITY_ALIASES={
  "casa":"Casablanca","casablanca":"Casablanca","dar el beida":"Casablanca",
  "rabat":"Rabat","marrakech":"Marrakech","marrakesh":"Marrakech",
  "tanger":"Tanger","tangier":"Tanger","fes":"Fès","fès":"Fès","fez":"Fès",
  "agadir":"Agadir","meknes":"Meknès","meknès":"Meknès","kenitra":"Kénitra","kénitra":"Kénitra",
  "mohammedia":"Mohammedia","oujda":"Oujda","tetouan":"Tétouan","tétouan":"Tétouan",
  "eljadida":"El Jadida","el jadida":"El Jadida","el-jadida":"El Jadida",
  "sale":"Salé","salé":"Salé","temara":"Témara","témara":"Témara",
  "beni-mellal":"Béni Mellal","béni-mellal":"Béni Mellal","beni mellal":"Béni Mellal","béni mellal":"Béni Mellal"
};
function normalizeCity(raw){
  const decoded=decodeSafe(String(raw??"")).trim();
  if(!decoded) return null;
  const key=decoded.toLowerCase().replace(/_/g," ").replace(/\s+/g," ").trim();
  if(CITY_ALIASES[key]) return CITY_ALIASES[key];
  return titleCase(decoded.replace(/_/g," ").replace(/\s+/g," ").trim());
}
function mapType(raw){
  if(ALLOWED.has(raw)) return raw;
  if(PT_MAP[raw]) return PT_MAP[raw];
  return null;
}
function bump(m,k){m[k]=(m[k]||0)+1}

const rows=fs.readFileSync(input,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
if(rows.length!==17238) throw new Error("expected 17238 pre-identity rows, got "+rows.length);

const pre=[], rejected=[];
for(const r of rows){
  const reasons=[];
  const f=r.fields||{};
  const property_type=mapType(f.property_type);
  if(!property_type) reasons.push("unsupported_or_unknown_property_type");
  if(!["sale","rent"].includes(f.transaction_type)) reasons.push("unsupported_transaction_type");
  const title=String(f.title??"").trim();
  if(title.length<12) reasons.push("weak_title");
  const city=normalizeCity(f.city);
  if(!city) reasons.push("missing_city");
  if(!Array.isArray(r.evidence)||r.evidence.length===0) reasons.push("missing_existence_evidence");
  if(reasons.length){rejected.push({canonical_url:r.canonical_url,source_domain:r.source_domain,reasons});continue}
  pre.push({...r,normalized:{city,property_type,transaction_type:f.transaction_type,title}});
}
if(rejected.filter(x=>x.reasons.includes("unsupported_or_unknown_property_type")).length!==8) throw new Error("expected 8 unsupported types");
if(rejected.filter(x=>x.reasons.includes("weak_title")).length!==40) throw new Error("expected 40 weak titles");
if(pre.length!==17190) throw new Error("expected 17190 after field gates, got "+pre.length);

const sigFields=["city","property_type","transaction_type","price_mad","surface_m2"];
const groups=new Map();
for(const r of pre){
  const f=r.fields||{};
  const vals=[r.normalized.city,r.normalized.property_type,r.normalized.transaction_type,f.price_mad,f.surface_m2];
  if(vals.some(v=>v===null||v===undefined||v==="")) continue;
  const key=JSON.stringify(vals.map(normSig));
  const a=groups.get(key)||[]; a.push(r); groups.set(key,a);
}
const ambiguous=[...groups.entries()].filter(([,g])=>g.length>1&&new Set(g.map(x=>x.source_domain)).size>1);
if(ambiguous.length!==66) throw new Error("expected 66 ambiguous groups, got "+ambiguous.length);
const quarantineUrls=new Set();
for(const [,g] of ambiguous) for(const r of g) quarantineUrls.add(r.canonical_url);
if(quarantineUrls.size!==166) throw new Error("expected 166 identity-quarantine rows, got "+quarantineUrls.size);

const safe=pre.filter(r=>!quarantineUrls.has(r.canonical_url));
if(safe.length!==17024) throw new Error("expected 17024 DB-ready rows, got "+safe.length);
if(new Set(safe.map(r=>r.canonical_url)).size!==safe.length) throw new Error("duplicate canonical URLs");

const out=[];
for(const r of safe){
  const f=r.fields||{};
  const priceRaw=f.price_mad??null, surfaceRaw=f.surface_m2??null;
  const price=priceRaw==null?null:Math.round(Number(priceRaw));
  const surface=surfaceRaw==null?null:Math.round(Number(surfaceRaw));
  if(price!==null&&!Number.isSafeInteger(price)) throw new Error("invalid price "+r.canonical_url);
  if(surface!==null&&!Number.isSafeInteger(surface)) throw new Error("invalid surface "+r.canonical_url);
  const score=80
    +(price!==null?5:0)
    +(surface!==null?5:0)
    +(f.district?3:0)
    +(f.bedrooms_count!=null?3:0)
    +(f.description_snippet?4:0);
  out.push({
    canonical_fingerprint:fp(r.canonical_url),
    title:r.normalized.title,
    price_mad:price,
    city:r.normalized.city,
    district:f.district??null,
    property_type:r.normalized.property_type,
    transaction_type:r.normalized.transaction_type,
    surface_m2_raw:surfaceRaw,
    surface_m2:surface,
    rooms_count:null,
    bedrooms_count:f.bedrooms_count??null,
    bathrooms_count:null,
    description_snippet:f.description_snippet?String(f.description_snippet).slice(0,500):null,
    images_count:null,
    seller_name:null,
    data_completeness_score:score,
    field_confidence:{
      certification:"v4.11_wave2_pre_db_verified",
      existence_evidence:r.evidence,
      field_sources:r.field_sources,
      city_source_value:f.city,
      city_normalized_value:r.normalized.city,
      property_type_source_value:f.property_type,
      property_type_normalized_value:r.normalized.property_type,
      price_mad_raw:priceRaw,
      surface_m2_raw:surfaceRaw
    },
    source_name:r.source_domain,
    listing_url:r.canonical_url,
    source_url:"https://"+r.source_domain,
    first_seen_at:null,
    last_seen_at:null,
    source_offer_key:null,
    origin_type:"external_index_seed",
    compliance_status:"recovery_verified_v4_11_wave2",
    content_fingerprint:fp(r.canonical_url),
    ingestion_run_id:"clean-corpus-v4.11-wave2",
    displayed_price:price,
    price_currency:price!==null?"MAD":null,
    price_period:null,
    price_status:price!==null?"valid":"not_disclosed",
    approved_for_import:false
  });
}
if(new Set(out.map(x=>x.canonical_fingerprint)).size!==out.length) throw new Error("fingerprint duplicate");
fs.writeFileSync(output,out.map(x=>JSON.stringify(x)).join("\n")+"\n");

const qrows=[];
for(const r of pre.filter(x=>quarantineUrls.has(x.canonical_url))){
  qrows.push({canonical_url:r.canonical_url,source_domain:r.source_domain,reason:"cross_source_identity_ambiguity"});
}
for(const r of rejected)qrows.push({...r,reason:"field_gate"});
fs.writeFileSync(quarantineOut,qrows.map(x=>JSON.stringify(x)).join("\n")+"\n");

const byDomain=out.reduce((m,r)=>(bump(m,r.source_name),m),{});
const byType=out.reduce((m,r)=>(bump(m,r.property_type),m),{});
const summary={
  schema_version:"akarfinder-v4.11-db-ready-wave2-20260927",
  input_pre_identity_rows:17238,
  field_gate_pass_rows:17190,
  rejected_unknown_type_rows:8,
  rejected_weak_title_rows:40,
  identity_ambiguous_groups:66,
  identity_quarantine_rows:166,
  db_ready_rows:17024,
  by_domain:byDomain,
  by_property_type:byType,
  approved_for_import_rows:0,
  source_ledger_artifact_id:10927761643,
  source_ledger_digest:"sha256:e549dddcc5e8f4d47b82af81096cfd5f2e46caa1c2757cd068bc7bc6fcc0e01f",
  output_sha256:sha(output),
  quarantine_sha256:sha(quarantineOut),
  certification_time:CERTIFIED_AT,
  database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false,
  rule:"Only existence-verified + core product fields + supported normalized taxonomy + no contradiction + conservative cross-source identity-safe rows qualify."
};
fs.writeFileSync(summaryOut,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
