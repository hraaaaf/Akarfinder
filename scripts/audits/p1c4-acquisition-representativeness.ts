#!/usr/bin/env tsx
// P1C.4 — read-only acquisition representativeness qualification.
// The observed metric cohort is evidence, never the denominator.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

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
  return q.includes("a louer") || q.includes("location") || q.includes("for rent") || q.includes(" rent");
}

function isExactNeighborhoodQuery(query: string): boolean {
  const q = normalize(query);
  return q.includes("gueliz") || q.includes("guéliz");
}

async function readAllMarrakechDiscoveryCandidates(db: any): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await db
      .from("discovery_candidates")
      .select("provider,discovery_query,result_rank,source_domain,discovered_at,last_seen_at")
      .ilike("discovery_query", "%Marrakech%")
      .range(from, from + PAGE_SIZE - 1);
    if (response.error) throw new Error(`P1C.4 discovery_candidates read failed: ${response.error.message}`);
    const page = response.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    if (rows.length > SAFETY_BOUND) throw new Error("P1C.4 discovery-candidate safety bound exceeded");
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

  const db = getSupabaseServerClient();
  const scope = policy.scope;

  const metricResponse = await db
    .from("odm_neighborhood_offer_reliability_metric_v1")
    .select("city_slug,neighborhood_slug,transaction_type,metric_name,listing_count,sample_count,fresh_sample_count,source_domain_count,median,field_coverage_percent,fresh_sample_percent,reliability_level,p1c3_review_candidate,market_representativeness_certified,public_activation,metric_layers_activated,metric_state")
    .eq("city_slug", scope.city_slug)
    .eq("neighborhood_slug", scope.neighborhood_slug)
    .eq("transaction_type", scope.transaction_type)
    .eq("metric_name", scope.metric_name)
    .limit(2);
  if (metricResponse.error) throw new Error(`P1C.4 metric read failed: ${metricResponse.error.message}`);
  const metricRows = metricResponse.data ?? [];
  assert(metricRows.length === 1, `P1C.4 expected one exact metric row, found ${metricRows.length}`);
  const metric = metricRows[0];
  assert(metric.public_activation === false && metric.metric_layers_activated === false, "P1C.4 detected activation drift");

  const listingResponse = await db
    .from("odm_neighborhood_offer_shadow_listing_v1")
    .select("seed_id,source_domain,freshness_status,last_observed_at,surface_m2,property_type")
    .eq("city_slug", scope.city_slug)
    .eq("neighborhood_slug", scope.neighborhood_slug)
    .eq("transaction_type", scope.transaction_type)
    .range(0, 999);
  if (listingResponse.error) throw new Error(`P1C.4 shadow listing read failed: ${listingResponse.error.message}`);
  const listings = listingResponse.data ?? [];
  const seedIds = [...new Set(listings.map((row: any) => String(row.seed_id)).filter(Boolean))];

  const seedResponse = seedIds.length === 0
    ? { data: [], error: null }
    : await db
      .from("source_offer_seeds")
      .select("id,source_domain,seed_provider,first_observed_at,last_observed_at,observation_count,freshness_status,fresh_channels,metadata")
      .in("id", seedIds);
  if (seedResponse.error) throw new Error(`P1C.4 seed read failed: ${seedResponse.error.message}`);
  const seeds = seedResponse.data ?? [];

  const observedSourceCounts = new Map<string, number>();
  for (const row of listings) {
    const domain = String(row.source_domain ?? "").trim();
    if (domain) observedSourceCounts.set(domain, (observedSourceCounts.get(domain) ?? 0) + 1);
  }
  const observedSources = [...observedSourceCounts.keys()].sort();
  const freshCount = listings.filter((row: any) => row.freshness_status === "fresh_confirmed").length;
  const seedOnlyCount = listings.filter((row: any) => row.freshness_status === "seed_only").length;

  const policyResponse = observedSources.length === 0
    ? { data: [], error: null }
    : await db
      .from("source_policy_registry")
      .select("source_domain,authorization_status,acquisition_mode,allowed_discovery_channels,review_status,content_reuse_policy,display_policy,ingestion_gate,display_gate,policy_version,policy_expires_at")
      .in("source_domain", observedSources);
  if (policyResponse.error) throw new Error(`P1C.4 source policy read failed: ${policyResponse.error.message}`);
  const observedSourcePolicies = policyResponse.data ?? [];

  const discoveryRows = await readAllMarrakechDiscoveryCandidates(db);
  const cityRentRows = discoveryRows.filter((row) => isRentQuery(String(row.discovery_query ?? "")));
  const cityRentQueries = [...new Set(cityRentRows.map((row) => String(row.discovery_query ?? "")))];
  const cityRentDomains = [...new Set(cityRentRows.map((row) => String(row.source_domain ?? "")).filter(Boolean))];
  const cityRentProviders = [...new Set(cityRentRows.map((row) => String(row.provider ?? "")).filter(Boolean))];
  const exactNeighborhoodQueryRows = cityRentRows.filter((row) => isExactNeighborhoodQuery(String(row.discovery_query ?? "")));
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

  const result = {
    schema_version: "p1c4-acquisition-representativeness-audit-v1",
    generated_at: new Date().toISOString(),
    policy_id: policy.policy_id,
    policy_version: policy.policy_version,
    scope,
    metric: {
      listing_count: Number(metric.listing_count),
      sample_count: Number(metric.sample_count),
      fresh_sample_count: Number(metric.fresh_sample_count),
      source_domain_count: Number(metric.source_domain_count),
      median: metric.median === null ? null : Number(metric.median),
      field_coverage_percent: Number(metric.field_coverage_percent),
      fresh_sample_percent: Number(metric.fresh_sample_percent),
      reliability_level: metric.reliability_level,
      p1c3_review_candidate: metric.p1c3_review_candidate,
      market_representativeness_certified: metric.market_representativeness_certified,
      metric_state: metric.metric_state,
    },
    observed_cohort: {
      listing_count: listings.length,
      unique_seed_count: seedIds.length,
      fresh_confirmed_count: freshCount,
      seed_only_count: seedOnlyCount,
      source_count: observedSources.length,
      source_counts: Object.fromEntries([...observedSourceCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
      seed_providers: [...new Set(seeds.map((row: any) => String(row.seed_provider ?? "")).filter(Boolean))].sort(),
      fresh_channels: [...new Set(seeds.flatMap((row: any) => Array.isArray(row.fresh_channels) ? row.fresh_channels.map(String) : []))].sort(),
      source_policies: observedSourcePolicies,
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
      last_seen_at: cityRentRows.map((row) => row.last_seen_at).filter(Boolean).sort().at(-1) ?? null,
      query_rotation_rows: queryRotation.length,
      query_universe_versions: queryUniverseVersions,
      active_partner_feed_count: partnerFeeds.filter((row) => row.status === "active").length,
      partner_feed_count: partnerFeeds.length,
      commoncrawl_public_index_run_count: publicIndexRuns.length,
    },
    denominator,
    biases: {
      source_concentration: Object.fromEntries([...observedSourceCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
      freshness_skew: { fresh_confirmed: freshCount, seed_only: seedOnlyCount },
      pagination_and_depth: "City-level public-index discovery is predominantly bounded by search-result rank and does not prove source inventory depth or crawl completion for Guéliz.",
      portal_coverage: "The city-level query universe mixes site-specific and broad searches; some broad queries explicitly exclude major portals. No exact Guéliz source-universe reconciliation exists.",
      duplication: "The metric cohort is deduplicated to unique Shadow seed rows, but acquisition-universe duplicate/completeness effects are not proven against an exact-scope denominator.",
      policy_constraints: observedSourcePolicies.map((row: any) => ({
        source_domain: row.source_domain,
        authorization_status: row.authorization_status,
        acquisition_mode: row.acquisition_mode,
        review_status: row.review_status,
        content_reuse_policy: row.content_reuse_policy,
        display_policy: row.display_policy,
      })),
      real_market_coverage: "Unknown. The acquired/discoverable set cannot be equated with the real Guéliz rental market without an independently defined exact-scope denominator."
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

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  runP1C4Audit().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
