import fs from "node:fs";
import path from "node:path";

const input=process.env.PASSPORTS_JSONL||process.argv[2]||".tmp/full-field/full-field-passports.jsonl";
const summaryPath=process.env.FULL_FIELD_SUMMARY||process.argv[3]||".tmp/full-field/full-field-summary.json";
const outputDir=process.env.OUTPUT_DIR||process.argv[4]||"artifacts/neon-full-field-write";
fs.mkdirSync(outputDir,{recursive:true});

const certified=JSON.parse(fs.readFileSync(summaryPath,"utf8"));
if(certified.schema_version!=="AKARFINDER_FULL_FIELD_PASSPORT_V1") throw new Error("unexpected full-field schema");
if(Number(certified.duplicate_conflicts)!==0) throw new Error("full-field artifact has duplicate conflicts");
if((certified.semantic_issues||[]).length!==0) throw new Error("full-field artifact has semantic issues");
if(Number(certified.database_access)!==0||Number(certified.database_writes)!==0) throw new Error("full-field artifact is not read-only certified");

const columns=[
  "url","title","description_snippet","transaction_type","property_type","city","district",
  "surface_m2","rooms_count","bedrooms_count","bathrooms_count"
];
const fieldMap={
  title:"title",
  description:"description_snippet",
  transaction_type:"transaction_type",
  property_type:"property_type",
  city:"city",
  district:"district",
  surface_m2:"surface_m2",
  rooms_count:"rooms_count",
  bedrooms_count:"bedrooms_count",
  bathrooms_count:"bathrooms_count"
};
function csv(v){
  if(v===null||v===undefined) return "";
  const s=String(v);
  return /[",\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;
}

const rows=[];
const counts=Object.fromEntries(Object.values(fieldMap).map(k=>[k,0]));
let candidateCount=0;
for(const line of fs.readFileSync(input,"utf8").split(/\r?\n/).filter(Boolean)){
  const p=JSON.parse(line);
  const row={url:p.url};
  let n=0;
  for(const [passportField,dbField] of Object.entries(fieldMap)){
    const f=p.fields?.[passportField];
    if(f?.state!=="recovered_write_safe") continue;
    if(row[dbField]!==undefined && JSON.stringify(row[dbField])!==JSON.stringify(f.value)){
      throw new Error(`duplicate conflicting value ${p.url} ${dbField}`);
    }
    row[dbField]=f.value;
    counts[dbField]++;
    candidateCount++;
    n++;
  }
  if(n) rows.push(row);
}
rows.sort((a,b)=>a.url.localeCompare(b.url));

const certifiedWriteSafe=Number(certified.field_state_counts?.recovered_write_safe||0);
if(candidateCount!==certifiedWriteSafe){
  throw new Error(`write-safe count mismatch: passports=${candidateCount} summary=${certifiedWriteSafe}`);
}
const seen=new Set();
for(const row of rows){
  if(seen.has(row.url)) throw new Error(`duplicate URL ${row.url}`);
  seen.add(row.url);
}

fs.writeFileSync(
  path.join(outputDir,"full-field-write-stage.csv"),
  [columns.join(","),...rows.map(r=>columns.map(c=>csv(r[c])).join(","))].join("\n")+"\n"
);
fs.writeFileSync(path.join(outputDir,"stage-summary.json"),JSON.stringify({
  schema_version:"AKARFINDER_NEON_FULL_FIELD_WRITE_STAGE_V1",
  staged_urls:rows.length,
  staged_fields:candidateCount,
  fields:counts,
  source_listing_passports:Number(certified.listing_passports||0),
  source_unique_urls:Number(certified.unique_urls||0),
  source_duplicate_conflicts:Number(certified.duplicate_conflicts||0),
  source_semantic_issues:(certified.semantic_issues||[]).length,
  database_access:0,
  database_writes:0
},null,2)+"\n");
console.log(JSON.stringify({staged_urls:rows.length,staged_fields:candidateCount,fields:counts},null,2));
