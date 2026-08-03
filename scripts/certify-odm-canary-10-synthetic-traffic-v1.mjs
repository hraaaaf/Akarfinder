import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL=(process.env.AKARFINDER_PRODUCTION_URL||"https://akarfinder.vercel.app").replace(/\/$/,"");
const cities=["Casablanca","Rabat","Marrakech","Tanger","Agadir","Fès","Oujda","Kénitra","Témara","Salé"];
const propertyTypes=["apartment","villa","land","office"];
const intents=["sale","rent","new"];
const aliases={apartment:"appartement",villa:"villa",land:"terrain",office:"bureau"};
const priceBands={sale:[[100000,900000],[500000,1500000],[1000000,3500000],[2500000,8000000]],rent:[[1000,5000],[3000,10000],[7000,20000],[15000,50000]],new:[[200000,1000000],[700000,2000000],[1500000,5000000]]};
const surfaceBands=[[20,80],[50,150],[100,300],[200,1000]];
const CANARY_BUCKET=1000;

const bucket=(key)=>createHash("sha256").update(key).digest().readUInt32BE(0)%10000;
const stableKey=(q)=>JSON.stringify({q:q.q??null,city:q.city??null,property_type:q.property_type??null,transaction_type:q.transaction_type??null,min_price:q.min_price??null,max_price:q.max_price??null,min_surface:q.min_surface??null,max_surface:q.max_surface??null,limit:q.limit??null,offset:q.offset??null});
const norm=(v)=>String(v??"").trim().toLowerCase();
const percentile=(values,p)=>{const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor((s.length-1)*p))]??null;};
const queryString=(q)=>{const p=new URLSearchParams();for(const [k,v] of Object.entries(q))if(v!=null)p.set(k,String(v));return p.toString();};

function candidates(city){const rows=[];let serial=0;for(const property_type of propertyTypes)for(const transaction_type of intents)for(const [min_price,max_price] of priceBands[transaction_type])for(const [min_surface,max_surface] of surfaceBands)for(let variant=0;variant<60;variant++)rows.push({q:variant%4===0?undefined:`${city} ${property_type} ${transaction_type}`,city,property_type,transaction_type,min_price,max_price,min_surface,max_surface,limit:5,offset:serial++%251});return rows;}

function selectTraffic(){const selected=[];for(const city of cities){const canary=[],legacy=[];for(const query of candidates(city)){const stable_key=stableKey(query),b=bucket(stable_key);if(b<CANARY_BUCKET&&canary.length<10)canary.push({query,stable_key,bucket:b,expected_lane:"canary"});if(b>=CANARY_BUCKET&&legacy.length<10)legacy.push({query,stable_key,bucket:b,expected_lane:"legacy"});if(canary.length===10&&legacy.length===10)break;}if(canary.length!==10||legacy.length!==10)throw new Error(`Insufficient keys for ${city}: ${canary.length}/${legacy.length}`);selected.push(...canary,...legacy);}return selected;}

function validate(item,body){const errors=[],q=item.query,lane=body?.source==="database_fallback"?"canary":"legacy";if(lane!==item.expected_lane)errors.push(`lane:${lane}`);if(!Array.isArray(body?.listings))return [...errors,"invalid_json_contract"];for(const l of body.listings){if(norm(l.city)!==norm(q.city))errors.push(`city:${l.id}:${l.city}`);if(norm(l.property_type)!==aliases[q.property_type])errors.push(`property_type:${l.id}:${l.property_type}`);const expectedTx=q.transaction_type==="sale"?"buy":q.transaction_type;if(norm(l.transaction_type)!==expectedTx)errors.push(`intent:${l.id}:${l.transaction_type}`);const price=l.price==null?null:Number(l.price),surface=Number(l.surface_m2||0);if(price==null||price<q.min_price||price>q.max_price)errors.push(`price:${l.id}:${l.price}`);if(surface<q.min_surface||surface>q.max_surface)errors.push(`surface:${l.id}:${l.surface_m2}`);if(item.expected_lane==="canary"){if(!String(l.id||"").startsWith("seed_"))errors.push(`id:${l.id}`);if(l.result_origin!=="search_api"||l.search_result_display_mode!=="thin_indexed_seed")errors.push(`contract:${l.id}`);if(l.production_allowed!==true||l.can_show_result!==true||l.can_show_contact===true||l.can_show_gallery===true)errors.push(`policy:${l.id}`);}}return errors;}

