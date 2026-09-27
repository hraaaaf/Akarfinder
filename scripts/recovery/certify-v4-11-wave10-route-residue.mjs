#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const input=process.argv[2], outDir=process.argv[3];
if(!input||!outDir)throw new Error("usage: input outDir");
fs.mkdirSync(outDir,{recursive:true});
const rows=fs.readFileSync(input,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);

const ptMap={
  appartement:"apartment",studio:"studio",villa:"villa",maison:"house",terrain:"land",
  bureau:"office",commerce:"commercial",local:"commercial",riad:"riad",
  ferme:"land","local-commercial":"commercial","local-industriel":"commercial"
};
const txMap={achat:"sale",location:"rent"};
const dec=s=>{try{return decodeURIComponent(s)}catch{return s}};
const title=s=>dec(s).replace(/[-_]+/g," ").replace(/\s+/g," ").trim().replace(/^./,c=>c.toUpperCase());
const normCity=s=>title(s).replace(/^Kenitra$/,"Kénitra").replace(/^Temara$/,"Témara").replace(/^Sale$/,"Salé").replace(/^Fes$/,"Fès");
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const cityChecks=[
  ["Casablanca",/\b(casablanca|casa)\b/],["Rabat",/\brabat\b/],["Marrakech",/\b(marrakech|marrakesh)\b/],
  ["Tanger",/\b(tanger|tangier)\b/],["Fès",/\b(fes|fez)\b/],["Agadir",/\bagadir\b/],["Kénitra",/\bkenitra\b/],
  ["Mohammedia",/\bmohammedia\b/],["El Jadida",/\bel jadida\b/],["Salé",/\bsale\b/],["Bouznika",/\bbouznika\b/],
  ["Skhirat",/\bskhirat\b/],["Témara",/\btemara\b/],["Safi",/\bsafi\b/],["Martil",/\bmartil\b/],
  ["Dakhla",/\bdakhla\b/],["Bouskoura",/\bbouskoura\b/]
];

const safe=[], rejected=[];
for(const r of rows){
  const u=new URL(r.canonical_url),d=r.source_domain,p=u.pathname.split("/").filter(Boolean).map(dec);
  let tx=null,pt=null,city=null,t=null,key=null;

  if(["fadlimmo.com","bakimmo.com","immoessaouira.com"].includes(d)){
    if(p.length<6||p[0]!=="fr"||!txMap[p[1]]){rejected.push({...r,wave10_reason:"route_contract"});continue}
    tx=txMap[p[1]]; pt=ptMap[p[2]]||null; city=normCity(p[3]); key=p.at(-1);
    t=title(p[2]+" "+p[1]+" "+p[3]+" "+p[4]);
  } else if(d==="capalmrabat.com"){
    if(p.length<4||p[0]!=="biens"){rejected.push({...r,wave10_reason:"route_contract"});continue}
    pt=ptMap[p[1]]||null; city=normCity(p[2]); key=sha(u.pathname).slice(0,24);
    const slug=p[3].toLowerCase();
    const rent=/(^|-)a-louer(-|$)|(^|-)location(-|$)/.test(slug);
    const sale=/(^|-)a-vendre(-|$)|(^|-)vente(-|$)/.test(slug);
    if(rent!==sale)tx=rent?"rent":"sale";
    t=title(p[3]);
  } else if(d==="archimmomaroc.com"){
    if(p.length<2||p[0]!=="propriete"){rejected.push({...r,wave10_reason:"route_contract"});continue}
    const raw=p[1], m=raw.match(/-(\d{8,})$/);
    if(!m){rejected.push({...r,wave10_reason:"identity_missing"});continue}
    key=m[1];
    const slug=raw.slice(0,-m[0].length).toLowerCase();
    const rent=/(^|-)(a-louer|location|louer)(-|$)|(^|-)a-la-location(-|$)|(^|-)pour-la-location(-|$)/.test(slug);
    const sale=/(^|-)(a-vendre|vente|vendre)(-|$)/.test(slug);
    if(rent!==sale)tx=rent?"rent":"sale";

    const txt=slug.replace(/-/g," ");
    const typeChecks=[
      ["apartment",/\bappartements?\b/],["studio",/\bstudios?\b/],["villa",/\bvillas?\b/],
      ["house",/\bmaisons?\b/],["land",/\bterrains?\b|\bfermes?\b/],["office",/\bbureaux?\b/],
      ["commercial",/\b(local|commerce|magasin|boulangerie|patisserie)\b/],["riad",/\briads?\b/]
    ];
    const types=[...new Set(typeChecks.filter(([,re])=>re.test(txt)).map(([v])=>v))];
    if(types.length===1)pt=types[0];
    const cities=[...new Set(cityChecks.filter(([,re])=>re.test(txt)).map(([v])=>v))];
    if(cities.length===1)city=cities[0];
    t=title(slug);
  } else {
    rejected.push({...r,wave10_reason:"unsupported_source"}); continue;
  }

  if(!tx||!pt||!city||!t||t.length<8){rejected.push({...r,wave10_reason:"strict_core_incomplete"});continue}
  const fp=sha("representation|"+r.canonical_url);
  safe.push({
    canonical_fingerprint:fp,title:t,price_mad:null,city,district:null,property_type:pt,transaction_type:tx,
    surface_m2:null,rooms_count:null,bedrooms_count:null,bathrooms_count:null,description_snippet:null,images_count:null,seller_name:null,
    data_completeness_score:80,
    field_confidence:{certification:"v4.11_wave10_route_residue",title:{source:"route_explicit"},city:{source:"route_explicit"},property_type:{source:"route_explicit"},transaction_type:{source:"route_explicit"},source_wave9_artifact_id:10937202447,cross_source_merge_performed:false},
    source_name:d,listing_url:r.canonical_url,source_url:"https://"+d,first_seen_at:null,last_seen_at:null,source_offer_key:key,
    origin_type:"legacy_import",compliance_status:"recovery_verified_v4_11_wave10_route_residue",
    content_fingerprint:fp,ingestion_run_id:"clean-corpus-v4.11-wave10-route-residue",
    displayed_price:null,price_currency:null,price_period:null,price_status:"not_disclosed",approved_for_import:false
  });
}

