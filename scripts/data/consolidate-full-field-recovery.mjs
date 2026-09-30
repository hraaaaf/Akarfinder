import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";

const inputDir=process.env.INPUT_DIR||".tmp/full-field-artifacts";
const freezePath=process.env.FREEZE_JSONL_GZ||".tmp/freeze/clean-corpus-v4.11-core.jsonl.gz";
const outputDir=process.env.OUTPUT_DIR||"data/recovery/full-field-consolidated";

const usefulFields=[
  "title","description","transaction_type","property_type","city","district","neighborhood",
  "surface_m2","built_surface_m2","plot_surface_m2","garden_m2","terrace_m2",
  "rooms_count","bedrooms_count","bathrooms_count","condition","property_age_range",
  "orientation","floor_type","floors_count","garage_spaces","has_pool","has_concierge",
  "has_equipped_kitchen","has_moroccan_living_room","has_european_living_room",
  "images_count","thumbnail_url"
];

const aliases={
  description:["description","description_snippet"],
  bedrooms_count:["bedrooms_count","bedrooms"],
  bathrooms_count:["bathrooms_count","bathrooms"]
};

function walk(dir){
  const out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
function present(v){ return v!==null&&v!==undefined&&v!==""; }
function baseValue(row,field){
  for(const k of aliases[field]||[field]) if(present(row[k])) return row[k];
  return null;
}
function ck(url,field){ return url+"\u0000"+field; }

function safeString(v){ return typeof v==="string"?v.replace(/\s+/g," ").trim():""; }
function containsContactPii(value){
  const s=safeString(value);
  if(!s) return false;
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(s)
    || /(?<!\d)(?:\+?212|0)\s*[5-7](?:[\s.\-]?\d){8}(?!\d)/i.test(s)
    || /\b(?:t[eé]l(?:[eé]phone)?|gsm|whats\s*app)\s*[:\-]?\s*(?:\+?212|0)?\s*[5-7](?:[\s.\-]?\d|\.{2,}){2,}/i.test(s)
    || /(?:wa\.me|api\.whatsapp\.com)/i.test(s);
}
function downgradeReason(c){
  if(c.state!=="write_safe") return null;
  const value=safeString(c.value);
  if(c.field==="title" && (
    /^(?:404(?:\b|[-_])|accueil\b|acceuil\b|page not found\b|not found\b)/i.test(value) ||
    /^tous\s+les?\s+biens?\s+immobiliers?\b/i.test(value) ||
    /^agence\s+immobili[eè]re\s+[àa]\b/i.test(value)
  )) return "generic_or_soft_page_title";
  if((c.field==="title"||c.field==="description") && containsContactPii(value)) return "contact_pii_blocked";
  if(c.field==="city" && /^(?:autre|other|unknown|n\/?a|hay\s+riad)$/i.test(value)) return "invalid_city_placeholder_or_neighborhood";
  if(c.field==="district" && /(?:\brez(?:-|s)?de\s+chauss|\bimmeuble\b|\bimm\s*n?[°o]?\s*\d+|\blocal\s+\d+|\bn[°o]\s*\d+|\bavenue\b|\brue\b|\bboulevard\b)/i.test(value)) return "address_like_value_not_district";
  return null;
}

const artifactFiles=walk(inputDir).filter(f=>f.endsWith(".jsonl"));
if(!artifactFiles.length) throw new Error("No full-field JSONL artifacts found");

const sourceResults=[];
const candidateRows=[];
const consolidationDowngrades=[];
for(const file of artifactFiles){
  for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean)){
    const r=JSON.parse(line);
    sourceResults.push(r);
    for(const raw of r.candidates||[]){
      const c={url:r.url,source:r.source,...raw};
      const reason=downgradeReason(c);
      if(reason){
        consolidationDowngrades.push({url:c.url,source:c.source,field:c.field,value:c.value,reason});
        c.state="review";
        c.consolidation_reason=reason;
      }
      candidateRows.push(c);
    }
  }
}

const candidateByKey=new Map();
const duplicateConflicts=[];
for(const c of candidateRows){
  const k=ck(c.url,c.field);
  if(!candidateByKey.has(k)){ candidateByKey.set(k,c); continue; }
  const prev=candidateByKey.get(k);
  if(JSON.stringify(prev.value)!==JSON.stringify(c.value)||prev.state!==c.state){
    duplicateConflicts.push({key:k,a:prev,b:c});
  }
}

