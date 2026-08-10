#!/usr/bin/env tsx
// P1C.3 — explicit read-only activation review.
// Reconstructs the exact P1C.1 cohort from bounded base-table reads and replays
// the versioned P1C.2 reliability policy client-side. No heavy Reliability view
// or global RPC is required through PostgREST.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const POLICY_PATH = join(process.cwd(), "data/market/p1c3-neighborhood-offer-activation-review-policy.json");
const RELIABILITY_POLICY_PATH = join(process.cwd(), "data/market/p1c2-neighborhood-offer-reliability-policy.json");
const RELIABILITY_SQL_PATH = join(process.cwd(), "supabase/migrations/20260810133000_p1c2_neighborhood_offer_reliability.sql");
const OUTPUT = join(process.cwd(), "data/audits/runtime/p1c3-neighborhood-offer-activation-review.json");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 1000;
const IN_CHUNK = 100;

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

type MetricThreshold = {
  min_sample_count: number;
  min_field_coverage_percent: number;
  min_fresh_sample_percent: number;
  min_source_domain_count: number;
  max_outlier_percent: number;
  max_iqr_to_median_ratio: number;
};

type ListingRow = {
  seed_id: string;
  city_id: string;
  city_slug: string;
  city_name: string;
  neighborhood_id: string;
  neighborhood_slug: string;
  neighborhood_name: string;
  transaction_type: string;
  freshness_status: string;
  source_domain: string;
  price_mad: number | null;
  surface_m2: number | null;
  price_per_m2_mad: number | null;
};

type MetricObservation = { value: number; fresh: boolean; source: string };

type SegmentAccumulator = {
  city_id: string;
  city_slug: string;
  city_name: string;
  neighborhood_id: string;
  neighborhood_slug: string;
  neighborhood_name: string;
  transaction_type: string;
  listing_count: number;
  metrics: Record<string, MetricObservation[]>;
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

export function percentileCont(values: number[], percentile: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * percentile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const fraction = position - lower;
  return sorted[lower] + ((sorted[upper] - sorted[lower]) * fraction);
}

export function classifyReliabilityMetric(
  evidence: {
    sample_count: number;
    field_coverage_percent: number;
    fresh_sample_percent: number;
    source_domain_count: number;
    outlier_percent: number;
    iqr_to_median_ratio: number | null;
  },
  thresholds: Record<"limited" | "moderate" | "strong", MetricThreshold>,
): "insufficient" | "limited" | "moderate" | "strong" {
  const passes = (level: "limited" | "moderate" | "strong") => {
    const t = thresholds[level];
    return evidence.iqr_to_median_ratio !== null
      && evidence.sample_count >= t.min_sample_count
      && evidence.field_coverage_percent >= t.min_field_coverage_percent
      && evidence.fresh_sample_percent >= t.min_fresh_sample_percent
      && evidence.source_domain_count >= t.min_source_domain_count
      && evidence.outlier_percent <= t.max_outlier_percent
      && evidence.iqr_to_median_ratio <= t.max_iqr_to_median_ratio;
  };
  if (passes("strong")) return "strong";
  if (passes("moderate")) return "moderate";
  if (passes("limited")) return "limited";
  return "insufficient";
}

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
function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
async function readAllResolutionEvents(db: any): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await db.from("geo_resolution_events")
      .select("id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,resolver_version,created_at")
      .eq("source_record_type", "source_offer_seed")
      .range(from, from + PAGE_SIZE - 1);
    if (response.error) throw new Error(`P1C.3 resolution events read failed: ${response.error.message}`);
    const page = response.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    if (rows.length > 100000) throw new Error("P1C.3 resolution-event safety bound exceeded");
  }
}
async function readByIds(db: any, table: string, select: string, key: string, ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const rows: any[] = [];
  for (const batch of chunks(ids)) {
    const response = await db.from(table).select(select).in(key, batch);
    if (response.error) throw new Error(`P1C.3 ${table} read failed: ${response.error.message}`);
    rows.push(...(response.data ?? []));
  }
  return rows;
}

