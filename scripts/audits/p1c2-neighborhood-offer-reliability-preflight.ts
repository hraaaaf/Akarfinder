#!/usr/bin/env tsx
// P1C.2 — live read-only preflight.
// Uses the bounded P1C.1 segment surface plus the canonical P1B.3 Geo report.
// It intentionally avoids the heavier P1C.1 global RPC, whose work is redundant here.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const POLICY_PATH = join(process.cwd(), "data/market/p1c2-neighborhood-offer-reliability-policy.json");
const P1C1_SQL_PATH = join(process.cwd(), "supabase/migrations/20260810130500_p1c1_neighborhood_offer_shadow.sql");
const OUTPUT = join(process.cwd(), "data/audits/runtime/p1c2-neighborhood-offer-reliability-preflight.json");

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
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
  const [geoR, segmentsR] = await Promise.all([
    db.rpc("odm_territorial_metric_join_report_v1"),
    db.from("odm_neighborhood_offer_shadow_segment_v1")
      .select("city_id,neighborhood_id,transaction_type,listing_count,price_sample_count,price_coverage_percent,surface_sample_count,surface_coverage_percent,price_per_m2_sample_count,price_per_m2_coverage_percent,fresh_confirmed_count,seed_only_count,source_domain_count,reliability_certified,public_activation,metric_layers_activated"),
  ]);
  if (geoR.error) throw new Error(`P1C.2 P1B.3 report read failed: ${geoR.error.message}`);
  if (segmentsR.error) throw new Error(`P1C.2 Shadow segments read failed: ${segmentsR.error.message}`);

  const geoRaw = geoR.data;
  const geo = Array.isArray(geoRaw) ? (geoRaw[0]?.report ?? geoRaw[0]) : (geoRaw?.report ?? geoRaw);
  assert(geo?.contract_version === "p1b3_territorial_metric_join_v1", "P1B.3 Geo contract drift");
  assert(Number(geo.resolved_neighborhood_listings) > 0, "resolved neighborhood cohort disappeared");
  assert(Number(geo.latest_resolution_collisions) === 0 && Number(geo.conflicting_resolution_history) === 0 && Number(geo.missing_canonical_geo) === 0, "P1B.3 Geo integrity drift");
  assert(geo.metric_layers_activated === false, "public territorial metrics activated before P1C.2");

  const segments = segmentsR.data ?? [];
  assert(segments.length > 0, "P1C.1 Shadow segments disappeared");
  assert(segments.every((row: any) => row.reliability_certified === false && row.public_activation === false && row.metric_layers_activated === false), "P1C.1 segment activation drift");

  const listingRows = segments.reduce((sum: number, row: any) => sum + Number(row.listing_count ?? 0), 0);
  const neighborhoods = new Set(segments.map((row: any) => String(row.neighborhood_id))).size;
  assert(listingRows === Number(geo.resolved_neighborhood_listings), `P1C.1/P1B.3 denominator mismatch: ${listingRows}/${geo.resolved_neighborhood_listings}`);

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
      heavy_p1c1_global_rpc_required: false,
    },
    predecessor: {
      contract_version: "p1c1_neighborhood_offer_shadow_v1",
      listing_rows: listingRows,
      neighborhoods,
      transaction_segments: segments.length,
      price_coverage_percent: pct(priceSamples),
      surface_coverage_percent: pct(surfaceSamples),
      price_per_m2_coverage_percent: pct(priceM2Samples),
      geo_contract_version: geo.contract_version,
      geo_latest_resolution_collisions: Number(geo.latest_resolution_collisions),
      geo_conflicting_resolution_history: Number(geo.conflicting_resolution_history),
      geo_missing_canonical_geo: Number(geo.missing_canonical_geo),
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
