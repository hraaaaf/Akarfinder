#!/usr/bin/env tsx
// P1C.2 — live read-only preflight.
// Replays the P1B.3 latest-event-first Geo contract from bounded base-table reads,
// then cross-checks it against the compact P1C.1 segment surface. No heavy report RPC is required.

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
  const [events, segmentsR] = await Promise.all([
    readAllResolutionEvents(db),
    db.from("odm_neighborhood_offer_shadow_segment_v1")
      .select("city_id,neighborhood_id,transaction_type,listing_count,price_sample_count,price_coverage_percent,surface_sample_count,surface_coverage_percent,price_per_m2_sample_count,price_per_m2_coverage_percent,fresh_confirmed_count,seed_only_count,source_domain_count,reliability_certified,public_activation,metric_layers_activated"),
  ]);
  if (segmentsR.error) throw new Error(`P1C.2 Shadow segments read failed: ${segmentsR.error.message}`);

  const eventSourceIds = [...new Set(events.map((event: any) => String(event.source_record_id ?? "")).filter((id) => UUID_RE.test(id)))];
  const docsRows = await readByIds(
    db,
    "thin_index_search_documents",
    "seed_id,vertical_classification,document_kind,display_eligibility",
    "seed_id",
    eventSourceIds,
  );
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

  let missingCanonicalGeo = 0;
  let resolvedNeighborhoodListings = 0;
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
    if (valid) resolvedNeighborhoodListings += 1;
    else missingCanonicalGeo += 1;
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

  assert(resolvedNeighborhoodListings > 0, "resolved neighborhood cohort disappeared");
  assert(latestResolutionCollisions === 0, `latest Geo collision detected: ${latestResolutionCollisions}`);
  assert(conflictingResolutionHistory === 0, `conflicting Geo history detected: ${conflictingResolutionHistory}`);
  assert(missingCanonicalGeo === 0, `missing canonical Geo detected: ${missingCanonicalGeo}`);

  const segments = segmentsR.data ?? [];
  assert(segments.length > 0, "P1C.1 Shadow segments disappeared");
  assert(segments.every((row: any) => row.reliability_certified === false && row.public_activation === false && row.metric_layers_activated === false), "P1C.1 segment activation drift");

  const listingRows = segments.reduce((sum: number, row: any) => sum + Number(row.listing_count ?? 0), 0);
  const neighborhoodCount = new Set(segments.map((row: any) => String(row.neighborhood_id))).size;
  assert(listingRows === resolvedNeighborhoodListings, `P1C.1/P1B.3 replay denominator mismatch: ${listingRows}/${resolvedNeighborhoodListings}`);

  const max = (key: string) => Math.max(0, ...segments.map((row: any) => Number(row[key] ?? 0)));
  const countAtLeast = (key: string, threshold: number) => segments.filter((row: any) => Number(row[key] ?? 0) >= threshold).length;
  const priceSamples = segments.reduce((sum: number, row: any) => sum + Number(row.price_sample_count ?? 0), 0);
  const surfaceSamples = segments.reduce((sum: number, row: any) => sum + Number(row.surface_sample_count ?? 0), 0);
  const priceM2Samples = segments.reduce((sum: number, row: any) => sum + Number(row.price_per_m2_sample_count ?? 0), 0);
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
      geo_replayed_resolved_neighborhood_listings: resolvedNeighborhoodListings,
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
