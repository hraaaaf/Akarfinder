#!/usr/bin/env tsx
// P1C.4 — acquisition representativeness qualification.
// Read-only by contract: reconstructs the exact Shadow scope, compares it with
// independent discovery evidence and Source Registry state, then fails closed
// unless a versioned denominator design exists for the exact scope.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const POLICY_PATH = join(process.cwd(), "data/market/p1c4-acquisition-representativeness-policy.json");
const OUTPUT = join(process.cwd(), "data/audits/runtime/p1c4-acquisition-representativeness-qualification.json");
const PAGE_SIZE = 1000;
const IN_CHUNK = 50;

type QualificationState = "CERTIFIED" | "INSUFFICIENT" | "NOT_CERTIFIABLE";

type DesignEvidence = {
  exact_scope_source_universe_manifest: boolean;
  versioned_query_universe: boolean;
  per_source_depth_contract: boolean;
  source_inclusion_exclusion_reasons: boolean;
  freshness_contract: boolean;
  duplicate_handling_contract: boolean;
  known_holes_register: boolean;
  source_policy_snapshot: boolean;
  exact_scope_geo_semantics_review: boolean;
  live_discovery_reconciliation: boolean;
  evidence_sufficient_under_versioned_design: boolean;
};

type DiscoveryCandidate = {
  id: string;
  provider: string | null;
  discovery_query: string | null;
  source_domain: string | null;
  source_url: string | null;
  canonical_url: string | null;
  title: string | null;
  snippet: string | null;
  discovered_at: string | null;
  last_seen_at: string | null;
  created_at: string | null;
};

type ShadowListing = {
  seed_id: string;
  city_slug: string;
  neighborhood_slug: string;
  transaction_type: string;
  source_domain: string;
  freshness_status: string;
  surface_m2: number | string | null;
  last_observed_at: string | null;
};

type SeedRow = {
  id: string;
  source_domain: string;
  seed_provider: string | null;
  freshness_status: string | null;
  fresh_channels: string[] | null;
  first_observed_at: string | null;
  last_observed_at: string | null;
  metadata: Record<string, any> | null;
};

type SourcePolicyRow = {
  source_domain: string;
  authorization_status: string | null;
  acquisition_mode: string | null;
  allowed_discovery_channels: string[] | null;
  ingestion_gate: string | null;
  display_gate: string | null;
  review_status: string | null;
  policy_effective_at: string | null;
  policy_expires_at: string | null;
};

export function classifyRepresentativeness(input: DesignEvidence): QualificationState {
  const designComplete = input.exact_scope_source_universe_manifest
    && input.versioned_query_universe
    && input.per_source_depth_contract
    && input.source_inclusion_exclusion_reasons
    && input.freshness_contract
    && input.duplicate_handling_contract
    && input.known_holes_register
    && input.source_policy_snapshot
    && input.exact_scope_geo_semantics_review
    && input.live_discovery_reconciliation;

  if (!designComplete) return "NOT_CERTIFIABLE";
  if (!input.evidence_sufficient_under_versioned_design) return "INSUFFICIENT";
  return "CERTIFIED";
}

export function normalizeScopeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesGuelizRentCandidate(row: Pick<DiscoveryCandidate, "discovery_query" | "title" | "snippet">): boolean {
  const text = normalizeScopeText([row.discovery_query, row.title, row.snippet].filter(Boolean).join(" "));
  if (!text.includes("marrakech") || !text.includes("gueliz")) return false;
  return /(^|\W)(location|louer|rent|rental)(\W|$)/.test(text);
}

export function hasProximityLanguageSignal(value: unknown): boolean {
  const text = normalizeScopeText(value);
  if (!text.includes("gueliz")) return false;
  return /(quelques minutes|\bminutes?\b|\bproche\b|proximite|a seulement|non loin)/.test(text);
}

