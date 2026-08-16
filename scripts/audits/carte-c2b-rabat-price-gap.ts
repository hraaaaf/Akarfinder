#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const OUTPUT = join(process.cwd(), "data/audits/runtime/carte-c2b-rabat-price-gap.json");
const TARGETS = ["agdal", "hay-riad", "souissi", "hassan"] as const;
const CHUNK_SIZE = 100;

function err(e: any) {
  return JSON.stringify({ message: e?.message, code: e?.code, details: e?.details, hint: e?.hint, status: e?.status });
}

function chunks<T>(values: T[], size = CHUNK_SIZE): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size));
  return result;
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
    if (error) throw new Error(`C2B ${table} bounded read failed: ${err(error)}`);
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
  if (cityError) throw new Error(`C2B Rabat city read failed: ${err(cityError)}`);
  if ((cityRows ?? []).length !== 1) throw new Error(`C2B expected exactly one validated Rabat city, got ${(cityRows ?? []).length}`);
  const rabatCityId = String(cityRows[0].id);

  const { data: neighborhoodRows, error: neighborhoodError } = await db
    .from("geo_entities")
    .select("id,slug,parent_id,entity_type,validation_status")
    .eq("entity_type", "neighborhood")
    .eq("parent_id", rabatCityId)
    .eq("validation_status", "validated")
    .in("slug", [...TARGETS]);
  if (neighborhoodError) throw new Error(`C2B Rabat neighborhoods read failed: ${err(neighborhoodError)}`);

  const neighborhoodById = new Map((neighborhoodRows ?? []).map((row: any) => [String(row.id), String(row.slug)]));
  const foundSlugs = new Set(neighborhoodById.values());
  for (const slug of TARGETS) if (!foundSlugs.has(slug)) throw new Error(`C2B missing validated Rabat neighborhood: ${slug}`);
  const targetNeighborhoodIds = [...neighborhoodById.keys()];

  const { data: targetEvents, error: targetEventsError } = await db
    .from("geo_resolution_events")
    .select("id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,created_at")
    .eq("source_record_type", "source_offer_seed")
    .eq("resolution_status", "resolved")
    .in("resolved_neighborhood_id", targetNeighborhoodIds)
    .range(0, 999);
  if (targetEventsError) throw new Error(`C2B target resolution event read failed: ${err(targetEventsError)}`);
  if ((targetEvents ?? []).length >= 1000) throw new Error("C2B target resolution event safety bound reached");

  const candidateSeedIds = [...new Set((targetEvents ?? []).map((row: any) => String(row.source_record_id)).filter(Boolean))];
  const allCandidateEvents = await readByIds(
    db,
    "geo_resolution_events",
    "id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,created_at",
    "source_record_id",
    candidateSeedIds,
  );

  const latest = new Map<string, any>();
  for (const event of allCandidateEvents) {
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

  const docsRows = await readByIds(
    db,
    "thin_index_search_documents",
    "seed_id,vertical_classification,document_kind,display_eligibility,normalized_intent,normalized_price_mad,normalized_surface_m2,normalized_price_m2,freshness_status",
    "seed_id",
    currentSeedIds,
  );
  const docs = new Map(docsRows.map((row: any) => [String(row.seed_id), row]));

  const seedRows = await readByIds(db, "source_offer_seeds", "id,source_domain", "id", currentSeedIds);
  const seeds = new Map(seedRows.map((row: any) => [String(row.id), row]));

  const rows = current.flatMap((event: any) => {
    const seedId = String(event.source_record_id);
    const doc: any = docs.get(seedId);
    const seed: any = seeds.get(seedId);
    if (!doc || !seed) return [];
    const eligible = doc.vertical_classification === "real_estate_likely" &&
      doc.document_kind === "LISTING" &&
      ["eligible_primary", "eligible_secondary"].includes(doc.display_eligibility);
    if (!eligible) return [];

    const price = Number(doc.normalized_price_mad) > 0 ? Number(doc.normalized_price_mad) : null;
    const surface = Number(doc.normalized_surface_m2) > 0 ? Number(doc.normalized_surface_m2) : null;
    const normalizedPriceM2 = Number(doc.normalized_price_m2) > 0 ? Number(doc.normalized_price_m2) : null;
    const effectivePriceM2 = normalizedPriceM2 ?? (price !== null && surface !== null ? price / surface : null);

    return [{
      neighborhood_slug: neighborhoodById.get(String(event.resolved_neighborhood_id)),
      transaction_type: String(doc.normalized_intent ?? "").trim() || "unknown",
      source_domain: String(seed.source_domain ?? "unknown"),
      price_per_m2_mad: effectivePriceM2,
      price_per_m2_source: normalizedPriceM2 !== null ? "normalized_price_m2" : effectivePriceM2 !== null ? "derived_exact_price_surface" : null,
      price_mad: price,
      surface_m2: surface,
      freshness_status: doc.freshness_status,
    }];
  });

  const groups = new Map<string, any>();
  for (const row of rows) {
    const key = [row.neighborhood_slug, row.transaction_type, row.source_domain].join("|");
    const g = groups.get(key) ?? {
      neighborhoodSlug: row.neighborhood_slug,
      transactionType: row.transaction_type,
      sourceDomain: row.source_domain,
      listings: 0,
      withPricePerM2: 0,
      withPrice: 0,
      withSurface: 0,
      normalizedPricePerM2: 0,
      derivedPricePerM2: 0,
      freshConfirmed: 0,
    };
    g.listings += 1;
    if (Number(row.price_per_m2_mad) > 0) g.withPricePerM2 += 1;
    if (Number(row.price_mad) > 0) g.withPrice += 1;
    if (Number(row.surface_m2) > 0) g.withSurface += 1;
    if (row.price_per_m2_source === "normalized_price_m2") g.normalizedPricePerM2 += 1;
    if (row.price_per_m2_source === "derived_exact_price_surface") g.derivedPricePerM2 += 1;
    if (row.freshness_status === "fresh_confirmed") g.freshConfirmed += 1;
    groups.set(key, g);
  }

  const bySource = [...groups.values()].sort((a, b) => b.listings - a.listings || a.sourceDomain.localeCompare(b.sourceDomain));
  const total = rows.length;
  const withPricePerM2 = rows.filter((r: any) => Number(r.price_per_m2_mad) > 0).length;
  const missingPriceButHasSurface = rows.filter((r: any) => !(Number(r.price_mad) > 0) && Number(r.surface_m2) > 0).length;
  const hasPriceButMissingSurface = rows.filter((r: any) => Number(r.price_mad) > 0 && !(Number(r.surface_m2) > 0)).length;
  const neither = rows.filter((r: any) => !(Number(r.price_mad) > 0) && !(Number(r.surface_m2) > 0)).length;

  const report = {
    contractVersion: "carte_c2b_rabat_price_gap_v3",
    readOnly: true,
    source: "bounded_base_tables_latest_event_first",
    targetSlugs: TARGETS,
    candidateResolutionSeeds: candidateSeedIds.length,
    currentResolvedSeeds: currentSeedIds.length,
    totalListings: total,
    withPricePerM2,
    pricePerM2CoveragePct: total ? Number(((withPricePerM2 / total) * 100).toFixed(2)) : 0,
    missingPriceButHasSurface,
    hasPriceButMissingSurface,
    neitherPriceNorSurface: neither,
    bySource,
    verdict: withPricePerM2 >= 10 ? "C2B_PRICE_COVERAGE_REVIEWABLE" : "C2B_PRICE_COVERAGE_INSUFFICIENT",
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
