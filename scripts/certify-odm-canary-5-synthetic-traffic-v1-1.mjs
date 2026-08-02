import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = (process.env.AKARFINDER_PRODUCTION_URL || "https://akarfinder.vercel.app").replace(/\/$/, "");
const cities = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès", "Oujda", "Kénitra", "Témara", "Salé"];
const propertyTypes = ["apartment", "villa", "land", "office"];
const intents = ["sale", "rent", "new"];
const aliases = { apartment: "appartement", villa: "villa", land: "terrain", office: "bureau" };
const priceBands = {
  sale: [[100000, 900000], [500000, 1500000], [1000000, 3500000], [2500000, 8000000]],
  rent: [[1000, 5000], [3000, 10000], [7000, 20000], [15000, 50000]],
  new: [[200000, 1000000], [700000, 2000000], [1500000, 5000000]],
};
const surfaceBands = [[20, 80], [50, 150], [100, 300], [200, 1000]];

function bucket(key) { return createHash("sha256").update(key).digest().readUInt32BE(0) % 10_000; }
function stableKey(q) { return JSON.stringify({ q:q.q??null, city:q.city??null, property_type:q.property_type??null, transaction_type:q.transaction_type??null, min_price:q.min_price??null, max_price:q.max_price??null, min_surface:q.min_surface??null, max_surface:q.max_surface??null, limit:q.limit??null, offset:q.offset??null }); }
function params(q) { const p=new URLSearchParams(); for (const [k,v] of Object.entries(q)) if(v!=null)p.set(k,String(v)); return p.toString(); }
function norm(v) { return String(v??"").trim().toLowerCase(); }
function percentile(values,p) { const s=[...values].sort((a,b)=>a-b); return s[Math.min(s.length-1,Math.floor((s.length-1)*p))]??null; }

function candidatesForCity(city) {
  const rows=[]; let serial=0;
  for (const property_type of propertyTypes) for (const transaction_type of intents)
    for (const [min_price,max_price] of priceBands[transaction_type]) for (const [min_surface,max_surface] of surfaceBands)
      for (let variant=0; variant<40; variant++) rows.push({
        q: variant%4===0 ? undefined : `${city} ${property_type} ${transaction_type}`,
        city, property_type, transaction_type, min_price, max_price, min_surface, max_surface,
        limit:5, offset:(serial++%197),
      });
  return rows;
}

function selectTraffic() {
  const selected=[];
  for (const city of cities) {
    const canary=[]; const legacy=[];
    for (const query of candidatesForCity(city)) {
      const stable_key=stableKey(query); const b=bucket(stable_key);
      if (b<500 && canary.length<5) canary.push({query,stable_key,bucket:b,expected_lane:"canary"});
      if (b>=500 && legacy.length<15) legacy.push({query,stable_key,bucket:b,expected_lane:"legacy"});
      if (canary.length===5 && legacy.length===15) break;
    }
    if (canary.length!==5 || legacy.length!==15) throw new Error(`Insufficient keys for ${city}: ${canary.length}/${legacy.length}`);
    selected.push(...canary,...legacy);
  }
  return selected;
}

function validate(item, body) {
  const errors=[]; const q=item.query;
  const lane=body?.source==="database_fallback"?"canary":"legacy";
  if (lane!==item.expected_lane) errors.push(`lane:${lane}`);
  if (!Array.isArray(body?.listings)) return [...errors,"invalid_json_contract"];
  for (const l of body.listings) {
    if (norm(l.city)!==norm(q.city)) errors.push(`city:${l.id}:${l.city}`);
    if (norm(l.property_type)!==aliases[q.property_type]) errors.push(`property_type:${l.id}:${l.property_type}`);
    const tx=q.transaction_type==="sale"?"buy":q.transaction_type;
    if (norm(l.transaction_type)!==tx) errors.push(`intent:${l.id}:${l.transaction_type}`);
    const price=l.price==null?null:Number(l.price), surface=Number(l.surface_m2||0);
    if (price==null || price<q.min_price || price>q.max_price) errors.push(`price:${l.id}:${l.price}`);
    if (surface<q.min_surface || surface>q.max_surface) errors.push(`surface:${l.id}:${l.surface_m2}`);
    if (item.expected_lane==="canary") {
      if (!String(l.id||"").startsWith("seed_")) errors.push(`id:${l.id}`);
      if (l.result_origin!=="search_api" || l.search_result_display_mode!=="thin_indexed_seed") errors.push(`contract:${l.id}`);
      if (l.production_allowed!==true || l.can_show_result!==true || l.can_show_contact===true || l.can_show_gallery===true) errors.push(`policy:${l.id}`);
    }
  }
  return errors;
}

