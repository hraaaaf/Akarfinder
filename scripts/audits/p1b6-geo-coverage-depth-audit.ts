#!/usr/bin/env tsx
// P1B.6 — Geo Coverage Depth Audit
// Production read-only audit. No DB/Registry mutation, no source-site request,
// no alias/entity creation and no fuzzy/title/snippet inference.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const OUTPUT_PATH = join(process.cwd(), "data/audits/runtime/p1b6-geo-coverage-depth-audit.json");
const PAGE = 1000;

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

async function readAll(table: string, columns: string, build?: (q: any) => any) {
  const client = getSupabaseServerClient();
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    let q: any = client.from(table).select(columns).range(from, from + PAGE - 1);
    if (build) q = build(q);
    const { data, error } = await q;
    if (error) throw new Error(`P1B.6 ${table} read failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function readInChunks(table: string, columns: string, column: string, values: string[]) {
  const client = getSupabaseServerClient();
  const rows: any[] = [];
  const unique = [...new Set(values)];
  for (let i = 0; i < unique.length; i += 100) {
    const { data, error } = await client.from(table).select(columns).in(column, unique.slice(i, i + 100));
    if (error) throw new Error(`P1B.6 ${table} chunk read failed: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

export async function runP1B6GeoCoverageDepthAudit() {
  const eligibleDocs = await readAll("thin_index_search_documents", "seed_id", (q) => q.eq("vertical_classification", "real_estate_likely").eq("document_kind", "LISTING").in("display_eligibility", ["eligible_primary", "eligible_secondary"]));
  const eligibleSeedIds = new Set(eligibleDocs.map((r) => String(r.seed_id)));
  const allSeeds = await readAll("source_offer_seeds", "id,source_domain,metadata");
  const bridgedSeeds = allSeeds.filter((s) => eligibleSeedIds.has(String(s.id)) && String(s?.metadata?.coverage_bridge?.property_listing_id ?? "").trim() !== "");

  const listings = await readInChunks("property_listings", "id,city,district", "id", bridgedSeeds.map((s) => String(s.metadata.coverage_bridge.property_listing_id)));
  const listingById = new Map(listings.map((r) => [String(r.id), r]));
  const events = await readInChunks("geo_resolution_events", "id,source_record_id,resolution_status,resolved_neighborhood_id,created_at", "source_record_id", bridgedSeeds.map((s) => String(s.id)));
  const latest = new Map<string, any>();
  for (const event of events) {
    const key = String(event.source_record_id);
    const prev = latest.get(key);
    if (!prev || String(event.created_at) > String(prev.created_at) || (String(event.created_at) === String(prev.created_at) && String(event.id) > String(prev.id))) latest.set(key, event);
  }

  const unresolved = bridgedSeeds.filter((s) => { const e = latest.get(String(s.id)); return !(e?.resolution_status === "resolved" && e?.resolved_neighborhood_id); });
  const explicitDistrict = unresolved.filter((s) => normalize(listingById.get(String(s.metadata.coverage_bridge.property_listing_id))?.district) !== "");
  const noDistrict = unresolved.filter((s) => normalize(listingById.get(String(s.metadata.coverage_bridge.property_listing_id))?.district) === "");

  const [aliases, entities] = await Promise.all([
    readAll("geo_aliases", "geo_entity_id,normalized_alias,confidence"),
    readAll("geo_entities", "id,parent_id,entity_type,canonical_name,normalized_name,validation_status,map_eligible"),
  ]);
  const entityById = new Map(entities.map((e) => [String(e.id), e]));
  const confidenceOneAliases = aliases.filter((a) => Number(a.confidence) === 1);
  const validatedNeighborhoods = entities.filter((e) => e.entity_type === "neighborhood" && e.validation_status === "validated");
  let explicitWithExistingAlias = 0;
  const pairCounts = new Map<string, {city:string;district:string;rows:number;sourceDomains:Set<string>}>();
  const byCity = new Map<string, number>();
  const bySource = new Map<string, number>();

  for (const seed of explicitDistrict) {
    const p = listingById.get(String(seed.metadata.coverage_bridge.property_listing_id));
    const city = String(p?.city ?? "").trim(); const district = String(p?.district ?? "").trim(); const nd = normalize(district);
    const matches = new Set(confidenceOneAliases.filter((a) => normalize(a.normalized_alias) === nd).map((a) => String(a.geo_entity_id)).filter((id) => { const e = entityById.get(id); return e?.entity_type === "neighborhood" && e?.validation_status === "validated"; }));
    if (matches.size > 0) explicitWithExistingAlias += 1;
    const key = `${normalize(city)}\u0000${nd}`; const item = pairCounts.get(key) ?? {city,district,rows:0,sourceDomains:new Set<string>()}; item.rows += 1; item.sourceDomains.add(String(seed.source_domain)); pairCounts.set(key,item);
    byCity.set(city,(byCity.get(city)??0)+1); bySource.set(String(seed.source_domain),(bySource.get(String(seed.source_domain))??0)+1);
  }

  const pairs = [...pairCounts.values()].map((item) => ({
    city:item.city,district:item.district,rows:item.rows,source_domains:[...item.sourceDomains].sort(),
    entity_name_matches:validatedNeighborhoods.filter((e) => normalize(e.canonical_name)===normalize(item.district)||normalize(e.normalized_name)===normalize(item.district)).length,
    confidence_one_alias_matches:confidenceOneAliases.filter((a) => normalize(a.normalized_alias)===normalize(item.district)).length,
  })).sort((a,b)=>b.rows-a.rows||a.city.localeCompare(b.city)||a.district.localeCompare(b.district));

  const structuredNeighborhoodKeys = new Set<string>();
  const metadataKeyCounts = new Map<string,number>();
  for (const seed of noDistrict) {
    for (const key of Object.keys(seed.metadata??{})) metadataKeyCounts.set(key,(metadataKeyCounts.get(key)??0)+1);
    for (const parent of ["coverage_bridge","public_index_result","serper_search","structured_data"]) {
      const value=seed?.metadata?.[parent]; if(!value||typeof value!=="object") continue;
      for(const key of Object.keys(value)){const n=normalize(key).replace(/[ _-]/g,"");if(["district","neighborhood","neighbourhood","quartier"].includes(n)) structuredNeighborhoodKeys.add(`${parent}.${key}`);}
    }
  }

  const report={
    schema_version:"p1b6-geo-coverage-depth-audit-v1",generated_at:new Date().toISOString(),
    contract:{read_only:true,db_mutation:false,registry_mutation:false,source_site_request:false,external_network_request:false,alias_creation:false,entity_creation:false,fuzzy_matching:false,title_snippet_inference:false},
    search:{eligible_listings:eligibleSeedIds.size,bridged_rows:bridgedSeeds.length,currently_resolved:bridgedSeeds.length-unresolved.length,unresolved:unresolved.length,unresolved_with_explicit_district:explicitDistrict.length,unresolved_without_explicit_district:noDistrict.length},
    explicit_district_gap:{rows:explicitDistrict.length,rows_with_existing_confidence_one_neighborhood_alias:explicitWithExistingAlias,distinct_city_district_pairs:pairCounts.size,by_city:Object.fromEntries([...byCity.entries()].sort((a,b)=>b[1]-a[1])),by_source_domain:Object.fromEntries([...bySource.entries()].sort((a,b)=>b[1]-a[1])),pairs},
    no_district_gap:{rows:noDistrict.length,structured_neighborhood_keys:[...structuredNeighborhoodKeys].sort(),metadata_key_counts:Object.fromEntries([...metadataKeyCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,30)),forbidden_evidence_keys_not_used:["title","snippet"]},
    verdict:explicitWithExistingAlias===0&&structuredNeighborhoodKeys.size===0?"REGISTRY_GAP_IS_NEXT_BOUNDARY":"REVIEW_NEW_DETERMINISTIC_EVIDENCE",
  };
  mkdirSync(dirname(OUTPUT_PATH),{recursive:true}); writeFileSync(OUTPUT_PATH,`${JSON.stringify(report,null,2)}\n`); console.log(JSON.stringify(report,null,2)); return report;
}

const invokedAsScript=Boolean(process.argv[1])&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(invokedAsScript)runP1B6GeoCoverageDepthAudit().catch((error)=>{console.error(error instanceof Error?error.stack??error.message:String(error));process.exitCode=1;});
