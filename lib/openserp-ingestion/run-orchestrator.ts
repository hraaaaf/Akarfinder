// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — sections 20-25.
// OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 — sections 6-10.
// OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — Phases 3-6.
// Orchestrates one ingestion cycle: pick a batch from the query universe via
// the rotation planner, execute each query against up to 2 active (non-
// suspended) engines, run every raw result through national-admission, then
// (if write=true) persist via national-writer. Produces the full per-run
// metrics shape section 25 requires. No direct fetch of any listing page —
// only OpenSERP SERP results are ever read.
//
// query-universe-v1.json is read-only here (immutable_bundle_read) -- it is
// NEVER written back to. The mutable rotation state (which queries have run,
// when, with what yield) and the engine budget/backoff state both live in
// PostgreSQL (lib/openserp-ingestion/state/*), not on the local filesystem.
// A prior version of this file rewrote both back into local JSON files via
// writeFileSync, which works when run through a local CLI script (writable
// cwd) but crashes with EROFS the moment it runs inside a Vercel serverless
// function (read-only /var/task bundle) -- see
// docs/OPENSERP_SERVERLESS_FILESYSTEM_AUDIT.md for the full trace of how
// this was found and confirmed to have written zero DB rows before crashing.
//
// A second incident (OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1; see
// data/audits/openserp-serverless-state-real-run-attempt-result.json) found
// that even after the EROFS fix, a real batch of real engine calls could
// still run past Vercel's own platform-level FUNCTION_INVOCATION_TIMEOUT,
// which kills the function with no chance to run any persistence code at
// all. This file now: (a) tracks an internal time budget well inside the
// route's maxDuration and stops issuing new work once it's exhausted, (b)
// gives every engine call its own bounded, budget-aware timeout, (c) caps
// how many queries a single serverless invocation may even attempt, and
// (d) persists each query's rotation-state update immediately after that
// query finishes (a "checkpoint"), rather than batching all persistence
// until after the entire loop -- so a run that stops early (voluntarily on
// budget, or is killed outright) never loses already-completed work.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { runOpenSerpLiveQuery, EngineCallError, DEFAULT_ENGINE_CALL_TIMEOUT_MS } from "./openserp-live";
import {
  classifyEngineErrorDetail,
  sanitizeEngineErrorMessage,
  logEngineCallAttempt,
  type EngineErrorCategory,
} from "./engine-error-diagnostics";
import { selectNextBatch, markQueryExecuted, type RotationQuery } from "./query-rotation-planner";
import { decideAdmission, type AdmissionDecision } from "./national-admission";
import { writeNationalIngestionRun } from "./national-writer";
import { activeEngines, applyRunOutcome, MAX_SERVERLESS_BATCH_SIZE, type BudgetState } from "./budget-policy";
import {
  hydrateRotationQueries,
  persistRotationUpdates,
  loadBudgetState,
  persistBudgetState,
  type StaticQueryDefinition,
} from "./state/serverless-state-service";
import type { OpenSerpEngineName } from "./state/query-rotation-state-repository";
import { DbCallTimeoutError, TimeBudgetExhaustedBeforeDbCallError } from "./state/db-call-guard";
import type { OpenSerpIngestionQuery } from "./types";
import { createTimeBudget, remainingBudgetMs, elapsedMs, snapshotTimeBudget, DEFAULT_SAFETY_MARGIN_MS } from "./time-budget";

type UniverseQueryRecord = StaticQueryDefinition & {
  normalized_query: string;
  // The JSON file may still carry these four fields from before this
  // migration (or from the build-time generator) -- they are read here only
  // as historical/documentary values on the static record and are NEVER
  // used for rotation decisions. hydrateRotationQueries() always overwrites
  // them with the current PostgreSQL-backed values.
  last_executed_at?: string | null;
  next_eligible_at?: string | null;
  failure_count?: number;
  discovery_yield?: number;
};

type UniverseFile = { universe_version: string; queries: UniverseQueryRecord[] };

// Matches route.ts's `export const maxDuration = 120;`. Kept as an
// explicit, named, overridable default (routeMaxDurationMs input) rather
// than importing from the route module (route.ts is a Next.js route file,
// not meant to be imported by library code) -- the two are proven in sync
// by scripts/scrapers/__tests__/openserp-time-budget-route-sync.test.ts.
export const DEFAULT_ROUTE_MAX_DURATION_MS = 120_000;

// Below this much remaining budget, don't even attempt one more engine
// call -- a call that starts with almost no time left has no realistic
// chance to finish inside the deadline anyway, and would just push the
// invocation closer to the platform's own hard kill instead of stopping
// cleanly on our own terms.
const MIN_VIABLE_CALL_BUDGET_MS = 3_000;

