#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const rejectedFile=arg("--wave6-rejected");
const wave8File=arg("--wave8");
const freezeDir=arg("--freeze-dir");
const outDir=arg("--out-dir");
if(!rejectedFile||!wave8File||!freezeDir||!outDir)throw new Error("missing args");

const TARGETS=new Set(["mubawab.ma","avito.ma"]);
const ALLOWED_PT=new Set(["apartment","studio","land","villa","house","riad","office","commercial"]);
const PT_LABEL={apartment:"Appartement",studio:"Studio",villa:"Villa",house:"Maison",land:"Terrain",office:"Bureau",commercial:"Local commercial",riad:"Riad"};
const TX_LABEL={sale:"à vendre",rent:"à louer"};

function sha(v){return crypto.createHash("sha256").update(v).digest("hex")}
function fp(u){return sha("representation|"+u)}
function dec(v){try{return decodeURIComponent(String(v))}catch{return String(v)}}
function nonEmpty(v){return v!=null&&String(v).trim()!==""}
function canon(raw){
  const u=new URL(String(raw).trim());
  u.protocol="https:";
  u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
  u.hash="";
  for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|msclkid|yclid)$/i.test(k))u.searchParams.delete(k);
  u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
  return u.toString();
}
function domainOf(raw){try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,"")}catch{return null}}
function identity(raw,domain=null){
  const u=canon(raw),d=domain||domainOf(u),p=dec(new URL(u).pathname);
  let m=null;
  if(d==="mubawab.ma")m=p.match(/\/(?:a|pa)\/(\d+)(?:\/|$)/i);
  else if(d==="avito.ma")m=p.match(/_(\d+)\.html?$/i);
  return m?d+"|"+m[1]:null;
}
function offerId(k){return k?k.split("|")[1]:null}
function titleCase(s){return String(s).toLowerCase().split(/\s+/).filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1)).join(" ")}
function normCity(v){
  if(v==null)return null;
  const s=dec(v).trim();if(!s)return null;
  const aliases={
    casablanca:"Casablanca",casa:"Casablanca",rabat:"Rabat",marrakech:"Marrakech",marrakesh:"Marrakech",
    tanger:"Tanger",tangier:"Tanger",fes:"Fès","fès":"Fès",fez:"Fès",agadir:"Agadir",
    meknes:"Meknès","meknès":"Meknès",kenitra:"Kénitra","kénitra":"Kénitra",mohammedia:"Mohammedia",
    oujda:"Oujda",tetouan:"Tétouan","tétouan":"Tétouan",sale:"Salé","salé":"Salé",
    temara:"Témara","témara":"Témara",essaouira:"Essaouira",bouskoura:"Bouskoura",bouznika:"Bouznika",
    "el jadida":"El Jadida","dar bouazza":"Dar Bouazza",safi:"Safi",nador:"Nador",dakhla:"Dakhla",
    laayoune:"Laâyoune",berrechid:"Berrechid",martil:"Martil",ifrane:"Ifrane",taghazout:"Taghazout",ourika:"Ourika"
  };
  const k=s.toLowerCase().replace(/[-_]+/g," ").replace(/\s+/g," ").trim();
  return aliases[k]||titleCase(k);
}
function normPt(v){
  if(v==null)return null;
  const s=String(v).toLowerCase().trim();
  const m={
    apartment:"apartment",apartments:"apartment",appartement:"apartment",appartements:"apartment",flat:"apartment",duplex:"apartment",
    studio:"studio",land:"land",terrain:"land",terrains:"land",villa:"villa",villas:"villa",house:"house",maison:"house",
    maisons:"house",riad:"riad",office:"office",bureau:"office",bureaux:"office",commercial:"commercial",
    commerce:"commercial",local:"commercial","local commercial":"commercial","locaux-magasins":"commercial"
  };
  const x=m[s]||s;return ALLOWED_PT.has(x)?x:null;
}
function normTx(v){
  if(v==null)return null;
  const s=String(v).toLowerCase().trim();
  if(["sale","vente","buy","achat","for-sale","a-vendre"].includes(s))return "sale";
  if(["rent","location","rental","for-rent","a-louer"].includes(s))return "rent";
  return null;
}
function intOrNull(v){if(v==null||v==="")return null;const n=Number(v);return Number.isFinite(n)?Math.round(n):null}
function loadJsonl(file){return fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse)}
async function* gzJsonl(file){
  const rl=readline.createInterface({input:fs.createReadStream(file).pipe(zlib.createGunzip()),crlfDelay:Infinity});
  for await(const line of rl)if(line.trim())yield JSON.parse(line);
}
function pushMap(map,key,value){const a=map.get(key)||[];a.push(value);map.set(key,a)}
function priority(src){return {old_property:0,minimal_live:1,thin_index:2,listing_representation:3}[src.split(":")[0]]??99}
function routeFallback(url){
  const p=dec(new URL(url).pathname),seg=p.split("/").filter(Boolean);
  const norm=s=>dec(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
  const text=norm(p);
  let transaction_type=null,property_type=null,title=null,city=null;

  const rent=/(?:^|\b)(a louer|louer|location|rent|rental|for rent)(?:\b|$)/.test(text);
  const sale=/(?:^|\b)(a vendre|vendre|vente|achat|for sale|to buy)(?:\b|$)/.test(text) || /(?:^|[\/_-])sale(?:[\/_-]|$)/i.test(p);
  if(rent!==sale)transaction_type=rent?"rent":"sale";

  const checks=[
    ["studio",/\bstudios?\b/],
    ["apartment",/\b(appartements?|apartments?|appart|appt|flat|duplex)\b/],
    ["villa",/\bvillas?\b/],
    ["house",/\b(maisons?|houses?|housing)\b/],
    ["land",/\b(terrains?|land|plot|parcelle)\b/],
    ["office",/\b(bureaux?|offices?)\b/],
    ["commercial",/\b(local commercial|locaux|local|commercial|shops?|magasins?|commerce)\b/],
    ["riad",/\briads?\b/]
  ];
  const ptHits=[...new Set(checks.filter(([,re])=>re.test(text)).map(([x])=>x))];
  if(ptHits.length===1)property_type=ptHits[0];

  const cityChecks=[
    ["Casablanca",/\b(casablanca|casa)\b/],["Rabat",/\brabat\b/],["Marrakech",/\b(marrakech|marrakesh)\b/],
    ["Tanger",/\b(tanger|tangier)\b/],["Fès",/\b(fes|fez)\b/],["Agadir",/\bagadir\b/],
    ["Meknès",/\bmeknes\b/],["Kénitra",/\bkenitra\b/],["Mohammedia",/\bmohammedia\b/],["Oujda",/\boujda\b/],
    ["Tétouan",/\btetouan\b/],["Témara",/\btemara\b/],["Essaouira",/\bessaouira\b/],["Bouskoura",/\bbouskoura\b/],
    ["Bouznika",/\bbouznika\b/],["El Jadida",/\bel jadida\b/],["Dar Bouazza",/\bdar bouazza\b/],["Safi",/\bsafi\b/],
    ["Nador",/\bnador\b/],["Dakhla",/\bdakhla\b/],["Laâyoune",/\blaayoune\b/],["Berrechid",/\bberrechid\b/],
    ["Martil",/\bmartil\b/],["Ifrane",/\bifrane\b/],["Taghazout",/\btaghazout\b/],["Ourika",/\bourika\b/],
    ["Skhirat",/\bskhirat\b/],["Harhoura",/\bharhoura\b/],["Tamesna",/\btamesna\b/],["Khémisset",/\bkhemisset\b/]
  ];
  const cityHits=[...new Set(cityChecks.filter(([,re])=>re.test(text)).map(([x])=>x))];
  if(cityHits.length===1)city=cityHits[0];

  let slug=dec(seg.at(-1)||"").replace(/\.html?$/i,"").replace(/_\d{5,}$/,"").replace(/^\d{2,}_/,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
  if(slug.length>=12&&!/^\d+$/.test(slug)&&[...slug].filter(ch=>/[A-Za-zÀ-ÿ]/.test(ch)).length>=8)title=slug[0].toUpperCase()+slug.slice(1);
  return {transaction_type,property_type,title,city};
}
function collect(records,url){
  const vals={city:[],property_type:[],transaction_type:[]},titles=[];
  for(const {src,obj} of records){
    if(src==="listing_source")continue;
    const add=(k,v,norm)=>{if(nonEmpty(v)){const x=norm(v);if(x!=null)vals[k].push([x,src,v])}};
    if(src==="old_property"||src==="minimal_live"||src==="listing_representation"){
      add("city",obj.city,normCity);add("property_type",obj.property_type,normPt);add("transaction_type",obj.transaction_type,normTx);
      if(nonEmpty(obj.title))titles.push([String(obj.title).trim(),src,obj.title]);
    }else if(src==="thin_index"){
      for(const k of ["normalized_city","city","recovered_city"])add("city",obj[k],normCity);
      for(const k of ["normalized_property_type","property_type"])add("property_type",obj[k],normPt);
      for(const k of ["normalized_intent","intent"])add("transaction_type",obj[k],normTx);
      if(nonEmpty(obj.title))titles.push([String(obj.title).trim(),src,obj.title]);
    }
  }
  const fallback=routeFallback(url),core={},conflicts={};
  for(const k of ["city","property_type","transaction_type"]){
    const a=vals[k].filter(x=>x[0]!=null);
    const distinct=[...new Set(a.map(x=>x[0]))];
    if(distinct.length>1)conflicts[k]=distinct;
    a.sort((x,y)=>priority(x[1])-priority(y[1]));
    if(a[0])core[k]=a[0];
    else if(fallback[k])core[k]=[fallback[k],"route_explicit",fallback[k]];
    else core[k]=[null,null,null];
  }
  const good=titles.filter(x=>x[0].length>=12).sort((a,b)=>priority(a[1])-priority(b[1]));
  core.title=good[0]||(fallback.title?[fallback.title,"route",fallback.title]:[null,null,null]);
  return {core,conflicts};
}
function optional(records,specs,norm=x=>x){
  const a=[];
  for(const [src,key] of specs)for(const r of records.filter(x=>x.src===src))if(nonEmpty(r.obj[key])){
    const v=norm(r.obj[key]);if(v!=null&&nonEmpty(v))a.push({v,src,raw:r.obj[key]});
  }
  if(!a.length)return {value:null,source:null,raw:null};
  const distinct=[...new Set(a.map(x=>String(x.v).toLowerCase().trim()))];
  if(distinct.length>1)return {value:null,source:"conflict_quarantined",raw:null};
  return {value:a[0].v,source:a[0].src,raw:a[0].raw};
}
function buildRow(idKey,url,domain,records,core){
  const price=optional(records,[["old_property","price_mad"],["minimal_live","price_mad"],["thin_index","normalized_price_mad"],["listing_representation","price_mad"]],intOrNull);
  const surface=optional(records,[["old_property","surface_m2"],["minimal_live","surface_m2"],["thin_index","normalized_surface_m2"],["listing_representation","surface_m2"]],intOrNull);
  const district=optional(records,[["old_property","district"],["minimal_live","district"],["listing_representation","district"]],v=>String(v).trim());
  const bedrooms=optional(records,[["old_property","bedrooms_count"]],intOrNull);
  const description=optional(records,[["old_property","description_snippet"],["thin_index","snippet"],["listing_representation","snippet"]],v=>String(v).trim().slice(0,500));
  const prop=records.find(r=>r.src==="old_property")?.obj||null;
  const ls=records.filter(r=>r.src==="listing_source").map(r=>r.obj);
  const firstSeen=ls.map(x=>x.first_seen_at).filter(Boolean).sort()[0]||null;
  const lastSeen=[...ls.map(x=>x.last_seen_at),...records.map(r=>r.obj.updated_at)].filter(Boolean).sort().at(-1)||null;
  const quality=80+(price.value!=null?5:0)+(surface.value!=null?5:0)+(district.value?3:0)+(bedrooms.value!=null?3:0)+(description.value?4:0);
  return {
    canonical_fingerprint:fp(url),title:core.title[0],price_mad:price.value,city:core.city[0],district:district.value,
    property_type:core.property_type[0],transaction_type:core.transaction_type[0],surface_m2:surface.value,
    rooms_count:prop?intOrNull(prop.rooms_count):null,bedrooms_count:bedrooms.value,bathrooms_count:prop?intOrNull(prop.bathrooms_count):null,
    description_snippet:description.value,images_count:prop?intOrNull(prop.images_count):null,
    seller_name:prop&&nonEmpty(prop.seller_name)?String(prop.seller_name).trim():null,data_completeness_score:Math.min(100,quality),
    field_confidence:{
      certification:"v4.11_wave9_route_refinement",portal_offer_id:offerId(idKey),
      title:{source:core.title[1],raw:core.title[2]},city:{source:core.city[1],raw:core.city[2],normalized:core.city[0]},
      property_type:{source:core.property_type[1],raw:core.property_type[2],normalized:core.property_type[0]},
      transaction_type:{source:core.transaction_type[1],raw:core.transaction_type[2],normalized:core.transaction_type[0]},
      price_mad:price,surface_m2:surface,source_freeze_artifact_id:10869399865,
      source_wave6_artifact_id:10932325027,source_wave8_artifact_id:10934176431,representation_identity:"portal_offer_id",cross_source_merge_performed:false
    },
    source_name:domain,listing_url:url,source_url:"https://"+domain,first_seen_at:firstSeen,last_seen_at:lastSeen,
    source_offer_key:offerId(idKey),origin_type:"legacy_import",compliance_status:"recovery_verified_v4_11_wave9",
    content_fingerprint:fp(url),ingestion_run_id:"clean-corpus-v4.11-wave9",displayed_price:price.value,
    price_currency:price.value!=null?"MAD":null,price_period:null,price_status:price.value!=null?"valid":"not_disclosed",
    approved_for_import:false
  };
}

fs.mkdirSync(outDir,{recursive:true});
const wave8Ids=new Set(loadJsonl(wave8File).map(r=>identity(r.listing_url,r.source_name)).filter(Boolean));
const universe=new Map(),identityless=[];
for(const r of loadJsonl(rejectedFile)){
  if(!TARGETS.has(r.source_domain))continue;
  const url=canon(r.canonical_url),idKey=identity(url,r.source_domain);
  if(!idKey){identityless.push({url,domain:r.source_domain,reason:"missing_stable_portal_identity"});continue}
  if(wave8Ids.has(idKey))continue;
  pushMap(universe,idKey,{url,domain:r.source_domain,reasons:r.reasons||[]});
}

const lsByUrl=new Map(),propIds=new Set();
for await(const r of gzJsonl(path.join(freezeDir,"listing_sources.jsonl.gz"))){
  const url=canon(r.listing_url),domain=domainOf(url);
  if(!TARGETS.has(domain))continue;
  const idKey=identity(url,domain);
  if(!idKey||!universe.has(idKey))continue;
  pushMap(lsByUrl,url,r);propIds.add(r.property_listing_id);
}
const props=new Map();
for await(const r of gzJsonl(path.join(freezeDir,"property_listings.jsonl.gz")))if(propIds.has(r.id))props.set(r.id,r);
async function loadDocs(file,src){
  const m=new Map();
  for await(const r of gzJsonl(path.join(freezeDir,file))){
    if(!r.canonical_url)continue;
    const url=canon(r.canonical_url),domain=domainOf(url),idKey=identity(url,domain);
    if(!idKey||!universe.has(idKey))continue;
    pushMap(m,url,{src,obj:r});
  }
  return m;
}
const minimal=await loadDocs("minimal_live_search_documents_v1.jsonl.gz","minimal_live");
const thin=await loadDocs("thin_index_search_documents.jsonl.gz","thin_index");
const reps=await loadDocs("listing_representations.jsonl.gz","listing_representation");
function recordsFor(url){
  const out=[];
  for(const ls of lsByUrl.get(url)||[]){out.push({src:"listing_source",obj:ls});const p=props.get(ls.property_listing_id);if(p)out.push({src:"old_property",obj:p})}
  for(const r of minimal.get(url)||[])out.push(r);for(const r of thin.get(url)||[])out.push(r);for(const r of reps.get(url)||[])out.push(r);
  return out;
}

const safe=[],rejected=[...identityless];
let identityConflicts=0,missingCore=0;
const byDomain={};
for(const [idKey,group] of universe){
  const good=[];
  for(const x of group){
    const records=recordsFor(x.url),{core,conflicts}=collect(records,x.url);
    const complete=core.title[0]&&core.city[0]&&core.property_type[0]&&core.transaction_type[0];
    if(complete&&Object.keys(conflicts).length===0)good.push({...x,records,core});
  }
  if(!good.length){missingCore++;rejected.push({idKey,domain:idKey.split("|")[0],reason:"missing_or_conflicting_core"});continue}
  const signatures=new Set(good.map(x=>JSON.stringify([x.core.city[0],x.core.property_type[0],x.core.transaction_type[0]])));
  if(signatures.size>1){identityConflicts++;rejected.push({idKey,domain:idKey.split("|")[0],reason:"portal_identity_core_conflict",signatures:[...signatures].map(JSON.parse)});continue}
  good.sort((a,b)=>b.records.length-a.records.length||a.url.length-b.url.length||a.url.localeCompare(b.url));
  const x=good[0],domain=x.domain;
  safe.push(buildRow(idKey,x.url,domain,x.records,x.core));
  byDomain[domain]=(byDomain[domain]||0)+1;
}
if(new Set(safe.map(r=>r.listing_url)).size!==safe.length)throw new Error("URL duplicate");
if(new Set(safe.map(r=>r.canonical_fingerprint)).size!==safe.length)throw new Error("fingerprint duplicate");
if(new Set(safe.map(r=>r.source_name+"|"+r.source_offer_key)).size!==safe.length)throw new Error("identity duplicate");
if(safe.some(r=>r.approved_for_import!==false))throw new Error("approval invariant");

const body=safe.map(r=>JSON.stringify(r)).join("\n")+(safe.length?"\n":"");
const rejectedBody=rejected.map(r=>JSON.stringify(r)).join("\n")+(rejected.length?"\n":"");
fs.writeFileSync(path.join(outDir,"db-ready-wave9.jsonl"),body);
fs.writeFileSync(path.join(outDir,"rejected-wave9.jsonl"),rejectedBody);
const summary={
  schema_version:"akarfinder-v4.11-wave9-route-refinement-20260927",
  source_freeze_artifact_id:10869399865,source_wave6_artifact_id:10932325027,source_wave8_artifact_id:10934176431,
  input_target_identities:universe.size,wave8_excluded_identities:wave8Ids.size,
  identityless_rows:identityless.length,identity_conflicts:identityConflicts,missing_or_conflicting_core:missingCore,
  db_ready_rows:safe.length,by_domain:byDomain,output_sha256:sha(body),rejected_sha256:sha(rejectedBody),
  approved_for_import_rows:0,database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false
};
fs.writeFileSync(path.join(outDir,"summary.json"),JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