export function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round(((numerator / denominator) * 100 + Number.EPSILON) * 100) / 100;
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function chunks<T>(values: T[], size = IN_CHUNK): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function increment(map: Map<string, number>, key: unknown): void {
  const normalized = String(key ?? "").trim() || "unknown";
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function countsObject(map: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function readMarrakechDiscoveryCandidates(db: any, snapshotAt: string): Promise<DiscoveryCandidate[]> {
  const rows: DiscoveryCandidate[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await db
      .from("discovery_candidates")
      .select("id,provider,discovery_query,source_domain,source_url,canonical_url,title,snippet,discovered_at,last_seen_at,created_at")
      .lte("created_at", snapshotAt)
      .or("discovery_query.ilike.%Marrakech%,title.ilike.%Marrakech%,snippet.ilike.%Marrakech%")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (response.error) throw new Error(`P1C.4 discovery_candidates read failed: ${response.error.message}`);
    const page = (response.data ?? []) as DiscoveryCandidate[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    if (rows.length > 50000) throw new Error("P1C.4 discovery candidate safety bound exceeded");
  }
}

async function readSourcePolicies(db: any, domains: string[]): Promise<SourcePolicyRow[]> {
  const rows: SourcePolicyRow[] = [];
  for (const batch of chunks(domains)) {
    const response = await db
      .from("source_policy_registry")
      .select("source_domain,authorization_status,acquisition_mode,allowed_discovery_channels,ingestion_gate,display_gate,review_status,policy_effective_at,policy_expires_at")
      .in("source_domain", batch);
    if (response.error) throw new Error(`P1C.4 source_policy_registry read failed: ${response.error.message}`);
    rows.push(...((response.data ?? []) as SourcePolicyRow[]));
  }
  return rows;
}

async function main(): Promise<void> {
  const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8")) as any;
  assert(policy.schema_version === "p1c4-acquisition-representativeness-policy-v1", "P1C.4 policy schema drift");
  assert(policy.scope.city_slug === "marrakech", "P1C.4 city scope drift");
  assert(policy.scope.neighborhood_slug === "gueliz", "P1C.4 neighborhood scope drift");
  assert(policy.scope.transaction_type === "rent", "P1C.4 transaction scope drift");
  assert(policy.scope.metric_name === "surface_m2", "P1C.4 metric scope drift");

  const evaluatedAt = new Date().toISOString();
  const db = getSupabaseServerClient();

  const shadowResponse = await db
    .from("odm_neighborhood_offer_shadow_listing_v1")
    .select("seed_id,city_slug,neighborhood_slug,transaction_type,source_domain,freshness_status,surface_m2,last_observed_at")
    .eq("city_slug", policy.scope.city_slug)
    .eq("neighborhood_slug", policy.scope.neighborhood_slug)
    .eq("transaction_type", policy.scope.transaction_type);
  if (shadowResponse.error) throw new Error(`P1C.4 Shadow read failed: ${shadowResponse.error.message}`);
  const shadowRows = (shadowResponse.data ?? []) as ShadowListing[];
  assert(shadowRows.length > 0, "P1C.4 exact Shadow scope unexpectedly empty");

  const seedIds = [...new Set(shadowRows.map((row) => String(row.seed_id)).filter(Boolean))];
  const seedResponse = await db
    .from("source_offer_seeds")
    .select("id,source_domain,seed_provider,freshness_status,fresh_channels,first_observed_at,last_observed_at,metadata")
    .in("id", seedIds);
  if (seedResponse.error) throw new Error(`P1C.4 source_offer_seeds read failed: ${seedResponse.error.message}`);
  const seedRows = (seedResponse.data ?? []) as SeedRow[];
  assert(seedRows.length === seedIds.length, `P1C.4 seed provenance mismatch ${seedRows.length}/${seedIds.length}`);

  const allMarrakechCandidates = await readMarrakechDiscoveryCandidates(db, evaluatedAt);
  const scopedCandidates = allMarrakechCandidates.filter(matchesGuelizRentCandidate);
  assert(scopedCandidates.length > 0, "P1C.4 independent discovery evidence unexpectedly empty");

  const observedDomainCounts = new Map<string, number>();
  const freshnessCounts = new Map<string, number>();
  for (const row of shadowRows) {
    increment(observedDomainCounts, row.source_domain);
    increment(freshnessCounts, row.freshness_status);
  }
  const observedDomains = [...observedDomainCounts.keys()].filter((domain) => domain !== "unknown");
  const observedDomainSet = new Set(observedDomains);

  const candidateDomainCounts = new Map<string, number>();
  const candidateProviderCounts = new Map<string, number>();
  const candidateUrls = new Set<string>();
  const representedCandidateUrls = new Set<string>();
  let representedCandidateRows = 0;
  for (const row of scopedCandidates) {
    const domain = String(row.source_domain ?? "").trim();
    if (domain) increment(candidateDomainCounts, domain);
    increment(candidateProviderCounts, row.provider);
    const urlKey = String(row.canonical_url ?? row.source_url ?? row.id);
    candidateUrls.add(urlKey);
    if (domain && observedDomainSet.has(domain)) {
      representedCandidateRows += 1;
      representedCandidateUrls.add(urlKey);
    }
  }
  const candidateDomains = [...candidateDomainCounts.keys()];
  const candidateDomainSet = new Set(candidateDomains);

  const policyRows = await readSourcePolicies(db, [...new Set([...candidateDomains, ...observedDomains])]);
  const sourcePolicies = new Map(policyRows.map((row) => [row.source_domain, row]));
  const candidateRegisteredDomains = candidateDomains.filter((domain) => sourcePolicies.has(domain));
  const candidateUnregisteredDomains = candidateDomains.filter((domain) => !sourcePolicies.has(domain));

  const authorizationCounts = new Map<string, number>();
  const reviewStatusCounts = new Map<string, number>();
  for (const domain of candidateRegisteredDomains) {
    const row = sourcePolicies.get(domain);
    increment(authorizationCounts, row?.authorization_status);
    increment(reviewStatusCounts, row?.review_status);
  }

  const seedProviderCounts = new Map<string, number>();
  const freshChannelCounts = new Map<string, number>();
  const bridgeOriginCounts = new Map<string, number>();
  const publicIndexProviderCounts = new Map<string, number>();
  const proximitySignals: Array<{ seed_id: string; source_domain: string; title: string | null }> = [];
  for (const seed of seedRows) {
    increment(seedProviderCounts, seed.seed_provider);
    for (const channel of seed.fresh_channels ?? []) increment(freshChannelCounts, channel);
    const metadata = seed.metadata ?? {};
    increment(bridgeOriginCounts, metadata?.coverage_bridge?.origin_type);
    if (metadata?.public_index_result?.provider) increment(publicIndexProviderCounts, metadata.public_index_result.provider);
    const text = [metadata?.serper_search?.title, metadata?.serper_search?.snippet].filter(Boolean).join(" ");
    if (hasProximityLanguageSignal(text)) {
      proximitySignals.push({
        seed_id: seed.id,
        source_domain: seed.source_domain,
        title: metadata?.serper_search?.title ?? null,
      });
    }
  }

  const missingDesignArtifacts = Object.entries(policy.required_design_artifacts)
    .filter(([, relativePath]) => !existsSync(join(process.cwd(), String(relativePath))))
    .map(([name, relativePath]) => ({ name, path: relativePath }));

  const artifactAvailable = (name: string): boolean => !missingDesignArtifacts.some((artifact) => artifact.name === name);
  const designEvidence: DesignEvidence = {
    exact_scope_source_universe_manifest: artifactAvailable("source_universe_manifest"),
    versioned_query_universe: artifactAvailable("query_universe_manifest"),
    per_source_depth_contract: artifactAvailable("source_depth_contract"),
    source_inclusion_exclusion_reasons: false,
    freshness_contract: false,
    duplicate_handling_contract: false,
    known_holes_register: artifactAvailable("known_holes_register"),
    source_policy_snapshot: policyRows.length > 0,
    exact_scope_geo_semantics_review: false,
    live_discovery_reconciliation: scopedCandidates.length > 0,
    evidence_sufficient_under_versioned_design: false,
  };

  const classification = classifyRepresentativeness(designEvidence);
  const verdict = policy.verdict_codes[classification];
  const sortedUnrepresentedDomains = [...candidateDomainCounts.entries()]
    .filter(([domain]) => !observedDomainSet.has(domain))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const sourceConcentration = Math.max(...observedDomainCounts.values());
  const seedOnlyCount = freshnessCounts.get("seed_only") ?? 0;
  const expiredObservedPolicies = observedDomains.filter((domain) => {
    const expiresAt = sourcePolicies.get(domain)?.policy_expires_at;
    return Boolean(expiresAt && String(expiresAt) <= evaluatedAt);
  });

  const report = {
    schema_version: "p1c4-acquisition-representativeness-report-v1",
    evaluated_at: evaluatedAt,
    verdict,
    classification,
    decision: classification === "CERTIFIED" ? "ALLOW_NEXT_WRITE_LOT" : "FAIL_CLOSED",
    scope: policy.scope,
    observed_shadow: {
      sample_count: shadowRows.length,
      surface_sample_count: shadowRows.filter((row) => Number(row.surface_m2) > 0).length,
      source_domain_count: observedDomains.length,
      source_domain_counts: countsObject(observedDomainCounts),
      source_concentration_percent: percent(sourceConcentration, shadowRows.length),
      freshness_counts: countsObject(freshnessCounts),
      seed_only_count: seedOnlyCount,
      seed_only_percent: percent(seedOnlyCount, shadowRows.length),
      seed_provider_counts: countsObject(seedProviderCounts),
      fresh_channel_counts: countsObject(freshChannelCounts),
      bridge_origin_counts: countsObject(bridgeOriginCounts),
      public_index_provider_counts: countsObject(publicIndexProviderCounts),
      proximity_language_signal_count: proximitySignals.length,
      proximity_language_signals: proximitySignals,
    },
    independent_acquisition_evidence: {
      source: "discovery_candidates",
      note: "Diagnostic acquisition evidence only; it is explicitly not treated as a certified denominator.",
      candidate_rows: scopedCandidates.length,
      unique_candidate_urls: candidateUrls.size,
      duplicate_candidate_rows: Math.max(0, scopedCandidates.length - candidateUrls.size),
      candidate_domain_count: candidateDomains.length,
      candidate_provider_count: candidateProviderCounts.size,
      candidate_provider_counts: countsObject(candidateProviderCounts),
      represented_candidate_rows: representedCandidateRows,
      represented_candidate_rows_percent: percent(representedCandidateRows, scopedCandidates.length),
      represented_candidate_urls: representedCandidateUrls.size,
      represented_candidate_urls_percent: percent(representedCandidateUrls.size, candidateUrls.size),
      represented_candidate_domain_count: candidateDomains.filter((domain) => observedDomainSet.has(domain)).length,
      represented_candidate_domain_percent: percent(candidateDomains.filter((domain) => observedDomainSet.has(domain)).length, candidateDomains.length),
      unrepresented_candidate_domain_count: candidateDomains.filter((domain) => !observedDomainSet.has(domain)).length,
      top_unrepresented_domains: sortedUnrepresentedDomains.slice(0, 20).map(([source_domain, candidate_rows]) => ({ source_domain, candidate_rows })),
      candidate_registered_domain_count: candidateRegisteredDomains.length,
      candidate_unregistered_domain_count: candidateUnregisteredDomains.length,
      candidate_unregistered_domains_sample: candidateUnregisteredDomains.sort().slice(0, 25),
      candidate_authorization_status_counts: countsObject(authorizationCounts),
      candidate_registry_review_status_counts: countsObject(reviewStatusCounts),
    },
    observed_source_policy_snapshot: observedDomains.map((domain) => {
      const row = sourcePolicies.get(domain);
      return {
        source_domain: domain,
        registered: Boolean(row),
        authorization_status: row?.authorization_status ?? null,
        acquisition_mode: row?.acquisition_mode ?? null,
        allowed_discovery_channels: row?.allowed_discovery_channels ?? [],
        ingestion_gate: row?.ingestion_gate ?? null,
        display_gate: row?.display_gate ?? null,
        review_status: row?.review_status ?? null,
        policy_effective_at: row?.policy_effective_at ?? null,
        policy_expires_at: row?.policy_expires_at ?? null,
        expired_at_evaluation: expiredObservedPolicies.includes(domain),
      };
    }),
    bias_register: {
      source_concentration_present: sourceConcentration > 1,
      single_shadow_seed_provider: seedProviderCounts.size === 1,
      single_bridge_origin: [...bridgeOriginCounts.keys()].filter((key) => key !== "unknown").length <= 1,
      seed_only_present: seedOnlyCount > 0,
      discovery_to_shadow_source_gap_present: candidateDomainSet.size > observedDomainSet.size,
      duplicate_pressure_present: scopedCandidates.length > candidateUrls.size,
      unregistered_candidate_sources_present: candidateUnregisteredDomains.length > 0,
      expired_observed_source_policy_present: expiredObservedPolicies.length > 0,
      proximity_language_scope_contamination_signal_present: proximitySignals.length > 0,
      pagination_or_depth_contract_missing: !designEvidence.per_source_depth_contract,
      exact_scope_denominator_manifest_missing: !designEvidence.exact_scope_source_universe_manifest,
    },
    design_evidence: designEvidence,
    missing_design_artifacts: missingDesignArtifacts,
    certification: {
      market_representativeness_certified: classification === "CERTIFIED",
      revocable: true,
      denominator_independent_of_observed_sources: true,
      denominator_certified: false,
      numeric_pass_threshold_applied: false,
    },
    contract: {
      read_only: true,
      db_mutation: false,
      registry_write: false,
      listing_write: false,
      geo_write: false,
      public_activation: false,
      search_change: false,
      ranking_change: false,
      data_policy_change: false,
      national_bulk_activation: false,
    },
    next_boundary: classification === "CERTIFIED"
      ? "P1C.5 Scoped Canary Activation Write"
      : "P1C.4A Acquisition Source Universe & Denominator Design",
  };

  assert(classification === policy.current_expected_outcome.classification, `P1C.4 classification drift: ${classification}`);
  assert(verdict === policy.current_expected_outcome.verdict, `P1C.4 verdict drift: ${verdict}`);
  assert(report.certification.market_representativeness_certified === false, "P1C.4 unexpectedly certified representativeness");
  assert(report.contract.db_mutation === false && report.contract.public_activation === false, "P1C.4 mutation/activation contract drift");
  assert(report.independent_acquisition_evidence.candidate_domain_count > report.observed_shadow.source_domain_count, "P1C.4 expected independent source-universe gap disappeared; re-review required");
  assert(report.missing_design_artifacts.length > 0, "P1C.4 design artifacts now exist; qualification policy must be explicitly re-reviewed");

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
