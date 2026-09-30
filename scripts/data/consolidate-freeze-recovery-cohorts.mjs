import fs from "node:fs";
import path from "node:path";

const inputDir=process.env.INPUT_DIR||process.argv[2]||".tmp/recovery-artifacts";
const outputDir=process.env.OUTPUT_DIR||process.argv[3]||"data/recovery/consolidated";

function walk(dir){
  const out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}
function readJsonl(file){
  return fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l));
}
function key(x){ return `${x.url}\u0000${x.field}`; }
function dedupe(rows){
  const map=new Map(), conflicts=[];
  for(const x of rows){
    const k=key(x);
    if(map.has(k) && JSON.stringify(map.get(k).value)!==JSON.stringify(x.value)) conflicts.push({key:k,a:map.get(k),b:x});
    else map.set(k,x);
  }
  return {rows:[...map.values()],conflicts};
}
function isLand(url=""){ return /(?:^|[\/-])(?:terrain|land)(?:[\/-]|$)/i.test(url); }

const files=walk(inputDir);
const writeFiles=files.filter(f=>f.endsWith("-offline-write-safe.jsonl"));
const reviewFiles=files.filter(f=>f.endsWith("-offline-review.jsonl"));
if(!writeFiles.length) throw new Error("No offline-write-safe JSONL inputs found");

const rawWrite=writeFiles.flatMap(readJsonl);
const rawReview=reviewFiles.flatMap(readJsonl);
const dw=dedupe(rawWrite), dr=dedupe(rawReview);
let write=dw.rows, review=dr.rows;
const reviewByKey=new Map(review.map(x=>[key(x),x]));
const downgraded=[];

function downgrade(row,reason){
  const k=key(row);
  if(!write.some(x=>key(x)===k)) return;
  write=write.filter(x=>key(x)!==k);
  const r={...row,confidence:"review",mode:"offline_review",consolidation_reason:reason};
  if(!reviewByKey.has(k)){ review.push(r); reviewByKey.set(k,r); }
  downgraded.push({url:row.url,source:row.source,field:row.field,value:row.value,reason});
}

for(const x of [...write]){
  if(x.field==="surface_m2" && Number.isFinite(Number(x.value)) && Number(x.value)>100000){
    downgrade(x,"extreme_surface_over_100000m2_review");
  }
}

const byUrl=new Map();
for(const x of write){
  if(!byUrl.has(x.url)) byUrl.set(x.url,new Map());
  byUrl.get(x.url).set(x.field,x);
}
for(const [url,fields] of byUrl){
  const p=fields.get("price_mad"), s=fields.get("surface_m2");
  if(!p||!s||p.price_period_candidate!=="sale"||isLand(url)) continue;
  const price=Number(p.value), surface=Number(s.value);
  if(!(price>0&&surface>0)) continue;
  const ppm2=price/surface;
  if(ppm2<500||ppm2>100000) downgrade(p,"cross_field_sale_price_per_m2_outlier");
}

const finalWrite=dedupe(write), finalReview=dedupe(review);
const overlap=new Set(finalWrite.rows.map(key));
const crossOverlap=finalReview.rows.filter(x=>overlap.has(key(x)));

const semanticIssues=[];
for(const x of finalWrite.rows){
  const v=Number(x.value);
  if(x.field==="price_mad" && !(v>0)) semanticIssues.push({type:"invalid_price",row:x});
  if(x.field==="surface_m2" && !(v>0&&v<=100000)) semanticIssues.push({type:"invalid_surface",row:x});
  if(["bedrooms_count","bathrooms_count","rooms_count"].includes(x.field) && !(v>=0&&v<=100)) semanticIssues.push({type:"invalid_count",row:x});
}

fs.mkdirSync(outputDir,{recursive:true});
const sortRows=rows=>rows.sort((a,b)=>a.source.localeCompare(b.source)||a.url.localeCompare(b.url)||a.field.localeCompare(b.field));
fs.writeFileSync(path.join(outputDir,"github-freeze-recovery-write-safe.jsonl"),sortRows(finalWrite.rows).map(x=>JSON.stringify(x)).join("\n")+"\n");
fs.writeFileSync(path.join(outputDir,"github-freeze-recovery-review.jsonl"),sortRows(finalReview.rows).map(x=>JSON.stringify(x)).join("\n")+"\n");

const summary={
  input_write_safe_rows:rawWrite.length,
  input_review_rows:rawReview.length,
  input_write_safe_duplicate_conflicts:dw.conflicts.length,
  input_review_duplicate_conflicts:dr.conflicts.length,
  downgraded,
  final_write_safe_rows:finalWrite.rows.length,
  final_review_rows:finalReview.rows.length,
  final_write_safe_duplicate_conflicts:finalWrite.conflicts.length,
  final_review_duplicate_conflicts:finalReview.conflicts.length,
  write_safe_review_overlap_same_url_field:crossOverlap.length,
  semantic_issues:semanticIssues,
  database_access:0,
  database_writes:0
};
fs.writeFileSync(path.join(outputDir,"github-freeze-recovery-consolidation-summary.json"),JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
if(finalWrite.conflicts.length||finalReview.conflicts.length||crossOverlap.length||semanticIssues.length) process.exitCode=2;
