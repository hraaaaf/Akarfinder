import fs from "node:fs/promises";
import {compareCrossPortalCards} from "./cross-source-card-dedup-v1.mjs";
const dir=process.env.INPUT_DIR||".tmp/card-dedup";
const read=async file=>(await fs.readFile(dir+"/"+file,"utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const [m,d]=await Promise.all([read("mubawab-mass-acquisition-50.jsonl"),read("domio-card-canary.jsonl")]);
const report=compareCrossPortalCards(m,d);
await fs.writeFile("cross-source-card-dedup-v1.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({...report,candidates:undefined},null,2));
