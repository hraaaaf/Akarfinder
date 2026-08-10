#!/usr/bin/env tsx
// P1B.12 live read-only preflight. No DB/Registry mutation.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const OUTPUT = join(process.cwd(), "data/audits/runtime/p1b12-tier-a-resolution-canary-preflight.json");
const TARGETS = new Map([
  ["049cd577-fc81-4d23-bc1c-2d5cf84214ea", { district: "hay mohammadi", target: "district_agadir_hay_mohammadi" }],
  ["6aed05ed-5aee-415f-98cb-ff87db6d2cc5", { district: "dakhla", target: "district_agadir_dakhla" }],
  ["6d72d3f0-8697-4b88-9876-5ce0806aa681", { district: "hay mohammadi", target: "district_agadir_hay_mohammadi" }],
  ["b36688fd-fe7b-43e3-bad6-e968e2ecf4c8", { district: "hay mohammadi", target: "district_agadir_hay_mohammadi" }],
  ["d1ecf541-bb26-43b1-87e7-d4dedd03b413", { district: "dakhla", target: "district_agadir_dakhla" }],
  ["d69e04e4-92bd-4bd9-bbd2-2bfc07b5fa7e", { district: "hay mohammadi", target: "district_agadir_hay_mohammadi" }],
  ["e804e8ab-2575-412e-b0dd-0b01737513b1", { district: "hay mohammadi", target: "district_agadir_hay_mohammadi" }],
  ["fbbdd20c-8d8b-4b78-a186-652a7557cf7e", { district: "dakhla", target: "district_agadir_dakhla" }],
]);
const IDS = [...TARGETS.keys()];
function norm(v: unknown) { return String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase(); }
function newer(a: any, b: any) { if (!b) return true; if (String(a.created_at) !== String(b.created_at)) return String(a.created_at) > String(b.created_at); return String(a.id) > String(b.id); }

export async function runP1B12Preflight() {
  const db = getSupabaseServerClient();
  const [docsR, seedsR, entitiesR, aliasesR, eventsR] = await Promise.all([
    db.from("thin_index_search_documents").select("seed_id,vertical_classification,document_kind,display_eligibility").in("seed_id", IDS),
    db.from("source_offer_seeds").select("id,source_domain,metadata").in("id", IDS),
    db.from("geo_entities").select("id,parent_id,entity_type,validation_status,map_eligible,seo_eligible").in("id", ["district_agadir_dakhla","district_agadir_hay_mohammadi"]),
    db.from("geo_aliases").select("geo_entity_id,normalized_alias,source,confidence").in("geo_entity_id", ["district_agadir_dakhla","district_agadir_hay_mohammadi"]),
    db.from("geo_resolution_events").select("id,source_record_type,source_record_id,resolution_status,resolved_neighborhood_id,created_at").eq("source_record_type","source_offer_seed").in("source_record_id", IDS),
  ]);
  for (const [name, r] of [["docs",docsR],["seeds",seedsR],["entities",entitiesR],["aliases",aliasesR],["events",eventsR]] as const) if (r.error) throw new Error(`P1B.12 ${name} read failed: ${r.error.message}`);

  const docs = docsR.data ?? []; const seeds = seedsR.data ?? []; const entities = entitiesR.data ?? []; const aliases = aliasesR.data ?? []; const events = eventsR.data ?? [];
  const bridges = seeds.map((s:any) => String(s?.metadata?.coverage_bridge?.property_listing_id ?? "")).filter(Boolean);
  const listingsR = await db.from("property_listings").select("id,city,district").in("id", bridges);
  if (listingsR.error) throw new Error(`P1B.12 listings read failed: ${listingsR.error.message}`);
  const listingById = new Map((listingsR.data ?? []).map((r:any)=>[String(r.id),r]));
  const docById = new Map(docs.map((r:any)=>[String(r.seed_id),r]));
  const latest = new Map<string,any>(); for (const e of events as any[]) if (newer(e, latest.get(String(e.source_record_id)))) latest.set(String(e.source_record_id),e);

  const rows = seeds.map((s:any) => {
    const id=String(s.id), expected=TARGETS.get(id)!; const d:any=docById.get(id); const listing:any=listingById.get(String(s?.metadata?.coverage_bridge?.property_listing_id ?? "")); const event=latest.get(id);
    return { id, source_domain:String(s.source_domain), expected_target:expected.target,
      eligible:Boolean(d && d.vertical_classification==="real_estate_likely" && d.document_kind==="LISTING" && ["eligible_primary","eligible_secondary"].includes(d.display_eligibility)),
      bridge_ok:Boolean(listing), city_ok:norm(listing?.city)==="agadir", district_ok:norm(listing?.district)===expected.district,
      latest_not_resolved:!(event?.resolution_status==="resolved" && event?.resolved_neighborhood_id),
    };
  });
  const targetReady = entities.length===2 && entities.every((e:any)=>e.parent_id==="city_agadir" && e.entity_type==="neighborhood" && e.validation_status==="validated" && e.map_eligible===false && e.seo_eligible===false);
  const aliasReady = aliases.filter((a:any)=>((a.geo_entity_id==="district_agadir_dakhla"&&norm(a.normalized_alias)==="dakhla")||(a.geo_entity_id==="district_agadir_hay_mohammadi"&&norm(a.normalized_alias)==="hay mohammadi")) && Number(a.confidence)===1).length===2;
  const dakhla=rows.filter(r=>r.expected_target==="district_agadir_dakhla").length, hay=rows.filter(r=>r.expected_target==="district_agadir_hay_mohammadi").length;
  const domains=[...new Set(rows.map(r=>r.source_domain))].sort();
  const ready=rows.length===8 && dakhla===3 && hay===5 && domains.length===2 && rows.every(r=>r.eligible&&r.bridge_ok&&r.city_ok&&r.district_ok&&r.latest_not_resolved) && targetReady && aliasReady;
  const report={schema_version:"p1b12-tier-a-resolution-canary-preflight-v1",generated_at:new Date().toISOString(),contract:{read_only:true,db_mutation:false,geo_resolution_write:false,fuzzy:false,title_snippet_spatial_inference:false,map_activation:false,seo_activation:false},rows:rows.length,dakhla_rows:dakhla,hay_mohammadi_rows:hay,source_domains:domains,target_registry_ready:targetReady,exact_aliases_ready:aliasReady,row_checks:rows,verdict:ready?"TIER_A_RESOLUTION_CANARY_READY_8":"TIER_A_RESOLUTION_CANARY_BLOCKED"};
  mkdirSync(dirname(OUTPUT),{recursive:true}); writeFileSync(OUTPUT,`${JSON.stringify(report,null,2)}\n`); console.log(JSON.stringify(report,null,2)); if(!ready) throw new Error("P1B.12 live preflight blocked"); return report;
}
const invoked=Boolean(process.argv[1])&&import.meta.url===pathToFileURL(process.argv[1]).href; if(invoked) runP1B12Preflight().catch(e=>{console.error(e instanceof Error?e.stack??e.message:String(e));process.exitCode=1;});
