// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — sections 20-25.
// Orchestrates one ingestion cycle: pick a batch from the query universe via
// the rotation planner, execute each query against up to 2 active (non-
// suspended) engines, run every raw result through national-admission, then
// (if write=true) persist via national-writer. Produces the full per-run
// metrics shape section 25 requires. No direct fetch of any listing page —
// only OpenSERP SERP results are ever read.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { runOpenSerpLiveQuery } from "./openserp-live";
import { selectNextBatch, markQueryExecuted, type RotationQuery } from "./query-rotation-planner";
import { decideAdmission, type AdmissionDecision } from "./national-admission";
import { writeNationalIngestionRun } from "./national-writer";
import { activeEngines, defaultBudgetState, applyRunOutcome, type BudgetState } from "./budget-policy";
import type { OpenSerpIngestionQuery } from "./types";

type UniverseQueryRecord = RotationQuery & {
  normalized_query: string;
  transaction: "sale" | "rent";
  property_type: string;
  language: "fr" | "ar";
  preferred_engine: "bing" | "duckduckgo" | "ecosia";
  query_text: string;
  target_domain: string | null;
  query_family: "general" | "brand_hint";
};

type UniverseFile = { queries: UniverseQueryRecord[] };

export type RunMetrics = {
  run_id: string;
  scheduled_at: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  query_count: number;
  query_success_count: number;
  query_failure_count: number;
  engines_used: string[];
  raw_results: number;
  canonical_unique_urls: number;
  accepted_candidates: number;
  rejected_candidates: number;
  unclassified_candidates: number;
  existing_source_offers: number;
  new_property_listings: number;
  new_listing_sources: number;
  new_clusters: number;
  new_memberships: number;
  observations_created: 0;
  pii_removed: number;
  invalid_urls: number;
  category_pages_rejected: number;
  duplicate_urls: number;
  write_conflicts: number;
  captcha_count: number;
  status_403_429: number;
  timeout_count: number;
  cities_covered: number;
  price_presence_rate: number;
  surface_presence_rate: number;
  write_mode: boolean;
};

function loadUniverse(path: string): UniverseFile {
  return JSON.parse(readFileSync(path, "utf8")) as UniverseFile;
}

function saveUniverse(path: string, universe: UniverseFile): void {
  const byTier: Record<number, number> = {};
  const byLanguage: Record<string, number> = {};
  for (const q of universe.queries) {
    byTier[q.priority_tier] = (byTier[q.priority_tier] ?? 0) + 1;
    byLanguage[q.language] = (byLanguage[q.language] ?? 0) + 1;
  }
  writeFileSync(
    path,
    JSON.stringify(
      {
        universe_version: "openserp-query-universe-v1",
        generated_at: new Date().toISOString(),
        total_queries: universe.queries.length,
        by_priority_tier: byTier,
        by_language: byLanguage,
        cities_covered: [...new Set(universe.queries.map((q) => q.city))].length,
        districts_covered: [...new Set(universe.queries.filter((q) => q.district).map((q) => `${q.city}::${q.district}`))].length,
        queries: universe.queries,
      },
      null,
      2,
    ),
    "utf8",
  );
}

function categorizeError(error: unknown): "captcha" | "rate_limit" | "timeout" | "other" {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("captcha")) return "captcha";
  if (message.includes("429") || message.includes("rate limit") || message.includes("quota")) return "rate_limit";
  if (message.includes("timeout") || message.includes("etimedout")) return "timeout";
  return "other";
}

