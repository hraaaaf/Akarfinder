#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const ledger=arg("--ledger"),wave2=arg("--wave2"),wave3=arg("--wave3"),wave4=arg("--wave4"),output=arg("--output"),rejected=arg("--rejected"),summary=arg("--summary");
if(!ledger||!wave2||!wave3||!wave4||!output||!rejected||!summary)throw new Error("missing args");

const STRONG=new Set(["direct_http200","official_sitemap_recent","commoncrawl_recent","listing_source_active_recent","thin_fresh_confirmed_recent","official_category_listing_recent"]);
const TARGETS=new Set(["promoimmomarrakech.com","agenz.ma","aykana.ma","daragadir.com","limmobiliersansfrontieres.com","kawtarimmobilier.com","atlasimmobilier.com","1immo.ma"]);
const PT_LABEL={apartment:"Appartement",studio:"Studio",villa:"Villa",house:"Maison",land:"Terrain",office:"Bureau",commercial:"Local commercial",riad:"Riad"};
const TX_LABEL={sale:"à vendre",rent:"à louer"};
const CITY_ALIASES={agadir:"Agadir",marrakech:"Marrakech",rabat:"Rabat",casablanca:"Casablanca",tanger:"Tanger",fes:"Fès",meknes:"Meknès",kenitra:"Kénitra",sale:"Salé",temara:"Témara",essaouira:"Essaouira",bouznika:"Bouznika","el-jadida":"El Jadida",eljadida:"El Jadida",mohammedia:"Mohammedia",oujda:"Oujda",tetouan:"Tétouan",bouskoura:"Bouskoura","dar-bouazza":"Dar Bouazza",safi:"Safi",nador:"Nador",dakhla:"Dakhla",laayoune:"Laâyoune",berrechid:"Berrechid",martil:"Martil",ifrane:"Ifrane",taghazout:"Taghazout",ourika:"Ourika"};