async function replayShadowListings(db: any): Promise<{
  listings: ListingRow[];
  latestResolutionCollisions: number;
  conflictingResolutionHistory: number;
  missingCanonicalGeo: number;
}> {
  const events = await readAllResolutionEvents(db);
  const eventSourceIds = [...new Set(events.map((event: any) => String(event.source_record_id ?? "")).filter((id) => UUID_RE.test(id)))];
  const docsRows = await readByIds(
    db,
    "thin_index_search_documents",
    "seed_id,vertical_classification,document_kind,display_eligibility,normalized_intent,normalized_price_mad,normalized_surface_m2,normalized_price_m2,freshness_status",
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
  const eventsBySource = new Map<string, any[]>();
  for (const event of eligibleEvents) {
    const id = String(event.source_record_id);
    if (newer(event, latest.get(id))) latest.set(id, event);
    const bucket = eventsBySource.get(id) ?? [];
    bucket.push(event);
    eventsBySource.set(id, bucket);
  }

  let latestResolutionCollisions = 0;
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

  const latestResolved = [...latest.values()].filter(
    (event) => event.resolution_status === "resolved" && String(event.resolved_neighborhood_id ?? "").trim(),
  );
  const neighborhoodIds = [...new Set(latestResolved.map((event: any) => String(event.resolved_neighborhood_id)))];
  const neighborhoodRows = await readByIds(db, "geo_entities", "id,entity_type,parent_id,canonical_name,slug,validation_status", "id", neighborhoodIds);
  const neighborhoodsById = new Map(neighborhoodRows.map((row: any) => [String(row.id), row]));
  const parentIds = [...new Set(neighborhoodRows.map((row: any) => String(row.parent_id ?? "")).filter(Boolean))];
  const cityRows = await readByIds(db, "geo_entities", "id,entity_type,canonical_name,slug,validation_status", "id", parentIds);
  const citiesById = new Map(cityRows.map((row: any) => [String(row.id), row]));
  const seedIds = latestResolved.map((event: any) => String(event.source_record_id));
  const seedRows = await readByIds(db, "source_offer_seeds", "id,source_domain", "id", seedIds);
  const seedsById = new Map(seedRows.map((row: any) => [String(row.id), row]));

  let missingCanonicalGeo = 0;
  const listings: ListingRow[] = [];
  for (const event of latestResolved) {
    const seedId = String(event.source_record_id);
    const doc: any = docsById.get(seedId);
    const seed: any = seedsById.get(seedId);
    const neighborhood: any = neighborhoodsById.get(String(event.resolved_neighborhood_id));
    const city: any = neighborhood ? citiesById.get(String(neighborhood.parent_id)) : null;
    const valid = Boolean(
      doc && seed && neighborhood && neighborhood.entity_type === "neighborhood" && neighborhood.validation_status === "validated" && neighborhood.slug
      && city && city.entity_type === "city" && city.validation_status === "validated" && city.slug
      && (!event.resolved_city_id || String(event.resolved_city_id) === String(city.id)),
    );
    if (!valid) {
      missingCanonicalGeo += 1;
      continue;
    }
    const price = positive(doc.normalized_price_mad);
    const surface = positive(doc.normalized_surface_m2);
    const normalizedM2 = positive(doc.normalized_price_m2);
    listings.push({
      seed_id: seedId,
      city_id: String(city.id),
      city_slug: String(city.slug),
      city_name: String(city.canonical_name),
      neighborhood_id: String(neighborhood.id),
      neighborhood_slug: String(neighborhood.slug),
      neighborhood_name: String(neighborhood.canonical_name),
      transaction_type: String(doc.normalized_intent ?? "").trim() || "unknown",
      freshness_status: String(doc.freshness_status ?? ""),
      source_domain: String(seed.source_domain ?? "").trim(),
      price_mad: price,
      surface_m2: surface,
      price_per_m2_mad: normalizedM2 ?? (price !== null && surface !== null ? round(price / surface, 2) : null),
    });
  }
  return { listings, latestResolutionCollisions, conflictingResolutionHistory, missingCanonicalGeo };
}

function buildReliabilityRows(listings: ListingRow[], reliabilityPolicy: any) {
  const metricCatalog: string[] = reliabilityPolicy.metric_catalog;
  const segments = new Map<string, SegmentAccumulator>();
  for (const listing of listings) {
    const key = `${listing.city_id}\u0000${listing.neighborhood_id}\u0000${listing.transaction_type}`;
    const segment = segments.get(key) ?? {
      city_id: listing.city_id,
      city_slug: listing.city_slug,
      city_name: listing.city_name,
      neighborhood_id: listing.neighborhood_id,
      neighborhood_slug: listing.neighborhood_slug,
      neighborhood_name: listing.neighborhood_name,
      transaction_type: listing.transaction_type,
      listing_count: 0,
      metrics: Object.fromEntries(metricCatalog.map((metric) => [metric, []])),
    };
    segment.listing_count += 1;
    const values: Record<string, number | null> = {
      price_mad: listing.price_mad,
      surface_m2: listing.surface_m2,
      price_per_m2_mad: listing.price_per_m2_mad,
    };
    for (const metric of metricCatalog) {
      const value = values[metric];
      if (value !== null) {
        segment.metrics[metric].push({
          value,
          fresh: listing.freshness_status === "fresh_confirmed",
          source: listing.source_domain,
        });
      }
    }
    segments.set(key, segment);
  }

  const metricRows: any[] = [];
  for (const segment of segments.values()) {
    for (const metric of metricCatalog) {
      const observations = segment.metrics[metric] ?? [];
      const values = observations.map((observation) => observation.value);
      const sampleCount = values.length;
      const freshSampleCount = observations.filter((observation) => observation.fresh).length;
      const sourceDomainCount = new Set(observations.map((observation) => observation.source).filter(Boolean)).size;
      const q1Raw = percentileCont(values, 0.25);
      const medianRaw = percentileCont(values, 0.5);
      const q3Raw = percentileCont(values, 0.75);
      const iqr = q1Raw === null || q3Raw === null ? null : round(q3Raw - q1Raw, 4);
      const iqrToMedianRatio = medianRaw === null || medianRaw <= 0 || q1Raw === null || q3Raw === null
        ? null
        : round((q3Raw - q1Raw) / medianRaw, 4);
      const outlierCount = iqr === null || q1Raw === null || q3Raw === null
        ? 0
        : values.filter((value) => value < q1Raw - (1.5 * iqr) || value > q3Raw + (1.5 * iqr)).length;
      const fieldCoveragePercent = segment.listing_count === 0 ? 0 : round((sampleCount / segment.listing_count) * 100, 2);
      const freshSamplePercent = sampleCount === 0 ? 0 : round((freshSampleCount / sampleCount) * 100, 2);
      const outlierPercent = sampleCount === 0 ? 0 : round((outlierCount / sampleCount) * 100, 2);
      const reliabilityLevel = classifyReliabilityMetric(
        {
          sample_count: sampleCount,
          field_coverage_percent: fieldCoveragePercent,
          fresh_sample_percent: freshSamplePercent,
          source_domain_count: sourceDomainCount,
          outlier_percent: outlierPercent,
          iqr_to_median_ratio: iqrToMedianRatio,
        },
        reliabilityPolicy.metric_thresholds,
      );
      metricRows.push({
        city_id: segment.city_id,
        city_slug: segment.city_slug,
        city_name: segment.city_name,
        neighborhood_id: segment.neighborhood_id,
        neighborhood_slug: segment.neighborhood_slug,
        neighborhood_name: segment.neighborhood_name,
        transaction_type: segment.transaction_type,
        metric_name: metric,
        listing_count: segment.listing_count,
        sample_count: sampleCount,
        field_coverage_percent: fieldCoveragePercent,
        fresh_sample_percent: freshSamplePercent,
        source_domain_count: sourceDomainCount,
        median: medianRaw === null ? null : round(medianRaw, 4),
        iqr_to_median_ratio: iqrToMedianRatio,
        outlier_percent: outlierPercent,
        reliability_level: reliabilityLevel,
        p1c3_review_candidate: reliabilityPolicy.activation_boundary.p1c3_review_candidate_levels.includes(reliabilityLevel),
        market_representativeness_certified: false,
        public_activation: false,
        metric_layers_activated: false,
      });
    }
  }
  return { segments: [...segments.values()], metricRows };
}

export async function runP1C3NeighborhoodOfferActivationReview() {
  const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
  const reliabilityPolicy = JSON.parse(readFileSync(RELIABILITY_POLICY_PATH, "utf8"));
  const reliabilitySql = readFileSync(RELIABILITY_SQL_PATH, "utf8");
  assert(policy.schema_version === "p1c3-neighborhood-offer-activation-review-policy-v1", "P1C.3 policy schema drift");
  assert(reliabilityPolicy.schema_version === "p1c2-neighborhood-offer-reliability-policy-v1", "P1C.2 policy schema drift");
  assert(JSON.stringify(policy.review_candidate_levels) === JSON.stringify(reliabilityPolicy.activation_boundary.p1c3_review_candidate_levels), "P1C.3/P1C.2 review-level drift");
  assert(policy.principles.reliability_is_necessary_but_not_sufficient === true, "P1C.3 reliability boundary missing");
  assert(policy.principles.missing_acquisition_representativeness_forces_hold === true, "P1C.3 representativeness HOLD missing");
  assert(policy.principles.p1c3_is_read_only_review === true, "P1C.3 must remain read-only");
  assert(policy.principles.public_metric_activation_requires_separate_write_lot === true, "P1C.3 separate write lot boundary missing");
  assert(policy.current_certification_boundary.acquisition_representativeness_source_available === false, "P1C.4 representativeness boundary unexpectedly bypassed");
  assert(policy.current_certification_boundary.expected_canary_eligible_count === 0, "P1C.3 current canary expectation drift");
  for (const marker of ["false as market_representativeness_certified", "false as public_activation", "false as metric_layers_activated", "false as p1c3_auto_activation"]) {
    assert(reliabilitySql.includes(marker), `P1C.2 activation marker missing: ${marker}`);
  }

  const db: any = getSupabaseServerClient();
  const replay = await replayShadowListings(db);
  assert(replay.listings.length > 0, "P1C.3 Shadow cohort disappeared");
  assert(new Set(replay.listings.map((row) => row.seed_id)).size === replay.listings.length, "P1C.3 duplicate latest seed rows");
  assert(replay.latestResolutionCollisions === 0, `P1C.3 latest Geo collisions=${replay.latestResolutionCollisions}`);
  assert(replay.conflictingResolutionHistory === 0, `P1C.3 conflicting Geo history=${replay.conflictingResolutionHistory}`);
  assert(replay.missingCanonicalGeo === 0, `P1C.3 missing canonical Geo=${replay.missingCanonicalGeo}`);

  const { segments, metricRows } = buildReliabilityRows(replay.listings, reliabilityPolicy);
  assert(metricRows.length === segments.length * policy.metric_catalog.length, `P1C.2 metric catalog cardinality drift: ${metricRows.length}/${segments.length}`);

  const decisions = metricRows.map((row: any) => ({
    ...row,
    decision: evaluateActivationCandidate(row, policy.review_candidate_levels),
  }));
  const reviewCandidates = decisions.filter((row) => row.p1c3_review_candidate === true);
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
      reliability_view_required: false,
      bounded_base_table_replay: true,
    },
    predecessor: {
      reliability_policy_version: "p1c2_neighborhood_offer_reliability_v1",
      listing_rows: replay.listings.length,
      segment_rows: segments.length,
      metric_rows: metricRows.length,
      geo_latest_resolution_collisions: replay.latestResolutionCollisions,
      geo_conflicting_resolution_history: replay.conflictingResolutionHistory,
      geo_missing_canonical_geo: replay.missingCanonicalGeo,
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
