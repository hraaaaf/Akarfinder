#!/usr/bin/env tsx
// P1C.3 — explicit read-only activation review.
// Reliability is necessary but not sufficient: acquisition representativeness
// must be separately certified for the exact neighborhood × transaction × metric scope.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const POLICY_PATH = join(process.cwd(), "data/market/p1c3-neighborhood-offer-activation-review-policy.json");
const OUTPUT = join(process.cwd(), "data/audits/runtime/p1c3-neighborhood-offer-activation-review.json");

export type ActivationDecisionCode =
  | "NOT_REVIEW_CANDIDATE"
  | "HOLD_ACTIVATION_DRIFT"
  | "HOLD_MARKET_REPRESENTATIVENESS_REQUIRED"
  | "CANARY_ELIGIBLE";

export type ActivationCandidateInput = {
  reliability_level: string;
  p1c3_review_candidate: boolean;
  market_representativeness_certified: boolean;
  public_activation: boolean;
  metric_layers_activated: boolean;
};

export function evaluateActivationCandidate(
  row: ActivationCandidateInput,
  reviewCandidateLevels: string[] = ["moderate", "strong"],
): ActivationDecisionCode {
  const reviewCandidate = row.p1c3_review_candidate === true && reviewCandidateLevels.includes(row.reliability_level);
  if (!reviewCandidate) return "NOT_REVIEW_CANDIDATE";
  if (row.public_activation === true || row.metric_layers_activated === true) return "HOLD_ACTIVATION_DRIFT";
  if (row.market_representativeness_certified !== true) return "HOLD_MARKET_REPRESENTATIVENESS_REQUIRED";
  return "CANARY_ELIGIBLE";
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function runP1C3NeighborhoodOfferActivationReview() {
  const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
  assert(policy.schema_version === "p1c3-neighborhood-offer-activation-review-policy-v1", "P1C.3 policy schema drift");
  assert(JSON.stringify(policy.review_candidate_levels) === JSON.stringify(["moderate", "strong"]), "P1C.3 review levels drift");
  assert(policy.principles.reliability_is_necessary_but_not_sufficient === true, "P1C.3 reliability boundary missing");
  assert(policy.principles.missing_acquisition_representativeness_forces_hold === true, "P1C.3 representativeness HOLD missing");
  assert(policy.principles.p1c3_is_read_only_review === true, "P1C.3 must remain read-only");
  assert(policy.principles.public_metric_activation_requires_separate_write_lot === true, "P1C.3 separate write lot boundary missing");
  assert(policy.current_certification_boundary.acquisition_representativeness_source_available === false, "P1C.4 representativeness boundary unexpectedly bypassed");
  assert(policy.current_certification_boundary.expected_canary_eligible_count === 0, "P1C.3 current canary expectation drift");

  const db: any = getSupabaseServerClient();
  const [metricsR, healthR] = await Promise.all([
    db.from("odm_neighborhood_offer_reliability_metric_v1").select(
      "city_id,city_slug,city_name,neighborhood_id,neighborhood_slug,neighborhood_name,transaction_type,metric_name,listing_count,sample_count,field_coverage_percent,fresh_sample_percent,source_domain_count,median,iqr_to_median_ratio,outlier_percent,reliability_level,p1c3_review_candidate,market_representativeness_certified,public_activation,metric_layers_activated,p1c3_auto_activation,metric_state,reliability_policy_version",
    ),
    db.from("odm_neighborhood_offer_reliability_segment_health_v1").select(
      "city_id,neighborhood_id,transaction_type,listing_count,source_domain_count,fresh_listing_percent,sample_health_level,market_representativeness_certified,public_activation,metric_layers_activated,metric_state",
    ),
  ]);
  if (metricsR.error) throw new Error(`P1C.3 reliability metrics read failed: ${metricsR.error.message}`);
  if (healthR.error) throw new Error(`P1C.3 segment health read failed: ${healthR.error.message}`);

  const metrics = metricsR.data ?? [];
  const health = healthR.data ?? [];
  assert(metrics.length > 0, "P1C.2 metric rows disappeared");
  assert(health.length > 0, "P1C.2 segment health rows disappeared");
  assert(metrics.length === health.length * policy.metric_catalog.length, `P1C.2 metric catalog cardinality drift: ${metrics.length}/${health.length}`);

  const allowedMetrics = new Set<string>(policy.metric_catalog);
  const allowedLevels = new Set<string>(["insufficient", "limited", "moderate", "strong"]);
  for (const row of metrics) {
    assert(allowedMetrics.has(String(row.metric_name)), `unexpected P1C.2 metric ${row.metric_name}`);
    assert(allowedLevels.has(String(row.reliability_level)), `unexpected reliability level ${row.reliability_level}`);
    assert(row.public_activation === false, "public activation already enabled before P1C.3 review");
    assert(row.metric_layers_activated === false, "metric layer already enabled before P1C.3 review");
    assert(row.p1c3_auto_activation === false, "P1C.2 auto-activation drift");
    assert(row.metric_state === "shadow", "P1C.2 metric state drift");
    assert(row.reliability_policy_version === "p1c2_neighborhood_offer_reliability_v1", "P1C.2 policy version drift");
  }
  for (const row of health) {
    assert(row.public_activation === false && row.metric_layers_activated === false, "segment health activation drift");
    assert(row.market_representativeness_certified === false, "segment health representativeness unexpectedly certified");
    assert(row.metric_state === "shadow", "segment health state drift");
  }

  const decisions = metrics.map((row: any) => {
    const decision = evaluateActivationCandidate(
      {
        reliability_level: String(row.reliability_level),
        p1c3_review_candidate: row.p1c3_review_candidate === true,
        market_representativeness_certified: row.market_representativeness_certified === true,
        public_activation: row.public_activation === true,
        metric_layers_activated: row.metric_layers_activated === true,
      },
      policy.review_candidate_levels,
    );
    return {
      city_id: String(row.city_id),
      city_slug: String(row.city_slug),
      city_name: String(row.city_name),
      neighborhood_id: String(row.neighborhood_id),
      neighborhood_slug: String(row.neighborhood_slug),
      neighborhood_name: String(row.neighborhood_name),
      transaction_type: String(row.transaction_type),
      metric_name: String(row.metric_name),
      listing_count: numberValue(row.listing_count),
      sample_count: numberValue(row.sample_count),
      field_coverage_percent: numberValue(row.field_coverage_percent),
      fresh_sample_percent: numberValue(row.fresh_sample_percent),
      source_domain_count: numberValue(row.source_domain_count),
      median: row.median === null ? null : numberValue(row.median),
      iqr_to_median_ratio: row.iqr_to_median_ratio === null ? null : numberValue(row.iqr_to_median_ratio),
      outlier_percent: numberValue(row.outlier_percent),
      reliability_level: String(row.reliability_level),
      market_representativeness_certified: row.market_representativeness_certified === true,
      decision,
    };
  });

  const reviewCandidates = decisions.filter((row) => policy.review_candidate_levels.includes(row.reliability_level));
  const canaryEligible = decisions.filter((row) => row.decision === "CANARY_ELIGIBLE");
  const representativenessHolds = decisions.filter((row) => row.decision === "HOLD_MARKET_REPRESENTATIVENESS_REQUIRED");
  const activationDrift = decisions.filter((row) => row.decision === "HOLD_ACTIVATION_DRIFT");
  const priceReviewCandidates = reviewCandidates.filter((row) => ["price_mad", "price_per_m2_mad"].includes(row.metric_name));
  const priceCanaryEligible = canaryEligible.filter((row) => ["price_mad", "price_per_m2_mad"].includes(row.metric_name));

  assert(activationDrift.length === 0, `P1C.3 activation drift detected: ${activationDrift.length}`);
  assert(canaryEligible.length === policy.current_certification_boundary.expected_canary_eligible_count, `P1C.3 canary eligibility drift: ${canaryEligible.length}`);
  assert(reviewCandidates.every((row) => row.decision === "HOLD_MARKET_REPRESENTATIVENESS_REQUIRED"), "P1C.3 candidate escaped representativeness HOLD");
  assert(priceCanaryEligible.length === 0, "P1C.3 price metric became canary-eligible without P1C.4 certification");

  const report = {
    schema_version: "p1c3-neighborhood-offer-activation-review-v1",
    generated_at: new Date().toISOString(),
    contract: {
      read_only: true,
      db_mutation: false,
      reliability_is_necessary_but_not_sufficient: true,
      acquisition_representativeness_source_available: false,
      market_representativeness_certified: false,
      public_activation: false,
      metric_layers_activated: false,
      auto_activation: false,
      national_bulk_activation: false,
      exact_scope: "neighborhood_x_transaction_x_metric",
      global_report_rpc_required: false,
    },
    predecessor: {
      reliability_policy_version: "p1c2_neighborhood_offer_reliability_v1",
      segment_rows: health.length,
      metric_rows: metrics.length,
    },
    review: {
      candidate_count: reviewCandidates.length,
      canary_eligible_count: canaryEligible.length,
      representativeness_hold_count: representativenessHolds.length,
      activation_drift_count: activationDrift.length,
      price_review_candidate_count: priceReviewCandidates.length,
      price_canary_eligible_count: priceCanaryEligible.length,
      candidates: reviewCandidates,
    },
    decision: canaryEligible.length === 0 ? "HOLD" : "CANARY_ELIGIBLE",
    verdict: canaryEligible.length === 0 ? "P1C3_ACTIVATION_REVIEW_HOLD" : "P1C3_CANARY_ELIGIBLE",
    next_boundary: canaryEligible.length === 0
      ? policy.next_boundary_if_hold
      : "Separate scoped canary write lot; P1C.3 itself never activates metrics.",
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const invoked = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) runP1C3NeighborhoodOfferActivationReview().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
