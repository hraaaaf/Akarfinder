#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const ledger=arg("--ledger"), wave2=arg("--wave2"), domioMatched=arg("--domio-matched"), output=arg("--output"), rejectedOut=arg("--rejected"), summaryOut=arg("--summary");
if(!ledger||!wave2||!domioMatched||!output||!rejectedOut||!summaryOut) throw new Error("missing args");

const STRONG=new Set(["direct_http200","official_sitemap_recent","commoncrawl_recent","listing_source_active_recent","thin_fresh_confirmed_recent"]);
const TARGETS=new Set(["marocimmo.com","sarout.ma","agenz.ma"]);
const CERTIFIED_AT="2026-09-27T09:15:00Z";
const PT_LABEL={apartment:"Appartement",studio:"Studio",villa:"Villa",house:"Maison",land:"Terrain",office:"Bureau",commercial:"Local commercial",riad:"Riad"};
const TX_LABEL={sale:"à vendre",rent:"à louer"};

function fp(url){return crypto.createHash("sha256").update("representation|"+url).digest("hex")}
function sha(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}
function safeDecode(s){try{return decodeURIComponent(s)}catch{return s}}
function asciiSlug(s){return safeDecode(String(s)).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[_\x27’]/g,"-").replace(/[^a-z0-9\u0600-\u06ff-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
function titleCaseWords(s){return s.split(/\s+/).map(w=>w?w[0].toUpperCase()+w.slice(1):w).join(" ")}
const CITY_ALIASES={
  casablanca:"Casablanca",casa:"Casablanca",rabat:"Rabat",marrakech:"Marrakech",marrakesh:"Marrakech",
  tanger:"Tanger",tangier:"Tanger",fes:"Fès",fez:"Fès",agadir:"Agadir",meknes:"Meknès",kenitra:"Kénitra",
  mohammedia:"Mohammedia",oujda:"Oujda",tetouan:"Tétouan","el-jadida":"El Jadida",eljadida:"El Jadida",
  essaouira:"Essaouira","dar-bouazza":"Dar Bouazza",bouskoura:"Bouskoura",bouznika:"Bouznika",martil:"Martil",
  berrechid:"Berrechid",safi:"Safi",benslimane:"Benslimane",dakhla:"Dakhla",khouribga:"Khouribga",nador:"Nador",
  settat:"Settat","beni-mellal":"Béni Mellal",skhirat:"Skhirat",harhoura:"Harhoura",fnideq:"Fnideq",berkane:"Berkane",
  "sidi-rahal":"Sidi Rahal",tiznit:"Tiznit",saidia:"Saïdia",azrou:"Azrou",tamesna:"Tamesna","el-mansouria":"El Mansouria",
  mansouria:"El Mansouria",asilah:"Asilah","had-soualem":"Had Soualem",chefchaouen:"Chefchaouen",taroudant:"Taroudant",
  ifrane:"Ifrane",sefrou:"Sefrou",mehdia:"Mehdia","ben-guerir":"Ben Guerir",nouaceur:"Nouaceur",deroua:"Deroua",
  "ksar-el-kebir":"Ksar El Kebir",khemisset:"Khémisset",mdiq:"M\x27diq",larache:"Larache",youssoufia:"Youssoufia",
  taza:"Taza","ait-melloul":"Aït Melloul",ouarzazate:"Ouarzazate","sidi-kacem":"Sidi Kacem",tinghir:"Tinghir",
  "al-hoceima":"Al Hoceima",laayoune:"Laâyoune",guelmim:"Guelmim",errachidia:"Errachidia",midelt:"Midelt",
  tifelt:"Tifelt",taounate:"Taounate",inezgane:"Inezgane",oualidia:"Oualidia",mediouna:"Médiouna",taourirt:"Taourirt",
  ouezzane:"Ouezzane",aourir:"Aourir",tahannaout:"Tahannaout",taghazout:"Taghazout",ourika:"Ourika",mirleft:"Mirleft",
  sale:"Salé",temara:"Témara","sala-el-jadida":"Salé","cabo-negro":"Cabo Negro"
};
const CITY_KEYS=Object.keys(CITY_ALIASES).sort((a,b)=>b.split("-").length-a.split("-").length||b.length-a.length);

function structuredCity(raw){
  const k=asciiSlug(raw);
  if(!k||["autre","indefini","undefined"].includes(k))return null;
  return CITY_ALIASES[k]||titleCaseWords(safeDecode(raw).replace(/[-_]+/g," ").trim());
}
function cityCandidates(text){
  const s=asciiSlug(text),out=[];
  for(const k of CITY_KEYS){
    const escaped=k.replace(/[.*+?^$()|[\]\\]/g,"\\$&");
    if(new RegExp("(^|-)"+escaped+"($|-)").test(s)){const v=CITY_ALIASES[k];if(!out.includes(v))out.push(v)}
  }
  return out;
}
function ptype(text){
  const s=asciiSlug(text);
  const pats=[
    ["studio",/(^|-)(studio)(-|$)/],
    ["apartment",/(^|-)(appartement|appartements|apartment|apartments|duplex|flat)(-|$)/],
    ["riad",/(^|-)(riad|riads)(-|$)/],
    ["villa",/(^|-)(villa|villas)(-|$)/],
    ["house",/(^|-)(maison|maisons|house|houses|home)(-|$)/],
    ["land",/(^|-)(terrain|terrains|land|lot|parcelle|ferme|farm)(-|$)/],
    ["office",/(^|-)(bureau|bureaux|office|offices|plateau)(-|$)/],
    ["commercial",/(^|-)(local-commercial|local|commerce|commercial|magasin|magasins|shop|shops)(-|$)/]
  ];
  for(const [t,re] of pats)if(re.test(s))return t;
  return null;
}
function transaction(text){
  const s=asciiSlug(text);
  if(/(^|-)(location|louer|rent|rental|for-rent|a-louer)(-|$)/.test(s))return "rent";
  if(/(^|-)(vente|vendre|acheter|sale|for-sale|buy|achat|a-vendre)(-|$)/.test(s))return "sale";
  return null;
}
function sourceTitle(url,typ,tx,city,district){
  const seg=safeDecode(new URL(url).pathname).split("/").filter(Boolean);
  let slug=seg.at(-1)||"";
  slug=slug.replace(/\.html?$/i,"").replace(/[-_]+/g," ").replace(/\b\d{6,}\b\s*$/,"").replace(/\s+/g," ").trim();
  if(slug.length>=12&&!/^\d+$/.test(slug))return slug[0].toUpperCase()+slug.slice(1);
  return PT_LABEL[typ]+" "+TX_LABEL[tx]+" — "+city+(district?" · "+district:"");
}
function parse(url,domain){
  const p=safeDecode(new URL(url).pathname),seg=p.split("/").filter(Boolean),n=seg.map(asciiSlug);
  let property_type=null,transaction_type=null,city=null,district=null,method=null,reason=null;
  if(domain==="marocimmo.com"&&seg.length>=5&&["fr","en","ar"].includes(n[0])){
    transaction_type={location:"rent",vente:"sale"}[n[1]]||null;
    property_type=ptype(n[2]);
    city=structuredCity(seg[3]);
    district=structuredCity(seg[4]);
    method="structured_route_marocimmo";
  }else if(domain==="agenz.ma"&&seg.length>=5&&n[1]==="annonces"&&n[2].startsWith("immo-")){
    transaction_type=transaction(n[3]);
    property_type=ptype(n[3]);
    city=structuredCity(n[2].slice(5));
    district=structuredCity(seg[4]);
    method="structured_route_agenz";
  }else if(domain==="domio.ma"&&seg.length>=6&&["fr","en","ar"].includes(n[0])){
    property_type=ptype(n[1]);
    transaction_type=transaction(n[2]);
    city=structuredCity(seg[3]);
    method="structured_route_domio";
  }else if(domain==="sarout.ma"){
    transaction_type=transaction(p);
    property_type=ptype(p);
    const cities=cityCandidates(p);
    if(cities.length===1)city=cities[0];
    else if(cities.length>1)reason="ambiguous_city_tokens";
    method="strict_slug_sarout";
  }
  if(!property_type)reason=reason||"missing_property_type";
  if(!transaction_type)reason=reason||"missing_transaction_type";
  if(!city)reason=reason||"missing_city";
  return {property_type,transaction_type,city,district,method,reason};
}

const wave2Urls=new Set(fs.readFileSync(wave2,"utf8").split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x).listing_url));
if(wave2Urls.size!==13421)throw new Error("wave2 URL set mismatch");
const sourceRows=fs.readFileSync(ledger,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const out=[],rejects=[];const byDomain={},rejectReasons={};
function addCertified(r,evidence){
  if(wave2Urls.has(r.canonical_url))return;
  const m=parse(r.canonical_url,r.source_domain);
  if(m.reason){rejects.push({canonical_url:r.canonical_url,source_domain:r.source_domain,reason:m.reason});rejectReasons[m.reason]=(rejectReasons[m.reason]||0)+1;return}
  const title=sourceTitle(r.canonical_url,m.property_type,m.transaction_type,m.city,m.district);
  if(title.length<12){rejects.push({canonical_url:r.canonical_url,source_domain:r.source_domain,reason:"weak_route_title"});rejectReasons.weak_route_title=(rejectReasons.weak_route_title||0)+1;return}
  byDomain[r.source_domain]=(byDomain[r.source_domain]||0)+1;
  out.push({canonical_fingerprint:fp(r.canonical_url),title,price_mad:null,city:m.city,district:m.district,property_type:m.property_type,transaction_type:m.transaction_type,surface_m2:null,rooms_count:null,bedrooms_count:null,bathrooms_count:null,description_snippet:null,images_count:null,seller_name:null,data_completeness_score:80,field_confidence:{certification:"v4.11_wave3_mass_route_verified",existence_evidence:evidence,route_mapping:m.method,representation_identity:"source_url_level",cross_source_merge_performed:false},source_name:r.source_domain,listing_url:r.canonical_url,source_url:"https://"+r.source_domain,first_seen_at:null,last_seen_at:null,source_offer_key:null,origin_type:"external_index_seed",compliance_status:"recovery_verified_v4_11_wave3",content_fingerprint:fp(r.canonical_url),ingestion_run_id:"clean-corpus-v4.11-wave3",displayed_price:null,price_currency:null,price_period:null,price_status:"not_disclosed",approved_for_import:false});
}
for(const r of sourceRows){
  if(!TARGETS.has(r.source_domain))continue;
  if(!Array.isArray(r.evidence)||!r.evidence.some(e=>STRONG.has(e))){rejects.push({canonical_url:r.canonical_url,source_domain:r.source_domain,reason:"no_strong_evidence"});continue}
  addCertified(r,r.evidence);
}
const domioRows=fs.readFileSync(domioMatched,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
if(domioRows.length!==6843)throw new Error("expected 6843 Domio evidence rows, got "+domioRows.length);
if(new Set(domioRows.map(r=>r.canonical_url)).size!==6843)throw new Error("Domio evidence URL duplicate");
for(const r of domioRows){
  if(r.source_domain!=="domio.ma"||r.verification_method!=="official_category_listing_recent")throw new Error("Domio evidence invariant");
  addCertified(r,["official_category_listing_recent"]);
}
if(out.length!==68043)throw new Error("expected 68043 wave3 rows, got "+out.length);
if(byDomain["marocimmo.com"]!==32795||byDomain["sarout.ma"]!==28297||byDomain["agenz.ma"]!==108||byDomain["domio.ma"]!==6843)throw new Error("domain yield invariant");
if(new Set(out.map(x=>x.listing_url)).size!==out.length)throw new Error("URL dedupe");
if(new Set(out.map(x=>x.canonical_fingerprint)).size!==out.length)throw new Error("fingerprint dedupe");
if(out.some(x=>x.approved_for_import!==false))throw new Error("approval invariant");
fs.writeFileSync(output,out.map(x=>JSON.stringify(x)).join("\n")+"\n");
fs.writeFileSync(rejectedOut,rejects.map(x=>JSON.stringify(x)).join("\n")+(rejects.length?"\n":""));
const summary={schema_version:"akarfinder-v4.11-wave3-mass-route-certification-20260927",strong_route_db_ready_rows:out.length,by_domain:byDomain,rejected_rows:rejects.length,rejected_reason_counts:rejectReasons,excluded_wave2_rows:wave2Urls.size,source_ledger_artifact_id:10927761643,source_wave2_artifact_id:10927304058,source_domio_evidence_artifact_id:10927144343,output_sha256:sha(output),rejected_sha256:sha(rejectedOut),approved_for_import_rows:0,database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false,certification_time:CERTIFIED_AT,doctrine:["strong existence evidence only","source-structured deterministic route/slug mapping","no inferred price/surface","ambiguous Sarout city tokens rejected","representation-level identity; no cross-source merge"]};
fs.writeFileSync(summaryOut,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