async function run(item) {
  const url=`${BASE_URL}/api/search?${params(item.query)}`; const start=performance.now();
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),30000);
  try {
    const res=await fetch(url,{signal:controller.signal,headers:{"user-agent":"AkarFinder-ODM-Canary-Certification/1.1"}});
    const body=await res.json(); const errors=res.status===200?validate(item,body):[`http:${res.status}`];
    return {...item,status:res.status,latency_ms:Math.round((performance.now()-start)*100)/100,source:body?.source,returned:body?.listings?.length??0,errors};
  } catch(e) { return {...item,status:0,latency_ms:Math.round((performance.now()-start)*100)/100,source:"error",returned:0,errors:[String(e)]}; }
  finally { clearTimeout(timer); }
}

async function concurrent(items,n=6) { const out=new Array(items.length); let i=0; async function w(){while(true){const x=i++;if(x>=items.length)return;out[x]=await run(items[x]);}} await Promise.all(Array.from({length:n},w)); return out; }

const traffic=selectTraffic(); const results=await concurrent(traffic); const failures=results.filter(r=>r.errors.length);
const sample=cities.flatMap(c=>candidatesForCity(c)).slice(0,10000); const rate=sample.filter(q=>bucket(stableKey(q))<500).length/sample.length;
const canary=results.filter(r=>r.expected_lane==="canary"), legacy=results.filter(r=>r.expected_lane==="legacy");
const report={
  certification:"ODM_CANARY_5_SYNTHETIC_TRAFFIC_V1_1",generated_at:new Date().toISOString(),base_url:BASE_URL,
  requested:results.length,http_200:results.filter(r=>r.status===200).length,expected_canary:canary.length,expected_legacy:legacy.length,
  observed_canary:results.filter(r=>r.source==="database_fallback").length,observed_legacy:results.filter(r=>r.source!=="database_fallback"&&r.status===200).length,
  failures:failures.length,bucket_distribution_rate:rate,
  coverage:{cities:[...new Set(results.map(r=>r.query.city))],property_types:[...new Set(results.map(r=>r.query.property_type))],intents:[...new Set(results.map(r=>r.query.transaction_type))]},
  latency_ms:{canary_p50:percentile(canary.map(r=>r.latency_ms),.5),canary_p95:percentile(canary.map(r=>r.latency_ms),.95),legacy_p50:percentile(legacy.map(r=>r.latency_ms),.5),legacy_p95:percentile(legacy.map(r=>r.latency_ms),.95)},
  gates:{all_http_200:results.every(r=>r.status===200),all_ten_cities:new Set(results.map(r=>r.query.city)).size===10,deterministic_lane_match:results.every(r=>(r.source==="database_fallback"?"canary":"legacy")===r.expected_lane),no_filter_or_contract_leaks:failures.length===0,bucket_rate_near_five_percent:rate>=.04&&rate<=.06},
  failed_requests:failures.slice(0,50),
};
await mkdir("artifacts",{recursive:true}); await writeFile("artifacts/odm-canary-5-synthetic-traffic-v1-1.json",JSON.stringify(report,null,2)+"\n"); console.log(JSON.stringify(report,null,2));
if(!Object.values(report.gates).every(Boolean)) process.exitCode=1;
