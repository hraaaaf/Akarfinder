#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { extractResidualPriceV4, type Candidate } from "@/scripts/scrapers/price-extraction-v4-strict-residual";

const OUTPUT = join(process.cwd(), "data/audits/runtime/carte-c2d-rabat-mouldar-offline.json");
const TARGETS = ["agdal", "hay-riad", "souissi", "hassan"] as const;
const CHUNK_SIZE = 100;

function err(e: any) {
  return JSON.stringify({ message: e?.message, code: e?.code, details: e?.details, hint: e?.hint, status: e?.status });
}

function chunks<T>(values: T[], size = CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

function newer(a: any, b: any): boolean {
  if (!b) return true;
  if (String(a.created_at) !== String(b.created_at)) return String(a.created_at) > String(b.created_at);
  return String(a.id) > String(b.id);
}

async function readByIds(db: any, table: string, select: string, key: string, ids: string[]): Promise<any[]> {
  const rows: any[] = [];
  for (const batch of chunks(ids)) {
    const { data, error } = await db.from(table).select(select).in(key, batch);
    if (error) throw new Error(`C2D ${table} bounded read failed: ${err(error)}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

async function main() {
  const db: any = getSupabaseServerClient();

  const { data: cityRows, error: cityError } = await db
    .from("geo_entities")
    .select("id,slug,entity_type,validation_status")
    .eq("entity_type", "city")
    .eq("slug", "rabat")
    .eq("validation_status", "validated")
    .limit(2);
  if (cityError) throw new Error(`C2D Rabat city read failed: ${err(cityError)}`);
  if ((cityRows ?? []).length !== 1) throw new Error(`C2D expected one validated Rabat city, got ${(cityRows ?? []).length}`);
  const rabatCityId = String(cityRows[0].id);

  const { data: neighborhoodRows, error: neighborhoodError } = await db
    .from("geo_entities")
    .select("id,slug,parent_id,entity_type,validation_status")
    .eq("entity_type", "neighborhood")
    .eq("parent_id", rabatCityId)
    .eq("validation_status", "validated")
    .in("slug", [...TARGETS]);
  if (neighborhoodError) throw new Error(`C2D neighborhoods read failed: ${err(neighborhoodError)}`);

  const neighborhoodById = new Map((neighborhoodRows ?? []).map((row: any) => [String(row.id), String(row.slug)]));
  for (const slug of TARGETS) {
    if (![...neighborhoodById.values()].includes(slug)) throw new Error(`C2D missing validated neighborhood ${slug}`);
  }
  const targetIds = [...neighborhoodById.keys()];

  const { data: targetEvents, error: targetEventsError } = await db
    .from("geo_resolution_events")
    .select("id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,created_at")
    .eq("source_record_type", "source_offer_seed")
    .eq("resolution_status", "resolved")
    .in("resolved_neighborhood_id", targetIds)
    .range(0, 999);
  if (targetEventsError) throw new Error(`C2D target events read failed: ${err(targetEventsError)}`);
  if ((targetEvents ?? []).length >= 1000) throw new Error("C2D target event safety bound reached");

  const candidateSeedIds = [...new Set((targetEvents ?? []).map((r: any) => String(r.source_record_id)).filter(Boolean))];
  const allEvents = await readByIds(
    db,
    "geo_resolution_events",
    "id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,created_at",
    "source_record_id",
    candidateSeedIds,
  );
  const latest = new Map<string, any>();
  for (const event of allEvents) {
    if (event.source_record_type !== "source_offer_seed") continue;
    const seedId = String(event.source_record_id);
    if (newer(event, latest.get(seedId))) latest.set(seedId, event);
  }

  const current = [...latest.values()].filter((event: any) =>
    event.resolution_status === "resolved" &&
    neighborhoodById.has(String(event.resolved_neighborhood_id)) &&
    (!event.resolved_city_id || String(event.resolved_city_id) === rabatCityId),
  );
  const currentSeedIds = current.map((event: any) => String(event.source_record_id));
  const zoneBySeed = new Map(current.map((event: any) => [String(event.source_record_id), neighborhoodById.get(String(event.resolved_neighborhood_id))]));

  const docsRows = await readByIds(
    db,
    "thin_index_search_documents",
    "seed_id,canonical_url,source_domain,seed_provider,freshness_status,title,snippet,normalized_intent,normalized_price_mad,normalized_surface_m2,vertical_classification,document_kind,display_eligibility",
    "seed_id",
    currentSeedIds,
  );

  const rows = docsRows.filter((row: any) =>
    row.source_domain === "mouldar.com" &&
    row.vertical_classification === "real_estate_likely" &&
    row.document_kind === "LISTING" &&
    ["eligible_primary", "eligible_secondary"].includes(row.display_eligibility) &&
    !(Number(row.normalized_price_mad) > 0) &&
    Number(row.normalized_surface_m2) > 0,
  );

  const results = rows.map((row: any) => {
    const candidate: Candidate = {
      seed_id: String(row.seed_id),
      canonical_url: String(row.canonical_url),
      source_domain: String(row.source_domain),
      seed_provider: row.seed_provider ?? null,
      freshness_status: row.freshness_status ?? null,
      title: row.title ?? null,
      snippet: row.snippet ?? null,
      normalized_intent: row.normalized_intent ?? null,
    };
    const match = extractResidualPriceV4(candidate);
    const surface = Number(row.normalized_surface_m2);
    return {
      seedId: candidate.seed_id,
      zone: zoneBySeed.get(candidate.seed_id) ?? null,
      provider: candidate.seed_provider,
      freshnessStatus: candidate.freshness_status,
      surfaceM2: surface,
      matched: !!match,
      amount: match?.amount ?? null,
      signal: match?.source ?? null,
      pricePerM2: match ? Math.round(match.amount / surface) : null,
    };
  });

  const matched = results.filter((r: any) => r.matched);
  const byZone = Object.fromEntries(TARGETS.map((zone) => {
    const z = results.filter((r: any) => r.zone === zone);
    return [zone, { candidates: z.length, matched: z.filter((r: any) => r.matched).length }];
  }));

  const report = {
    contractVersion: "carte_c2d_rabat_mouldar_offline_v1",
    readOnly: true,
    thirdPartyFetches: 0,
    source: "mouldar_v4_stored_evidence_only",
    targetSlugs: TARGETS,
    candidateCount: rows.length,
    matchedCount: matched.length,
    byZone,
    results,
    verdict: matched.length >= 2 ? "C2D_OFFLINE_RECOVERY_REVIEWABLE" : "C2D_OFFLINE_RECOVERY_INSUFFICIENT",
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
