import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { buildAdaptiveQueries, buildInitialHarvestPlan, HARVEST_HARD_CAP, selectRefreshQueries, ADAPTIVE_QUERY_BUDGET } from "./planner";
import { normalizeHarvestResults } from "./core";
import type {
  HarvestObservation,
  HarvestQuery,
  HarvestQueryMetrics,
  HarvestRawResult,
  HarvestRunSummary,
} from "./types";

const RESULTS_PER_QUERY = 10;
const PROVIDER_TIMEOUT_MS = 12_000;
const PERSIST_CHUNK_SIZE = 100;
const READ_PAGE_SIZE = 1000;
const PROVIDER = "serper_mass_harvest";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function queryHash(query: string): string {
  return sha256(`${PROVIDER}:${query.trim().replace(/\s+/g, " ").toLowerCase()}`);
}

function contentFingerprint(title: string | null, snippet: string | null): string {
  return sha256(`${title ?? ""}\n${snippet ?? ""}`);
}

class BudgetLedger {
  private reserved = 0;
  private succeeded = 0;
  private failed = 0;

  constructor(readonly hardCap: number) {
    if (!Number.isInteger(hardCap) || hardCap < 1 || hardCap > HARVEST_HARD_CAP) {
      throw new Error(`invalid Serper harvest hard cap: ${hardCap}`);
    }
  }

  canReserve(): boolean {
    return this.reserved < this.hardCap;
  }

  reserve(): void {
    if (!this.canReserve()) throw new Error("Serper harvest hard cap reached");
    this.reserved += 1;
  }

  markSuccess(): void {
    this.succeeded += 1;
  }

  markFailure(): void {
    this.failed += 1;
  }

  snapshot(): { reserved: number; succeeded: number; failed: number } {
    return { reserved: this.reserved, succeeded: this.succeeded, failed: this.failed };
  }
}

class ProviderFatalError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function fetchProviderResults(input: {
  endpoint: string;
  apiKey: string;
  query: string;
}): Promise<HarvestRawResult[]> {
  const endpointUrl = new URL(input.endpoint);
  const isNativeSerper = endpointUrl.hostname === "google.serper.dev";
  const response = isNativeSerper
    ? await fetch(input.endpoint, {
        method: "POST",
        headers: {
          "X-API-KEY": input.apiKey,
          "Content-Type": "application/json",
          "User-Agent": "AkarFinder Serper Mass Harvest",
        },
        body: JSON.stringify({ q: input.query, num: RESULTS_PER_QUERY, gl: "ma", hl: "fr" }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      })
    : await fetch(`${input.endpoint}?q=${encodeURIComponent(input.query)}&num=${RESULTS_PER_QUERY}`, {
        method: "GET",
        headers: {
          "X-API-KEY": input.apiKey,
          "User-Agent": "AkarFinder Serper Mass Harvest",
        },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });

  if ([401, 402, 403, 429].includes(response.status)) {
    throw new ProviderFatalError(`Serper provider stopped with HTTP ${response.status}`, response.status);
  }
  if (!response.ok) throw new Error(`Serper provider HTTP ${response.status}`);

  const data = (await response.json()) as { organic?: HarvestRawResult[]; results?: HarvestRawResult[] };
  return (data.organic ?? data.results ?? []).slice(0, RESULTS_PER_QUERY);
}

async function readCanonicalUrlSet(table: "discovery_candidates" | "source_offer_seeds"): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const output = new Set<string>();
  let from = 0;

  while (true) {
    const response = await supabase
      .from(table)
      .select("canonical_url")
      .not("canonical_url", "is", null)
      .range(from, from + READ_PAGE_SIZE - 1);
    if (response.error) throw new Error(`${table} preload failed: ${response.error.message}`);
    const rows = (response.data ?? []) as Array<{ canonical_url: string | null }>;
    for (const row of rows) if (row.canonical_url) output.add(row.canonical_url);
    if (rows.length < READ_PAGE_SIZE) break;
    from += READ_PAGE_SIZE;
  }
  return output;
}

async function readExistingSerperFirstSeen(): Promise<Map<string, string>> {
  const supabase = getSupabaseServerClient();
  const output = new Map<string, string>();
  let from = 0;

  while (true) {
    const response = await supabase
      .from("discovery_candidates")
      .select("query_hash,canonical_url,discovered_at")
      .eq("provider", PROVIDER)
      .range(from, from + READ_PAGE_SIZE - 1);
    if (response.error) throw new Error(`Serper first-seen preload failed: ${response.error.message}`);
    const rows = (response.data ?? []) as Array<{
      query_hash: string;
      canonical_url: string | null;
      discovered_at: string;
    }>;
    for (const row of rows) {
      if (row.canonical_url) output.set(`${row.query_hash}|${row.canonical_url}`, row.discovered_at);
    }
    if (rows.length < READ_PAGE_SIZE) break;
    from += READ_PAGE_SIZE;
  }
  return output;
}

