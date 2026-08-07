import fs from "node:fs/promises";
import path from "node:path";
import { extractRobotsSitemaps, parseSitemapXml, sameDarAgadirOrigin } from "../data4/daragadir-sitemap-revalidation";
import { classifyFreshnessShadowRows, policyAllowsFreshnessShadow, type FreshnessShadowCandidate, type FreshnessShadowPolicy } from "../data4/daragadir-freshness-shadow";

const outDir = process.env.DATA_4_3C_OUT_DIR ?? ".tmp/data-4-3c/results";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 15000;
const MAX_SOURCE_REQUESTS = 40;
let sourceRequests = 0;

function env(name: string): string { const v = process.env[name]; if (!v) throw new Error(`DATA-4.3C requires ${name}`); return v; }
async function restPage<T>(table: string, params: Record<string,string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k,v);
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(url,{headers:{apikey:key,authorization:`Bearer ${key}`},signal:AbortSignal.timeout(TIMEOUT_MS)});
  if(!r.ok) throw new Error(`${table} read failed: ${r.status} ${await r.text()}`);
  return await r.json() as T[];
}
async function restAll<T>(table:string, params:Record<string,string>):Promise<T[]>{const out:T[]=[];for(let offset=0;;offset+=PAGE_SIZE){const p=await restPage<T>(table,{...params,limit:String(PAGE_SIZE),offset:String(offset)});out.push(...p);if(p.length<PAGE_SIZE)return out;}}
async function fetchAllowedText(urlString:string):Promise<string>{if(!sameDarAgadirOrigin(urlString))throw new Error(`Disallowed URL ${urlString}`);sourceRequests++;if(sourceRequests>MAX_SOURCE_REQUESTS)throw new Error("Request budget exceeded");const r=await fetch(urlString,{redirect:"follow",headers:{"user-agent":"AkarFinder/1.0 (+freshness-shadow; sitemap-only; no-detail-fetch)"},signal:AbortSignal.timeout(TIMEOUT_MS)});if(!sameDarAgadirOrigin(r.url)||!r.ok)throw new Error(`Source read failed ${r.status}: ${urlString}`);return r.text();}

type RegistryRow={source_domain:string;acquisition_mode:string;discovery_policy:string;display_policy:string;display_gate:string;machine_gate:string;allowed_discovery_channels:string[]|null;max_revalidation_interval_days:number|null;review_status:string|null};
type NormalizedRow={canonical_url:string;normalization_status:string;freshness_status:string;city:string|null;property_type:string|null;intent:string|null};
type DisplayRow={canonical_url:string;display_eligibility:string;quality_score:number|string|null};
const numberOrNull=(v:number|string|null)=>v===null?null:(Number.isFinite(Number(v))?Number(v):null);

async function main(){
  const [registry,normalized,display]=await Promise.all([
    restAll<RegistryRow>("source_policy_registry",{select:"source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,machine_gate,allowed_discovery_channels,max_revalidation_interval_days,review_status",source_domain:"eq.daragadir.com",order:"source_domain.asc"}),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2",{select:"canonical_url,normalization_status,freshness_status,city,property_type,intent",source_domain:"eq.daragadir.com",order:"canonical_url.asc"}),
    restAll<DisplayRow>("thin_index_display_eligible_v1",{select:"canonical_url,display_eligibility,quality_score",source_domain:"eq.daragadir.com",order:"canonical_url.asc"}),
  ]);
  if(registry.length!==1)throw new Error(`Expected one Registry row, got ${registry.length}`);
  const r=registry[0]!; const policy:FreshnessShadowPolicy={sourceDomain:r.source_domain,acquisitionMode:r.acquisition_mode,discoveryPolicy:r.discovery_policy,displayPolicy:r.display_policy,displayGate:r.display_gate,machineGate:r.machine_gate,allowedDiscoveryChannels:r.allowed_discovery_channels??[],maxRevalidationIntervalDays:r.max_revalidation_interval_days,reviewStatus:r.review_status};
  if(!policyAllowsFreshnessShadow(policy))throw new Error(`Registry boundary mismatch: ${JSON.stringify(policy)}`);

  const robots=await fetchAllowedText("https://daragadir.com/robots.txt"); const roots=extractRobotsSitemaps(robots); if(!roots.length)throw new Error("No sitemap declared");
  const queue=[...roots], visited=new Set<string>(), sitemapUrls=new Set<string>();
  while(queue.length){const u=queue.shift()!;if(visited.has(u))continue;visited.add(u);const parsed=parseSitemapXml(await fetchAllowedText(u));if(parsed.kind==="unknown")throw new Error(`Unknown sitemap ${u}`);if(parsed.kind==="index")for(const child of parsed.locs)if(!visited.has(child)&&!queue.includes(child))queue.push(child);else;else for(const loc of parsed.locs)sitemapUrls.add(loc);}

  const displayByUrl=new Map(display.map(d=>[d.canonical_url,d]));
  const candidates:FreshnessShadowCandidate[]=normalized.map(n=>{const d=displayByUrl.get(n.canonical_url);return{canonicalUrl:n.canonical_url,normalizationStatus:n.normalization_status,freshnessStatus:n.freshness_status,city:n.city,propertyType:n.property_type,intent:n.intent,qualityScore:d?numberOrNull(d.quality_score):null,displayEligibility:d?.display_eligibility??null};});
  const results=classifyFreshnessShadowRows(candidates,policy,sitemapUrls);const counts:Record<string,number>={};for(const x of results)counts[x.classification]=(counts[x.classification]??0)+1;
  const seedOnlyShadowReady=results.filter(x=>x.freshnessStatus==="seed_only"&&x.classification==="SHADOW_READY").length;
  const proof={schemaVersion:"data-4-3c-daragadir-freshness-shadow-v1",generatedAt:new Date().toISOString(),databaseWrites:0,freshnessWrites:0,policyChanges:0,productionActivation:false,detailPageFetches:0,contentReuseOperations:0,sourceRequests,sourceRequestBudget:MAX_SOURCE_REQUESTS,sitemapUrlsObserved:sitemapUrls.size,rowsRead:normalized.length,registryReviewStatus:policy.reviewStatus,maxRevalidationIntervalDays:policy.maxRevalidationIntervalDays,counts,shadowReadyRows:counts.SHADOW_READY??0,seedOnlyShadowReadyRows:seedOnlyShadowReady,policyBlockedRows:counts.POLICY_BLOCKED??0,duplicateRows:counts.DUPLICATE??0};
  const csv=["canonical_url,classification,freshness_status,normalization_status,city,property_type,intent,quality_score,display_eligibility",...results.map(x=>[x.canonicalUrl,x.classification,x.freshnessStatus,x.normalizationStatus,x.city??"",x.propertyType??"",x.intent??"",x.qualityScore??"",x.displayEligibility??""].map(v=>`"${String(v).replaceAll('"','""')}"`).join(","))].join("\n");
  await fs.mkdir(outDir,{recursive:true});await fs.writeFile(path.join(outDir,"proof.json"),JSON.stringify(proof,null,2)+"\n");await fs.writeFile(path.join(outDir,"report.json"),JSON.stringify({proof,policy,counts},null,2)+"\n");await fs.writeFile(path.join(outDir,"classification.csv"),csv+"\n");console.log(JSON.stringify(proof,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
