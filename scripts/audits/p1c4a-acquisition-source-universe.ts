#!/usr/bin/env tsx
// P1C.4A — read-only acquisition source-universe and denominator design audit.
// The frozen baseline is independent from the P1C.3 observed cohort. Challenger discovery may
// invalidate completeness, but it may never silently become the denominator or prove inventory depth.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const DESIGN_PATH = join(process.cwd(), "data/market/p1c4a-acquisition-source-universe.json");
const OUTPUT = join(process.cwd(), "data/audits/runtime/p1c4a-acquisition-source-universe.json");
const PAGE_SIZE = 1000;
const SAFETY_BOUND = 20000;

export type SourceUniverseStatus = "PROVEN" | "DESIGNED_NOT_PROVEN" | "INVALID";

export type SourceUniverseInput = {
  universe_versioned: boolean;
  scope_exact: boolean;
  source_list_frozen_before_numerator: boolean;
  observed_sources_used_to_define_universe: boolean;
  baseline_source_count: number;
  baseline_registry_missing_count: number;
  challenger_outside_baseline_count: number;
  unresolved_registry_scope_count: number;
  per_source_inventory_depth_unproven_count: number;
  per_source_freshness_unproven_count: number;
  exact_scope_identifiability_unproven_count: number;
  channels_unreconciled_count: number;
};

export function classifySourceUniverse(input: SourceUniverseInput): SourceUniverseStatus {
  if (
    !input.universe_versioned
    || !input.scope_exact
    || !input.source_list_frozen_before_numerator
    || input.observed_sources_used_to_define_universe
    || input.baseline_source_count <= 0
    || input.baseline_registry_missing_count > 0
  ) return "INVALID";

  if (
    input.challenger_outside_baseline_count > 0
    || input.unresolved_registry_scope_count > 0
    || input.per_source_inventory_depth_unproven_count > 0
    || input.per_source_freshness_unproven_count > 0
    || input.exact_scope_identifiability_unproven_count > 0
    || input.channels_unreconciled_count > 0
  ) return "DESIGNED_NOT_PROVEN";

  return "PROVEN";
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function hasExactScopeSignal(row: any): boolean {
  const text = normalizeText([
    row.discovery_query,
    row.title,
    row.snippet,
    row.source_url,
  ].join(" "));
  const hasCity = text.includes("marrakech");
  const hasNeighborhood = text.includes("gueliz");
  const hasRent = text.includes("location") || text.includes("a louer") || text.includes("for rent") || text.includes(" rent");
  return hasCity && hasNeighborhood && hasRent;
}

async function readAllRows(db: any, table: string, select: string): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await db.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (response.error) throw new Error(`P1C.4A ${table} read failed: ${response.error.message}`);
    const page = response.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    if (rows.length > SAFETY_BOUND) throw new Error(`P1C.4A ${table} safety bound exceeded`);
  }
}

async function readDiscoveryByQueryPattern(db: any, pattern: string): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await db
      .from("discovery_candidates")
      .select("id,provider,discovery_query,source_domain,source_url,title,snippet,discovered_at,last_seen_at")
      .ilike("discovery_query", pattern)
      .range(from, from + PAGE_SIZE - 1);
    if (response.error) throw new Error(`P1C.4A discovery read failed (${pattern}): ${response.error.message}`);
    const page = response.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    if (rows.length > SAFETY_BOUND) throw new Error(`P1C.4A discovery safety bound exceeded (${pattern})`);
  }
}

