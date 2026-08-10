#!/usr/bin/env tsx
// P1B.13D live read-only preflight. No DB/Registry mutation.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const OUTPUT=join(process.cwd(),"data/audits/runtime/p1b13d-oasis-resolution-canary-preflight.json");
const IDS=[
 "1c3223d2-8eae-471d-ba14-ea90447aeb2f",
 "2301d915-3d1b-45db-b178-bd2abdc26472",
 "7eacf82f-c374-467a-a3af-53430f82211d",
 "9a7f0328-683c-4783-b46e-4bdc30cb3a86",
 "9f644e9e-f2c0-4b0a-8646-8d4e750a6767",
];
function norm(v:unknown){return String(v??"").trim().replace(/\s+/g," ").toLowerCase();}
function newer(a:any,b:any){if(!b)return true;if(String(a.created_at)!==String(b.created_at))return String(a.created_at)>String(b.created_at);return String(a.id)>String(b.id);}

export async function runP1B13DPreflight(){
 const db=getSupabaseServerClient();
 const [docsR,seedsR,entityR,aliasR,eventsR]=await Promise.all([
  db.from("thin_index_search_documents").select("seed_id,vertical_classification,document_kind,display_eligibility").in("seed_id",IDS),
  db.from("source_offer_seeds").select("id,source_domain,metadata").in("id",IDS),
  db.from("geo_entities").select("id,parent_id,entity_type,validation_status,map_eligible,seo_eligible").eq("id","district_casablanca_oasis"),
  db.from("geo_aliases").select("geo_entity_id,normalized_alias,source,confidence").eq("geo_entity_id","district_casablanca_oasis"),
  db.from("geo_resolution_events").select("id,source_record_type,source_record_id,resolution_status,resolved_neighborhood_id,created_at").eq("source_record_type","source_offer_seed").in("source_record_id",IDS),
 ]);
 for(const [name,r] of [["docs",docsR],["seeds",seedsR],["entity",entityR],["alias",aliasR],["events",eventsR]] as const) if(r.error) throw new Error(`P1B.13D ${name} read failed: ${r.error.message}`);
 const seeds=seedsR.data??[],docs=docsR.data??[],events=eventsR.data??[];
 const bridges=seeds.map((s:any)=>String(s?.metadata?.coverage_bridge?.property_listing_id??"")).filter(Boolean);
 const listingsR=await db.from("property_listings").select("id,city,district").in("id",bridges);
 if(listingsR.error) throw new Error(`P1B.13D listings read failed: ${listingsR.error.message}`);
 const listingById=new Map((listingsR.data??[]).map((r:any)=>[String(r.id),r]));
 const docById=new Map(docs.map((r:any)=>[String(r.seed_id),r]));
 const latest=new Map<string,any>(); for(const e of events as any[]) if(newer(e,latest.get(String(e.source_record_id)))) latest.set(String(e.source_record_id),e);
 const rows=seeds.map((s:any)=>{const id=String(s.id),d:any=docById.get(id),listing:any=listingById.get(String(s?.metadata?.coverage_bridge?.property_listing_id??"")),event=latest.get(id);return{
  id,source_domain:String(s.source_domain),eligible:Boolean(d&&d.vertical_classification==="real_estate_likely"&&d.document_kind==="LISTING"&&["eligible_primary","eligible_secondary"].includes(d.display_eligibility)),
  bridge_ok:Boolean(listing),city_ok:norm(listing?.city)==="casablanca",district_ok:norm(listing?.district)==="oasis",
  latest_not_resolved:!(event?.resolution_status==="resolved"&&event?.resolved_neighborhood_id),
 };});
 const entities=entityR.data??[],aliases=aliasR.data??[];
 const targetReady=entities.length===1&&entities.every((e:any)=>e.parent_id==="city_casablanca"&&e.entity_type==="neighborhood"&&e.validation_status==="validated"&&e.map_eligible===false&&e.seo_eligible===false);
 const aliasReady=aliases.filter((a:any)=>norm(a.normalized_alias)==="oasis"&&Number(a.confidence)===1).length===1;
 const domains=[...new Set(rows.map(r=>r.source_domain))].sort();
 const ready=rows.length===5&&domains.length===1&&rows.every(r=>r.eligible&&r.bridge_ok&&r.city_ok&&r.district_ok&&r.latest_not_resolved)&&targetReady&&aliasReady;
 const report={schema_version:"p1b13d-oasis-resolution-canary-preflight-v1",generated_at:new Date().toISOString(),contract:{read_only:true,db_mutation:false,geo_resolution_write:false,fuzzy:false,title_snippet_spatial_inference:false,map_activation:false,seo_activation:false},rows:rows.length,oasis_rows:rows.length,source_domains:domains,target_registry_ready:targetReady,exact_alias_ready:aliasReady,row_checks:rows,verdict:ready?"OASIS_RESOLUTION_CANARY_READY_5":"OASIS_RESOLUTION_CANARY_BLOCKED"};
 mkdirSync(dirname(OUTPUT),{recursive:true});writeFileSync(OUTPUT,`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));if(!ready)throw new Error("P1B.13D live preflight blocked");return report;
}
const invoked=Boolean(process.argv[1])&&import.meta.url===pathToFileURL(process.argv[1]).href;if(invoked)runP1B13DPreflight().catch(e=>{console.error(e instanceof Error?e.stack??e.message:String(e));process.exitCode=1;});
