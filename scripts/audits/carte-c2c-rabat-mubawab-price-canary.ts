#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { auditStructuredCohortHtml, type CohortRow } from "@/scripts/scrapers/price-extraction-v5-structured-cohort-audit";
import { fetchHtml, isAllowedByRobots } from "@/scripts/scrapers/utils/fetch-html";
import { safeDelay } from "@/scripts/scrapers/utils/safe-delay";

const OUTPUT = join(process.cwd(), "data/audits/runtime/carte-c2c-rabat-mubawab-price-canary.json");
const TARGETS = ["agdal", "hay-riad", "souissi", "hassan"] as const;
const MAX_RESOLUTION_EVENTS = 300;
const MAX_FETCHES = 30;

function err(e: any) {
  return JSON.stringify({ message: e?.message, code: e?.code, details: e?.details, hint: e?.hint, status: e?.status });
}

async function main() {
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
    .limit(MAX_FETCHES);
  if (docsError) throw new Error(`C2C documents read failed: ${err(docsError)}`);

  const zoneBySeed = new Map(resolved.map((e: any) => [e.seed_id, slugByEntity.get(e.entity_id)]));
  const rows = (docs ?? []) as Array<CohortRow & { normalized_surface_m2: number | null }>;
  const results: any[] = [];

  for (const row of rows) {
    const result: any = {
      seedId: row.seed_id,
      zone: zoneBySeed.get(row.seed_id) ?? null,
      sourceDomain: row.source_domain,
      fetched: false,
      robotsAllowed: false,
      identity: false,
      reliableAmount: null,
      surfaceM2: Number(row.normalized_surface_m2) || null,
      pricePerM2: null,
      error: null,
    };
    try {
      result.robotsAllowed = await isAllowedByRobots(row.canonical_url);
      if (!result.robotsAllowed) {
        results.push(result);
        continue;
      }
      const res = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
      result.fetched = true;
      const audit = auditStructuredCohortHtml(res.html, row, res.url);
      result.identity = audit.identity;
      result.reliableAmount = audit.amount;
      if (audit.amount != null && result.surfaceM2 && result.surfaceM2 > 0) {
        result.pricePerM2 = Math.round(audit.amount / result.surfaceM2);
      }
    } catch (e) {
      result.error = e instanceof Error ? e.message : String(e);
    }
    results.push(result);
    await safeDelay(300, 700);
  }

  const reliable = results.filter((r) => Number(r.reliableAmount) > 0);
  const byZone = Object.fromEntries(TARGETS.map((zone) => {
    const z = results.filter((r) => r.zone === zone);
    return [zone, { candidates: z.length, fetched: z.filter((r) => r.fetched).length, reliable: z.filter((r) => Number(r.reliableAmount) > 0).length }];
  }));

  const report = {
    contractVersion: "carte_c2c_rabat_mubawab_price_canary_v1",
    readOnly: true,
    source: "mubawab_v5_targeted_refetch",
    targetSlugs: TARGETS,
    candidateCount: rows.length,
    fetchedCount: results.filter((r) => r.fetched).length,
    identityCount: results.filter((r) => r.identity).length,
    reliablePriceCount: reliable.length,
    byZone,
    results,
    verdict: reliable.length >= 4 ? "C2C_TARGETED_PRICE_RECOVERY_REVIEWABLE" : "C2C_TARGETED_PRICE_RECOVERY_INSUFFICIENT",
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
