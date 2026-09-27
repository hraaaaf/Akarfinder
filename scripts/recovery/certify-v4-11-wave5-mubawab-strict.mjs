#!/usr/bin/env node
import fs from "node:fs";
import zlib from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";
import path from "node:path";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const ledger=arg("--ledger"),freezeDir=arg("--freeze-dir"),wave2=arg("--wave2"),out=arg("--output"),summary=arg("--summary"),rejectsOut=arg("--rejects");
if(!ledger||!freezeDir||!wave2||!out||!summary||!rejectsOut)throw new Error("missing args");

const VALID_EVIDENCE=new Set(["direct_http200","commoncrawl_recent","listing_source_active_recent","thin_fresh_confirmed_recent","representation_recent"]);
const ALLOWED_TYPES=new Set(["studio","apartment","riad","villa","house","land","office","commercial"]);
const TYPE_MAP={office_commercial:"office",farm:"land",local:"commercial"};
const TX_MAP={sale:"sale",rent:"rent",vente:"sale",location:"rent"};

function canon(raw){
 const u=new URL(String(raw).trim());u.protocol="https:";u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");u.hash="";
 for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|msclkid|yclid)$/i.test(k))u.searchParams.delete(k);
 u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";return u.toString();
}
function fp(url){return crypto.createHash("sha256").update("representation|"+url).digest("hex")}
function sha(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}
function fold(s){return String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[_-]+/g," ").replace(/\s+/g," ")}
function routeType(s){
 const x=fold(decodeURIComponent(s));
 const pats=[["studio",/\bstudio\b/],["apartment",/\b(?:appartement|appartements|apartment|apartments|flat|duplex)\b/],["riad",/\briad\b/],["villa",/\bvillas?\b/],["house",/\b(?:maison|maisons|house|houses|home)\b/],["land",/\b(?:terrain|terrains|land|lot|parcelle|ferme|farm)\b/],["office",/\b(?:bureau|bureaux|office|offices|plateau)\b/],["commercial",/\b(?:local commercial|commerce|commercial|magasin|magasins|shop|shops)\b/]];
 for(const [t,re] of pats)if(re.test(x))return t;return null;
}
function routeTx(s){
 const x=fold(decodeURIComponent(s));
 if(/\b(?:for rent|rent|rental|location|a louer|louer|lease)\b/.test(x))return "rent";
 if(/\b(?:for sale|sale|vente|a vendre|vendre|buy|achat)\b/.test(x))return "sale";
 return null;
}
function normType(v){if(v==null||v==="")return null;const x=String(v).toLowerCase().trim();return ALLOWED_TYPES.has(x)?x:(TYPE_MAP[x]||routeType(x))}
function normTx(v){if(v==null||v==="")return null;return TX_MAP[String(v).toLowerCase().trim()]||routeTx(v)}
function normCity(v){const x=fold(v);return x||null}
function titleFor(url,title,type,tx,city){
 const t=String(title||"").trim();if(t.length>=12)return t;
 const last=decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).at(-1)||"").replace(/[-_]+/g," ").replace(/\s+/g," ").trim();
 if(last.length>=12)return last[0].toUpperCase()+last.slice(1);
 const labels={studio:"Studio",apartment:"Appartement",riad:"Riad",villa:"Villa",house:"Maison",land:"Terrain",office:"Bureau",commercial:"Local commercial"};
 return labels[type]+" "+(tx==="rent"?"à louer":"à vendre")+" — "+city;
}
async function* gz(file){
 const rl=readline.createInterface({input:fs.createReadStream(file).pipe(zlib.createGunzip()),crlfDelay:Infinity});
 for await(const line of rl)if(line.trim())yield JSON.parse(line);
}
function addCandidate(rec,k,v,src,norm){
 if(v===undefined||v===null||v==="")return;
 const nv=norm(v);if(nv==null)return;
 if(!rec.candidates[k])rec.candidates[k]=new Map();
 if(!rec.candidates[k].has(nv))rec.candidates[k].set(nv,{value:v,sources:new Set()});
 rec.candidates[k].get(nv).sources.add(src);
}
function addOptional(rec,k,v,src){
 if(v===undefined||v===null||v==="")return;
 if(rec.optional[k]===undefined)rec.optional[k]={value:v,source:src};
}

