#!/usr/bin/env tsx
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, basename } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";

const BASE=process.env.BASE_JSONL_GZ||"";
const ARTIFACT_DIR=process.env.DEEP_RESULTS_DIR||"";
const OUT=process.env.OUT_JSONL_GZ||"data/audits/raw-results/listings_scored_v3_3.jsonl.gz";
if(!BASE||!ARTIFACT_DIR) throw new Error("BASE_JSONL_GZ and DEEP_RESULTS_DIR required");

const weights:any={
  title:4,price_mad:6,surface_m2:5,city:5,district:3,property_type:4,transaction_type:4,
  source_listing_id:2,description:2,bedrooms_count:1.5,bathrooms_count:1,images_count:1,seller_name:1.5
};
function norm(raw:any){if(typeof raw!=="string"||!raw.trim())return null;try{const u=new URL(raw.trim());u.hash="";u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|ref)$/i.test(k))u.searchParams.delete(k);if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,"");return u.toString()}catch{return null}}
function comp(r:any){let x=0;for(const [f,w] of Object.entries(weights)){const v=r[f];if(v!==null&&v!==undefined&&v!=="")x+=Number(w)}return Math.min(40,x)}
function addSource(r:any,f:string,s:string){r.field_sources=r.field_sources||{};const cur=r.field_sources[f];if(!cur)r.field_sources[f]=[s];else if(typeof cur==="string"){r.field_sources[f]=cur===s?[cur]:[cur,s]}else if(Array.isArray(cur)&&!cur.includes(s))cur.push(s)}
function same(a:any,b:any){if(a==null||b==null)return a===b;if(typeof a==="number"&&typeof b==="number")return Math.abs(a-b)<=Math.max(1,Math.abs(a)*0.01);return String(a).trim().toLowerCase()===String(b).trim().toLowerCase()}
function setField(r:any,f:string,v:any,source:string){if(v===null||v===undefined||v==="")return;const cur=r[f];if(cur===null||cur===undefined||cur===""){r[f]=v;addSource(r,f,source);return}if(same(cur,v)){addSource(r,f,source);return}r.contradiction_flags=r.contradiction_flags||[];const flag=`conflict:${f}:deep_public`;if(!r.contradiction_flags.includes(flag))r.contradiction_flags.push(flag);addSource(r,f,source)}
function parseIsoFresh(v:any){if(typeof v!=="string"||!v)return null;const d=new Date(v);return Number.isFinite(d.getTime())?d:null}
function recalc(r:any){
 const sc=r.score||{};
 const oldComp=Number(sc.completeness||0),newComp=comp(r);
 sc.completeness=Math.max(oldComp,newComp);
 const pub=parseIsoFresh(r.published_at),last=parseIsoFresh(r.last_seen_at),upd=parseIsoFresh(r.updated_at);
 const dates=[pub,last,upd].filter(Boolean) as Date[];
 if(dates.length){
   const latest=new Date(Math.max(...dates.map(d=>d.getTime())));
   const days=Math.max(0,Math.floor((Date.now()-latest.getTime())/86400000));
   let fresh=0;if(days<=30)fresh=20;else if(days<=90)fresh=15;else if(days<=180)fresh=10;else if(days<=365)fresh=5;
   sc.freshness=Math.max(Number(sc.freshness||0),fresh);
 }
 for(const k of ["reliability","consistency","identity_dedup_confidence"])sc[k]=Number(sc[k]||0);
 sc.total=Number((sc.completeness+sc.freshness+sc.reliability+sc.consistency+sc.identity_dedup_confidence).toFixed(2));
 r.score=sc;r.quality_score=sc.total;
}
const baseText=gunzipSync(readFileSync(BASE)).toString("utf8");
const rows:any[]=[];const byUrl=new Map<string,any>();
for(const line of baseText.split(/\r?\n/)){if(!line.trim())continue;const r=JSON.parse(line);rows.push(r);const u=norm(r.canonical_url);if(u)byUrl.set(u,r)}
let observations=0,matched=0,updated=0;
for(const file of readdirSync(ARTIFACT_DIR).filter(f=>/^deep-batch-.*\.json$/.test(f))){
 const arr=JSON.parse(readFileSync(resolve(ARTIFACT_DIR,file),"utf8"));
 if(!Array.isArray(arr))continue;
 for(const x of arr){observations++;const u=norm(x.url||x.final_url);if(!u)continue;const r=byUrl.get(u);if(!r)continue;matched++;const before=JSON.stringify([r.title,r.description,r.price_mad,r.surface_m2,r.city,r.district,r.published_at,r.bedrooms_count,r.quality_score]);
   const src=`deep_public:${x.domain||"unknown"}`;
   for(const f of ["title","description","price_mad","surface_m2","address","published_at","city","district","bedrooms_count","source_listing_id"])setField(r,f,x[f],src);
   recalc(r);
   const after=JSON.stringify([r.title,r.description,r.price_mad,r.surface_m2,r.city,r.district,r.published_at,r.bedrooms_count,r.quality_score]);
   if(before!==after)updated++;
 }
}
rows.sort((a,b)=>Number(b.quality_score||0)-Number(a.quality_score||0)||String(a.canonical_url||"").localeCompare(String(b.canonical_url||"")));
const body=Buffer.from(rows.map(r=>JSON.stringify(r)).join("\n")+"\n");
const gz=gzipSync(body,{level:9});
mkdirSync(resolve(OUT,".."),{recursive:true});writeFileSync(OUT,gz);
const bands:any={"90-100":0,"80-89":0,"70-79":0,"60-69":0,"50-59":0,"40-49":0,"0-39":0};
for(const r of rows){const s=Number(r.quality_score||0);if(s>=90)bands["90-100"]++;else if(s>=80)bands["80-89"]++;else if(s>=70)bands["70-79"]++;else if(s>=60)bands["60-69"]++;else if(s>=50)bands["50-59"]++;else if(s>=40)bands["40-49"]++;else bands["0-39"]++}
const manifest={schema_version:"akarfinder-v3.3-merge-v1",rows:rows.length,observations,matched,updated,score_bands:bands,database_access:0,database_writes:0,sha256:createHash("sha256").update(gz).digest("hex")};
writeFileSync(OUT.replace(/\.jsonl\.gz$/,"-manifest.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify(manifest,null,2));
