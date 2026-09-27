#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const args=process.argv.slice(2);
const vals={}; for(let i=0;i<args.length;i+=2) vals[args[i]]=args[i+1];
const sarout=vals["--sarout"], maroc=vals["--marocannonces"], domio=vals["--domio"], outDir=vals["--out-dir"];
if(!sarout||!maroc||!domio||!outDir) throw new Error("missing args");
fs.mkdirSync(outDir,{recursive:true});

const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const dec=s=>{try{return decodeURIComponent(s)}catch{return s}};
const norm=s=>dec(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
const title=s=>dec(s).replace(/\.(html?|php)$/i,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim().replace(/^./,c=>c.toUpperCase());

const cities=[
["Casablanca",/\b(casablanca|casa)\b/],["Rabat",/\brabat\b/],["Marrakech",/\b(marrakech|marrakesh)\b/],
["Tanger",/\b(tanger|tangier)\b/],["Fès",/\b(fes|fez)\b/],["Agadir",/\bagadir\b/],["Meknès",/\bmeknes\b/],
["Kénitra",/\bkenitra\b/],["Mohammedia",/\bmohammedia\b/],["Oujda",/\boujda\b/],["Tétouan",/\btetouan\b/],
["Témara",/\btemara\b/],["Essaouira",/\bessaouira\b/],["Bouskoura",/\bbouskoura\b/],["Bouznika",/\bbouznika\b/],
["El Jadida",/\bel jadida\b/],["Dar Bouazza",/\bdar bouazza\b/],["Safi",/\bsafi\b/],["Nador",/\bnador\b/],
["Dakhla",/\bdakhla\b/],["Laâyoune",/\blaayoune\b/],["Berrechid",/\bberrechid\b/],["Martil",/\bmartil\b/],
["Ifrane",/\bifrane\b/],["Skhirat",/\bskhirat\b/],["Salé",/\bsale\b/],["Khouribga",/\bkhouribga\b/],
["Béni Mellal",/\bbeni mellal\b/],["Settat",/\bsettat\b/],["Larache",/\blarache\b/],["Chefchaouen",/\bchefchaouen\b/]
];
const types=[
["apartment",/\b(appartements?|appartement|apartment|apartments|appart|appt|flat|duplex)\b/],
["studio",/\bstudios?\b/],["villa",/\bvillas?\b/],["house",/\b(maisons?|houses?|maison)\b/],
["land",/\b(terrains?|land|plot|parcelle|ferme|farm)\b/],["office",/\b(bureaux?|office|offices)\b/],
["commercial",/\b(local commercial|locaux|local|commercial|commerce|magasin|shop)\b/],["riad",/\briads?\b/]
];
const tx=(txt)=>{
  const rent=/(?:^|\b)(a louer|louer|location|rent|rental|for rent)(?:\b|$)/.test(txt);
  const sale=/(?:^|\b)(a vendre|vendre|vente|achat|acheter|sale|for sale|buy)(?:\b|$)/.test(txt);
  return rent!==sale?(rent?"rent":"sale"):null;
};
const pick=(txt,dict)=>{const x=[...new Set(dict.filter(([,r])=>r.test(txt)).map(([v])=>v))]; return x.length===1?x[0]:null};

function readLines(p){return fs.readFileSync(p,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
const safe=[], rejected=[];
function emit({source_name,listing_url,source_offer_key,city,property_type,transaction_type,title_text,rule}){
  if(!source_offer_key||!city||!property_type||!transaction_type||!title_text||title_text.length<8){
    rejected.push({source_name,listing_url,reason:"core_incomplete",rule}); return;
  }
  const fp=sha("representation|"+listing_url);
  safe.push({
    canonical_fingerprint:fp,title:title_text,price_mad:null,city,district:null,property_type,transaction_type,
    surface_m2:null,rooms_count:null,bedrooms_count:null,bathrooms_count:null,description_snippet:null,images_count:null,seller_name:null,
    data_completeness_score:80,
    field_confidence:{certification:"v4.11_wave11_big_portal_route",title:{source:"route_explicit"},city:{source:"route_explicit"},property_type:{source:"route_explicit"},transaction_type:{source:"route_explicit"},rule,cross_source_merge_performed:false},
    source_name,listing_url,source_url:"https://"+source_name,first_seen_at:null,last_seen_at:null,source_offer_key,
    origin_type:"legacy_import",compliance_status:"recovery_verified_v4_11_wave11_big_portal_route",
    content_fingerprint:fp,ingestion_run_id:"clean-corpus-v4.11-wave11-big-portal",
    displayed_price:null,price_currency:null,price_period:null,price_status:"not_disclosed",approved_for_import:false
  });
}

for(const raw of readLines(domio)){
  try{
    const u=new URL(raw),p=u.pathname.split("/").filter(Boolean).map(dec);
    if(p.length<6||p[0]!=="fr"){rejected.push({source_name:"domio.ma",listing_url:raw,reason:"route_contract"});continue}
    const pt=pick(norm(p[1]),types), tr=p[2]==="vendre"?"sale":p[2]==="louer"?"rent":null;
    const city=title(p[3]), key=p[4], tt=title(p[5]);
    emit({source_name:"domio.ma",listing_url:raw,source_offer_key:key,city,property_type:pt,transaction_type:tr,title_text:tt,rule:"domio_structured_route"});
  }catch{rejected.push({source_name:"domio.ma",listing_url:raw,reason:"bad_url"})}
}

for(const raw of readLines(sarout)){
  try{
    const u=new URL(raw),p=u.pathname.split("/").filter(Boolean).map(dec);
    if(p.length<4||!["fr","ar"].includes(p[0])||p[1]!=="annonce"||!/^\d+$/.test(p[2])){rejected.push({source_name:"sarout.ma",listing_url:raw,reason:"route_contract"});continue}
    const slug=norm(p.slice(3).join(" ")), city=pick(slug,cities), pt=pick(slug,types), tr=tx(slug);
    emit({source_name:"sarout.ma",listing_url:raw,source_offer_key:p[2],city,property_type:pt,transaction_type:tr,title_text:title(p.slice(3).join(" ")),rule:"sarout_slug_explicit"});
  }catch{rejected.push({source_name:"sarout.ma",listing_url:raw,reason:"bad_url"})}
}

for(const raw of readLines(maroc)){
  try{
    const u=new URL(raw),p=u.pathname.split("/").filter(Boolean).map(dec);
    const ix=p.indexOf("annonce");
    if(ix<2||!/^\d+$/.test(p[ix+1]||"")){rejected.push({source_name:"marocannonces.com",listing_url:raw,reason:"route_contract"});continue}
    const typeSeg=norm(p[ix-1]||""), slug=norm((p[ix+2]||"").replace(/\.html?$/i,""));
    const city=pick(slug,cities), pt=pick(typeSeg+" "+slug,types), tr=tx(slug);
    emit({source_name:"marocannonces.com",listing_url:raw,source_offer_key:p[ix+1],city,property_type:pt,transaction_type:tr,title_text:title(p[ix+2]||""),rule:"marocannonces_route_slug_explicit"});
  }catch{rejected.push({source_name:"marocannonces.com",listing_url:raw,reason:"bad_url"})}
}

const byId=new Map(), conflicts=[];
for(const r of safe){
  const k=r.source_name+"|"+r.source_offer_key, prev=byId.get(k);
  if(!prev){byId.set(k,r);continue}
  const a=JSON.stringify([prev.city,prev.property_type,prev.transaction_type]),b=JSON.stringify([r.city,r.property_type,r.transaction_type]);
  if(a!==b){conflicts.push({identity:k,a:prev.listing_url,b:r.listing_url});byId.delete(k);continue}
  if(r.listing_url.length<prev.listing_url.length)byId.set(k,r);
}
const out=[...byId.values()];
if(new Set(out.map(r=>r.listing_url)).size!==out.length)throw new Error("url dup");
if(new Set(out.map(r=>r.canonical_fingerprint)).size!==out.length)throw new Error("fp dup");
if(new Set(out.map(r=>r.source_name+"|"+r.source_offer_key)).size!==out.length)throw new Error("id dup");
const body=out.map(JSON.stringify).join("\n")+(out.length?"\n":"");
fs.writeFileSync(outDir+"/db-ready-wave11.jsonl",body);
fs.writeFileSync(outDir+"/rejected-wave11.jsonl",rejected.concat(conflicts.map(x=>({reason:"identity_conflict",...x}))).map(JSON.stringify).join("\n")+"\n");
const by={};for(const r of out)by[r.source_name]=(by[r.source_name]||0)+1;
fs.writeFileSync(outDir+"/summary.json",JSON.stringify({
 schema_version:"akarfinder-v4.11-wave11-big-portal-route-20260927",
 input_rows:{sarout:readLines(sarout).length,marocannonces:readLines(maroc).length,domio:readLines(domio).length},
 pre_identity_rows:safe.length,identity_conflicts:conflicts.length,db_ready_rows:out.length,by_domain:by,
 rejected_rows:rejected.length+conflicts.length,output_sha256:sha(body),
 database_access:0,database_writes:0,production_neon_writes:0,approved_for_import_rows:0,vercel_deployment:false
},null,2)+"\n");
console.log(JSON.stringify({ready:out.length,by,rejected:rejected.length,conflicts:conflicts.length},null,2));