function chunk<T>(values: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < values.length; i += size) output.push(values.slice(i, i + size));
  return output;
}

async function persistObservations(input: {
  runId: string;
  observations: HarvestObservation[];
  existingFirstSeen: ReadonlyMap<string, string>;
}): Promise<number> {
  if (input.observations.length === 0) return 0;
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const rows = input.observations.map((observation) => {
    const hash = queryHash(observation.query.query);
    const firstSeenKey = `${hash}|${observation.canonical_url}`;
    return {
      provider: PROVIDER,
      discovery_query: observation.query.query,
      query_hash: hash,
      result_rank: observation.result_rank,
      source_domain: observation.source_domain,
      source_url: observation.source_url,
      canonical_url: observation.canonical_url,
      title: observation.title,
      snippet: observation.snippet,
      discovered_at: input.existingFirstSeen.get(firstSeenKey) ?? now,
      last_seen_at: now,
      discovery_status: observation.discovery_status,
      content_fingerprint: contentFingerprint(observation.title, observation.snippet),
      metadata: {
        ingestion_run_id: input.runId,
        harvest_phase: observation.query.phase,
        harvest_source_id: observation.query.source_id,
        harvest_query_id: observation.query.id,
        parent_query_id: observation.query.parent_query_id ?? null,
        eligibility_reasons: observation.eligibility_reasons,
        no_direct_property_listing_write: true,
      },
    };
  });

  let persisted = 0;
  for (const batch of chunk(rows, PERSIST_CHUNK_SIZE)) {
    const response = await supabase
      .from("discovery_candidates")
      .upsert(batch, { onConflict: "provider,query_hash,canonical_url" });
    if (response.error) throw new Error(`Serper discovery_candidates upsert failed: ${response.error.message}`);
    persisted += batch.length;
  }
  return persisted;
}

function buildMetrics(input: {
  query: HarvestQuery;
  rawResults: HarvestRawResult[];
  observations: HarvestObservation[];
  knownBeforeRun: ReadonlySet<string>;
  seenThisRun: Set<string>;
}): HarvestQueryMetrics {
  let newUnique = 0;
  let duplicate = Math.max(0, input.rawResults.length - input.observations.length);
  let categoryOrNoise = 0;
  let detailCandidates = 0;

  for (const observation of input.observations) {
    const known = input.knownBeforeRun.has(observation.canonical_url) || input.seenThisRun.has(observation.canonical_url);
    if (known) duplicate += 1;
    else newUnique += 1;
    input.seenThisRun.add(observation.canonical_url);

    if (
      observation.discovery_status === "accepted" ||
      observation.eligibility_reasons.includes("individual_like_url_unreviewed_source")
    ) {
      detailCandidates += 1;
    }
    if (
      observation.discovery_status === "rejected" ||
      observation.eligibility_reasons.includes("insufficient_individual_listing_evidence")
    ) {
      categoryOrNoise += 1;
    }
  }

  const accepted = input.observations.filter((item) => item.discovery_status === "accepted").length;
  const rejected = input.observations.filter((item) => item.discovery_status === "rejected").length;
  const unclassified = input.observations.length - accepted - rejected;

  return {
    query: input.query,
    raw_results: input.rawResults.length,
    unique_results: input.observations.length,
    detail_candidates: detailCandidates,
    accepted_results: accepted,
    rejected_results: rejected,
    unclassified_results: unclassified,
    duplicate_results: duplicate,
    category_or_noise_results: categoryOrNoise,
    new_unique_results: newUnique,
    yield_ratio: input.rawResults.length > 0 ? accepted / input.rawResults.length : 0,
  };
}

export type RunSerperMassHarvestInput = {
  mode: "plan" | "run" | "apply";
  endpoint?: string;
  apiKey?: string;
  maxCalls?: number;
  runId?: string;
};