const byIdentity=new Map(), conflicts=[];
for(const r of safe){
  const k=r.source_name+"|"+r.source_offer_key,prev=byIdentity.get(k);
  if(!prev){byIdentity.set(k,r);continue}
  const a=JSON.stringify([prev.city,prev.property_type,prev.transaction_type]),b=JSON.stringify([r.city,r.property_type,r.transaction_type]);
  if(a!==b){conflicts.push({identity:k,urls:[prev.listing_url,r.listing_url],cores:[JSON.parse(a),JSON.parse(b)]});byIdentity.delete(k);continue}
  if(r.listing_url.length<prev.listing_url.length || (r.listing_url.length===prev.listing_url.length&&r.listing_url.localeCompare(prev.listing_url)<0))byIdentity.set(k,r);
}
const out=[...byIdentity.values()];
for(const x of conflicts)rejected.push({wave10_reason:"identity_core_conflict",...x});
if(new Set(out.map(r=>r.listing_url)).size!==out.length)throw new Error("url duplicate");
if(new Set(out.map(r=>r.canonical_fingerprint)).size!==out.length)throw new Error("fp duplicate");
if(new Set(out.map(r=>r.source_name+"|"+r.source_offer_key)).size!==out.length)throw new Error("identity duplicate");
if(out.some(r=>![r.title,r.city,r.property_type,r.transaction_type].every(v=>v&&String(v).trim())))throw new Error("core gap");

const body=out.map(JSON.stringify).join("\n")+(out.length?"\n":"");
fs.writeFileSync(outDir+"/db-ready-wave10-route-residue.jsonl",body);
fs.writeFileSync(outDir+"/rejected-wave10.jsonl",rejected.map(JSON.stringify).join("\n")+(rejected.length?"\n":""));
const byDomain={};for(const r of out)byDomain[r.source_name]=(byDomain[r.source_name]||0)+1;
fs.writeFileSync(outDir+"/summary.json",JSON.stringify({
  schema_version:"akarfinder-v4.11-wave10-route-residue-20260927",
  input_rows:rows.length,pre_identity_rows:safe.length,identity_conflicts:conflicts.length,db_ready_rows:out.length,
  rejected_rows:rejected.length,by_domain:byDomain,output_sha256:sha(body),
  database_access:0,database_writes:0,production_neon_writes:0,approved_for_import_rows:0,vercel_deployment:false
},null,2)+"\n");
console.log(JSON.stringify({ready:out.length,rejected:rejected.length,byDomain},null,2));
