#!/usr/bin/env tsx
// OPENSERP-GITHUB-NATIVE-INGESTION-INTEGRATION-1
// DATA-MASS-ACQUISITION-QUERY-UNIVERSE-V2-1
// NATIONAL-MASS-ACQUISITION-ALL-MOROCCO-V1
// MASS-ACQUISITION-CAMPAIGN-V2
//
// GitHub-hosted ingestion is the national scale lane. Every cycle materializes
// the FULL V2 Morocco query universe; no single city may replace or monopolize
// it. Query rotation prioritizes never-executed queries, historical discovery
// yield, under-covered cities/districts and staleness.
//
// GitHub-only throughput controls:
//   1) native OpenSERP requests up to 50 organic results/page;
//   2) native transport follows at most 3 upstream pagination pages when the
//      provider explicitly reports `has_more` + `next_start`;
//   3) batch override follows persisted engine safety state, capped at 24.
// Existing incidents/backoff/suspension, DB lock and 3 write flags remain
// authoritative. Vercel/serverless behavior is untouched.

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import { acquireIngestionRunLock, releaseIngestionRunLock } from "@/lib/openserp-ingestion/run-lock";
import { runIngestionCycle } from "@/lib/openserp-ingestion/run-orchestrator";
import { buildQueryUniverseV2 } from "@/lib/openserp-ingestion/query-universe-v2";
import { loadBudgetState } from "@/lib/openserp-ingestion/state/serverless-state-service";
import { activeEngines } from "@/lib/openserp-ingestion/budget-policy";

const GITHUB_MAX_DURATION_MS = 240_000;
const LOCK_LEASE_SECONDS = Math.round(GITHUB_MAX_DURATION_MS / 1000 + 45);
const GITHUB_NATIVE_RESULT_LIMIT = "50";
const GITHUB_NATIVE_MAX_PAGES = "3";
const GITHUB_MAX_BATCH = 24;

function parseMode(argv: string[]): "dry-run" | "cron" {
  const hasDryRun = argv.includes("--dry-run");
  const hasCron = argv.includes("--cron");
  if (hasDryRun && hasCron) throw new Error("--dry-run and --cron are mutually exclusive");
  if (hasDryRun) return "dry-run";
  if (hasCron) return "cron";
  throw new Error("one of --dry-run or --cron is required (no default mode)");
}

function materializeScaleUniverse(runId: string) {
  const universe = buildQueryUniverseV2();
  const path = join(tmpdir(), `${runId}-query-universe-v2.json`);
  writeFileSync(path, JSON.stringify(universe), "utf8");
  return { path, universe };
}

async function resolveGithubMassBatch(nowIso: string): Promise<{ batchSize: number; active: string[]; persistedBudget: number }> {
  const state = await loadBudgetState();
  const active = activeEngines(state, nowIso);
  if (active.length === 0) return { batchSize: 0, active, persistedBudget: state.current_budget };
  const batchSize = active.length === 1
    ? Math.min(4, state.current_budget)
    : Math.min(GITHUB_MAX_BATCH, Math.max(8, state.current_budget));
  return { batchSize, active, persistedBudget: state.current_budget };
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const runId = `openserp-github-${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const scheduledAtIso = new Date().toISOString();
  const scale = materializeScaleUniverse(runId);
  const runtimeEnv: NodeJS.ProcessEnv = {
    ...process.env,
    OPENSERP_NATIVE_RESULT_LIMIT: GITHUB_NATIVE_RESULT_LIMIT,
    OPENSERP_NATIVE_MAX_PAGES: GITHUB_NATIVE_MAX_PAGES,
  };

  console.log(JSON.stringify({
    event: "QUERY_UNIVERSE_V2_READY",
    universe_version: scale.universe.universe_version,
    total_queries: scale.universe.total_queries,
    cities_covered: scale.universe.cities_covered,
    districts_covered: scale.universe.districts_covered,
    national_hot_lane: true,
    single_city_exclusive_filter: false,
    native_result_limit: Number(GITHUB_NATIVE_RESULT_LIMIT),
    native_max_pages: Number(GITHUB_NATIVE_MAX_PAGES),
    theoretical_native_results_per_query_ceiling: Number(GITHUB_NATIVE_RESULT_LIMIT) * Number(GITHUB_NATIVE_MAX_PAGES),
  }));

  if (mode === "dry-run") {
    const budget = await resolveGithubMassBatch(scheduledAtIso);
    if (budget.batchSize === 0) {
      console.log(JSON.stringify({ ok: true, status: "DRY_RUN_NO_ACTIVE_ENGINES", run_id: runId, budget }, null, 2));
      return;
    }
    const { metrics } = await runIngestionCycle({
      runId,
      scheduledAtIso,
      universePath: scale.path,
      write: false,
      persistState: false,
      routeMaxDurationMs: GITHUB_MAX_DURATION_MS,
      batchSizeOverride: budget.batchSize,
      env: runtimeEnv,
    });
    console.log(JSON.stringify({ ok: true, status: "DRY_RUN_COMPLETED", run_id: runId, budget, metrics }, null, 2));
    return;
  }

  if (!isOpenSerpIngestionCronAuthorized()) {
    console.log(JSON.stringify({ ok: true, status: "NOOP_FLAGS_DISABLED", run_id: runId }, null, 2));
    return;
  }

  const lock = await acquireIngestionRunLock(runId, LOCK_LEASE_SECONDS);
  if (!lock.acquired) {
    console.log(JSON.stringify({ ok: true, status: lock.reason, run_id: runId }, null, 2));
    return;
  }

  try {
    const budget = await resolveGithubMassBatch(scheduledAtIso);
    if (budget.batchSize === 0) {
      console.log(JSON.stringify({ ok: true, status: "NO_ACTIVE_ENGINES", run_id: runId, budget }, null, 2));
      return;
    }
    const { metrics } = await runIngestionCycle({
      runId,
      scheduledAtIso,
      universePath: scale.path,
      write: true,
      routeMaxDurationMs: GITHUB_MAX_DURATION_MS,
      batchSizeOverride: budget.batchSize,
      env: runtimeEnv,
    });
    console.log(JSON.stringify({ ok: true, status: "COMPLETED", run_id: runId, budget, metrics }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({
      ok: false,
      status: "RUN_FAILED",
      run_id: runId,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  } finally {
    await releaseIngestionRunLock(runId);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
