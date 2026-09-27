#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const input=process.argv[2], outDir=process.argv[3];
if(!input||!outDir)throw new Error("usage: input outDir");
fs.mkdirSync(outDir,{recursive:true});
const rows=fs.readFileSync(input,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);

const ptMap={appartement:"apartment",studio:"studio",villa:"villa",maison:"house",terrain:"land",bureau:"office",commerce:"commercial",local:"commercial",riad:"riad"};
const txMap={achat:"sale",location:"rent"};
const title=s=>decodeURIComponent(s).replace(/[-_]+/g," ").replace(/\s+/g," ").trim().replace(/^./,c=>c.toUpperCase());
const normCity=s=>title(s).replace(/^Kenitra$/,"Kénitra").replace(/^Essaouira$/,"Essaouira").replace(/^Casablanca$/,"Casablanca").replace(/^Bouznika$/,"Bouznika").replace(/^Harhoura$/,"Harhoura");
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");

const safe=[], rejected=[];
for(const r of rows){
  const u=new URL(r.canonical_url),d=r.source_domain,p=u.pathname.split("/").filter(Boolean);
  let tx=null,pt=null,city=null,t=null,key=null;
  if(["fadlimmo.com","bakimmo.com","immoessaouira.com"].includes(d)){
    if(p.length<6||p[0]!=="fr"||!txMap[p[1]]){rejected.push({...r,reason:"route_contract"});continue}
    tx=txMap[p[1]]; pt=ptMap[p[2]]||null; city=normCity(p[3]); key=p.at(-1); t=title(p[2]+" "+p[1]+" "+p[3]+" "+p[4]);
  } else if(d==="capalmrabat.com"){
    if(p.length<4||p[0]!=="biens"){rejected.push({...r,reason:"route_contract"});continue}
    pt=ptMap[p[1]]||null; city=normCity(p[2]); key=sha(u.pathname).slice(0,24);
    const slug=decodeURIComponent(p[3]).toLowerCase();
    const rent=/(^|-)a-louer(-|$)|(^|-)location(-|$)/.test(slug);
    const sale=/(^|-)a-vendre(-|$)|(^|-)vente(-|$)/.test(slug);
    if(rent===sale){rejected.push({...r,reason:"ambiguous_transaction"});continue}
    tx=rent?"rent":"sale"; t=title(p[3]);
  } else { rejected.push({...r,reason:"unsupported_source"}); continue; }
  if(!pt||!city||!tx||!t||t.length<8){rejected.push({...r,reason:"core_incomplete"});continue}
  const fp=sha("representation|"+r.canonical_url);
  safe.push({
    canonical_fingerprint:fp,title:t,price_mad:null,city,district:null,property_type:pt,transaction_type:tx,
    surface_m2:null,rooms_count:null,bedrooms_count:null,bathrooms_count:null,description_snippet:null,images_count:null,seller_name:null,
    data_completeness_score:80,
    field_confidence:{certification:"v4.11_wave9_new_sources_route",title:{source:"route"},city:{source:"route"},property_type:{source:"route"},transaction_type:{source:"route"},source_cc_artifact_id:10936353396,cross_source_merge_performed:false},
    source_name:d,listing_url:r.canonical_url,source_url:"https://"+d,first_seen_at:null,last_seen_at:null,
    source_offer_key:key,origin_type:"legacy_import",compliance_status:"recovery_verified_v4_11_wave9_new_sources",
    content_fingerprint:fp,ingestion_run_id:"clean-corpus-v4.11-wave9-new-sources",displayed_price:null,price_currency:null,price_period:null,price_status:"not_disclosed",approved_for_import:false
  });
}
const byIdentity=new Map(), identityConflicts=[];
for(const r of safe){
  const k=r.source_name+"|"+r.source_offer_key;
  const prev=byIdentity.get(k);
  if(!prev){byIdentity.set(k,r);continue}
  const a=JSON.stringify([prev.city,prev.property_type,prev.transaction_type]);
  const b=JSON.stringify([r.city,r.property_type,r.transaction_type]);
  if(a!==b){identityConflicts.push({identity:k,urls:[prev.listing_url,r.listing_url],cores:[JSON.parse(a),JSON.parse(b)]});byIdentity.delete(k);continue}
  if(r.listing_url.length<prev.listing_url.length || (r.listing_url.length===prev.listing_url.length && r.listing_url.localeCompare(prev.listing_url)<0)) byIdentity.set(k,r);
}
const deduped=[...byIdentity.values()];
for(const x of identityConflicts)rejected.push({reason:"identity_core_conflict",...x});
if(new Set(deduped.map(r=>r.listing_url)).size!==deduped.length)throw new Error("url duplicate");
if(new Set(deduped.map(r=>r.canonical_fingerprint)).size!==deduped.length)throw new Error("fp duplicate");
if(new Set(deduped.map(r=>r.source_name+"|"+r.source_offer_key)).size!==deduped.length)throw new Error("identity duplicate");
const body=deduped.map(JSON.stringify).join("\n")+(deduped.length?"\n":"");
const rej=rejected.map(JSON.stringify).join("\n")+(rejected.length?"\n":"");
fs.writeFileSync(outDir+"/db-ready-wave9-new-sources.jsonl",body);
fs.writeFileSync(outDir+"/rejected.jsonl",rej);
const byDomain={};for(const r of deduped)byDomain[r.source_name]=(byDomain[r.source_name]||0)+1;
fs.writeFileSync(outDir+"/summary.json",JSON.stringify({
 schema_version:"akarfinder-v4.11-wave9-new-sources-route-20260927",
 input_rows:rows.length,pre_identity_rows:safe.length,identity_collapsed_rows:safe.length-deduped.length-identityConflicts.length,identity_conflicts:identityConflicts.length,db_ready_rows:deduped.length,rejected_rows:rejected.length,by_domain:byDomain,
 output_sha256:sha(body),database_access:0,database_writes:0,production_neon_writes:0,approved_for_import_rows:0,vercel_deployment:false
},null,2)+"\n");
console.log(JSON.stringify({ready:safe.length,rejected:rejected.length,byDomain},null,2));
