#!/usr/bin/env tsx
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { auditStructuredCohortHtml, type CohortRow } from "@/scripts/scrapers/price-extraction-v5-structured-cohort-audit";
import { fetchHtml, isAllowedByRobots } from "@/scripts/scrapers/utils/fetch-html";
import { safeDelay } from "@/scripts/scrapers/utils/safe-delay";

const TARGETS = ["agdal", "hay-riad", "souissi", "hassan"] as const;
const MAX_WRITES = 10;

function err(e: any) {
  return JSON.stringify({ message: e?.message, code: e?.code, details: e?.details, hint: e?.hint, status: e?.status });
}

function newer(a: any, b: any): boolean {
  if (!b) return true;
  if (String(a.created_at) !== String(b.created_at)) return String(a.created_at) > String(b.created_at);
  return String(a.id) > String(b.id);
}

async function main() {
  if (process.env.CARTE_C2C_EXECUTE_WRITE !== "true") throw new Error("C2C write blocked: CARTE_C2C_EXECUTE_WRITE=true required");
  const db: any = getSupabaseServerClient();

  const { data: cityRows, error: cityError } = await db.from("geo_entities").select("id,slug,entity_type,validation_status").eq("entity_type", "city").eq("slug", "rabat").eq("validation_status", "validated").limit(2);
  if (cityError) throw new Error(`C2C Rabat city read failed: ${err(cityError)}`);
  if ((cityRows ?? []).length !== 1) throw new Error(`C2C expected one validated Rabat city, got ${(cityRows ?? []).length}`);
  const rabatCityId = String(cityRows[0].id);

  const { data: neighborhoods, error: neighborhoodError } = await db.from("geo_entities").select("id,slug,parent_id,entity_type,validation_status").eq("entity_type", "neighborhood").eq("parent_id", rabatCityId).eq("validation_status", "validated").in("slug", [...TARGETS]);
  if (neighborhoodError) throw new Error(`C2C neighborhoods read failed: ${err(neighborhoodError)}`);
  const slugByNeighborhoodId = new Map((neighborhoods ?? []).map((r: any) => [String(r.id), String(r.slug)]));
  for (const slug of TARGETS) if (![...slugByNeighborhoodId.values()].includes(slug)) throw new Error(`C2C missing neighborhood ${slug}`);

  const { data: targetEvents, error: targetEventsError } = await db.from("geo_resolution_events").select("id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,created_at").eq("source_record_type", "source_offer_seed").eq("resolution_status", "resolved").in("resolved_neighborhood_id", [...slugByNeighborhoodId.keys()]).range(0, 999);
  if (targetEventsError) throw new Error(`C2C target resolution read failed: ${err(targetEventsError)}`);
  if ((targetEvents ?? []).length >= 1000) throw new Error("C2C resolution safety bound reached");
  const candidateSeedIds = [...new Set((targetEvents ?? []).map((e: any) => String(e.source_record_id)).filter(Boolean))];

  const { data: allEvents, error: allEventsError } = await db.from("geo_resolution_events").select("id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,created_at").in("source_record_id", candidateSeedIds.length ? candidateSeedIds : ["00000000-0000-0000-0000-000000000000"]);
  if (allEventsError) throw new Error(`C2C all resolution read failed: ${err(allEventsError)}`);
  const latest = new Map<string, any>();
  for (const event of allEvents ?? []) {
    if (event.source_record_type !== "source_offer_seed") continue;
    const seedId = String(event.source_record_id);
    if (newer(event, latest.get(seedId))) latest.set(seedId, event);
  }
  const currentSeedIds = [...latest.values()].filter((e: any) => e.resolution_status === "resolved" && slugByNeighborhoodId.has(String(e.resolved_neighborhood_id)) && (!e.resolved_city_id || String(e.resolved_city_id) === rabatCityId)).map((e: any) => String(e.source_record_id));

  const { data: seedRows, error: seedError } = await db.from("source_offer_seeds").select("id,canonical_url,source_domain").in("id", currentSeedIds.length ? currentSeedIds : ["00000000-0000-0000-0000-000000000000"]).eq("source_domain", "mubawab.ma");
  if (seedError) throw new Error(`C2C seed read failed: ${err(seedError)}`);
  const mubawabSeeds = new Map((seedRows ?? []).map((r: any) => [String(r.id), r]));

  const { data: docs, error: docsError } = await db.from("thin_index_search_documents").select("seed_id,normalized_intent,normalized_price_mad,normalized_surface_m2").in("seed_id", [...mubawabSeeds.keys()].length ? [...mubawabSeeds.keys()] : ["00000000-0000-0000-0000-000000000000"]).is("normalized_price_mad", null).not("normalized_surface_m2", "is", null).limit(30);
  if (docsError) throw new Error(`C2C documents read failed: ${err(docsError)}`);

  const rows = (docs ?? []).flatMap((doc: any) => {
    const seed: any = mubawabSeeds.get(String(doc.seed_id));
    if (!seed?.canonical_url) return [];
    return [{ seed_id: String(doc.seed_id), canonical_url: String(seed.canonical_url), source_domain: "mubawab.ma", normalized_intent: doc.normalized_intent ?? null }];
  }) as CohortRow[];

  const plan: Array<CohortRow & { amount: number }> = [];
  for (const row of rows) {
    if (!(await isAllowedByRobots(row.canonical_url))) continue;
    try {
      const res = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
      const audit = auditStructuredCohortHtml(res.html, row, res.url);
      if (audit.amount != null) plan.push({ ...row, amount: audit.amount });
    } catch (e) {
      console.warn(`[carte-c2c] ${row.seed_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await safeDelay(300, 700);
  }

  if (plan.length > MAX_WRITES) throw new Error(`C2C write fail-closed: planned ${plan.length} exceeds MAX_WRITES=${MAX_WRITES}`);
  let written = 0;
  for (const row of plan) {
    const { data, error } = await db.from("thin_index_search_documents").update({ normalized_price_mad: row.amount }).eq("seed_id", row.seed_id).eq("source_domain", "mubawab.ma").is("normalized_price_mad", null).select("seed_id");
    if (error) throw new Error(`C2C write failed ${row.seed_id}: ${err(error)}`);
    written += data?.length ?? 0;
  }
  console.log(JSON.stringify({ planned: plan.length, written, maxWrites: MAX_WRITES }, null, 2));
}

main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; });