export async function runIngestionCycle(input: {
  runId: string;
  scheduledAtIso: string;
  universePath?: string;
  budgetStatePath?: string;
  write: boolean;
  env?: NodeJS.ProcessEnv;
  // Bootstrap waves (section 22: 25/100/300) need an explicit batch size
  // independent of the cron's adaptive engine-budget-state.json --
  // WITHOUT this override, a wave silently ran at whatever the 30-minute
  // cron's current_budget happened to be (e.g. 4, after a captcha-driven
  // backoff), not the planned wave size. Found and fixed during this
  // mission's own live Wave 1 apply (4/25 queries executed) -- see
  // docs/OPENSERP_AUTOMATED_INGESTION_ARCHITECTURE.md.
  batchSizeOverride?: number;
  rawResultsDir?: string;
}): Promise<{ metrics: RunMetrics; decisions: AdmissionDecision[]; budgetState: BudgetState }> {
  const universePath = input.universePath ?? join(process.cwd(), "data/openserp/query-universe-v1.json");
  const budgetStatePath = input.budgetStatePath ?? join(process.cwd(), "data/openserp/engine-budget-state.json");

  const startedAt = new Date().toISOString();
  const universe = loadUniverse(universePath);
  const budgetState: BudgetState = existsSync(budgetStatePath)
    ? (JSON.parse(readFileSync(budgetStatePath, "utf8")) as BudgetState)
    : defaultBudgetState();

  const engines = activeEngines(budgetState, startedAt);
  const budget = input.batchSizeOverride ?? budgetState.current_budget;
  const batch = selectNextBatch(universe.queries, budget, startedAt);
  const rawResultsLog: unknown[] = [];

  const decisions: AdmissionDecision[] = [];
  const enginesUsed = new Set<string>();
  let querySuccessCount = 0;
  let queryFailureCount = 0;
  let rawResultsCount = 0;
  let captchaCount = 0;
  let status403429 = 0;
  let timeoutCount = 0;
  const enginesWithIncident = new Set<"bing" | "duckduckgo" | "ecosia">();
  const canonicalUrlsSeen = new Set<string>();

  const updatedByQueryId = new Map<string, UniverseQueryRecord>();

  for (const universeQuery of batch) {
    const attemptEngines = [universeQuery.preferred_engine, ...engines.filter((e) => e !== universeQuery.preferred_engine)].filter(
      (engine) => engines.includes(engine),
    ).slice(0, 2);

    let succeeded = false;
    let acceptedForThisQuery = 0;

    for (const engine of attemptEngines) {
      try {
        const execution = await runOpenSerpLiveQuery({
          engine,
          query: universeQuery.query_text,
          limit: 15,
          site: universeQuery.target_domain ?? undefined,
          env: input.env,
        });
        enginesUsed.add(engine);
        querySuccessCount += 1;
        succeeded = true;
        rawResultsCount += execution.response.results.length;

        const query: OpenSerpIngestionQuery = {
          query_id: universeQuery.query_id,
          city: universeQuery.city,
          district: universeQuery.district ?? "",
          transaction_type: universeQuery.transaction,
          property_type: universeQuery.property_type,
          query_text: universeQuery.query_text,
          priority: universeQuery.priority_tier <= 1 ? "high" : universeQuery.priority_tier === 2 ? "medium" : "low",
          target_domain: universeQuery.target_domain ?? undefined,
          query_family: universeQuery.query_family,
        };

        for (let i = 0; i < execution.response.results.length; i += 1) {
          const raw = execution.response.results[i];
          const decision = decideAdmission({
            result: raw,
            query,
            engine,
            discovered_at: execution.response.fetched_at,
            fallbackRank: i + 1,
          });
          decisions.push(decision);
          if (decision.classified) {
            canonicalUrlsSeen.add(decision.classified.canonical_source_url);
          }
          if (decision.admitted) acceptedForThisQuery += 1;
          // Persisted for debuggability (never used for admission itself) --
          // this mission found a discrepancy between a title's clear
          // content-derived transaction intent and the value ultimately
          // written, and had no raw log to root-cause it from. Never
          // written to any DB table, only to a local run-report file.
          rawResultsLog.push({
            query_id: universeQuery.query_id,
            query_text: universeQuery.query_text,
            query_transaction: universeQuery.transaction,
            engine,
            raw_title: raw.title ?? null,
            raw_url: raw.url ?? raw.link ?? null,
            admitted: decision.admitted,
            extracted_transaction_type: decision.classified?.extracted.transaction_type ?? null,
          });
        }

        if (execution.response.results.length > 0) break; // got usable results, stop attempting more engines
      } catch (error) {
        queryFailureCount += 1;
        const category = categorizeError(error);
        if (category === "captcha") {
          captchaCount += 1;
          enginesWithIncident.add(engine);
        } else if (category === "rate_limit") {
          status403429 += 1;
          enginesWithIncident.add(engine);
        } else if (category === "timeout") {
          timeoutCount += 1;
        }
      }
    }

    updatedByQueryId.set(
      universeQuery.query_id,
      markQueryExecuted(universeQuery, { executedAtIso: startedAt, succeeded, acceptedCount: acceptedForThisQuery }),
    );
  }

  // Write back rotation state for every query (executed ones updated, others untouched).
  universe.queries = universe.queries.map((q) => updatedByQueryId.get(q.query_id) ?? q);
  saveUniverse(universePath, universe);

  if (input.rawResultsDir) {
    mkdirSync(input.rawResultsDir, { recursive: true });
    writeFileSync(join(input.rawResultsDir, `${input.runId}-raw-results.json`), JSON.stringify(rawResultsLog, null, 2), "utf8");
  }

  let writeResult: Awaited<ReturnType<typeof writeNationalIngestionRun>> | null = null;
  if (input.write) {
    writeResult = await writeNationalIngestionRun({ runId: input.runId, decisions });
  }

  const acceptedCandidates = decisions.filter((d) => d.admitted).length;
  const rejectedCandidates = decisions.filter((d) => !d.admitted && d.classified?.classification_lane === "reject_out_of_scope").length;
  const unclassifiedCandidates = decisions.length - acceptedCandidates - rejectedCandidates;
  const piiRemoved = decisions.filter((d) => d.reasons.includes("pii_or_secret_detected")).length;
  const invalidUrls = decisions.filter((d) => d.classified === null || d.reasons.includes("unsafe_external_url")).length;
  const categoryPagesRejected = decisions.filter(
    (d) => d.reasons.includes("looks_like_non_listing_page") || d.classified?.classification_lane === "discovery_page",
  ).length;

  const admittedWithPrice = decisions.filter((d) => d.admitted && d.classified?.extracted.price_mad != null).length;
  const admittedWithSurface = decisions.filter((d) => d.admitted && d.classified?.extracted.surface_m2 != null).length;

  const finishedAt = new Date().toISOString();
  const errorRate = querySuccessCount + queryFailureCount > 0 ? queryFailureCount / (querySuccessCount + queryFailureCount) : 0;

  const nextBudgetState = applyRunOutcome(
    budgetState,
    {
      captcha_count: captchaCount,
      status_403_429: status403429,
      timeout_count: timeoutCount,
      error_rate: errorRate,
      quality_drift: false, // set by the caller after a sampled quality gate, if desired
      engines_with_captcha_or_ratelimit: [...enginesWithIncident],
    },
    finishedAt,
  );
  writeFileSync(budgetStatePath, JSON.stringify(nextBudgetState, null, 2), "utf8");

  const metrics: RunMetrics = {
    run_id: input.runId,
    scheduled_at: input.scheduledAtIso,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    query_count: batch.length,
    query_success_count: querySuccessCount,
    query_failure_count: queryFailureCount,
    engines_used: [...enginesUsed],
    raw_results: rawResultsCount,
    canonical_unique_urls: canonicalUrlsSeen.size,
    accepted_candidates: acceptedCandidates,
    rejected_candidates: rejectedCandidates,
    unclassified_candidates: unclassifiedCandidates,
    existing_source_offers: writeResult ? writeResult.updated_listing_sources : 0,
    new_property_listings: writeResult ? writeResult.new_property_listings : 0,
    new_listing_sources: writeResult ? writeResult.new_listing_sources : 0,
    new_clusters: writeResult ? writeResult.new_clusters : 0,
    new_memberships: writeResult ? writeResult.new_memberships : 0,
    observations_created: 0,
    pii_removed: piiRemoved,
    invalid_urls: invalidUrls,
    category_pages_rejected: categoryPagesRejected,
    duplicate_urls: decisions.length - canonicalUrlsSeen.size > 0 ? decisions.length - canonicalUrlsSeen.size : 0,
    write_conflicts: writeResult ? writeResult.write_errors.length : 0,
    captcha_count: captchaCount,
    status_403_429: status403429,
    timeout_count: timeoutCount,
    cities_covered: [...new Set(batch.map((q) => q.city))].length,
    price_presence_rate: acceptedCandidates > 0 ? Math.round((admittedWithPrice / acceptedCandidates) * 1000) / 1000 : 0,
    surface_presence_rate: acceptedCandidates > 0 ? Math.round((admittedWithSurface / acceptedCandidates) * 1000) / 1000 : 0,
    write_mode: input.write,
  };

  return { metrics, decisions, budgetState: nextBudgetState };
}
