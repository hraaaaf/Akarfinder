#!/usr/bin/env node
import fs from "node:fs";
import zlib from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";
import path from "node:path";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const ledger=arg("--ledger"),freezeDir=arg("--freeze-dir"),wave2=arg("--wave2"),out=arg("--output"),summary=arg("--summary"),rejectsOut=arg("--rejects");
if(!ledger||!freezeDir||!wave2||!out||!summary||!rejectsOut)throw new Error("missing args");

const RECENT=new Set(["direct_http200","commoncrawl_recent","listing_source_active_recent","thin_fresh_confirmed_recent","minimal_live_recent","representation_recent"]);
const ALLOWED_TYPES=new Set(["studio","apartment","riad","villa","house","land","office","commercial"]);
const TYPE_MAP={office_commercial:"office",farm:"land",local:"commercial"};
const TX_MAP={sale:"sale",rent:"rent",vente:"sale",location:"rent"};

function canon(raw){
 const u=new URL(String(raw).trim());u.protocol="https:";u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");u.hash="";
 for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|msclkid|yclid)$/i.test(k))u.searchParams.delete(k);
 u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
 return u.toString();
}
function fp(url){return crypto.createHash("sha256").update("representation|"+url).digest("hex")}
function sha(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}
function normText(s){return decodeURIComponent(String(s)).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function routeType(s){
 const x=normText(s);
 const pats=[
  ["studio",/\bstudio\b/],["apartment",/\b(?:appartement|appartements|apartment|apartments|flat|duplex)\b/],
  ["riad",/\briad\b/],["villa",/\b(?:villa|villas)\b/],["house",/\b(?:maison|maisons|house|houses|home)\b/],
  ["land",/\b(?:terrain|terrains|land|lot|parcelle|ferme|farm)\b/],["office",/\b(?:bureau|bureaux|office|offices|plateau)\b/],
  ["commercial",/\b(?:local commercial|local|commerce|commercial|magasin|magasins|shop|shops)\b/]
 ];
 for(const [t,re] of pats)if(re.test(x))return t;
 return null;
}
function routeTx(s){
 const x=normText(s);
 if(/\b(?:for rent|rent|rental|location|a louer|louer|lease)\b/.test(x))return "rent";
 if(/\b(?:for sale|sale|vente|a vendre|vendre|buy|achat)\b/.test(x))return "sale";
 return null;
}
function normType(v){
 if(v==null)return null;const x=String(v).toLowerCase().trim();
 return ALLOWED_TYPES.has(x)?x:(TYPE_MAP[x]||routeType(x));
}
function normTx(v){if(v==null)return null;return TX_MAP[String(v).toLowerCase().trim()]||routeTx(v)}
function cleanTitle(url,title,type,tx,city){
 const t=String(title||"").trim();
 if(t.length>=12)return t;
 const last=decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).at(-1)||"").replace(/[-_]+/g," ").replace(/\s+/g," ").trim();
 if(last.length>=12)return last[0].toUpperCase()+last.slice(1);
 const labels={studio:"Studio",apartment:"Appartement",riad:"Riad",villa:"Villa",house:"Maison",land:"Terrain",office:"Bureau",commercial:"Local commercial"};
 return labels[type]+" "+(tx==="rent"?"à louer":"à vendre")+" — "+city;
}
async function* gz(file){
 const rl=readline.createInterface({input:fs.createReadStream(file).pipe(zlib.createGunzip()),crlfDelay:Infinity});
 for await(const line of rl)if(line.trim())yield JSON.parse(line);
}
function put(rec,k,v,src){if((rec[k]===undefined||rec[k]===null||rec[k]==="")&&v!==undefined&&v!==null&&v!==""){rec[k]=v;rec[k+"_src"]=src}}

const wave2Urls=new Set();
for(const line of fs.readFileSync(wave2,"utf8").split(/\r?\n/)){if(!line.trim())continue;const r=JSON.parse(line);if(r.source_name==="mubawab.ma")wave2Urls.add(canon(r.listing_url))}
if(wave2Urls.size!==11897)throw new Error("wave2 Mubawab count "+wave2Urls.size);

const rows=new Map();
for(const line of fs.readFileSync(ledger,"utf8").split(/\r?\n/)){
 if(!line.trim())continue;const r=JSON.parse(line);if(r.source_domain!=="mubawab.ma")continue;
 const u=canon(r.canonical_url);rows.set(u,{url:u,evidence:new Set(r.evidence||[])});
}
if(rows.size!==60359)throw new Error("verified Mubawab count "+rows.size);

