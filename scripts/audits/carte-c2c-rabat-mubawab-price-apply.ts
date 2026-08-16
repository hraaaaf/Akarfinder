#!/usr/bin/env tsx
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { auditStructuredCohortHtml, type CohortRow } from "@/scripts/scrapers/price-extraction-v5-structured-cohort-audit";
import { fetchHtml, isAllowedByRobots } from "@/scripts/scrapers/utils/fetch-html";
import { safeDelay } from "@/scripts/scrapers/utils/safe-delay";

const TARGETS = ["agdal", "hay-riad", "souissi", "hassan"] as const;
const MAX_RESOLUTION_EVENTS = 300;
const MAX_WRITES = 10;

function err(e: any) {
  return JSON.stringify({ message: e?.message, code: e?.code, details: e?.details, hint: e?.hint, status: e?.status });
}

async function main() {
  if (process.env.CARTE_C2C_EXECUTE_WRITE !== "true") {
    throw new Error("C2C write blocked: CARTE_C2C_EXECUTE_WRITE=true required");
  }
  const db: any = getSupabaseServerClient();

  const { data: entities, error: entityError } = await db
    .from("geo_entities")
    .select("id,slug")
    .in("slug", TARGETS as unknown as string[]);
  if (entityError) throw new Error(`C2C entities read failed: ${err(entityError)}`);
  const slugByEntity = new Map((entities ?? []).map((r: any) => [r.id, r.slug]));
  const entityIds = [...slugByEntity.keys()];
  if (!entityIds.length) throw new Error("C2C no target geo entities");

  const { data: events, error: eventsError } = await db
    .from("geo_resolution_events")
    .select("seed_id,entity_id,resolution_status,created_at")
    .in("entity_id", entityIds)
    .order("created_at", { ascending: false })
    .limit(MAX_RESOLUTION_EVENTS);
  if (eventsError) throw new Error(`C2C resolution read failed: ${err(eventsError)}`);

  const latest = new Map<string, any>();
  for (const event of events ?? []) if (!latest.has(event.seed_id)) latest.set(event.seed_id, event);
  const resolved = [...latest.values()].filter((e: any) => e.resolution_status === "resolved" && slugByEntity.has(e.entity_id));
  const seedIds = resolved.map((e: any) => e.seed_id);

  const { data: docs, error: docsError } = await db
    .from("thin_index_search_documents")
    .select("seed_id,canonical_url,source_domain,normalized_intent,normalized_price_mad,normalized_surface_m2")
    .in("seed_id", seedIds.length ? seedIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("source_domain", "mubawab.ma")
    .is("normalized_price_mad", null)
    .not("normalized_surface_m2", "is", null)
    .limit(30);
  if (docsError) throw new Error(`C2C documents read failed: ${err(docsError)}`);

  const plan: Array<CohortRow & { amount: number }> = [];
  for (const row of (docs ?? []) as Array<CohortRow & { normalized_surface_m2: number | null }>) {
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

  if (plan.length > MAX_WRITES) {
    throw new Error(`C2C write fail-closed: planned ${plan.length} exceeds MAX_WRITES=${MAX_WRITES}`);
  }
  if (plan.length === 0) {
    console.log(JSON.stringify({ planned: 0, written: 0, maxWrites: MAX_WRITES }, null, 2));
    return;
  }

  let written = 0;
  for (const row of plan) {
    const { data, error } = await db
      .from("thin_index_search_documents")
      .update({ normalized_price_mad: row.amount })
      .eq("seed_id", row.seed_id)
      .eq("source_domain", "mubawab.ma")
      .is("normalized_price_mad", null)
      .select("seed_id");
    if (error) throw new Error(`C2C write failed ${row.seed_id}: ${err(error)}`);
    written += data?.length ?? 0;
  }

  console.log(JSON.stringify({ planned: plan.length, written, maxWrites: MAX_WRITES }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
