#!/usr/bin/env tsx
// P1C.4 — read-only acquisition representativeness qualification.
// The observed metric cohort is evidence, never the denominator.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { runP1C3NeighborhoodOfferActivationReview } from "./p1c3-neighborhood-offer-activation-review";

const POLICY_PATH = join(process.cwd(), "data/market/p1c4-acquisition-representativeness-policy.json");
const OUTPUT = join(process.cwd(), "data/audits/runtime/p1c4-acquisition-representativeness.json");
const PAGE_SIZE = 1000;
const SAFETY_BOUND = 20000;

export type RepresentativenessStatus = "CERTIFIED" | "INSUFFICIENT" | "NOT_CERTIFIABLE";

export type RepresentativenessInput = {
  independent_denominator_defined: boolean;
  denominator_scope_exact: boolean;
  expected_source_universe_versioned: boolean;
  acquisition_channels_reconciled: boolean;
  observed_sources_used_as_denominator: boolean;
  per_source_depth_proven: boolean;
  per_source_freshness_proven: boolean;
  denominator_critical_gap_count: number;
};

export function classifyRepresentativeness(input: RepresentativenessInput): RepresentativenessStatus {
  if (input.observed_sources_used_as_denominator) return "NOT_CERTIFIABLE";
  if (
    !input.independent_denominator_defined
    || !input.denominator_scope_exact
    || !input.expected_source_universe_versioned
    || !input.acquisition_channels_reconciled
  ) return "NOT_CERTIFIABLE";
  if (
    !input.per_source_depth_proven
    || !input.per_source_freshness_proven
    || input.denominator_critical_gap_count > 0
  ) return "INSUFFICIENT";
  return "CERTIFIED";
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function isRentQuery(query: string): boolean {
  const q = normalize(query);
  return q.includes("a louer") || q.includes("location") || q.includes("for rent") || q.includes(" rent") || q.startsWith("rent");
}

function isExactNeighborhoodQuery(query: string): boolean {
  const q = normalize(query);
  return q.includes("gueliz") || q.includes("guéliz");
}

async function readDiscoveryCandidatesByPattern(db: any, pattern: string): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await db
      .from("discovery_candidates")
      .select("id,provider,discovery_query,result_rank,source_domain,discovered_at,last_seen_at")
      .ilike("discovery_query", pattern)
      .range(from, from + PAGE_SIZE - 1);
    if (response.error) throw new Error(`P1C.4 discovery_candidates read failed (${pattern}): ${response.error.message}`);
    const page = response.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    if (rows.length > SAFETY_BOUND) throw new Error(`P1C.4 discovery-candidate safety bound exceeded (${pattern})`);
  }
}

async function readAllRows(db: any, table: string, select: string): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await db.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (response.error) throw new Error(`P1C.4 ${table} read failed: ${response.error.message}`);
    const page = response.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    if (rows.length > SAFETY_BOUND) throw new Error(`P1C.4 ${table} safety bound exceeded`);
  }
}