const wave2Urls=new Set();
for(const line of fs.readFileSync(wave2,"utf8").split(/\r?\n/)){if(!line.trim())continue;const r=JSON.parse(line);if(r.source_name==="mubawab.ma")wave2Urls.add(canon(r.listing_url))}
if(wave2Urls.size!==11897)throw new Error("wave2 Mubawab count "+wave2Urls.size);

const rows=new Map();
for(const line of fs.readFileSync(ledger,"utf8").split(/\r?\n/)){
 if(!line.trim())continue;const r=JSON.parse(line);if(r.source_domain!=="mubawab.ma")continue;
 const u=canon(r.canonical_url);rows.set(u,{url:u,evidence:new Set(r.evidence||[]),candidates:{},optional:{}});
}
if(rows.size!==60359)throw new Error("verified Mubawab count "+rows.size);

for await(const r of gz(path.join(freezeDir,"minimal_live_search_documents_v1.jsonl.gz"))){
 const rec=r.canonical_url?rows.get(canon(r.canonical_url)):null;if(!rec)continue;
 addOptional(rec,"title",r.title,"freeze_minimal_live");addCandidate(rec,"city",r.city,"freeze_minimal_live",normCity);
 addCandidate(rec,"property_type",r.property_type,"freeze_minimal_live",normType);addCandidate(rec,"transaction_type",r.transaction_type,"freeze_minimal_live",normTx);
 addOptional(rec,"price_mad",r.price_mad,"freeze_minimal_live");addOptional(rec,"surface_m2",r.surface_m2,"freeze_minimal_live");addOptional(rec,"district",r.district,"freeze_minimal_live");
}
for await(const r of gz(path.join(freezeDir,"thin_index_search_documents.jsonl.gz"))){
 const rec=r.canonical_url?rows.get(canon(r.canonical_url)):null;if(!rec)continue;
 addOptional(rec,"title",r.title,"freeze_thin");addCandidate(rec,"city",r.normalized_city,"freeze_thin",normCity);
 addCandidate(rec,"property_type",r.normalized_property_type,"freeze_thin",normType);addCandidate(rec,"transaction_type",r.normalized_intent,"freeze_thin",normTx);
 addOptional(rec,"price_mad",r.normalized_price_mad,"freeze_thin");addOptional(rec,"surface_m2",r.normalized_surface_m2,"freeze_thin");
}
for await(const r of gz(path.join(freezeDir,"listing_representations.jsonl.gz"))){
 const rec=r.canonical_url?rows.get(canon(r.canonical_url)):null;if(!rec)continue;
 addOptional(rec,"title",r.title,"freeze_representation");addCandidate(rec,"city",r.city,"freeze_representation",normCity);
 addCandidate(rec,"property_type",r.property_type,"freeze_representation",normType);addCandidate(rec,"transaction_type",r.transaction_type,"freeze_representation",normTx);
 addOptional(rec,"price_mad",r.price_mad,"freeze_representation");addOptional(rec,"surface_m2",r.surface_m2,"freeze_representation");addOptional(rec,"district",r.district,"freeze_representation");
}

