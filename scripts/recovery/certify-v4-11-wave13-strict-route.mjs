#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
const args=process.argv.slice(2),v={}; for(let i=0;i<args.length;i+=2)v[args[i]]=args[i+1];
const keys=["--daragadir","--masaken","--avito","--mouldar","--promo","--sarouty","--out-dir"];
for(const k of keys) if(!v[k]) throw new Error("missing "+k);
fs.mkdirSync(v["--out-dir"],{recursive:true});
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const dec=s=>{try{return decodeURIComponent(s)}catch{return s}};
const norm=s=>dec(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
const title=s=>dec(s).replace(/\.(html?|php)$/i,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim().replace(/^./,c=>c.toUpperCase());
const read=p=>fs.readFileSync(p,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const typeMap=new Map([["appartement","apartment"],["appartements","apartment"],["apartment","apartment"],["studio","studio"],["studios","studio"],["villa","villa"],["villas","villa"],["maison","house"],["maisons","house"],["house","house"],["terrain","land"],["terrains","land"],["terrains et fermes","land"],["bureau","office"],["bureaux","office"],["office","office"],["local","commercial"],["locaux","commercial"],["commerce","commercial"],["commercial","commercial"],["magasin","commercial"],["magasins et commerces","commercial"],["riad","riad"],["riads","riad"],["villas et riads","villa"]]);
const cities=["casablanca","rabat","marrakech","tanger","fes","agadir","meknes","kenitra","mohammedia","oujda","tetouan","temara","essaouira","bouskoura","bouznika","el jadida","eljadida","dar bouazza","safi","nador","dakhla","laayoune","berrechid","martil","ifrane","skhirat","sale"];
const cityName=s=>({"fes":"Fès","kenitra":"Kénitra","tetouan":"Tétouan","temara":"Témara","sale":"Salé","eljadida":"El Jadida"}[s]||s.split(" ").map(x=>x?x[0].toUpperCase()+x.slice(1):x).join(" "));
const pickCity=txt=>{const n=norm(txt);const a=[...new Set(cities.filter(c=>new RegExp("(?:^|\\b)"+c.replace(/ /g,"\\s+")+"(?:\\b|$)").test(n)).map(cityName))];return a.length===1?a[0]:null};
const txFrom=s=>{const n=norm(s);const r=/(?:^|\b)(location|louer|a louer|rent|rental)(?:\b|$)/.test(n);const q=/(?:^|\b)(vente|vendre|a vendre|achat|acheter|sale|buy)(?:\b|$)/.test(n);return r!==q?(r?"rent":"sale"):null};
const typeFrom=s=>{const n=norm(s);const hits=[];for(const [k,val] of typeMap){if(new RegExp("(?:^|\\b)"+k.replace(/ /g,"\\s+")+"(?:\\b|$)").test(n))hits.push(val)}const a=[...new Set(hits)];return a.length===1?a[0]:null};
const safe=[],rejected=[];
function emit(r){if(!r.source_offer_key||!r.city||!r.property_type||!r.transaction_type||!r.title_text||r.title_text.length<5){rejected.push({...r,reason:"core_incomplete"});return}
 const fp=sha("representation|"+r.listing_url);
 safe.push({canonical_fingerprint:fp,title:r.title_text,price_mad:null,city:r.city,district:r.district??null,property_type:r.property_type,transaction_type:r.transaction_type,surface_m2:null,rooms_count:null,bedrooms_count:null,bathrooms_count:null,description_snippet:null,images_count:null,seller_name:null,data_completeness_score:80,field_confidence:{certification:"v4.11_wave13_strict_route",title:{source:"route_explicit"},city:{source:"route_explicit"},property_type:{source:"route_explicit"},transaction_type:{source:"route_explicit"},rule:r.rule,cross_source_merge_performed:false},source_name:r.source_name,listing_url:r.listing_url,source_url:"https://"+r.source_name,first_seen_at:null,last_seen_at:null,source_offer_key:r.source_offer_key,origin_type:"legacy_import",compliance_status:"recovery_verified_v4_11_wave13_strict_route",content_fingerprint:fp,ingestion_run_id:"clean-corpus-v4.11-wave13-strict-route",displayed_price:null,price_currency:null,price_period:null,price_status:"not_disclosed",approved_for_import:false});}
function bad(src,url,reason){rejected.push({source_name:src,listing_url:url,reason})}

// Masaken: /fr|en/immobilier-maroc/{vente|location|sale|rent}-{type}-{city}/{id}
for(const raw of read(v["--masaken"])){try{const u=new URL(raw),p=u.pathname.split("/").filter(Boolean).map(dec);if(p.length!==4||!["fr","en"].includes(p[0])||p[1]!=="immobilier-maroc"||!/^\d+$/.test(p[3])){bad("masaken.ma",raw,"route_contract");continue}
 const parts=norm(p[2]).split(" "); const tr=parts[0]==="vente"||parts[0]==="sale"?"sale":parts[0]==="location"||parts[0]==="rent"?"rent":null;
 const pt=typeFrom(parts.slice(1,-1).join(" ")); const city=cityName(parts.at(-1));
 emit({source_name:"masaken.ma",listing_url:raw,source_offer_key:p[3],city,property_type:pt,transaction_type:tr,title_text:title(p[2]),rule:"masaken_structured_route"});}catch{bad("masaken.ma",raw,"bad_url")}}

// Mouldar: /fr|en/{achat|location|buy|rent}/{type}/{city}/{district}/{hexid}
for(const raw of read(v["--mouldar"])){try{const u=new URL(raw),p=u.pathname.split("/").filter(Boolean).map(dec);if(p.length!==6||!["fr","en"].includes(p[0])||!/^[a-f0-9]{8}$/i.test(p[5])){bad("mouldar.com",raw,"route_contract");continue}
 const tr=["achat","buy"].includes(norm(p[1]))?"sale":["location","rent"].includes(norm(p[1]))?"rent":null;
 emit({source_name:"mouldar.com",listing_url:raw,source_offer_key:p[5],city:title(p[3]),district:title(p[4]),property_type:typeFrom(p[2]),transaction_type:tr,title_text:title(p.slice(1,5).join(" ")),rule:"mouldar_structured_route"});}catch{bad("mouldar.com",raw,"bad_url")}}

// Promo: /produit/{ref}/{slug}; fixed Marrakech; reject location-sejour/vacances
for(const raw of read(v["--promo"])){try{const u=new URL(raw),p=u.pathname.split("/").filter(Boolean).map(dec);if(p.length!==3||p[0]!=="produit"){bad("promoimmomarrakech.com",raw,"route_contract");continue}
 const slug=norm(p[2]); if(/location sejour|vacance/.test(slug)){bad("promoimmomarrakech.com",raw,"vacation");continue}
 emit({source_name:"promoimmomarrakech.com",listing_url:raw,source_offer_key:norm(p[1]),city:"Marrakech",property_type:typeFrom(slug),transaction_type:txFrom(slug),title_text:title(p[2]),rule:"promo_structured_route"});}catch{bad("promoimmomarrakech.com",raw,"bad_url")}}

// DarAgadir: fixed Agadir; only /vente|location/ not location-de-vacances
for(const raw of read(v["--daragadir"])){try{const u=new URL(raw),p=u.pathname.split("/").filter(Boolean).map(dec);if(p.length<6||p[0]!=="annonces"||p[1]!=="annonces-immobilieres"||!["vente","location"].includes(norm(p[2]))){bad("daragadir.com",raw,"route_contract_or_vacation");continue}
 const slug=p.at(-1); const tr=norm(p[2])==="vente"?"sale":"rent";
 emit({source_name:"daragadir.com",listing_url:raw,source_offer_key:sha(raw).slice(0,24),city:"Agadir",property_type:typeFrom(p[3]),transaction_type:tr,title_text:title(slug),rule:"daragadir_structured_category"});}catch{bad("daragadir.com",raw,"bad_url")}}

// Sarouty: only direct /acheter/{slug-id}; PLP excluded
for(const raw of read(v["--sarouty"])){try{const u=new URL(raw),p=u.pathname.split("/").filter(Boolean).map(dec);if(p.length!==2||p[0]!=="acheter"){bad("sarouty.ma",raw,"plp_or_route_contract");continue}
 const m=p[1].match(/-(\d+)$/);if(!m){bad("sarouty.ma",raw,"missing_id");continue}
 emit({source_name:"sarouty.ma",listing_url:raw,source_offer_key:m[1],city:pickCity(p[1]),property_type:typeFrom(p[1]),transaction_type:"sale",title_text:title(p[1]),rule:"sarouty_direct_buy_route"});}catch{bad("sarouty.ma",raw,"bad_url")}}

// Avito: only when title itself exposes one city + one transaction; category gives type. Vacation excluded.
for(const raw of read(v["--avito"])){try{const u=new URL(raw),p=u.pathname.split("/").filter(Boolean).map(dec);if(p.length!==4||p[0]!=="fr"||/locations_de_vacances/.test(p[2])){bad("avito.ma",raw,"route_contract_or_vacation");continue}
 const m=p[3].match(/_(\d+)\.html?$/i);if(!m){bad("avito.ma",raw,"missing_id");continue}
 emit({source_name:"avito.ma",listing_url:raw,source_offer_key:m[1],city:pickCity(p[3]),district:title(p[1]),property_type:typeFrom(p[2]),transaction_type:txFrom(p[3]),title_text:title(p[3]),rule:"avito_explicit_title_only"});}catch{bad("avito.ma",raw,"bad_url")}}

const byId=new Map(),conflictKeys=new Set(),conflicts=[];
for(const r of safe){const k=r.source_name+"|"+r.source_offer_key;if(conflictKeys.has(k))continue;const prev=byId.get(k);if(!prev){byId.set(k,r);continue}const a=JSON.stringify([prev.city,prev.property_type,prev.transaction_type]),b=JSON.stringify([r.city,r.property_type,r.transaction_type]);if(a!==b){conflicts.push({identity:k,a:prev.listing_url,b:r.listing_url});byId.delete(k);conflictKeys.add(k);continue}if(r.listing_url.localeCompare(prev.listing_url)<0)byId.set(k,r)}
const out=[...byId.values()].sort((a,b)=>(a.source_name+"|"+a.source_offer_key).localeCompare(b.source_name+"|"+b.source_offer_key));
for(const k of ["listing_url","canonical_fingerprint"]){if(new Set(out.map(r=>r[k])).size!==out.length)throw new Error(k+" dup")}
if(new Set(out.map(r=>r.source_name+"|"+r.source_offer_key)).size!==out.length)throw new Error("identity dup");
const body=out.map(JSON.stringify).join("\n")+(out.length?"\n":"");const dir=v["--out-dir"];
fs.writeFileSync(dir+"/db-ready-wave13-strict-route.jsonl",body);
fs.writeFileSync(dir+"/rejected-wave13-strict-route.jsonl",rejected.concat(conflicts.map(x=>({reason:"identity_conflict",...x}))).map(JSON.stringify).join("\n")+"\n");
const by={};for(const r of out)by[r.source_name]=(by[r.source_name]||0)+1;
const inputs={};for(const [arg,src] of [["--daragadir","daragadir.com"],["--masaken","masaken.ma"],["--avito","avito.ma"],["--mouldar","mouldar.com"],["--promo","promoimmomarrakech.com"],["--sarouty","sarouty.ma"]])inputs[src]=read(v[arg]).length;
const summary={schema_version:"akarfinder-v4.11-wave13-strict-route-20260928",input_rows:inputs,pre_identity_rows:safe.length,identity_conflicts:conflicts.length,db_ready_rows:out.length,by_domain:by,rejected_rows:rejected.length+conflicts.length,output_sha256:sha(body),database_access:0,database_writes:0,production_neon_writes:0,approved_for_import_rows:0,vercel_deployment:false};
fs.writeFileSync(dir+"/summary.json",JSON.stringify(summary,null,2)+"\n");console.log(JSON.stringify(summary,null,2));
