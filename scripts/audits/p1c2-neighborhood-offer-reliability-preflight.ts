#!/usr/bin/env tsx
// P1C.2 — live read-only preflight.
// Replays the P1B.3/P1C.1 cohort directly from bounded base-table reads so CI
// does not depend on expensive Shadow/report views through PostgREST.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const POLICY_PATH = join(process.cwd(), "data/market/p1c2-neighborhood-offer-reliability-policy.json");
const P1C1_SQL_PATH = join(process.cwd(), "supabase/migrations/20260810130500_p1c1_neighborhood_offer_shadow.sql");
const OUTPUT = join(process.cwd(), "data/audits/runtime/p1c2-neighborhood-offer-reliability-preflight.json");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 1000;
const IN_CHUNK = 100;

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function newer(a: any, b: any): boolean {
  if (!b) return true;
  if (String(a.created_at) !== String(b.created_at)) return String(a.created_at) > String(b.created_at);
  return String(a.id) > String(b.id);
}
function chunks<T>(values: T[], size = IN_CHUNK): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}
function positive(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
async function readAllResolutionEvents(db: any): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await db.from("geo_resolution_events")
      .select("id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,resolver_version,created_at")
      .eq("source_record_type", "source_offer_seed")
      .range(from, from + PAGE_SIZE - 1);
    if (response.error) throw new Error(`P1C.2 resolution events read failed: ${response.error.message}`);
    const page = response.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    if (rows.length > 100000) throw new Error("P1C.2 resolution-event safety bound exceeded");
  }
}
async function readByIds(db: any, table: string, select: string, key: string, ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const rows: any[] = [];
  for (const batch of chunks(ids)) {
    const response = await db.from(table).select(select).in(key, batch);
    if (response.error) throw new Error(`P1C.2 ${table} read failed: ${response.error.message}`);
    rows.push(...(response.data ?? []));
  }
  return rows;
}