const urls=new Set(sourceResults.map(r=>r.url));
const freezeByUrl=new Map();
const rl=readline.createInterface({input:createReadStream(freezePath).pipe(createGunzip()),crlfDelay:Infinity});
for await(const line of rl){
  if(!line.trim()) continue;
  const row=JSON.parse(line);
  if(urls.has(row.canonical_url)) freezeByUrl.set(row.canonical_url,row);
}

const passports=[];
const stateCounts={existing:0,recovered_write_safe:0,review:0,contradicted:0,missing:0};
let completeBefore=0, completeAfterSafe=0;
for(const r of sourceResults){
  const base=freezeByUrl.get(r.url)||{};
  const fields={};
  let before=0, afterSafe=0;
  for(const field of usefulFields){
    const b=baseValue(base,field);
    if(present(b)){
      fields[field]={state:"existing",value:b};
      stateCounts.existing++; before++; afterSafe++;
      continue;
    }
    const c=candidateByKey.get(ck(r.url,field));
    if(c){
      const state=c.state==="write_safe"?"recovered_write_safe":c.state;
      fields[field]={state,value:c.value,evidence:c.evidence,confidence:c.confidence};
      stateCounts[state]++;
      if(state==="recovered_write_safe") afterSafe++;
    } else {
      fields[field]={state:"missing"};
      stateCounts.missing++;
    }
  }
  completeBefore+=before/usefulFields.length;
  completeAfterSafe+=afterSafe/usefulFields.length;
  passports.push({
    url:r.url,source:r.source,http_status:r.http_status,robots_allowed:r.robots_allowed,
    completeness_before:before/usefulFields.length,
    completeness_after_safe:afterSafe/usefulFields.length,
    fields
  });
}

const semanticIssues=[];
for(const p of passports){
  for(const [field,obj] of Object.entries(p.fields)){
    if(obj.state!=="recovered_write_safe") continue;
    const v=Number(obj.value);
    if(field==="surface_m2" && !(v>0&&v<=100000)) semanticIssues.push({url:p.url,field,value:obj.value,reason:"invalid_safe_surface"});
    if(field==="bedrooms_count" && !(v>=0&&v<=20)) semanticIssues.push({url:p.url,field,value:obj.value,reason:"invalid_safe_bedrooms"});
    if(field==="bathrooms_count" && !(v>=0&&v<=20)) semanticIssues.push({url:p.url,field,value:obj.value,reason:"invalid_safe_bathrooms"});
    if(field==="rooms_count" && !(v>=0&&v<=50)) semanticIssues.push({url:p.url,field,value:obj.value,reason:"invalid_safe_rooms"});
  }
}

const uniqueUrls=new Set(passports.map(p=>p.url));
const summary={
  schema_version:"AKARFINDER_FULL_FIELD_PASSPORT_V1",
  sources:[...new Set(passports.map(p=>p.source))].sort(),
  artifact_files:artifactFiles.length,
  listing_passports:passports.length,
  unique_urls:uniqueUrls.size,
  candidate_rows:candidateRows.length,
  candidate_unique_url_fields:candidateByKey.size,
  duplicate_conflicts:duplicateConflicts.length,
  semantic_issues:semanticIssues,
  consolidation_downgrades:consolidationDowngrades,
  field_state_counts:stateCounts,
  average_completeness_before:passports.length?completeBefore/passports.length:0,
  average_completeness_after_safe:passports.length?completeAfterSafe/passports.length:0,
  database_access:0,
  database_writes:0
};

fs.mkdirSync(outputDir,{recursive:true});
passports.sort((a,b)=>a.source.localeCompare(b.source)||a.url.localeCompare(b.url));
fs.writeFileSync(path.join(outputDir,"full-field-passports.jsonl"),passports.map(x=>JSON.stringify(x)).join("\n")+"\n");
fs.writeFileSync(path.join(outputDir,"full-field-summary.json"),JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));

if(duplicateConflicts.length||semanticIssues.length) process.exitCode=2;
