import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {acquireResultCards} from "./mubawab-card-scale-v1.mjs";

export const REGIONAL_CATEGORIES=[
 {city:"Fès",url:"https://www.mubawab.ma/fr/st/f%C3%A8s/appartements-a-vendre"},
 {city:"Fès",url:"https://www.mubawab.ma/fr/st/f%C3%A8s/appartements-a-louer"},
 {city:"Kénitra",url:"https://www.mubawab.ma/fr/st/k%C3%A9nitra/appartements-a-vendre"},
 {city:"Kénitra",url:"https://www.mubawab.ma/fr/st/k%C3%A9nitra/appartements-a-louer"},
 {city:"Tétouan",url:"https://www.mubawab.ma/fr/st/t%C3%A9touan/appartements-a-vendre"},
 {city:"Tétouan",url:"https://www.mubawab.ma/fr/st/t%C3%A9touan/appartements-a-louer"},
 {city:"Nador",url:"https://www.mubawab.ma/fr/st/nador/appartements-a-vendre"},
 {city:"Nador",url:"https://www.mubawab.ma/fr/st/nador/appartements-a-louer"}
];
export async function runRegionalMubawabPilot({pages=REGIONAL_CATEGORIES,baselineIds=null,fetchImpl,
 sleep,robotsText}={}){
 const options={pages,existingIds:baselineIds};
 if(fetchImpl)options.fetchImpl=fetchImpl;
 if(sleep)options.sleep=sleep;
 if(robotsText!==undefined)options.robotsText=robotsText;
 const {report,rows}=await acquireResultCards(options);
 return {report:{...report,schema_version:"AKARFINDER_MUBAWAB_REGIONAL_CATEGORIES_V1",
  semantics:"city-category-card-observations-only_not-freshness-certified",
  baseline_type:"seven_artifact_immutable_source_id_ledger",
  target_page_count:pages.length,
  note:"No detail requests, no implicit city from URL alone, missing fields kept review. Source newness relative to frozen ledger is not freshness."
 },rows};
}
async function main(){
 const input=process.env.CARD_LEDGER_JSONL;
 if(!input)throw Error("immutable seven-artifact ledger required");
 const data=await fs.readFile(input,"utf8");
 const baseline=new Set();
 for(const line of data.split(/\r?\n/)){
  if(!line)continue;
  const row=JSON.parse(line);if(row.source==="mubawab.ma")baseline.add(row.identity);
 }
 const {report,rows}=await runRegionalMubawabPilot({baselineIds:baseline});
 const name=process.env.OUTPUT_PREFIX||"mubawab-regional-categories";
 await fs.writeFile(name+".json",JSON.stringify(report,null,2)+"\n");
 await fs.writeFile(name+".jsonl",rows.map(r=>JSON.stringify(r)).join("\n")+(rows.length?"\n":""));
 console.log(JSON.stringify({...report,pages:undefined},null,2));
 if(report.halted_reason||report.observed_page_count===0)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
