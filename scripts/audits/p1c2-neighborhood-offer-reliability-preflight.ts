#!/usr/bin/env tsx
// P1C.2 — live read-only preflight.
// Confirms the P1C.1 Shadow contract is healthy and measures the current sample distribution
// before the Reliability Engine is deployed. No reliability claim is made by this script.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const POLICY_PATH = join(process.cwd(), "data/market/p1c2-neighborhood-offer-reliability-policy.json");
const OUTPUT = join(process.cwd(), "data/audits/runtime/p1c2-neighborhood-offer-reliability-preflight.json");

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

export async function runP1C2NeighborhoodOfferReliabilityPreflight() {
  const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
  assert(policy.schema_version === "p1c2-neighborhood-offer-reliability-policy-v1", "P1C.2 policy schema drift");
  assert(policy.principles.less_than_five_samples_is_always_insufficient === true, "P1C.2 minimum sample gate missing");
  assert(policy.principles.market_representativeness_requires_separate_acquisition_certification === true, "market representativeness boundary missing");
  assert(policy.activation_boundary.public_activation === false && policy.activation_boundary.metric_layers_activated === false && policy.activation_boundary.p1c3_auto_activation === false, "P1C.2 activation boundary drift");

  const db: any = getSupabaseServerClient();
  const [reportR, segmentsR] = await Promise.all([
    db.rpc("odm_neighborhood_offer_shadow_report_v1"),
    db.from("odm_neighborhood_offer_shadow_segment_v1")
      .select("city_id,neighborhood_id,transaction_type,listing_count,price_sample_count,price_coverage_percent,surface_sample_count,surface_coverage_percent,price_per_m2_sample_count,price_per_m2_coverage_percent,fresh_confirmed_count,seed_only_count,source_domain_count,reliability_certified,public_activation,metric_layers_activated"),
  ]);
  if (reportR.error) throw new Error(`P1C.2 P1C.1 report read failed: ${reportR.error.message}`);
  if (segmentsR.error) throw new Error(`P1C.2 Shadow segments read failed: ${segmentsR.error.message}`);

  const raw = reportR.data;
  const p1c1 = Array.isArray(raw) ? (raw[0]?.report ?? raw[0]) : (raw?.report ?? raw);
  assert(p1c1?.contract_version === "p1c1_neighborhood_offer_shadow_v1", "P1C.1 contract drift");
  assert(p1c1.metric_state === "shadow", "P1C.1 is not Shadow");
  assert(Number(p1c1.listing_rows) > 0 && Number(p1c1.neighborhoods) > 0 && Number(p1c1.transaction_segments) > 0, "P1C.1 Shadow cohort disappeared");
  assert(p1c1.public_activation === false && p1c1.reliability_certified === false && p1c1.metric_layers_activated === false, "P1C.1 activation boundary drift");
  assert(Number(p1c1.geo_latest_resolution_collisions) === 0 && Number(p1c1.geo_conflicting_resolution_history) === 0 && Number(p1c1.geo_missing_canonical_geo) === 0, "P1C.1 Geo integrity drift");

  const segments = segmentsR.data ?? [];
  assert(segments.length === Number(p1c1.transaction_segments), `P1C.2 segment denominator mismatch: ${segments.length}/${p1c1.transaction_segments}`);
  assert(segments.every((row: any) => row.reliability_certified === false && row.public_activation === false && row.metric_layers_activated === false), "P1C.1 segment activation drift");

  const max = (key: string) => Math.max(0, ...segments.map((row: any) => Number(row[key] ?? 0)));
  const countAtLeast = (key: string, threshold: number) => segments.filter((row: any) => Number(row[key] ?? 0) >= threshold).length;
  const priceSamples = segments.reduce((sum: number, row: any) => sum + Number(row.price_sample_count ?? 0), 0);
  const surfaceSamples = segments.reduce((sum: number, row: any) => sum + Number(row.surface_sample_count ?? 0), 0);
  const priceM2Samples = segments.reduce((sum: number, row: any) => sum + Number(row.price_per_m2_sample_count ?? 0), 0);

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
    },
    predecessor: {
      contract_version: p1c1.contract_version,
      listing_rows: Number(p1c1.listing_rows),
      neighborhoods: Number(p1c1.neighborhoods),
      transaction_segments: Number(p1c1.transaction_segments),
      price_coverage_percent: Number(p1c1.price_coverage_percent),
      surface_coverage_percent: Number(p1c1.surface_coverage_percent),
      price_per_m2_coverage_percent: Number(p1c1.price_per_m2_coverage_percent),
      geo_latest_resolution_collisions: Number(p1c1.geo_latest_resolution_collisions),
      geo_conflicting_resolution_history: Number(p1c1.geo_conflicting_resolution_history),
      geo_missing_canonical_geo: Number(p1c1.geo_missing_canonical_geo),
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