for await(const r of gz(path.join(freezeDir,"minimal_live_search_documents_v1.jsonl.gz"))){
 const u=r.canonical_url?canon(r.canonical_url):null,rec=u?rows.get(u):null;if(!rec)continue;
 for(const k of ["title","city","property_type","transaction_type","price_mad","surface_m2","district"])put(rec,k,r[k],"freeze_minimal_live");
}
for await(const r of gz(path.join(freezeDir,"thin_index_search_documents.jsonl.gz"))){
 const u=r.canonical_url?canon(r.canonical_url):null,rec=u?rows.get(u):null;if(!rec)continue;
 const map={title:"title",normalized_city:"city",normalized_property_type:"property_type",normalized_intent:"transaction_type",normalized_price_mad:"price_mad",normalized_surface_m2:"surface_m2"};
 for(const [src,k] of Object.entries(map))put(rec,k,r[src],"freeze_thin");
}
for await(const r of gz(path.join(freezeDir,"listing_representations.jsonl.gz"))){
 const u=r.canonical_url?canon(r.canonical_url):null,rec=u?rows.get(u):null;if(!rec)continue;
 for(const k of ["title","city","property_type","transaction_type","price_mad","surface_m2","district"])put(rec,k,r[k],"freeze_representation");
}

const outRows=[],rejects=[];const tiers={};
for(const rec of rows.values()){
 if(wave2Urls.has(rec.url))continue;
 const ev=[...rec.evidence].filter(e=>RECENT.has(e));
 if(!ev.length){rejects.push({listing_url:rec.url,reason:"no_recent_evidence"});continue}
 const city=String(rec.city||"").trim()||null;
 const type=normType(rec.property_type)||routeType(rec.url);
 const tx=normTx(rec.transaction_type)||routeTx(rec.url);
 if(!city||!type||!tx){rejects.push({listing_url:rec.url,reason:"missing_city_type_or_transaction",city:!!city,type,transaction:tx});continue}
 const strong=ev.some(e=>["direct_http200","commoncrawl_recent","listing_source_active_recent","thin_fresh_confirmed_recent"].includes(e));
 tiers[strong?"strong":"recent_freeze_only"]=(tiers[strong?"strong":"recent_freeze_only"]||0)+1;
 const title=cleanTitle(rec.url,rec.title,type,tx,city);
 const price=rec.price_mad==null?null:Math.round(Number(rec.price_mad));
 const surface=rec.surface_m2==null?null:Math.round(Number(rec.surface_m2));
 outRows.push({
  canonical_fingerprint:fp(rec.url),title,price_mad:Number.isSafeInteger(price)?price:null,city,district:rec.district||null,
  property_type:type,transaction_type:tx,surface_m2:Number.isSafeInteger(surface)?surface:null,rooms_count:null,bedrooms_count:null,bathrooms_count:null,
  description_snippet:null,images_count:null,seller_name:null,
  data_completeness_score:80+(price!=null?5:0)+(surface!=null?5:0)+(rec.district?3:0),
  field_confidence:{certification:"v4.11_wave5_mubawab_recent_freeze_route",existence_evidence:ev,evidence_tier:strong?"strong":"recent_freeze_only",city_source:rec.city_src||null,type_source:rec.property_type_src||"route",transaction_source:rec.transaction_type_src||"route"},
  source_name:"mubawab.ma",listing_url:rec.url,source_url:"https://mubawab.ma",first_seen_at:null,last_seen_at:null,source_offer_key:null,
  origin_type:"external_index_seed",compliance_status:"recovery_verified_v4_11_wave5",content_fingerprint:fp(rec.url),ingestion_run_id:"clean-corpus-v4.11-wave5",
  displayed_price:Number.isSafeInteger(price)?price:null,price_currency:Number.isSafeInteger(price)?"MAD":null,price_period:null,price_status:Number.isSafeInteger(price)?"valid":"not_disclosed",approved_for_import:false
 });
}
if(outRows.length!==27428)throw new Error("expected 27428 DB-ready, got "+outRows.length);
if(new Set(outRows.map(r=>r.listing_url)).size!==outRows.length)throw new Error("URL duplicate");
if(new Set(outRows.map(r=>r.canonical_fingerprint)).size!==outRows.length)throw new Error("fingerprint duplicate");
fs.writeFileSync(out,outRows.map(r=>JSON.stringify(r)).join("\n")+"\n");
fs.writeFileSync(rejectsOut,rejects.map(r=>JSON.stringify(r)).join("\n")+(rejects.length?"\n":""));
const s={schema_version:"akarfinder-v4.11-wave5-mubawab-offline-20260927",verified_mubawab_rows:60359,excluded_wave2_rows:11897,db_ready_rows:outRows.length,evidence_tiers:tiers,rejected_rows:rejects.length,output_sha256:sha(out),rejects_sha256:sha(rejectsOut),approved_for_import_rows:0,database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false};
fs.writeFileSync(summary,JSON.stringify(s,null,2)+"\n");console.log(JSON.stringify(s,null,2));
