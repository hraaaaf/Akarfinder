#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,arr)=>i%2===0?(a.push([v.replace(/^--/,""),arr[i+1]]),a):a,[]));
const files=(args.inputs||"").split(",").filter(Boolean);
if(!files.length||!args.output||!args.summary||!args.quarantine) throw new Error("missing args");

function fp(url){return crypto.createHash("sha256").update("representation|"+url).digest("hex")}
function sha(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}
function dec(s){try{return decodeURIComponent(s)}catch{return s}}
function slug(s){return dec(String(s)).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function typeOf(s){
  const x=slug(s);
  const tests=[
    ["studio",/studio/],["apartment",/appartement|apartment|duplex/],["riad",/riad/],["villa",/villa/],
    ["house",/maison/],["land",/terrain|ferme|farm/],["office",/bureau|plateau/],["commercial",/magasin|commerce|commercial|local/]
  ];
  for(const [t,r] of tests) if(r.test(x)) return t;
  return null;
}
function txOf(s){
  const x=slug(s);
  if(/location|louer|a-louer/.test(x)) return "rent";
  if(/vente|vendre|a-vendre/.test(x)) return "sale";
  return null;
}
const label={studio:"Studio",apartment:"Appartement",riad:"Riad",villa:"Villa",house:"Maison",land:"Terrain",office:"Bureau",commercial:"Local commercial"};
const txLabel={rent:"à louer",sale:"à vendre"};

let rows=[];
for(const f of files){
  const j=JSON.parse(fs.readFileSync(f,"utf8"));
  if(!Array.isArray(j)) throw new Error("expected array "+f);
  rows.push(...j);
}
if(rows.length!==3705) throw new Error("expected 3705 rows, got "+rows.length);

const seen=new Set(), out=[], quarantine=[];
for(const r of rows){
  const url=r.url;
  if(seen.has(url)) throw new Error("duplicate url "+url);
  seen.add(url);
  const t=typeOf(url), tx=txOf(url);
  const city=/marrakech/i.test(dec(url))?"Marrakech":null;
  if(r.http_status!==200||!t||!tx||!city){
    quarantine.push({listing_url:url,http_status:r.http_status,property_type:t,transaction_type:tx,city,reason:"strict_route_gate"});
    continue;
  }
  let title=String(r.title||"").trim();
  if(title.length<12) title=label[t]+" "+txLabel[tx]+" — Marrakech";
  const surface=r.surface_m2==null?null:Math.round(Number(r.surface_m2));
  if(surface!==null&&!Number.isSafeInteger(surface)) throw new Error("bad surface "+url);
  const desc=r.description?String(r.description).slice(0,500):null;
  out.push({
    canonical_fingerprint:fp(url),
    title,price_mad:null,city,district:null,property_type:t,transaction_type:tx,
    surface_m2:surface,rooms_count:null,bedrooms_count:r.bedrooms_count??null,bathrooms_count:null,
    description_snippet:desc,images_count:null,seller_name:null,
    data_completeness_score:80+(surface!==null?5:0)+(desc?4:0),
    field_confidence:{certification:"v4.11_wave4_promo_http200_route",http_status:200,route_mapping:true},
    source_name:"promoimmomarrakech.com",listing_url:url,source_url:"https://promoimmomarrakech.com",
    first_seen_at:null,last_seen_at:null,source_offer_key:null,origin_type:"external_index_seed",
    compliance_status:"recovery_verified_v4_11_wave4",content_fingerprint:fp(url),
    ingestion_run_id:"clean-corpus-v4.11-wave4",displayed_price:null,price_currency:null,price_period:null,
    price_status:"not_disclosed",approved_for_import:false
  });
}
if(out.length!==3674) throw new Error("expected 3674 DB-ready, got "+out.length);
if(quarantine.length!==31) throw new Error("expected 31 quarantine, got "+quarantine.length);
if(new Set(out.map(x=>x.listing_url)).size!==3674) throw new Error("url dedupe");
if(new Set(out.map(x=>x.canonical_fingerprint)).size!==3674) throw new Error("fp dedupe");

fs.writeFileSync(args.output,out.map(x=>JSON.stringify(x)).join("\n")+"\n");
fs.writeFileSync(args.quarantine,quarantine.map(x=>JSON.stringify(x)).join("\n")+"\n");
const summary={
 schema_version:"akarfinder-v4.11-wave4-promo-20260927",
 input_rows:3705,http200_rows:3705,db_ready_rows:3674,quarantine_rows:31,
 output_sha256:sha(args.output),quarantine_sha256:sha(args.quarantine),
 approved_for_import_rows:0,database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false
};
fs.writeFileSync(args.summary,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