export type RunOutcomeStatus = "completed" | "partial" | "time_budget_exhausted";

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
  // OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 additions:
  outcome_status: RunOutcomeStatus;
  planned_unit_count: number;
  executed_unit_count: number;
  state_persisted: boolean;
  time_budget: ReturnType<typeof snapshotTimeBudget>;
  // OPENSERP-ENGINE-FAILURE-OBSERVABILITY-1: purely additive diagnostic
  // breakdown of every failed engine-call attempt this run made, at a
  // finer grain than captcha_count/status_403_429/timeout_count above
  // (which are unchanged and still drive the adaptive budget/suspension
  // strategy in budget-policy.ts). This field feeds no strategy decision --
  // it exists only so a run's "other"-bucket failures are explainable
  // without re-running with extra instrumentation after the fact.
  engine_error_category_breakdown: Partial<Record<EngineErrorCategory, number>>;
};

function loadUniverse(path: string): UniverseFile {
  return JSON.parse(readFileSync(path, "utf8")) as UniverseFile;
}

function categorizeError(error: unknown): "captcha" | "rate_limit" | "timeout" | "other" {
  if (error instanceof EngineCallError && error.outcome === "engine_timeout") return "timeout";
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
  write: boolean;
  env?: NodeJS.ProcessEnv;
  // Bootstrap waves (section 22: 25/100/300) need an explicit batch size
  // independent of the cron's adaptive engine budget state -- WITHOUT this
  // override, a wave silently ran at whatever the 30-minute cron's
  // current_budget happened to be (e.g. 4, after a captcha-driven backoff),
  // not the planned wave size. Found and fixed during this mission's own
  // live Wave 1 apply (4/25 queries executed) -- see
  // docs/OPENSERP_AUTOMATED_INGESTION_ARCHITECTURE.md. When set, this ALSO
  // bypasses MAX_SERVERLESS_BATCH_SIZE (the cap only applies to the
  // serverless/cron path, which never sets this override).
  batchSizeOverride?: number;
  rawResultsDir?: string;
  // OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 additions:
  routeMaxDurationMs?: number;
  safetyMarginMs?: number;
  now?: () => number;
  engineCallTimeoutMs?: number;
}): Promise<{ metrics: RunMetrics; decisions: AdmissionDecision[]; budgetState: BudgetState }> {
  // universePath stays a read-only override (used by tests/fixtures only,
  // per OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 section 12) -- it is never
  // written back to. There is no local budget-state file path anymore: engine budget
  // state is always PostgreSQL-backed, for both the serverless route and
  // any local CLI script running with write=true, so the two never diverge.
  const universePath = input.universePath ?? join(process.cwd(), "data/openserp/query-universe-v1.json");
  const now = input.now ?? Date.now;
  const timeBudget = createTimeBudget({
    routeMaxDurationMs: input.routeMaxDurationMs ?? DEFAULT_ROUTE_MAX_DURATION_MS,
    safetyMarginMs: input.safetyMarginMs ?? DEFAULT_SAFETY_MARGIN_MS,
    now,
  });
  const engineCallTimeoutMs = input.engineCallTimeoutMs ?? DEFAULT_ENGINE_CALL_TIMEOUT_MS;

  const startedAt = new Date(now()).toISOString();
  const universe = loadUniverse(universePath);
  const dbCtx = { timeBudget, now };
  const hydratedQueries = await hydrateRotationQueries(universe.queries, universe.universe_version, dbCtx);
  const budgetState: BudgetState = await loadBudgetState(dbCtx);

  const engines = activeEngines(budgetState, startedAt);
  const requestedBudget = input.batchSizeOverride ?? Math.min(budgetState.current_budget, MAX_SERVERLESS_BATCH_SIZE);
  const plannedBatch = selectNextBatch(hydratedQueries, requestedBudget, startedAt);
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
  const engineErrorCategoryBreakdown: Partial<Record<EngineErrorCategory, number>> = {};

  let outcomeStatus: RunOutcomeStatus = "completed";
  let executedCount = 0;

  for (const universeQuery of plannedBatch) {
    // Single unified threshold for "can we responsibly even start the next
    // unit of work": MIN_VIABLE_CALL_BUDGET_MS, not just isTimeBudgetExhausted
    // (which only trips at exactly zero remaining). Checking only the
    // looser isTimeBudgetExhausted here would let the loop "burn through"
    // every remaining planned query doing zero real engine calls each
    // (since the per-engine-attempt check below would refuse all of them
    // too, without time ever advancing) and still report "completed" --
    // this check makes the run stop and honestly report
    // time_budget_exhausted the moment it can no longer afford one more
    // real unit of work, rather than silently no-op through the rest of
    // the batch.
    if (remainingBudgetMs(timeBudget, now) < MIN_VIABLE_CALL_BUDGET_MS) {
      outcomeStatus = "time_budget_exhausted";
      break;
    }

    const attemptEngines = [universeQuery.preferred_engine, ...engines.filter((e) => e !== universeQuery.preferred_engine)].filter(
      (engine) => engines.includes(engine),
    ).slice(0, 2);

    let succeeded = false;
    let acceptedForThisQuery = 0;
    let usedEngine: OpenSerpEngineName | undefined;

    for (const engine of attemptEngines) {
      const remaining = remainingBudgetMs(timeBudget, now);
      if (remaining < MIN_VIABLE_CALL_BUDGET_MS) {
        // Not enough budget left to responsibly start another network
        // call -- stop attempting further engines for this query (and,
        // via the outer loop's own check, further queries too).
        break;
      }
      // Never request a per-call timeout longer than what's actually left
      // in the invocation's own budget -- a slow engine can shrink its own
      // allotted time as the run progresses, but can never be handed more
      // time than the invocation could possibly honor.
      const perCallTimeoutMs = Math.max(1_000, Math.min(engineCallTimeoutMs, remaining - 500));
      const attemptStartedAtIso = new Date(now()).toISOString();
      const attemptStartTime = now();

      try {
        const execution = await runOpenSerpLiveQuery({
          engine,
          query: universeQuery.query_text,
          limit: 15,
          site: universeQuery.target_domain ?? undefined,
          env: input.env,
          timeoutMs: perCallTimeoutMs,
        });
        logEngineCallAttempt({
          engine,
          query_id: universeQuery.query_id,
          attempt_outcome: "success",
          category: "success",
          error_name: null,
          error_code: null,
          http_status: null,
          message: null,
          duration_ms: now() - attemptStartTime,
          started_at: attemptStartedAtIso,
          finished_at: new Date(now()).toISOString(),
        });
        enginesUsed.add(engine);
        querySuccessCount += 1;
        succeeded = true;
        usedEngine = engine;
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
          // written, and had no log to root-cause it from. Only the
          // already-PII-redacted classified.title is logged, and only when
          // the candidate carries no PII-related rejection reason -- an
          // auto-mode safety review correctly flagged an earlier version of
          // this code for logging the raw, pre-redaction SERP title/URL
          // directly, which could have persisted a phone number from a
          // listing title into a committed file. The URL is never logged
          // here at all (URLs are never passed through redaction anywhere
          // in this codebase, so a URL carrying PII in a query string could
          // otherwise leak through even after this fix). Never written to
          // any DB table, only to a local run-report file.
          const candidateHasPiiFlag = decision.reasons.includes("pii_or_secret_detected");
          rawResultsLog.push({
            query_id: universeQuery.query_id,
            query_text: universeQuery.query_text,
            query_transaction: universeQuery.transaction,
            engine,
            redacted_title: candidateHasPiiFlag ? null : (decision.classified?.title ?? null),
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

        // OPENSERP-ENGINE-FAILURE-OBSERVABILITY-1: additive diagnostics only
        // -- never overrides the categorization/counters above, which still
        // drive the budget/suspension strategy exactly as before.
        const isEngineCallError = error instanceof EngineCallError;
        const diagOutcome = isEngineCallError ? error.outcome : null;
        const diagErrorName = isEngineCallError ? error.name : error instanceof Error ? error.name : "UnknownError";
        const diagErrorCode = isEngineCallError ? error.errorCode : null;
        const diagHttpStatus = isEngineCallError ? error.httpStatus : null;
        const diagMessage = error instanceof Error ? error.message : String(error);
        const detailCategory = classifyEngineErrorDetail({
          outcome: diagOutcome,
          errorName: diagErrorName,
          errorCode: diagErrorCode,
          httpStatus: diagHttpStatus,
          message: diagMessage,
        });
        engineErrorCategoryBreakdown[detailCategory] = (engineErrorCategoryBreakdown[detailCategory] ?? 0) + 1;
        logEngineCallAttempt({
          engine,
          query_id: universeQuery.query_id,
          attempt_outcome: "failure",
          category: detailCategory,
          error_name: diagErrorName,
          error_code: diagErrorCode,
          http_status: diagHttpStatus,
          message: sanitizeEngineErrorMessage(diagMessage),
          duration_ms: now() - attemptStartTime,
          started_at: attemptStartedAtIso,
          finished_at: new Date(now()).toISOString(),
        });
      }
    }

    const updatedQuery = {
      ...markQueryExecuted(universeQuery, { executedAtIso: new Date(now()).toISOString(), succeeded, acceptedCount: acceptedForThisQuery }),
      succeeded,
      engine: usedEngine,
    };

    // Checkpoint: persist THIS query's rotation-state update immediately,
    // rather than accumulating every query's update and persisting once
    // after the whole loop finishes. Idempotent (upsertQueryStates is a
    // plain upsert keyed by query_id) -- if this exact call were retried,
    // re-persisting the same already-correct row is a no-op in effect, not
    // a double-count. If the invocation is killed the instant after this
    // call returns, every query completed so far is already durable; only
    // the query in flight (if any) is lost, and it was never marked
    // executed in the first place, so the next invocation will simply
    // select it again.
    //
    // OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1 Phase 9: a checkpoint
    // that can't complete within the remaining budget (refused up front,
    // or aborted mid-flight) must end the run CLEANLY as
    // time_budget_exhausted, not crash it -- the affected query's rotation
    // state is simply unchanged, so the next invocation reselects it, and
    // every previously checkpointed unit stays durable. Any other DB error
    // still propagates loudly.
    try {
      await persistRotationUpdates([updatedQuery], input.runId, universe.universe_version, dbCtx);
      executedCount += 1;
    } catch (error) {
      if (error instanceof DbCallTimeoutError || error instanceof TimeBudgetExhaustedBeforeDbCallError) {
        outcomeStatus = "time_budget_exhausted";
        break;
      }
      throw error;
    }
  }

  if (executedCount < plannedBatch.length && outcomeStatus === "completed") {
    outcomeStatus = "partial";
  }

  // rawResultsDir is local_cli_only (OPENSERP_SERVERLESS_FILESYSTEM_AUDIT.md
  // section 5): the serverless route never sets it, only the bootstrap CLI
  // script does, on a genuinely writable local filesystem. Guarded by the
  // same "if (input.rawResultsDir)" check the filesystem-guard test
  // (openserp-serverless-filesystem-guard.test.ts) statically verifies.
  if (input.rawResultsDir) {
    mkdirSync(input.rawResultsDir, { recursive: true });
    writeFileSync(join(input.rawResultsDir, `${input.runId}-raw-results.json`), JSON.stringify(rawResultsLog, null, 2), "utf8");
  }

  let writeResult: Awaited<ReturnType<typeof writeNationalIngestionRun>> | null = null;
  if (input.write) {
    writeResult = await writeNationalIngestionRun({ runId: input.runId, decisions, dbCtx });
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

  const finishedAt = new Date(now()).toISOString();
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
  // Persisted unconditionally, including on a "partial"/"time_budget_exhausted"
  // early exit -- an arrêt volontaire must still preserve whatever budget/
  // suspension signal was actually observed on the units that did run.
  // If even this last write can't fit in the remaining budget, ending the
  // run cleanly matters more than this non-critical write (engine budget
  // simply stays at its previous value; suspension signals from this run
  // are re-derivable on the next) -- report it via state_persisted=false
  // rather than crashing at the very end.
  let statePersisted = true;
  try {
    await persistBudgetState(nextBudgetState, input.runId, dbCtx);
  } catch (error) {
    if (error instanceof DbCallTimeoutError || error instanceof TimeBudgetExhaustedBeforeDbCallError) {
      statePersisted = false;
    } else {
      throw error;
    }
  }

  const metrics: RunMetrics = {
    run_id: input.runId,
    scheduled_at: input.scheduledAtIso,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: elapsedMs(timeBudget, now),
    query_count: executedCount,
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
    cities_covered: [...new Set(plannedBatch.slice(0, executedCount).map((q) => q.city))].length,
    price_presence_rate: acceptedCandidates > 0 ? Math.round((admittedWithPrice / acceptedCandidates) * 1000) / 1000 : 0,
    surface_presence_rate: acceptedCandidates > 0 ? Math.round((admittedWithSurface / acceptedCandidates) * 1000) / 1000 : 0,
    write_mode: input.write,
    outcome_status: outcomeStatus,
    planned_unit_count: plannedBatch.length,
    executed_unit_count: executedCount,
    state_persisted: statePersisted,
    time_budget: snapshotTimeBudget(timeBudget, now),
    engine_error_category_breakdown: engineErrorCategoryBreakdown,
  };

  return { metrics, decisions, budgetState: nextBudgetState };
}
