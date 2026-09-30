import fs from "node:fs";
import path from "node:path";

const input=process.env.PASSPORTS_JSONL||process.argv[2]||".tmp/full-field/full-field-passports.jsonl";
const outputDir=process.env.OUTPUT_DIR||process.argv[3]||"artifacts/neon-full-field-write";
fs.mkdirSync(outputDir,{recursive:true});

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
const expectedByField={
  title:1936,
  description_snippet:616,
  transaction_type:2082,
  property_type:1677,
  city:764,
  district:67,
  surface_m2:218,
  rooms_count:177,
  bedrooms_count:53,
  bathrooms_count:135
};
function csv(v){
  if(v===null||v===undefined) return "";
  const s=String(v);
  return /[",\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;
}

const rows=[];
const counts=Object.fromEntries(Object.keys(expectedByField).map(k=>[k,0]));
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

if(rows.length!==2385) throw new Error(`expected 2385 staged URLs, got ${rows.length}`);
if(candidateCount!==7725) throw new Error(`expected 7725 fields, got ${candidateCount}`);
for(const [field,expected] of Object.entries(expectedByField)){
  if(counts[field]!==expected) throw new Error(`${field}: expected ${expected}, got ${counts[field]}`);
}
const seen=new Set();
for(const row of rows){
  if(seen.has(row.url)) throw new Error(`duplicate URL ${row.url}`);
  seen.add(row.url);
}

const csvText=[
  columns.join(","),
  ...rows.map(r=>columns.map(c=>csv(r[c])).join(","))
].join("\n")+"\n";
fs.writeFileSync(path.join(outputDir,"full-field-write-stage.csv"),csvText);
fs.writeFileSync(path.join(outputDir,"stage-summary.json"),JSON.stringify({
  schema_version:"AKARFINDER_NEON_FULL_FIELD_WRITE_STAGE_V1",
  staged_urls:rows.length,
  staged_fields:candidateCount,
  fields:counts,
  source_artifact_id:11107346118,
  source_artifact_digest:"sha256:836f9b40f161294808ce92148d7459f392bae9f6be74eeec556f7c4e3dcf8cf5",
  database_access:0,
  database_writes:0
},null,2)+"\n");
console.log(JSON.stringify({staged_urls:rows.length,staged_fields:candidateCount,fields:counts},null,2));
