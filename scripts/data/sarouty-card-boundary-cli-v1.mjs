import fs from "node:fs/promises";
import {inspectSaroutyCardBoundaries} from "./sarouty-card-boundary-v1.mjs";
import {robotsAllowed} from "./mubawab-result-cards-v1.mjs";
import {saroutyCrawlDelay} from "./sarouty-card-canary-v1.mjs";
const UA="AkarFinderSaroutyDomBoundaryAudit/1.0 (+https://akarfinder.ma)";
const page="https://www.sarouty.ma/acheter/casablanca/appartements-a-vendre/";
let state="unverified",result=null;
try{
 const rob=await fetch("https://www.sarouty.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
 if(rob.status!==200)throw Error("robots_not_available");
 const robots=await rob.text(),delay=saroutyCrawlDelay(robots,UA);
 if(delay===null||!robotsAllowed(robots,page,UA))throw Error("robots_denied");
 await new Promise(resolve=>setTimeout(resolve,Math.max(10000,Math.ceil(delay*1000))));
 const res=await fetch(page,{redirect:"follow",headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml"},signal:AbortSignal.timeout(20000)});
 if(res.status===403||res.status===429)throw Error("http_access_denied");
 if(res.status!==200)throw Error("category_non_200");
 if(new URL(res.url).pathname!==new URL(page).pathname||!["sarouty.ma","www.sarouty.ma"].includes(new URL(res.url).hostname))throw Error("unexpected_redirect");
 if(!/html/i.test(res.headers.get("content-type")||""))throw Error("non_html");
 const html=await res.text();if(Buffer.byteLength(html,"utf8")>3000000)throw Error("oversized");
 result=inspectSaroutyCardBoundaries(html,res.url);
 state="observed";
}catch(e){state=String(e?.message||"source_fetch_error").slice(0,50);}
const report={
 schema_version:"AKARFINDER_SAROUTY_DOM_BOUNDARY_DIAGNOSTIC_V1",
 state,source_site:"sarouty.ma",category_requests:state==="observed"?1:0,
 ...(result||{profiles:[]}),database_access:0,database_writes:0,
 note:"DOM structural counts only, no source IDs, raw HTML, contact details, text, full URLs or assertion of freshness."
};
await fs.writeFile((process.env.OUTPUT_PREFIX||"sarouty-card-boundary")+".json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({...report,profiles:undefined},null,2));
if(state!=="observed")process.exitCode=2;
