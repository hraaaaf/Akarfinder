#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const ccDir=arg("--cc-dir");
const freezeDir=arg("--freeze-dir");
const usedDir=arg("--used-dir");
const outDir=arg("--out-dir");
if(!ccDir||!freezeDir||!usedDir||!outDir)throw new Error("missing args");

const TARGETS=new Set(["mubawab.ma","agenz.ma","avito.ma"]);
const ALLOWED_PT=new Set(["apartment","studio","land","villa","house","riad","office","commercial"]);
const CC_FILES={
  "mubawab.ma":"mubawab-ma.jsonl",
  "agenz.ma":"agenz-ma.jsonl",
  "avito.ma":"avito-ma.jsonl",
};
const CC_ARTIFACTS={
  "mubawab.ma":10930994925,
  "avito.ma":10931695755,
  "agenz.ma":10931955698,
};
const CITY_ALIASES={
  casablanca:"Casablanca",casa:"Casablanca",rabat:"Rabat",marrakech:"Marrakech",marrakesh:"Marrakech",
  tanger:"Tanger",tangier:"Tanger",fes:"Fès","fès":"Fès",fez:"Fès",agadir:"Agadir",
  meknes:"Meknès","meknès":"Meknès",kenitra:"Kénitra","kénitra":"Kénitra",mohammedia:"Mohammedia",
  oujda:"Oujda",tetouan:"Tétouan","tétouan":"Tétouan",sale:"Salé","salé":"Salé",
  temara:"Témara","témara":"Témara",essaouira:"Essaouira",bouskoura:"Bouskoura",bouznika:"Bouznika",
  "el jadida":"El Jadida","el-jadida":"El Jadida","dar bouazza":"Dar Bouazza","dar-bouazza":"Dar Bouazza",
  safi:"Safi",nador:"Nador",dakhla:"Dakhla",laayoune:"Laâyoune",berrechid:"Berrechid",martil:"Martil",
  ifrane:"Ifrane",taghazout:"Taghazout",ourika:"Ourika",skhirat:"Skhirat","beni mellal":"Béni Mellal",
  "beni-mellal":"Béni Mellal",khemisset:"Khémisset",khouribga:"Khouribga",settat:"Settat",larache:"Larache",
  chefchaouen:"Chefchaouen","al haouz":"Al Haouz","al-haouz":"Al Haouz",benslimane:"Benslimane",nouaceur:"Nouaceur"
};
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
function domainOf(raw){
  try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,"")}catch{return null}
}
function identity(raw,domain=null){
  const u=canon(raw);
  const d=domain||domainOf(u);
  const p=dec(new URL(u).pathname);
  let m=null;
  if(d==="mubawab.ma")m=p.match(/\/(?:a|pa)\/(\d+)(?:\/|$)/i);
  else if(d==="agenz.ma")m=p.match(/\/(\d+)\/?$/);
  else if(d==="avito.ma")m=p.match(/_(\d+)\.html?$/i);
  return m?d+"|"+m[1]:null;
}
function offerId(key){return key?key.split("|")[1]:null}
function titleCase(s){return String(s).toLowerCase().split(/\s+/).filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1)).join(" ")}
function normCity(v){
  if(v==null)return null;
  const s=dec(v).trim();if(!s)return null;
  const k=s.toLowerCase().replace(/_/g," ").replace(/\s+/g," ").trim();
  return CITY_ALIASES[k]||titleCase(s.replace(/[-_]+/g," ").replace(/\s+/g," ").trim());
}
function normPt(v){
  if(v==null)return null;
  const s=String(v).toLowerCase().trim();
  const m={
    apartment:"apartment",apartments:"apartment",appartement:"apartment",appartements:"apartment",flat:"apartment",duplex:"apartment",
    studio:"studio",land:"land",terrain:"land",terrains:"land","terrains_et_fermes":"land","terrains et fermes":"land",
    villa:"villa",villas:"villa",house:"house",maison:"house",maisons:"house",riad:"riad",
    office:"office",bureau:"office",bureaux:"office",commercial:"commercial",commerce:"commercial",
    local:"commercial","local commercial":"commercial","locaux-magasins":"commercial","locaux magasins":"commercial"
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
function intOrNull(v){
  if(v==null||v==="")return null;
  const n=Number(v);return Number.isFinite(n)?Math.round(n):null;
}
function routeFields(raw,domain){
  const u=new URL(raw),p=dec(u.pathname),seg=p.split("/").filter(Boolean),low=seg.map(x=>x.toLowerCase());
  const out={city:null,property_type:null,transaction_type:null,title:null,method:null};
  if(domain==="agenz.ma"&&seg.length>=5&&low[1]==="annonces"&&low[2].startsWith("immo-")){
    const cityRaw=low[2].slice(5).replace(/-/g," ");
    const txpt=low[3];
    out.transaction_type=txpt.startsWith("location-")?"rent":txpt.startsWith("vente-")?"sale":null;
    const tail=txpt.includes("-")?txpt.slice(txpt.indexOf("-")+1):"";
    const pm={appartements:"apartment",villas:"villa",maisons:"house",terrains:"land","locaux-magasins":"commercial",bureaux:"office",riads:"riad",studios:"studio"};
    out.property_type=pm[tail]||null;
    const local=low.at(-2).replace(/-/g," ");
    out.city=(CITY_ALIASES[local]||CITY_ALIASES[local.replace(/ /g,"-")])?normCity(local):normCity(cityRaw);
    out.method="structured_route_agenz_v2";
    if(out.property_type&&out.transaction_type&&out.city)out.title=PT_LABEL[out.property_type]+" "+TX_LABEL[out.transaction_type]+" — "+out.city;
  }
  const text=p.toLowerCase().replace(/_/g,"-");
  if(!out.transaction_type){
    if(/(?:^|[-/])(location|louer|rent|rental|a-louer)(?:[-/]|$)/.test(text)||text.includes("for-rent"))out.transaction_type="rent";
    else if(/(?:^|[-/])(vente|vendre|sale|achat|a-vendre)(?:[-/]|$)/.test(text)||text.includes("for-sale")||text.includes("to-buy"))out.transaction_type="sale";
  }
  if(!out.property_type){
    const t=dec(p).toLowerCase().replace(/[_-]+/g," ");
    const checks=[
      ["studio",/\bstudio\b/],["apartment",/\b(appartement|apartment|appart|flat|duplex)\b/],["villa",/\bvilla\b/],
      ["house",/\b(maison|house)\b/],["land",/\b(terrain|land|plot|farm|ferme)\b/],["office",/\b(bureau|office)\b/],
      ["commercial",/\b(local|commercial|shop|magasin)\b/],["riad",/\briad\b/]
    ];
    for(const [x,re] of checks)if(re.test(t)){out.property_type=x;break}
  }
  if(!out.title){
    let slug=dec(seg.at(-1)||"").replace(/\.html?$/i,"").replace(/[_-]+/g," ").replace(/\b\d{5,}\b\s*$/,"").replace(/\s+/g," ").trim();
    if(slug.length>=12&&!/^\d+$/.test(slug))out.title=slug[0].toUpperCase()+slug.slice(1);
  }
  if(!out.method)out.method="strict_slug_fallback";
  return out;
}
function loadJsonl(file){
  return fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
}
async function* gzJsonl(file){
  const rl=readline.createInterface({input:fs.createReadStream(file).pipe(zlib.createGunzip()),crlfDelay:Infinity});
  for await(const line of rl)if(line.trim())yield JSON.parse(line);
}
function pushMap(map,key,value){const a=map.get(key)||[];a.push(value);map.set(key,a)}
function priority(src){
  const k=src.split(":")[0];
  return {old_property:0,minimal_live:1,thin_index:2,listing_representation:3,route:4}[k]??99;
}
function collectCore(records,url,domain){
  const vals={city:[],property_type:[],transaction_type:[]},titles=[];
  for(const rec of records){
    const {src,obj}=rec;
    if(src==="listing_source")continue;
    if(src==="old_property"){
      if(nonEmpty(obj.city))vals.city.push([normCity(obj.city),src,obj.city]);
      if(nonEmpty(obj.property_type))vals.property_type.push([normPt(obj.property_type),src,obj.property_type]);
      if(nonEmpty(obj.transaction_type))vals.transaction_type.push([normTx(obj.transaction_type),src,obj.transaction_type]);
      if(nonEmpty(obj.title))titles.push([String(obj.title).trim(),src,obj.title]);
    }else if(src==="minimal_live"){
      if(nonEmpty(obj.city))vals.city.push([normCity(obj.city),src,obj.city]);
      if(nonEmpty(obj.property_type))vals.property_type.push([normPt(obj.property_type),src,obj.property_type]);
      if(nonEmpty(obj.transaction_type))vals.transaction_type.push([normTx(obj.transaction_type),src,obj.transaction_type]);
      if(nonEmpty(obj.title))titles.push([String(obj.title).trim(),src,obj.title]);
    }else if(src==="thin_index"){
      for(const k of ["normalized_city","city","recovered_city"])if(nonEmpty(obj[k]))vals.city.push([normCity(obj[k]),src+":"+k,obj[k]]);
      for(const k of ["normalized_property_type","property_type"])if(nonEmpty(obj[k]))vals.property_type.push([normPt(obj[k]),src+":"+k,obj[k]]);
      for(const k of ["normalized_intent","intent"])if(nonEmpty(obj[k]))vals.transaction_type.push([normTx(obj[k]),src+":"+k,obj[k]]);
      if(nonEmpty(obj.title))titles.push([String(obj.title).trim(),src,obj.title]);
    }else if(src==="listing_representation"){
      if(nonEmpty(obj.city))vals.city.push([normCity(obj.city),src,obj.city]);
      if(nonEmpty(obj.property_type))vals.property_type.push([normPt(obj.property_type),src,obj.property_type]);
      if(nonEmpty(obj.transaction_type))vals.transaction_type.push([normTx(obj.transaction_type),src,obj.transaction_type]);
      if(nonEmpty(obj.title))titles.push([String(obj.title).trim(),src,obj.title]);
    }
  }
  const route=routeFields(url,domain),out={},conflicts={};
  for(const k of ["city","property_type","transaction_type"]){
    const arr=vals[k].filter(x=>x[0]!=null);
    const distinct=[...new Set(arr.map(x=>x[0]))];
    if(distinct.length>1)conflicts[k]=distinct;
    arr.sort((a,b)=>priority(a[1])-priority(b[1]));
    out[k]=arr[0]||((route[k]!=null)?[route[k],"route",route[k]]:[null,null,null]);
  }
  const good=titles.filter(x=>x[0].length>=12).sort((a,b)=>priority(a[1])-priority(b[1]));
  out.title=good[0]||((route.title&&route.title.length>=12)?[route.title,"route",route.title]:[null,null,null]);
  return {core:out,conflicts,route};
}
function safeOptional(records,specs,normalizer=x=>x){
  const arr=[];
  for(const [src,key] of specs){
    for(const rec of records.filter(r=>r.src===src)){
      if(nonEmpty(rec.obj[key])){
        const v=normalizer(rec.obj[key]);
        if(v!=null&&nonEmpty(v))arr.push({v,src,key,raw:rec.obj[key]});
      }
    }
  }
  if(!arr.length)return {value:null,source:null,raw:null};
  const distinct=[...new Set(arr.map(x=>typeof x.v==="string"?x.v.toLowerCase().trim():String(x.v)))];
  if(distinct.length>1)return {value:null,source:"conflict_quarantined",raw:null};
  return {value:arr[0].v,source:arr[0].src,raw:arr[0].raw};
}
function buildRow({idKey,url,domain,ccRow,records,core,mode}){
  const price=safeOptional(records,[["old_property","price_mad"],["minimal_live","price_mad"],["thin_index","normalized_price_mad"],["thin_index","price_mad"],["listing_representation","price_mad"]],intOrNull);
  const surface=safeOptional(records,[["old_property","surface_m2"],["minimal_live","surface_m2"],["thin_index","normalized_surface_m2"],["thin_index","surface_m2"],["listing_representation","surface_m2"]],intOrNull);
  const bedrooms=safeOptional(records,[["old_property","bedrooms_count"]],intOrNull);
  const district=safeOptional(records,[["old_property","district"],["minimal_live","district"],["listing_representation","district"]],v=>String(v).trim());
  const description=safeOptional(records,[["old_property","description_snippet"],["thin_index","snippet"],["listing_representation","snippet"]],v=>String(v).trim().slice(0,500));
  const prop=records.find(r=>r.src==="old_property")?.obj||null;
  const ls=records.filter(r=>r.src==="listing_source").map(r=>r.obj);
  const firstSeen=ls.map(x=>x.first_seen_at).filter(Boolean).sort()[0]||null;
  const lastSeen=[...ls.map(x=>x.last_seen_at),...records.map(r=>r.obj.updated_at)].filter(Boolean).sort().at(-1)||null;
  const quality=80+(price.value!=null?5:0)+(surface.value!=null?5:0)+(district.value?3:0)+(bedrooms.value!=null?3:0)+(description.value?4:0);
  return {
    canonical_fingerprint:fp(url),
    title:core.title[0],
    price_mad:price.value,
    city:core.city[0],
    district:district.value,
    property_type:core.property_type[0],
    transaction_type:core.transaction_type[0],
    surface_m2:surface.value,
    rooms_count:prop?intOrNull(prop.rooms_count):null,
    bedrooms_count:bedrooms.value,
    bathrooms_count:prop?intOrNull(prop.bathrooms_count):null,
    description_snippet:description.value,
    images_count:prop?intOrNull(prop.images_count):null,
    seller_name:prop&&nonEmpty(prop.seller_name)?String(prop.seller_name).trim():null,
    data_completeness_score:Math.min(100,quality),
    field_confidence:{
      certification:"v4.11_wave7_commoncrawl365_freeze_enrichment",
      existence_evidence:["commoncrawl_recent_365d",...(ccRow.cc_indexes||[]).map(x=>"commoncrawl_index:"+x)],
      match_mode:mode,
      portal_offer_id:offerId(idKey),
      title:{source:core.title[1],raw:core.title[2]},
      city:{source:core.city[1],raw:core.city[2],normalized:core.city[0]},
      property_type:{source:core.property_type[1],raw:core.property_type[2],normalized:core.property_type[0]},
      transaction_type:{source:core.transaction_type[1],raw:core.transaction_type[2],normalized:core.transaction_type[0]},
      price_mad:price,
      surface_m2:surface,
      source_freeze_artifact_id:10869399865,
      source_commoncrawl_artifact_id:CC_ARTIFACTS[domain],
      representation_identity:"portal_offer_id",
      cross_source_merge_performed:false
    },
    source_name:domain,
    listing_url:url,
    source_url:"https://"+domain,
    first_seen_at:firstSeen,
    last_seen_at:lastSeen,
    source_offer_key:offerId(idKey),
    origin_type:"external_index_seed",
    compliance_status:"recovery_verified_v4_11_wave7",
    content_fingerprint:fp(url),
    ingestion_run_id:"clean-corpus-v4.11-wave7",
    displayed_price:price.value,
    price_currency:price.value!=null?"MAD":null,
    price_period:null,
    price_status:price.value!=null?"valid":"not_disclosed",
    approved_for_import:false
  };
}

fs.mkdirSync(outDir,{recursive:true});

const ccById=new Map(),ccUrls=new Set(),rejected=[];
let identitylessCcUrls=0;
for(const [domain,file] of Object.entries(CC_FILES)){
  for(const raw of loadJsonl(path.join(ccDir,domain,file))){
    const url=canon(raw.canonical_url);
    const idKey=identity(url,domain);
    if(!idKey){identitylessCcUrls++;rejected.push({canonical_url:url,domain,reason:"missing_stable_portal_identity"});continue}
    if(ccUrls.has(url))throw new Error("duplicate CC URL: "+url);
    ccUrls.add(url);
    pushMap(ccById,idKey,{...raw,canonical_url:url,source_domain:domain,idKey});
  }
}

const usedIds=new Set(),usedRowsByDomain={};
for(const file of fs.readdirSync(usedDir).filter(x=>x.endsWith(".jsonl")).sort()){
  for(const r of loadJsonl(path.join(usedDir,file))){
    const url=r.listing_url?canon(r.listing_url):null;
    const domain=(r.source_name&&TARGETS.has(r.source_name))?r.source_name:(url?domainOf(url):null);
    if(!url||!TARGETS.has(domain))continue;
    const idKey=identity(url,domain);
    if(idKey)usedIds.add(idKey);
    usedRowsByDomain[domain]=(usedRowsByDomain[domain]||0)+1;
  }
}

const lsById=new Map(),lsByUrl=new Map(),propIds=new Set();
for await(const r of gzJsonl(path.join(freezeDir,"listing_sources.jsonl.gz"))){
  const url=canon(r.listing_url),domain=domainOf(url);
  if(!TARGETS.has(domain))continue;
  const idKey=identity(url,domain);
  if(!idKey||!ccById.has(idKey))continue;
  const row={...r,_canonical_url:url};
  pushMap(lsById,idKey,row);pushMap(lsByUrl,url,row);propIds.add(r.property_listing_id);
}
const props=new Map();
for await(const r of gzJsonl(path.join(freezeDir,"property_listings.jsonl.gz")))if(propIds.has(r.id))props.set(r.id,r);

async function loadFreezeDocs(file,src){
  const byId=new Map(),byUrl=new Map();
  for await(const r of gzJsonl(path.join(freezeDir,file))){
    if(!r.canonical_url)continue;
    const url=canon(r.canonical_url),domain=domainOf(url);
    if(!TARGETS.has(domain))continue;
    const idKey=identity(url,domain);
    if(!idKey||!ccById.has(idKey))continue;
    const row={...r,_canonical_url:url};
    pushMap(byId,idKey,row);pushMap(byUrl,url,row);
  }
  return {src,byId,byUrl};
}
const minimal=await loadFreezeDocs("minimal_live_search_documents_v1.jsonl.gz","minimal_live");
const thin=await loadFreezeDocs("thin_index_search_documents.jsonl.gz","thin_index");
const reps=await loadFreezeDocs("listing_representations.jsonl.gz","listing_representation");

function recordsForUrl(url){
  const out=[];
  for(const ls of lsByUrl.get(url)||[]){out.push({src:"listing_source",obj:ls});const p=props.get(ls.property_listing_id);if(p)out.push({src:"old_property",obj:p})}
  for(const x of minimal.byUrl.get(url)||[])out.push({src:minimal.src,obj:x});
  for(const x of thin.byUrl.get(url)||[])out.push({src:thin.src,obj:x});
  for(const x of reps.byUrl.get(url)||[])out.push({src:reps.src,obj:x});
  return out;
}
function recordsForId(idKey){
  const out=[];
  for(const ls of lsById.get(idKey)||[]){out.push({src:"listing_source",obj:ls});const p=props.get(ls.property_listing_id);if(p)out.push({src:"old_property",obj:p})}
  for(const x of minimal.byId.get(idKey)||[])out.push({src:minimal.src,obj:x});
  for(const x of thin.byId.get(idKey)||[])out.push({src:thin.src,obj:x});
  for(const x of reps.byId.get(idKey)||[])out.push({src:reps.src,obj:x});
  return out;
}

const safe=[];
const counters={prior_overlap:0,exact_ready:0,identity_ready:0,exact_identity_conflict:0,identity_conflict:0,missing_core:0};
const byDomain={};
for(const [idKey,group] of ccById){
  const domain=idKey.split("|")[0];
  if(usedIds.has(idKey)){counters.prior_overlap++;rejected.push({idKey,domain,reason:"prior_certified_identity"});continue}
  const exactGood=[];
  for(const ccRow of group){
    const url=ccRow.canonical_url,records=recordsForUrl(url);
    if(records.length===0&&domain!=="agenz.ma")continue;
    const {core,conflicts}=collectCore(records,url,domain);
    const complete=core.title[0]&&core.city[0]&&core.property_type[0]&&core.transaction_type[0];
    if(complete&&Object.keys(conflicts).length===0)exactGood.push({url,ccRow,records,core});
  }
  if(exactGood.length){
    const sigs=new Set(exactGood.map(x=>JSON.stringify([x.core.city[0],x.core.property_type[0],x.core.transaction_type[0]])));
    if(sigs.size>1){counters.exact_identity_conflict++;rejected.push({idKey,domain,reason:"exact_identity_core_conflict",signatures:[...sigs].map(JSON.parse)});continue}
    exactGood.sort((a,b)=>{
      const ao=a.records.some(r=>r.src==="old_property")?1:0,bo=b.records.some(r=>r.src==="old_property")?1:0;
      return bo-ao||b.records.length-a.records.length||a.url.length-b.url.length||a.url.localeCompare(b.url);
    });
    const x=exactGood[0];
    safe.push(buildRow({idKey,url:x.url,domain,ccRow:x.ccRow,records:x.records,core:x.core,mode:"exact_url"}));
    counters.exact_ready++;byDomain[domain]=(byDomain[domain]||0)+1;continue;
  }
  const representative=[...group].sort((a,b)=>a.canonical_url.length-b.canonical_url.length||a.canonical_url.localeCompare(b.canonical_url))[0];
  const records=recordsForId(idKey),{core,conflicts}=collectCore(records,representative.canonical_url,domain);
  const complete=core.title[0]&&core.city[0]&&core.property_type[0]&&core.transaction_type[0];
  if(complete&&Object.keys(conflicts).length===0){
    safe.push(buildRow({idKey,url:representative.canonical_url,domain,ccRow:representative,records,core,mode:"portal_identity_fallback"}));
    counters.identity_ready++;byDomain[domain]=(byDomain[domain]||0)+1;
  }else if(complete){
    counters.identity_conflict++;rejected.push({idKey,domain,reason:"identity_core_conflict",conflicts});
  }else{
    counters.missing_core++;rejected.push({idKey,domain,reason:"missing_core",missing:["title","city","property_type","transaction_type"].filter(k=>!core[k][0])});
  }
}

const urlSet=new Set(safe.map(r=>r.listing_url)),fpSet=new Set(safe.map(r=>r.canonical_fingerprint)),offerSet=new Set(safe.map(r=>r.source_name+"|"+r.source_offer_key));
if(urlSet.size!==safe.length)throw new Error("wave7 URL duplicate");
if(fpSet.size!==safe.length)throw new Error("wave7 fingerprint duplicate");
if(offerSet.size!==safe.length)throw new Error("wave7 portal identity duplicate");
if(safe.some(r=>r.approved_for_import!==false))throw new Error("approval invariant");

const body=safe.map(r=>JSON.stringify(r)).join("\n")+(safe.length?"\n":"");
const rejectedBody=rejected.map(r=>JSON.stringify(r)).join("\n")+(rejected.length?"\n":"");
fs.writeFileSync(path.join(outDir,"db-ready-wave7.jsonl"),body);
fs.writeFileSync(path.join(outDir,"rejected-wave7.jsonl"),rejectedBody);

const summary={
  schema_version:"akarfinder-v4.11-wave7-commoncrawl365-freeze-enrichment-20260927",
  commoncrawl_artifacts:CC_ARTIFACTS,
  source_freeze_artifact_id:10869399865,
  cc_rows:ccUrls.size,
  cc_unique_identities:ccById.size,
  identityless_cc_urls:identitylessCcUrls,
  prior_target_identity_count:usedIds.size,
  prior_target_rows_by_domain:usedRowsByDomain,
  ...counters,
  db_ready_rows:safe.length,
  by_domain:byDomain,
  output_sha256:sha(body),
  rejected_sha256:sha(rejectedBody),
  approved_for_import_rows:0,
  database_access:0,
  database_writes:0,
  source_page_fetches:0,
  warc_downloads:0,
  production_neon_writes:0,
  vercel_deployment:false
};
fs.writeFileSync(path.join(outDir,"summary.json"),JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