export async function runP1C4Audit() {
  const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
  assert(policy.schema_version === "p1c4-acquisition-representativeness-policy-v1", "P1C.4 policy schema drift");
  assert(policy.principles.p1c4_is_read_only === true, "P1C.4 must stay read-only");
  assert(policy.principles.observed_sources_must_not_define_the_denominator === true, "P1C.4 circular-denominator guard missing");

  const db: any = getSupabaseServerClient();
  const scope = policy.scope;

  // P1C.3 already owns the bounded base-table reconstruction of Shadow + Reliability.
  // Reuse that certified replay instead of querying the heavy Reliability view through PostgREST.
  const predecessor = await runP1C3NeighborhoodOfferActivationReview();
  const exactCandidates = predecessor.review.candidates.filter((row: any) =>
    row.city_slug === scope.city_slug
    && row.neighborhood_slug === scope.neighborhood_slug
    && row.transaction_type === scope.transaction_type
    && row.metric_name === scope.metric_name,
  );
  assert(exactCandidates.length === 1, `P1C.4 expected one exact P1C.3 candidate, found ${exactCandidates.length}`);
  const predecessorMetric: any = exactCandidates[0];
  assert(predecessorMetric.public_activation === false && predecessorMetric.metric_layers_activated === false, "P1C.4 detected activation drift");
  assert(predecessorMetric.decision === "HOLD_MARKET_REPRESENTATIVENESS_REQUIRED", "P1C.4 predecessor HOLD drift");

  const snapshotSourceCounts = policy.current_evidence_snapshot.observed_sources as Record<string, number>;
  const observedSources = Object.keys(snapshotSourceCounts).sort();
  assert(observedSources.length === predecessorMetric.source_domain_count, "P1C.4 audited source snapshot drifted from live P1C.3 source cardinality");

  const sourcePolicyResponse = await db
    .from("source_policy_registry")
    .select("source_domain,authorization_status,acquisition_mode,allowed_discovery_channels,review_status,content_reuse_policy,display_policy,ingestion_gate,display_gate,policy_version,policy_expires_at")
    .in("source_domain", observedSources);
  if (sourcePolicyResponse.error) throw new Error(`P1C.4 source policy read failed: ${sourcePolicyResponse.error.message}`);
  const observedSourcePolicies = sourcePolicyResponse.data ?? [];

  const discoveryRows = await readDiscoveryCandidatesByPattern(db, "%Marrakech%");
  const cityRentRows = discoveryRows.filter((row) => isRentQuery(String(row.discovery_query ?? "")));
  const cityRentQueries = [...new Set(cityRentRows.map((row) => String(row.discovery_query ?? "")))];
  const cityRentDomains = [...new Set(cityRentRows.map((row) => String(row.source_domain ?? "")).filter(Boolean))];
  const cityRentProviders = [...new Set(cityRentRows.map((row) => String(row.provider ?? "")).filter(Boolean))];

  const exactUnaccented = await readDiscoveryCandidatesByPattern(db, "%Gueliz%");
  const exactAccented = await readDiscoveryCandidatesByPattern(db, "%Guéliz%");
  const exactById = new Map<string, any>();
  for (const row of [...exactUnaccented, ...exactAccented]) exactById.set(String(row.id), row);
  const exactNeighborhoodQueryRows = [...exactById.values()].filter((row) =>
    isExactNeighborhoodQuery(String(row.discovery_query ?? ""))
    && isRentQuery(String(row.discovery_query ?? "")),
  );
  const exactNeighborhoodQueries = [...new Set(exactNeighborhoodQueryRows.map((row) => String(row.discovery_query ?? "")))];

  const maxRankByQuery = new Map<string, number>();
  for (const row of cityRentRows) {
    const query = String(row.discovery_query ?? "");
    const rank = Number(row.result_rank ?? 0);
    maxRankByQuery.set(query, Math.max(maxRankByQuery.get(query) ?? 0, Number.isFinite(rank) ? rank : 0));
  }
  const queriesReachingRank10 = [...maxRankByQuery.values()].filter((rank) => rank === 10).length;
  const queriesExcludingFourMajorPortals = cityRentQueries.filter((query) => {
    const q = normalize(query);
    return ["-site:avito.ma", "-site:mubawab.ma", "-site:sarouty.ma", "-site:agenz.ma"].every((token) => q.includes(token));
  }).length;

  const partnerFeeds = await readAllRows(db, "partner_feed_sources", "id,name,source_kind,status,ownership_attested,rights_attested,updated_at");
  const publicIndexRuns = await readAllRows(db, "odm_10c4_public_index_runs", "run_key,source_domains,qualified_urls,net_new_urls,admitted_public_urls,executed_at");
  const queryRotation = await readAllRows(db, "openserp_query_rotation_state", "query_id,query_universe_version,last_executed_at,failure_count,successful_run_count,discovery_yield,last_engine,last_run_id");
  const queryUniverseVersions = [...new Set(queryRotation.map((row) => String(row.query_universe_version ?? "")).filter(Boolean))].sort();

  const denominator = {
    independent: false,
    exact_scope: false,
    source_universe_versioned: false,
    expected_sources: null,
    provenance: "No versioned Guéliz × rent expected-source universe is present in the audited acquisition evidence. City-level search results and the three observed sources are evidence only and are explicitly forbidden as a self-defined denominator.",
    city_level_evidence_is_denominator: false,
    observed_sources_are_denominator: false,
  };

  const classificationInput: RepresentativenessInput = {
    independent_denominator_defined: denominator.independent,
    denominator_scope_exact: denominator.exact_scope,
    expected_source_universe_versioned: denominator.source_universe_versioned,
    acquisition_channels_reconciled: false,
    observed_sources_used_as_denominator: false,
    per_source_depth_proven: false,
    per_source_freshness_proven: false,
    denominator_critical_gap_count: 5,
  };
  const status = classifyRepresentativeness(classificationInput);
  const verdict = status === "CERTIFIED"
    ? "P1C4_REPRESENTATIVENESS_CERTIFIED"
    : status === "INSUFFICIENT"
      ? "P1C4_REPRESENTATIVENESS_INSUFFICIENT"
      : "P1C4_REPRESENTATIVENESS_NOT_CERTIFIABLE";

  const freshSampleCount = Math.round((Number(predecessorMetric.fresh_sample_percent) / 100) * Number(predecessorMetric.sample_count));
  const result = {
    schema_version: "p1c4-acquisition-representativeness-audit-v1",
    generated_at: new Date().toISOString(),
    policy_id: policy.policy_id,
    policy_version: policy.policy_version,
    scope,
    predecessor: {
      verdict: predecessor.verdict,
      bounded_base_table_replay: predecessor.contract.bounded_base_table_replay,
      listing_rows: predecessor.predecessor.listing_rows,
      segment_rows: predecessor.predecessor.segment_rows,
      metric_rows: predecessor.predecessor.metric_rows,
    },
    metric: {
      listing_count: Number(predecessorMetric.listing_count),
      sample_count: Number(predecessorMetric.sample_count),
      fresh_sample_count: freshSampleCount,
      source_domain_count: Number(predecessorMetric.source_domain_count),
      median: predecessorMetric.median === null ? null : Number(predecessorMetric.median),
      field_coverage_percent: Number(predecessorMetric.field_coverage_percent),
      fresh_sample_percent: Number(predecessorMetric.fresh_sample_percent),
      reliability_level: predecessorMetric.reliability_level,
      p1c3_review_candidate: predecessorMetric.p1c3_review_candidate,
      market_representativeness_certified: predecessorMetric.market_representativeness_certified,
      metric_state: "shadow",
    },
    observed_cohort: {
      listing_count: Number(predecessorMetric.listing_count),
      fresh_confirmed_count: freshSampleCount,
      seed_only_count: Number(predecessorMetric.sample_count) - freshSampleCount,
      source_count: Number(predecessorMetric.source_domain_count),
      source_counts_audited_snapshot: snapshotSourceCounts,
      seed_provider_audited_snapshot: policy.current_evidence_snapshot.seed_provider,
      fresh_channel_family_audited_snapshot: policy.current_evidence_snapshot.fresh_channel_family,
      snapshot_observed_at: policy.current_evidence_snapshot.snapshot_observed_at,
      source_policies_live: observedSourcePolicies,
    },
    acquisition_universe_evidence: {
      marrakech_rent_candidate_rows: cityRentRows.length,
      marrakech_rent_distinct_queries: cityRentQueries.length,
      marrakech_rent_distinct_domains: cityRentDomains.length,
      discovery_providers: cityRentProviders,
      exact_gueliz_rent_query_rows: exactNeighborhoodQueryRows.length,
      exact_gueliz_rent_distinct_queries: exactNeighborhoodQueries.length,
      deepest_result_rank: cityRentRows.reduce((max, row) => Math.max(max, Number(row.result_rank ?? 0)), 0),
      queries_reaching_rank_10: queriesReachingRank10,
      queries_excluding_avito_mubawab_sarouty_agenz: queriesExcludingFourMajorPortals,
      first_discovered_at: cityRentRows.map((row) => row.discovered_at).filter(Boolean).sort()[0] ?? null,
      last_seen_at: cityRentRows.map((row) => row.last_seen_at).filter(Boolean).sort().slice(-1)[0] ?? null,
      query_rotation_rows: queryRotation.length,
      query_universe_versions: queryUniverseVersions,
      active_partner_feed_count: partnerFeeds.filter((row) => row.status === "active").length,
      partner_feed_count: partnerFeeds.length,
      commoncrawl_public_index_run_count: publicIndexRuns.length,
    },
    denominator,
    biases: {
      source_concentration_audited_snapshot: snapshotSourceCounts,
      freshness_skew_live: { fresh_confirmed: freshSampleCount, seed_only: Number(predecessorMetric.sample_count) - freshSampleCount },
      pagination_and_depth: "City-level public-index discovery is predominantly bounded by search-result rank and does not prove source inventory depth or crawl completion for Guéliz.",
      portal_coverage: "The city-level query universe mixes site-specific and broad searches; some broad queries explicitly exclude major portals. No exact Guéliz source-universe reconciliation exists.",
      duplication: "P1C.3 confirms a deduplicated current Shadow cohort, but acquisition-universe duplicate/completeness effects are not proven against an exact-scope denominator.",
      policy_constraints: observedSourcePolicies.map((row: any) => ({
        source_domain: row.source_domain,
        authorization_status: row.authorization_status,
        acquisition_mode: row.acquisition_mode,
        review_status: row.review_status,
        content_reuse_policy: row.content_reuse_policy,
        display_policy: row.display_policy,
      })),
      real_market_coverage: "Unknown. The acquired/discoverable set cannot be equated with the real Guéliz rental market without an independently defined exact-scope denominator.",
    },
    blockers: policy.current_blockers,
    certification: {
      status,
      revocable: true,
      classification_input: classificationInput,
      reason: status === "NOT_CERTIFIABLE"
        ? "No independent, versioned Guéliz × rent acquisition denominator exists; city-level rank-bounded discovery and the observed three-source cohort cannot establish market coverage."
        : null,
    },
    verdict,
    contract: {
      read_only: true,
      db_mutation: false,
      registry_write: false,
      listing_write: false,
      geo_write: false,
      search_change: false,
      ranking_change: false,
      data_policy_change: false,
      public_activation: false,
      metric_layers_activated: false,
      scoped_canary_write_opened: status === "CERTIFIED",
      national_activation: false,
    },
    next_boundary: status === "CERTIFIED"
      ? policy.next_boundary_if_certified
      : policy.next_boundary_if_not_certifiable,
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

const invokedDirectly = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  runP1C4Audit().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