const outRows=[],rejects=[];const rejectionCounts={},evidenceCounts={};
for(const rec of rows.values()){
 if(wave2Urls.has(rec.url))continue;
 const ev=[...rec.evidence].filter(e=>VALID_EVIDENCE.has(e)).sort();
 if(!ev.length){rejects.push({listing_url:rec.url,reason:"insufficient_existence_evidence"});rejectionCounts.insufficient_existence_evidence=(rejectionCounts.insufficient_existence_evidence||0)+1;continue}
 for(const e of ev)evidenceCounts[e]=(evidenceCounts[e]||0)+1;

 const rcType=routeType(rec.url),rcTx=routeTx(rec.url);
 if(rcType)addCandidate(rec,"property_type",rcType,"route",normType);
 if(rcTx)addCandidate(rec,"transaction_type",rcTx,"route",normTx);

 const core={};let conflict=null;
 for(const k of ["city","property_type","transaction_type"]){
   const m=rec.candidates[k]||new Map();
   if(m.size===0){conflict="missing_"+k;break}
   if(m.size>1){conflict="conflict_"+k;break}
   core[k]=[...m.values()][0].value;
 }
 if(conflict){rejects.push({listing_url:rec.url,reason:conflict});rejectionCounts[conflict]=(rejectionCounts[conflict]||0)+1;continue}
 const city=String(core.city).trim(),type=normType(core.property_type),tx=normTx(core.transaction_type);
 if(!city||!type||!tx){rejects.push({listing_url:rec.url,reason:"normalization_failure"});rejectionCounts.normalization_failure=(rejectionCounts.normalization_failure||0)+1;continue}

 const title=titleFor(rec.url,rec.optional.title?.value,type,tx,city);
 const rawPrice=rec.optional.price_mad?.value,rawSurface=rec.optional.surface_m2?.value;
 const p=rawPrice==null?null:Math.round(Number(rawPrice)),s=rawSurface==null?null:Math.round(Number(rawSurface));
 const price=Number.isSafeInteger(p)?p:null,surface=Number.isSafeInteger(s)?s:null;
 outRows.push({
  canonical_fingerprint:fp(rec.url),title,price_mad:price,city,district:rec.optional.district?.value||null,
  property_type:type,transaction_type:tx,surface_m2:surface,rooms_count:null,bedrooms_count:null,bathrooms_count:null,
  description_snippet:null,images_count:null,seller_name:null,data_completeness_score:80+(price!==null?5:0)+(surface!==null?5:0)+(rec.optional.district?3:0),
  field_confidence:{certification:"v4.11_wave5_mubawab_strict_consistency",existence_evidence:ev,core_field_consistency:"single_normalized_value_across_freeze_and_route"},
  source_name:"mubawab.ma",listing_url:rec.url,source_url:"https://mubawab.ma",first_seen_at:null,last_seen_at:null,source_offer_key:null,
  origin_type:"external_index_seed",compliance_status:"recovery_verified_v4_11_wave5",content_fingerprint:fp(rec.url),ingestion_run_id:"clean-corpus-v4.11-wave5",
  displayed_price:price,price_currency:price!==null?"MAD":null,price_period:null,price_status:price!==null?"valid":"not_disclosed",approved_for_import:false
 });
}
if(new Set(outRows.map(r=>r.listing_url)).size!==outRows.length)throw new Error("URL duplicate");
if(new Set(outRows.map(r=>r.canonical_fingerprint)).size!==outRows.length)throw new Error("fingerprint duplicate");
fs.writeFileSync(out,outRows.map(r=>JSON.stringify(r)).join("\n")+(outRows.length?"\n":""));
fs.writeFileSync(rejectsOut,rejects.map(r=>JSON.stringify(r)).join("\n")+(rejects.length?"\n":""));
const s={schema_version:"akarfinder-v4.11-wave5-mubawab-strict-consistency-20260927",verified_mubawab_rows:60359,excluded_wave2_rows:11897,db_ready_rows:outRows.length,rejected_rows:rejects.length,rejection_counts:rejectionCounts,evidence_counts:evidenceCounts,output_sha256:sha(out),rejects_sha256:sha(rejectsOut),approved_for_import_rows:0,database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false};
fs.writeFileSync(summary,JSON.stringify(s,null,2)+"\n");console.log(JSON.stringify(s,null,2));