function sha(s){return crypto.createHash("sha256").update(s).digest("hex")}
function fp(u){return sha("representation|"+u)}
function dec(s){try{return decodeURIComponent(s)}catch{return s}}
function norm(s){return dec(String(s)).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[_'’]/g,"-").replace(/[^a-z0-9\u0600-\u06ff-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
function pt(s){
 const n=norm(s),p=[["studio",/(^|-)studio(-|$)/],["apartment",/(^|-)(appartement|appartements|apartment|apartments|duplex|flat)(-|$)/],["riad",/(^|-)riad(s)?(-|$)/],["villa",/(^|-)villa(s)?(-|$)/],["house",/(^|-)(maison|maisons|house|houses|home)(-|$)/],["land",/(^|-)(terrain|terrains|land|plot|plots|lot|parcelle|ferme|farm)(-|$)/],["office",/(^|-)(bureau|bureaux|office|offices|plateau)(-|$)/],["commercial",/(^|-)(local-commercial|locaux-magasins|commerce|commercial|commercial-space|magasin|magasins|shop)(-|$)/]];
 for(const [t,re] of p)if(re.test(n))return t;return null;
}
function tx(s){const n=norm(s);if(/(^|-)(location|louer|rent|rental|for-rent|a-louer)(-|$)/.test(n))return"rent";if(/(^|-)(vente|vendre|acheter|sale|for-sale|achat|a-vendre)(-|$)/.test(n))return"sale";return null}
function cityText(s){const n=norm(s),a=[];for(const[k,v]of Object.entries(CITY_ALIASES))if(new RegExp("(^|-)"+k+"($|-)").test(n)&&!a.includes(v))a.push(v);return a.length===1?a[0]:null}
function ttl(url,p,t,c){const seg=dec(new URL(url).pathname).split("/").filter(Boolean);let s=(seg.at(-1)||"").replace(/\.html?$/i,"").replace(/[-_]+/g," ").replace(/\b\d{5,}\b\s*$/,"").replace(/\s+/g," ").trim();if(s.length>=12&&!/^\d+$/.test(s))return s[0].toUpperCase()+s.slice(1);return PT_LABEL[p]+" "+TX_LABEL[t]+" — "+c}
function parse(url,d){
 const path=dec(new URL(url).pathname),seg=path.split("/").filter(Boolean),n=seg.map(norm);
 if(d==="agenz.ma"&&seg.length>=5&&n[1]==="annonces"&&n[2].startsWith("immo-")){const raw=n[2].slice(5);return{t:tx(n[3]),p:pt(n[3]),c:CITY_ALIASES[raw]||raw.replace(/-/g," ").replace(/\b\w/g,x=>x.toUpperCase()),m:"structured_route_agenz"}}
 if(d==="promoimmomarrakech.com")return{t:tx(path),p:pt(path),c:norm(path).includes("marrakech")?"Marrakech":null,m:"strict_slug_promo"};
 if(d==="daragadir.com")return{t:tx(path),p:pt(path),c:norm(path).includes("agadir")?"Agadir":null,m:"strict_route_daragadir"};
 if(d==="limmobiliersansfrontieres.com")return{t:tx(path),p:pt(path),c:cityText(path),m:"strict_slug_lisf"};
 if(d==="aykana.ma")return{t:tx(path),p:pt(path),c:cityText(path),m:"strict_slug_aykana"};
 if(d==="atlasimmobilier.com")return{t:tx(path),p:pt(path),c:cityText(path),m:"strict_slug_atlas"};
 if(d==="1immo.ma")return{t:tx(path),p:pt(path),c:cityText(path),m:"strict_slug_1immo"};
 if(d==="kawtarimmobilier.com"&&seg.length>=3)return{t:tx(n[1]),p:pt(n[2]),c:n[0]==="essaouira"?"Essaouira":null,m:"structured_route_kawtar"};
 return{t:null,p:null,c:null,m:null};
}

const used=new Set();
for(const f of [wave2,wave3,wave4])for(const line of fs.readFileSync(f,"utf8").split(/\r?\n/)){if(line.trim())used.add(JSON.parse(line).listing_url)}
const rows=fs.readFileSync(ledger,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const out=[],bad=[],byDomain={};
for(const r of rows){
 if(used.has(r.canonical_url)||!TARGETS.has(r.source_domain))continue;
 if(!Array.isArray(r.evidence)||!r.evidence.some(e=>STRONG.has(e))){bad.push({canonical_url:r.canonical_url,source_domain:r.source_domain,reason:"no_strong_evidence"});continue}
 const x=parse(r.canonical_url,r.source_domain);
 if(!x.t||!x.p||!x.c){bad.push({canonical_url:r.canonical_url,source_domain:r.source_domain,reason:"route_fields_incomplete"});continue}
 const title=ttl(r.canonical_url,x.p,x.t,x.c);if(title.length<12){bad.push({canonical_url:r.canonical_url,source_domain:r.source_domain,reason:"weak_title"});continue}
 byDomain[r.source_domain]=(byDomain[r.source_domain]||0)+1;
 out.push({canonical_fingerprint:fp(r.canonical_url),title,price_mad:null,city:x.c,district:null,property_type:x.p,transaction_type:x.t,surface_m2:null,rooms_count:null,bedrooms_count:null,bathrooms_count:null,description_snippet:null,images_count:null,seller_name:null,data_completeness_score:80,field_confidence:{certification:"v4.11_wave5_strict_route_v3",existence_evidence:r.evidence,route_mapping:x.m,representation_identity:"source_url_level",cross_source_merge_performed:false},source_name:r.source_domain,listing_url:r.canonical_url,source_url:"https://"+r.source_domain,first_seen_at:null,last_seen_at:null,source_offer_key:null,origin_type:"external_index_seed",compliance_status:"recovery_verified_v4_11_wave5",content_fingerprint:fp(r.canonical_url),ingestion_run_id:"clean-corpus-v4.11-wave5",displayed_price:null,price_currency:null,price_period:null,price_status:"not_disclosed",approved_for_import:false});
}
const expected={"promoimmomarrakech.com":3674,"agenz.ma":851,"aykana.ma":100,"daragadir.com":100,"limmobiliersansfrontieres.com":65,"kawtarimmobilier.com":15,"atlasimmobilier.com":14,"1immo.ma":13};
if(out.length!==4832)throw new Error("expected 4832 got "+out.length);
for(const[d,n]of Object.entries(expected))if(byDomain[d]!==n)throw new Error(d+" "+byDomain[d]+" != "+n);
if(new Set(out.map(x=>x.listing_url)).size!==4832||new Set(out.map(x=>x.canonical_fingerprint)).size!==4832)throw new Error("uniqueness");
const body=out.map(x=>JSON.stringify(x)).join("\n")+"\n",badBody=bad.map(x=>JSON.stringify(x)).join("\n")+(bad.length?"\n":"");
fs.writeFileSync(output,body);fs.writeFileSync(rejected,badBody);
const s={schema_version:"akarfinder-v4.11-wave5-strict-route-v3-20260927",db_ready_rows:4832,by_domain:byDomain,rejected_rows:bad.length,source_ledger_artifact_id:10930659218,source_wave2_artifact_id:10927304058,source_wave3_artifact_id:10929247398,source_wave4_artifact_id:10931027229,output_sha256:sha(body),rejected_sha256:sha(badBody),approved_for_import_rows:0,database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false};
fs.writeFileSync(summary,JSON.stringify(s,null,2)+"\n");console.log(JSON.stringify(s,null,2));
