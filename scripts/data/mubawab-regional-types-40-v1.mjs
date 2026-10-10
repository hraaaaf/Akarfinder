import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {acquireResultCards} from "./mubawab-card-scale-v1.mjs";

const CITIES=[
 {slug:"f%C3%A8s",city:"Fès"},
 {slug:"k%C3%A9nitra",city:"Kénitra"},
 {slug:"t%C3%A9touan",city:"Tétouan"},
 {slug:"nador",city:"Nador"}
];
const TYPES=["appartements","maisons","villas-et-maisons-de-luxe","terrains","bureaux-et-commerces"];
const INTENTS=["a-vendre","a-louer"];
export function regionalTypeMatrix(){
 const pages=[];
 for(const {slug,city} of CITIES)for(const type of TYPES)for(const transaction of INTENTS){
  pages.push({city,type,transaction,url:"https://www.mubawab.ma/fr/st/"+slug+"/"+type+"-"+transaction});
 }
 return pages;
}
export async function runRegionalTypeMatrix({pages=regionalTypeMatrix(),baselineIds=null,fetchImpl,robotsText,sleep}={}){
 const opts={pages,existingIds:baselineIds};
 if(fetchImpl)opts.fetchImpl=fetchImpl;
 if(robotsText!==undefined)opts.robotsText=robotsText;
 if(sleep)opts.sleep=sleep;
 const {report,rows}=await acquireResultCards(opts);
 return {report:{...report,schema_version:"AKARFINDER_MUBAWAB_REGIONAL_TYPE_MATRIX_V1",
  semantics:"bounded_40_public_category_card_observations_not_commercial_freshness",
  baseline:"immutable_eight_artifact_source_ledger",candidate_categories:pages.length,
  note:"Only literal source route HTTP200, same-category final URL, and same-card location evidence count. HTTP404 is a nonresult, not a missing listing. No detail fetch nor bypass."
 },rows};
}
async function main(){
 const file=process.env.CARD_LEDGER_JSONL;
 if(!file)throw Error("certified source ledger input required");
 const data=await fs.readFile(file,"utf8"),known=new Set();
 for(const line of data.split(/\r?\n/)){
  if(!line)continue;
  const x=JSON.parse(line);if(x.source==="mubawab.ma")known.add(x.identity);
 }
 const {report,rows}=await runRegionalTypeMatrix({baselineIds:known});
 const prefix=process.env.OUTPUT_PREFIX||"mubawab-regional-matrix-40";
 await fs.writeFile(prefix+".json",JSON.stringify(report,null,2)+"\n");
 await fs.writeFile(prefix+".jsonl",rows.map(x=>JSON.stringify(x)).join("\n")+(rows.length?"\n":""));
 console.log(JSON.stringify({...report,pages:undefined},null,2));
 if(report.halted_reason||!report.observed_page_count)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e?.message||"matrix_failed");process.exitCode=1;});