export async function runSerperMassHarvest(input: RunSerperMassHarvestInput): Promise<HarvestRunSummary> {
  const runId = input.runId ?? `serper-mass-harvest-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const hardCap = Math.min(input.maxCalls ?? HARVEST_HARD_CAP, HARVEST_HARD_CAP);
  const ledger = new BudgetLedger(hardCap);
  const plan = buildInitialHarvestPlan();

  if (input.mode === "plan") {
    return {
      run_id: runId,
      mode: "plan",
      hard_cap: hardCap,
      calls_reserved: 0,
      calls_succeeded: 0,
      calls_failed: 0,
      raw_results: 0,
      observations: 0,
      persisted: 0,
      unique_canonical_urls: 0,
      accepted: 0,
      rejected: 0,
      unclassified: 0,
      fixed_queries: plan.fixed.length,
      adaptive_queries: ADAPTIVE_QUERY_BUDGET,
      discovery_queries: plan.discovery.length,
      refresh_queries: 150,
      query_metrics: [],
    };
  }

  if (process.env.SERPER_MASS_HARVEST_ENABLED !== "true") {
    throw new Error("SERPER_MASS_HARVEST_ENABLED must be exactly 'true' for run/apply mode");
  }
  const endpoint = input.endpoint ?? process.env.SERPER_MASS_HARVEST_ENDPOINT ?? process.env.SEARCH_API_ENDPOINT ?? "https://google.serper.dev/search";
  const apiKey = input.apiKey ?? process.env.SERPER_MASS_HARVEST_API_KEY ?? process.env.SEARCH_API_KEY;
  if (!apiKey) throw new Error("Missing SERPER_MASS_HARVEST_API_KEY or SEARCH_API_KEY");

  const knownUrls = new Set<string>([
    ...(await readCanonicalUrlSet("discovery_candidates")),
    ...(await readCanonicalUrlSet("source_offer_seeds")),
  ]);
  const firstSeen = input.mode === "apply" ? await readExistingSerperFirstSeen() : new Map<string, string>();
  const seenThisRun = new Set<string>();
  const queryMetrics: HarvestQueryMetrics[] = [];
  const allObservations: HarvestObservation[] = [];
  const executedQueryTexts = new Set<string>();

  const executeQuery = async (query: HarvestQuery): Promise<boolean> => {
    if (!ledger.canReserve()) return false;
    if (executedQueryTexts.has(query.query) && query.phase !== "refresh") return true;
    ledger.reserve();
    try {
      const rawResults = await fetchProviderResults({ endpoint, apiKey, query: query.query });
      ledger.markSuccess();
      const observations = normalizeHarvestResults(query, rawResults);
      const metrics = buildMetrics({ query, rawResults, observations, knownBeforeRun: knownUrls, seenThisRun });
      queryMetrics.push(metrics);
      allObservations.push(...observations);
      executedQueryTexts.add(query.query);
      return true;
    } catch (error) {
      ledger.markFailure();
      if (error instanceof ProviderFatalError) throw error;
      console.error(`[serper-mass-harvest] query failed: ${query.id}`, error);
      executedQueryTexts.add(query.query);
      return true;
    }
  };

  for (const query of plan.fixed) {
    if (!(await executeQuery(query))) break;
  }

  if (ledger.canReserve()) {
    const adaptivePlanned = new Set(executedQueryTexts);
    const rankedFixed = [...queryMetrics]
      .filter((metric) => metric.query.phase === "fixed")
      .sort((a, b) => {
        if (b.accepted_results !== a.accepted_results) return b.accepted_results - a.accepted_results;
        return b.new_unique_results - a.new_unique_results;
      });
    const adaptiveQueue: HarvestQuery[] = [];
    for (const metric of rankedFixed) {
      for (const query of buildAdaptiveQueries(metric, adaptivePlanned)) {
        if (adaptiveQueue.length >= ADAPTIVE_QUERY_BUDGET) break;
        adaptiveQueue.push(query);
        adaptivePlanned.add(query.query);
      }
      if (adaptiveQueue.length >= ADAPTIVE_QUERY_BUDGET) break;
    }
    for (const query of adaptiveQueue) {
      if (!(await executeQuery(query))) break;
    }
  }

  if (ledger.canReserve()) {
    for (const query of plan.discovery) {
      if (!(await executeQuery(query))) break;
    }
  }

  if (ledger.canReserve()) {
    const refresh = selectRefreshQueries(queryMetrics);
    for (const query of refresh) {
      if (!(await executeQuery(query))) break;
    }
  }

  const persisted = input.mode === "apply"
    ? await persistObservations({ runId, observations: allObservations, existingFirstSeen: firstSeen })
    : 0;
  const budget = ledger.snapshot();
  const accepted = allObservations.filter((item) => item.discovery_status === "accepted").length;
  const rejected = allObservations.filter((item) => item.discovery_status === "rejected").length;
  const unclassified = allObservations.length - accepted - rejected;

  return {
    run_id: runId,
    mode: input.mode,
    hard_cap: hardCap,
    calls_reserved: budget.reserved,
    calls_succeeded: budget.succeeded,
    calls_failed: budget.failed,
    raw_results: queryMetrics.reduce((sum, metric) => sum + metric.raw_results, 0),
    observations: allObservations.length,
    persisted,
    unique_canonical_urls: new Set(allObservations.map((item) => item.canonical_url)).size,
    accepted,
    rejected,
    unclassified,
    fixed_queries: queryMetrics.filter((metric) => metric.query.phase === "fixed").length,
    adaptive_queries: queryMetrics.filter((metric) => metric.query.phase === "adaptive").length,
    discovery_queries: queryMetrics.filter((metric) => metric.query.phase === "discovery").length,
    refresh_queries: queryMetrics.filter((metric) => metric.query.phase === "refresh").length,
    query_metrics: queryMetrics,
  };
}