export async function runP1C2NeighborhoodOfferReliabilityPreflight() {
  const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
  const p1c1Sql = readFileSync(P1C1_SQL_PATH, "utf8");
  assert(policy.schema_version === "p1c2-neighborhood-offer-reliability-policy-v1", "P1C.2 policy schema drift");
  assert(policy.principles.less_than_five_samples_is_always_insufficient === true, "P1C.2 minimum sample gate missing");
  assert(policy.principles.market_representativeness_requires_separate_acquisition_certification === true, "market representativeness boundary missing");
  assert(policy.activation_boundary.public_activation === false && policy.activation_boundary.metric_layers_activated === false && policy.activation_boundary.p1c3_auto_activation === false, "P1C.2 activation boundary drift");
  for (const marker of [
    "'p1c1_neighborhood_offer_shadow_v1'",
    "'shadow'::text as metric_state",
    "false as reliability_certified",
    "false as public_activation",
    "false as metric_layers_activated",
  ]) assert(p1c1Sql.includes(marker), `P1C.1 predecessor marker missing: ${marker}`);

  const db: any = getSupabaseServerClient();
  const events = await readAllResolutionEvents(db);
  const eventSourceIds = [...new Set(events.map((event: any) => String(event.source_record_id ?? "")).filter((id) => UUID_RE.test(id)))];
  const docsRows = await readByIds(
    db,
    "thin_index_search_documents",
    "seed_id,vertical_classification,document_kind,display_eligibility,normalized_intent,normalized_price_mad,normalized_surface_m2,normalized_price_m2",
    "seed_id",
    eventSourceIds,
  );
  const docsById = new Map(docsRows.map((doc: any) => [String(doc.seed_id), doc]));
  const eligibleIds = new Set(
    docsRows
      .filter((doc: any) => doc.vertical_classification === "real_estate_likely" && doc.document_kind === "LISTING" && ["eligible_primary", "eligible_secondary"].includes(doc.display_eligibility))
      .map((doc: any) => String(doc.seed_id)),
  );

  const eligibleEvents = events.filter((event: any) => eligibleIds.has(String(event.source_record_id)));
  const latest = new Map<string, any>();
  for (const event of eligibleEvents) {
    const id = String(event.source_record_id);
    if (newer(event, latest.get(id))) latest.set(id, event);
  }
  const latestResolved = [...latest.values()].filter(
    (event) => event.resolution_status === "resolved" && String(event.resolved_neighborhood_id ?? "").trim(),
  );

  const neighborhoodIds = [...new Set(latestResolved.map((event: any) => String(event.resolved_neighborhood_id)))];
  const neighborhoodRows = await readByIds(
    db,
    "geo_entities",
    "id,entity_type,parent_id,canonical_name,slug,validation_status",
    "id",
    neighborhoodIds,
  );
  const neighborhoodsById = new Map(neighborhoodRows.map((row: any) => [String(row.id), row]));
  const parentIds = [...new Set(neighborhoodRows.map((row: any) => String(row.parent_id ?? "")).filter(Boolean))];
  const cityRows = await readByIds(
    db,
    "geo_entities",
    "id,entity_type,canonical_name,slug,validation_status",
    "id",
    parentIds,
  );
  const citiesById = new Map(cityRows.map((row: any) => [String(row.id), row]));

  const joined: Array<{ seed_id: string; city_id: string; neighborhood_id: string; transaction_type: string; price: number | null; surface: number | null; price_m2: number | null }> = [];
  let missingCanonicalGeo = 0;
  for (const event of latestResolved) {
    const neighborhood: any = neighborhoodsById.get(String(event.resolved_neighborhood_id));
    const city: any = neighborhood ? citiesById.get(String(neighborhood.parent_id)) : null;
    const valid = Boolean(
      neighborhood &&
      neighborhood.entity_type === "neighborhood" &&
      neighborhood.validation_status === "validated" &&
      neighborhood.slug &&
      city &&
      city.entity_type === "city" &&
      city.validation_status === "validated" &&
      city.slug &&
      (!event.resolved_city_id || String(event.resolved_city_id) === String(city.id)),
    );
    if (!valid) {
      missingCanonicalGeo += 1;
      continue;
    }
    const seedId = String(event.source_record_id);
    const doc: any = docsById.get(seedId);
    assert(doc, `P1C.2 eligible document disappeared: ${seedId}`);
    const price = positive(doc.normalized_price_mad);
    const surface = positive(doc.normalized_surface_m2);
    const normalizedM2 = positive(doc.normalized_price_m2);
    joined.push({
      seed_id: seedId,
      city_id: String(city.id),
      neighborhood_id: String(neighborhood.id),
      transaction_type: String(doc.normalized_intent ?? "").trim() || "unknown",
      price,
      surface,
      price_m2: normalizedM2 ?? (price !== null && surface !== null ? price / surface : null),
    });
  }

  let latestResolutionCollisions = 0;
  const eventsBySource = new Map<string, any[]>();
  for (const event of eligibleEvents) {
    const id = String(event.source_record_id);
    const bucket = eventsBySource.get(id) ?? [];
    bucket.push(event);
    eventsBySource.set(id, bucket);
  }
  let conflictingResolutionHistory = 0;
  for (const sourceEvents of eventsBySource.values()) {
    const resolvedTargets = new Set(
      sourceEvents
        .filter((event) => event.resolution_status === "resolved" && event.resolved_neighborhood_id)
        .map((event) => String(event.resolved_neighborhood_id)),
    );
    if (resolvedTargets.size > 1) conflictingResolutionHistory += 1;

    const maxCreatedAt = sourceEvents.reduce((max, event) => String(event.created_at) > max ? String(event.created_at) : max, "");
    const latestTimestampTargets = new Set(
      sourceEvents
        .filter((event) => String(event.created_at) === maxCreatedAt && event.resolution_status === "resolved" && event.resolved_neighborhood_id)
        .map((event) => String(event.resolved_neighborhood_id)),
    );
    if (latestTimestampTargets.size > 1) latestResolutionCollisions += 1;
  }

  assert(joined.length > 0, "resolved neighborhood cohort disappeared");
  assert(new Set(joined.map((row) => row.seed_id)).size === joined.length, "P1C.2 replay contains duplicate latest seed rows");
  assert(latestResolutionCollisions === 0, `latest Geo collision detected: ${latestResolutionCollisions}`);
  assert(conflictingResolutionHistory === 0, `conflicting Geo history detected: ${conflictingResolutionHistory}`);
  assert(missingCanonicalGeo === 0, `missing canonical Geo detected: ${missingCanonicalGeo}`);

  const segmentMap = new Map<string, { neighborhood_id: string; listing_count: number; price_sample_count: number; surface_sample_count: number; price_per_m2_sample_count: number }>();
  for (const row of joined) {
    const key = `${row.city_id}\u0000${row.neighborhood_id}\u0000${row.transaction_type}`;
    const segment = segmentMap.get(key) ?? {
      neighborhood_id: row.neighborhood_id,
      listing_count: 0,
      price_sample_count: 0,
      surface_sample_count: 0,
      price_per_m2_sample_count: 0,
    };
    segment.listing_count += 1;
    if (row.price !== null) segment.price_sample_count += 1;
    if (row.surface !== null) segment.surface_sample_count += 1;
    if (row.price_m2 !== null) segment.price_per_m2_sample_count += 1;
    segmentMap.set(key, segment);
  }
  const segments = [...segmentMap.values()];
  const listingRows = segments.reduce((sum, row) => sum + row.listing_count, 0);
  const neighborhoodCount = new Set(segments.map((row) => row.neighborhood_id)).size;
  assert(listingRows === joined.length, `P1C.1 base replay denominator mismatch: ${listingRows}/${joined.length}`);

  const max = (key: "price_sample_count" | "surface_sample_count" | "price_per_m2_sample_count") => Math.max(0, ...segments.map((row) => row[key]));
  const countAtLeast = (key: "price_sample_count" | "surface_sample_count" | "price_per_m2_sample_count", threshold: number) => segments.filter((row) => row[key] >= threshold).length;
  const priceSamples = segments.reduce((sum, row) => sum + row.price_sample_count, 0);
  const surfaceSamples = segments.reduce((sum, row) => sum + row.surface_sample_count, 0);
  const priceM2Samples = segments.reduce((sum, row) => sum + row.price_per_m2_sample_count, 0);
  const pct = (n: number) => Number(((n / listingRows) * 100).toFixed(2));

  const report = {
    schema_version: "p1c2-neighborhood-offer-reliability-preflight-v1",
    generated_at: new Date().toISOString(),
    contract: {
      read_only: true,
      db_mutation: false,
      public_activation: false,
      metric_layers_activated: false,
      market_representativeness_certified: false,
      thresholds_are_internal_policy_not_external_standard: true,
      p1b3_report_rpc_required: false,
      p1c1_global_report_rpc_required: false,
      p1c1_shadow_segment_view_required: false,
      bounded_base_table_replay: true,
    },
    predecessor: {
      contract_version: "p1c1_neighborhood_offer_shadow_v1",
      listing_rows: listingRows,
      neighborhoods: neighborhoodCount,
      transaction_segments: segments.length,
      price_coverage_percent: pct(priceSamples),
      surface_coverage_percent: pct(surfaceSamples),
      price_per_m2_coverage_percent: pct(priceM2Samples),
      geo_contract_version: "p1b3_territorial_metric_join_v1",
      geo_replayed_resolved_neighborhood_listings: joined.length,
      geo_latest_resolution_collisions: latestResolutionCollisions,
      geo_conflicting_resolution_history: conflictingResolutionHistory,
      geo_missing_canonical_geo: missingCanonicalGeo,
    },
    live_distribution: {
      segments: segments.length,
      total_price_samples_across_segments: priceSamples,
      total_surface_samples_across_segments: surfaceSamples,
      total_price_per_m2_samples_across_segments: priceM2Samples,
      max_price_sample_count_per_segment: max("price_sample_count"),
      max_surface_sample_count_per_segment: max("surface_sample_count"),
      max_price_per_m2_sample_count_per_segment: max("price_per_m2_sample_count"),
      price_segments_meeting_minimum_five_samples: countAtLeast("price_sample_count", 5),
      surface_segments_meeting_minimum_five_samples: countAtLeast("surface_sample_count", 5),
      price_per_m2_segments_meeting_minimum_five_samples: countAtLeast("price_per_m2_sample_count", 5),
    },
    observations: {
      sparse_price_data_expected_to_fail_closed: max("price_sample_count") < 5,
      sparse_price_per_m2_data_expected_to_fail_closed: max("price_per_m2_sample_count") < 5,
      low_reliability_is_a_valid_engine_output: true,
      p1c3_requires_explicit_review_after_reliability: true,
    },
    verdict: "P1C2_RELIABILITY_ENGINE_READY_FOR_DEPLOYMENT",
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const invoked = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) runP1C2NeighborhoodOfferReliabilityPreflight().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