export async function runP1C4ASourceUniverseAudit() {
  const design = JSON.parse(readFileSync(DESIGN_PATH, "utf8"));
  assert(design.schema_version === "p1c4a-acquisition-source-universe-v1", "P1C.4A design schema drift");
  assert(design.denominator_design_version, "P1C.4A denominator version missing");
  assert(design.contract.p1c4a_is_read_only === true, "P1C.4A must stay read-only");
  assert(design.contract.source_list_frozen_before_numerator === true, "P1C.4A denominator must precede numerator");
  assert(design.contract.observed_p1c3_sources_used_to_define_universe === false, "P1C.4A circular source universe");
  assert(design.contract.public_index_is_discovery_evidence_not_inventory_depth === true, "P1C.4A SERP-depth guard missing");
  assert(design.contract.robots_or_sitemap_visibility_is_not_authorization === true, "P1C.4A permission guard missing");
  assert(design.contract.source_policy_registry_remains_acquisition_authority === true, "P1C.4A Source Registry authority drift");
  assert(design.contract.unknown_scope_is_not_exclusion === true, "P1C.4A unknown-scope fail-closed guard missing");
  assert(design.contract.no_arbitrary_numeric_market_coverage_threshold === true, "P1C.4A arbitrary threshold guard missing");

  const scope = design.scope;
  assert(
    scope.city_slug === "marrakech"
    && scope.neighborhood_slug === "gueliz"
    && scope.transaction_type === "rent"
    && scope.metric_name === "surface_m2",
    "P1C.4A exact scope drift",
  );

  const baselineDomains = design.baseline_expected_sources.map((row: any) => String(row.source_domain)).sort();
  assert(new Set(baselineDomains).size === baselineDomains.length, "P1C.4A duplicate baseline source");
  assert(baselineDomains.length > 3, "P1C.4A baseline cannot collapse to the three observed P1C.3 sources");

  const db: any = getSupabaseServerClient();
  const registry = await readAllRows(
    db,
    "source_policy_registry",
    "source_domain,source_name,primary_geography,authorization_status,acquisition_mode,allowed_discovery_channels,discovery_policy,detail_fetch_policy,content_reuse_policy,display_policy,robots_status,terms_status,partnership_required,legal_review_required,review_status,machine_gate,ingestion_gate,display_gate,policy_version,reviewed_at,next_review_at,evidence_observed_at,robots_observed_at,terms_observed_at",
  );
  const registryByDomain = new Map(registry.map((row: any) => [String(row.source_domain), row]));
  const baselineRegistryMissing = baselineDomains.filter((domain: string) => !registryByDomain.has(domain));

  const marrakechDiscovery = await readDiscoveryByQueryPattern(db, "%Marrakech%");
  const scopeSignalRows = marrakechDiscovery.filter(hasExactScopeSignal);
  const scopeSignalByDomain = new Map<string, any[]>();
  for (const row of scopeSignalRows) {
    const domain = String(row.source_domain ?? "");
    if (!domain) continue;
    const current = scopeSignalByDomain.get(domain) ?? [];
    current.push(row);
    scopeSignalByDomain.set(domain, current);
  }
  const challengerDomains = [...scopeSignalByDomain.keys()].sort();
  const baselineSet = new Set(baselineDomains);
  const challengerOutsideBaseline = challengerDomains.filter((domain) => !baselineSet.has(domain));
  const challengerOutsideRegistry = challengerDomains.filter((domain) => !registryByDomain.has(domain));

  // A null/unknown registry geography is not an exclusion. It remains unresolved until exact-scope evidence is reviewed.
  const unresolvedRegistryScope = registry
    .filter((row: any) => !baselineSet.has(String(row.source_domain)) && !String(row.primary_geography ?? "").trim())
    .map((row: any) => String(row.source_domain))
    .sort();

  const externalEvidenceByDomain = new Map<string, any[]>();
  for (const evidence of design.recorded_external_scope_evidence ?? []) {
    const domain = String(evidence.source_domain);
    const current = externalEvidenceByDomain.get(domain) ?? [];
    current.push(evidence);
    externalEvidenceByDomain.set(domain, current);
  }

  const baselineSources = baselineDomains.map((domain: string) => {
    const policy = registryByDomain.get(domain) ?? null;
    const challengerRows = scopeSignalByDomain.get(domain) ?? [];
    const externalEvidence = externalEvidenceByDomain.get(domain) ?? [];
    const recordedScopeEvidence = externalEvidence.length > 0;
    const latestChallengerSeenAt = challengerRows
      .map((row: any) => row.last_seen_at)
      .filter(Boolean)
      .sort()
      .slice(-1)[0] ?? null;
    return {
      source_domain: domain,
      independent_inclusion_basis: design.baseline_expected_sources.find((row: any) => row.source_domain === domain)?.independent_inclusion_basis ?? null,
      source_policy_live: policy,
      exact_scope_identifiability: recordedScopeEvidence
        ? "recorded_external_evidence"
        : challengerRows.length > 0
          ? "challenger_signal_only"
          : "unknown",
      recorded_external_scope_evidence: externalEvidence,
      challenger_signal_rows: challengerRows.length,
      challenger_last_seen_at: latestChallengerSeenAt,
      inventory_depth_status: "NOT_PROVEN",
      inventory_freshness_status: "NOT_PROVEN",
      exact_scope_channel_reconciliation_status: "NOT_PROVEN",
      denominator_eligible_now: false,
      known_holes: [
        ...(recordedScopeEvidence ? [] : ["EXACT_SCOPE_SOURCE_LEVEL_EVIDENCE_UNPROVEN"]),
        "SOURCE_INVENTORY_DEPTH_UNPROVEN",
        "SOURCE_INVENTORY_FRESHNESS_UNPROVEN",
        "EXACT_SCOPE_ACQUISITION_CHANNEL_NOT_RECONCILED",
      ],
    };
  });

  const exactScopeIdentifiabilityUnproven = baselineSources.filter((row: any) => row.exact_scope_identifiability !== "recorded_external_evidence").length;
  const classificationInput: SourceUniverseInput = {
    universe_versioned: Boolean(design.denominator_design_version),
    scope_exact: true,
    source_list_frozen_before_numerator: design.contract.source_list_frozen_before_numerator === true,
    observed_sources_used_to_define_universe: design.contract.observed_p1c3_sources_used_to_define_universe === true,
    baseline_source_count: baselineDomains.length,
    baseline_registry_missing_count: baselineRegistryMissing.length,
    challenger_outside_baseline_count: challengerOutsideBaseline.length,
    unresolved_registry_scope_count: unresolvedRegistryScope.length,
    per_source_inventory_depth_unproven_count: baselineSources.filter((row: any) => row.inventory_depth_status !== "PROVEN").length,
    per_source_freshness_unproven_count: baselineSources.filter((row: any) => row.inventory_freshness_status !== "PROVEN").length,
    exact_scope_identifiability_unproven_count: exactScopeIdentifiabilityUnproven,
    channels_unreconciled_count: baselineSources.filter((row: any) => row.exact_scope_channel_reconciliation_status !== "PROVEN").length,
  };
  const status = classifySourceUniverse(classificationInput);
  const verdict = status === "PROVEN"
    ? "P1C4A_DENOMINATOR_PROVEN"
    : status === "DESIGNED_NOT_PROVEN"
      ? "P1C4A_DENOMINATOR_DESIGN_COMPLETE_EVIDENCE_GAPS"
      : "P1C4A_DENOMINATOR_DESIGN_INVALID";

  const result = {
    schema_version: "p1c4a-acquisition-source-universe-audit-v1",
    generated_at: new Date().toISOString(),
    denominator_design_id: design.denominator_design_id,
    denominator_design_version: design.denominator_design_version,
    scope,
    method: design.method,
    baseline: {
      frozen_before_numerator: true,
      independent_from_p1c3_observed_cohort: true,
      source_count: baselineDomains.length,
      source_domains: baselineDomains,
      registry_missing_domains: baselineRegistryMissing,
      sources: baselineSources,
    },
    challenger: {
      role: "completeness_challenge_only_not_denominator",
      discovery_rows_scanned_for_marrakech_query: marrakechDiscovery.length,
      exact_scope_signal_rows: scopeSignalRows.length,
      exact_scope_signal_domain_count: challengerDomains.length,
      exact_scope_signal_domains: challengerDomains,
      domains_outside_frozen_baseline: challengerOutsideBaseline,
      domains_outside_source_policy_registry: challengerOutsideRegistry,
      serp_or_public_index_signal_proves_inventory_depth: false,
    },
    unresolved_registry_scope: {
      rule: "unknown geography is not an exclusion",
      count: unresolvedRegistryScope.length,
      domains: unresolvedRegistryScope,
    },
    denominator: {
      design_versioned: true,
      independent_baseline_defined: baselineRegistryMissing.length === 0,
      exact_scope_contract_defined: true,
      source_universe_proven_complete: status === "PROVEN",
      independent_denominator_defined: status === "PROVEN",
      numerator_evaluation_allowed: status === "PROVEN",
      market_coverage_percentage: null,
      arbitrary_numeric_threshold_used: false,
      revocable: true,
      revocation_rule: design.method.revocation,
    },
    blockers: status === "PROVEN" ? [] : design.current_blockers,
    certification: {
      status,
      classification_input: classificationInput,
      reason: status === "DESIGNED_NOT_PROVEN"
        ? "The denominator contract and independent baseline are versioned, but challenger domains, unresolved registry scope, exact-scope identifiability, inventory-depth/freshness and channel-reconciliation gaps prevent treating the source universe as complete."
        : status === "INVALID"
          ? "The source-universe design violates a structural denominator gate."
          : null,
    },
    verdict,
    contract: {
      read_only: true,
      db_mutation: false,
      source_registry_write: false,
      discovery_write: false,
      listing_write: false,
      geo_write: false,
      source_policy_change: false,
      search_change: false,
      ranking_change: false,
      public_activation: false,
      metric_layers_activated: false,
      p1c5_opened: false,
      new_acquisition_requires_separate_data_lot: true,
    },
    next_boundary: status === "PROVEN"
      ? "Replay P1C.4 Acquisition Representativeness Qualification read-only"
      : design.next_boundary,
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({
    verdict: result.verdict,
    status: result.certification.status,
    baseline_sources: result.baseline.source_count,
    challenger_domains: result.challenger.exact_scope_signal_domain_count,
    challenger_outside_baseline: result.challenger.domains_outside_frozen_baseline.length,
    challenger_outside_registry: result.challenger.domains_outside_source_policy_registry.length,
    unresolved_registry_scope: result.unresolved_registry_scope.count,
    next_boundary: result.next_boundary,
  }, null, 2));
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runP1C4ASourceUniverseAudit().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
