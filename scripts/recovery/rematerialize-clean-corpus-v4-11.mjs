#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
const freezeDir=arg("--freeze-dir"), reservoirDir=arg("--reservoir-dir"), deepDir=arg("--deep-dir"), output=arg("--output"), manifestPath=arg("--manifest");
if(!freezeDir||!reservoirDir||!deepDir||!output||!manifestPath) throw new Error("missing required args");

function canonicalize(url){
  const u=new URL(String(url).trim());
  u.hostname=u.hostname.replace(/^www\./i,"").toLowerCase();
  u.hash="";
  if(u.pathname.length>1) u.pathname=u.pathname.replace(/\/+$/,"");
  return u.toString();
}
function normalizedPath(url){return decodeURIComponent(new URL(url).pathname).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
const SHORT_STAY_TOKENS=["location-de-vacances","locations_de_vacances","par-jour","par-journee","par-nuit","vacance","vacances","journalier","journaliere","saisonnier","saisonniere"];
function isShortStay(url){const p=normalizedPath(url);return SHORT_STAY_TOKENS.some(t=>p.includes(t))}
const manualExpired=new Set(["sarouty.ma:894278","sarouty.ma:868140","sarouty.ma:854148","avito.ma:56197165","avito.ma:57083720","avito.ma:54965575","avito.ma:57118364","mubawab.ma:7781144","mubawab.ma:8176614"]);
function sourceId(url){
  const u=new URL(url), host=u.hostname.replace(/^www\./,"").toLowerCase(), p=decodeURIComponent(u.pathname).toLowerCase().replace(/\/+$/,"");
  let m=null;
  if(host==="avito.ma") m=p.match(/_(\d{7,})\.htm$/);
  else if(host==="mubawab.ma") m=p.match(/\/(?:a|pa)\/(\d+)/);
  else if(host==="sarouty.ma") m=p.match(/-(\d+)(?:\.html)?$/);
  return m?host+":"+m[1]:null;
}
function isTerminalAtlas(url){
  const u=new URL(url), host=u.hostname.replace(/^www\./,"").toLowerCase(), p=normalizedPath(url);
  return host==="atlasimmobilier.com" && /(?:sold-quickly|successfully-sold|sold-by-our-agency|(?:vendu|vendue)-rapidement|vendu-avec-succes|vendue-par-notre-agence)/.test(p);
}
async function* gzJsonl(file){
  const rl=readline.createInterface({input:fs.createReadStream(file).pipe(zlib.createGunzip()),crlfDelay:Infinity});
  for await(const line of rl){if(line.trim()) yield JSON.parse(line)}
}
function txtLines(file){return fs.readFileSync(file,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
function assertEq(actual,expected,label){if(actual!==expected) throw new Error(label+": expected "+expected+", got "+actual)}

const freezeEligible=new Set(), thinCategory=new Set();
for await(const r of gzJsonl(path.join(freezeDir,"listing_representations.jsonl.gz"))){
  if(["eligible_primary","eligible_secondary"].includes(String(r.display_eligibility)) && r.canonical_url) freezeEligible.add(canonicalize(r.canonical_url));
}
for await(const r of gzJsonl(path.join(freezeDir,"thin_index_search_documents.jsonl.gz"))){
  if(r.document_kind==="CATEGORY" && r.canonical_url) thinCategory.add(canonicalize(r.canonical_url));
}

const reservoirFiles=[
  "recovery-big-portal-mubawab-ma.txt","recovery-big-portal-avito-ma.txt",
  "recovery-big-sitemap-sarout-ma.txt","recovery-big-sitemap-marocimmo-com.txt",
  "recovery-big-portal-agenz-ma.txt","recovery-domio-category-detail-urls.txt",
  "recovery-big-portal-daragadir-com.txt","recovery-big-sitemap-daragadir-com.txt",
  "recovery-big-portal-promoimmomarrakech-com.txt","recovery-big-sitemap-promoimmomarrakech-com.txt",
  "recovery-big-portal-masaken-ma.txt","recovery-big-portal-mouldar-com.txt",
  "recovery-big-portal-soukimmobilier-com.txt","recovery-big-portal-sarouty-ma.txt",
  "recovery-big-portal-marocannonces-com.txt"
];
const reservoir=new Set();
for(const name of reservoirFiles){
  const file=path.join(reservoirDir,name);
  if(!fs.existsSync(file)) throw new Error("missing reservoir file: "+name);
  for(const raw of txtLines(file)) reservoir.add(canonicalize(raw));
}

const union=new Set([...freezeEligible,...reservoir]);
const deepByUrl=new Map();
let deepObservations=0,http200Obs=0,http503Obs=0,http0Obs=0;
for(const name of fs.readdirSync(deepDir).filter(n=>/^deep-batch-.*\.json$/.test(n) && !n.endsWith("-summary.json")).sort()){
  const arr=JSON.parse(fs.readFileSync(path.join(deepDir,name),"utf8"));
  if(!Array.isArray(arr)) throw new Error("deep artifact is not array: "+name);
  for(const x of arr){
    deepObservations++;
    const url=canonicalize(x.url||x.final_url);
    const status=Number(x.http_status);
    if(status===200) http200Obs++; else if(status===503) http503Obs++; else if(status===0) http0Obs++;
    const cur=deepByUrl.get(url)||{statuses:new Set(),observation_count:0,fields:{},contradictions:new Set()};
    cur.statuses.add(status); cur.observation_count++;
    if(status===200){
      for(const field of ["source_listing_id","title","description","price_mad","surface_m2","address","published_at","city","district","bedrooms_count"]){
        const incoming=x[field];
        if(incoming===null||incoming===undefined||incoming==="") continue;
        if(cur.fields[field]===undefined) cur.fields[field]=incoming;
        else if(String(cur.fields[field])!==String(incoming)) cur.contradictions.add("deep_conflict:"+field);
      }
    }
    deepByUrl.set(url,cur);
  }
}

assertEq(freezeEligible.size,98666,"freeze eligible");
assertEq(reservoir.size,149473,"reservoir unique");
assertEq([...freezeEligible].filter(u=>reservoir.has(u)).length,21853,"freeze/reservoir overlap");
assertEq(union.size,226286,"union");
assertEq(deepObservations,10500,"deep observations");
assertEq(deepByUrl.size,10495,"deep unique urls");
assertEq(http200Obs,8492,"HTTP200 observations");
assertEq(http503Obs,1955,"HTTP503 observations");
assertEq(http0Obs,53,"HTTP0 observations");
assertEq([...deepByUrl].filter(([,v])=>v.statuses.has(200)).length,8487,"unique HTTP200 urls");
assertEq([...deepByUrl.keys()].filter(u=>union.has(u)).length,10495,"deep urls matched to union");

const rows=[], classification={KEEP:0,EXPIRED:0,NON_REAL_ESTATE:0}, scope={eligible:0,ineligible:0,short_stay:0};
for(const url of [...union].sort()){
  const isCategory=thinCategory.has(url);
  const sid=sourceId(url);
  const expired=(sid&&manualExpired.has(sid))||isTerminalAtlas(url);
  const cls=isCategory?"NON_REAL_ESTATE":expired?"EXPIRED":"KEEP";
  const shortStay=isShortStay(url);
  const exclusions=[];
  if(shortStay) exclusions.push("short_stay_route");
  if(cls==="EXPIRED") exclusions.push("expired");
  if(cls==="NON_REAL_ESTATE") exclusions.push("non_real_estate");
  const eligible=cls==="KEEP"&&exclusions.length===0;
  const deep=deepByUrl.get(url);
  rows.push({
    canonical_url:url,
    source_domain:new URL(url).hostname.replace(/^www\./,"").toLowerCase(),
    from_freeze_eligible:freezeEligible.has(url),
    from_recovery_reservoir:reservoir.has(url),
    classification:cls,
    scope_eligible:eligible,
    scope_exclusion_reasons:exclusions,
    approved_for_import:false,
    deep_observation_count:deep?.observation_count||0,
    deep_http_statuses:deep?[...deep.statuses].sort((a,b)=>a-b):[],
    ...(deep?.fields||{}),
    contradiction_flags:deep?[...deep.contradictions].sort():[]
  });
  classification[cls]++; scope[eligible?"eligible":"ineligible"]++; if(shortStay) scope.short_stay++;
}
assertEq(classification.KEEP,225952,"KEEP");
assertEq(classification.EXPIRED,45,"EXPIRED");
assertEq(classification.NON_REAL_ESTATE,289,"NON_REAL_ESTATE");
assertEq(scope.eligible,222359,"scope eligible");
assertEq(scope.ineligible,3927,"scope ineligible");
assertEq(scope.short_stay,3613,"short stay");

const body=Buffer.from(rows.map(r=>JSON.stringify(r)).join("\n")+"\n");
const gz=zlib.gzipSync(body,{level:9});
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,gz);
const sha=crypto.createHash("sha256").update(gz).digest("hex");
const manifest={
  schema_version:"akarfinder-clean-corpus-v4.11-core-rematerialized-20260926",
  rows:rows.length, freeze_eligible_unique:freezeEligible.size, recovery_reservoir_unique:reservoir.size,
  overlap:21853, classification_counts:classification, scope_counts:scope,
  deep_observations:deepObservations, deep_unique_urls:deepByUrl.size,
  deep_http_200_observations:http200Obs, deep_unique_http_200_urls:8487,
  deep_http_503_observations:http503Obs, deep_http_0_observations:http0Obs,
  approved_for_import_rows:0, database_access:0, database_writes:0, sha256_gzip:sha,
  note:"Core rematerialization certifies URL union, classification, scope and cumulative deep evidence. Lifecycle aggregate remains separately audited in reconstruction manifest."
};
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify(manifest,null,2));