async function execute(item){const url=`${BASE_URL}/api/search?${queryString(item.query)}`,started=performance.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);try{const response=await fetch(url,{signal:controller.signal,headers:{"user-agent":"AkarFinder-ODM-Canary-10-Certification/1.0"}});const body=await response.json();const errors=response.status===200?validate(item,body):[`http:${response.status}`];return {...item,status:response.status,latency_ms:Math.round((performance.now()-started)*100)/100,source:body?.source,returned:body?.listings?.length??0,errors};}catch(error){return {...item,status:0,latency_ms:Math.round((performance.now()-started)*100)/100,source:"error",returned:0,errors:[String(error)]};}finally{clearTimeout(timer);}}

async function mapConcurrent(items,concurrency=6){const output=new Array(items.length);let cursor=0;async function worker(){while(true){const index=cursor++;if(index>=items.length)return;output[index]=await execute(items[index]);}}await Promise.all(Array.from({length:concurrency},worker));return output;}

const traffic=selectTraffic();
const results=await mapConcurrent(traffic);
const failures=results.filter((row)=>row.errors.length>0);
const sample=cities.flatMap((city)=>candidates(city)).slice(0,10000);
const rate=sample.filter((q)=>bucket(stableKey(q))<CANARY_BUCKET).length/sample.length;
const canary=results.filter((row)=>row.expected_lane==="canary");
const legacy=results.filter((row)=>row.expected_lane==="legacy");
const canaryP95=percentile(canary.map((row)=>row.latency_ms),.95);
const report={
  certification:"ODM_CANARY_10_SYNTHETIC_TRAFFIC_V1",
  generated_at:new Date().toISOString(),
  base_url:BASE_URL,
  requested:results.length,
  http_200:results.filter((row)=>row.status===200).length,
  expected_canary:canary.length,
  expected_legacy:legacy.length,
  observed_canary:results.filter((row)=>row.source==="database_fallback").length,
  observed_legacy:results.filter((row)=>row.source!=="database_fallback"&&row.status===200).length,
  failures:failures.length,
  bucket_distribution_rate:rate,
  coverage:{cities:[...new Set(results.map((row)=>row.query.city))],property_types:[...new Set(results.map((row)=>row.query.property_type))],intents:[...new Set(results.map((row)=>row.query.transaction_type))]},
  latency_ms:{overall_p50:percentile(results.map((row)=>row.latency_ms),.5),overall_p95:percentile(results.map((row)=>row.latency_ms),.95),canary_p50:percentile(canary.map((row)=>row.latency_ms),.5),canary_p95:canaryP95,legacy_p50:percentile(legacy.map((row)=>row.latency_ms),.5),legacy_p95:percentile(legacy.map((row)=>row.latency_ms),.95)},
  gates:{all_http_200:results.every((row)=>row.status===200),all_ten_cities:new Set(results.map((row)=>row.query.city)).size===10,deterministic_lane_match:results.every((row)=>(row.source==="database_fallback"?"canary":"legacy")===row.expected_lane),no_filter_or_contract_leaks:failures.length===0,bucket_rate_near_ten_percent:rate>=.09&&rate<=.11,canary_p95_under_2s:canaryP95<2000},
  failed_requests:failures.slice(0,50),
};

await mkdir("artifacts",{recursive:true});
await writeFile("artifacts/odm-canary-10-synthetic-traffic-v1.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(!Object.values(report.gates).every(Boolean))process.exitCode=1;
