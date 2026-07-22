#!/usr/bin/env tsx
// OPENSERP-GITHUB-NATIVE-INGESTION-INTEGRATION-1
// DATA-MASS-ACQUISITION-QUERY-UNIVERSE-V2-1
// CASABLANCA-MASS-ACQUISITION-V1
//
// GitHub-hosted ingestion is the scale lane. Until Casablanca reaches the
// first 5k persisted-listing bootstrap milestone, the scheduled GitHub lane
// focuses the V2 universe on Casablanca. This does NOT relax any admission,
// publication, provenance, dedupe, source-registry or engine-suspension gate.
// Vercel/serverless remains untouched.
//
// Throughput is increased in two bounded ways on GitHub only:
//   1) native OpenSERP may request up to 50 organic results/query;
//   2) the batch override is derived from the persisted adaptive budget and
//      currently-active engines, with a small GitHub floor of 8 only when at
//      least two engines remain active. One active engine stays capped at 4.
// Incidents still persist through the existing budget/backoff state and can
// suspend engines exactly as before.

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import { acquireIngestionRunLock, releaseIngestionRunLock } from "@/lib/openserp-ingestion/run-lock";
import { runIngestionCycle } from "@/lib/openserp-ingestion/run-orchestrator";
import { buildQueryUniverseV2 } from "@/lib/openserp-ingestion/query-universe-v2";
import { loadBudgetState } from "@/lib/openserp-ingestion/state/serverless-state-service";
import { activeEngines } from "@/lib/openserp-ingestion/budget-policy";

const GITHUB_MAX_DURATION_MS = 240_000;
const LOCK_LEASE_SECONDS = Math.round(GITHUB_MAX_DURATION_MS / 1000 + 45);
const MASS_CAMPAIGN_CITY = "Casablanca";
const MASS_CAMPAIGN_BOOTSTRAP_TARGET = 5_000;
const GITHUB_NATIVE_RESULT_LIMIT = "50";
const GITHUB_MAX_BATCH = 24;

function parseMode(argv: string[]): "dry-run" | "cron" {
  const hasDryRun = argv.includes("--dry-run");
  const hasCron = argv.includes("--cron");
  if (hasDryRun && hasCron) throw new Error("--dry-run and --cron are mutually exclusive");
  if (hasDryRun) return "dry-run";
  if (hasCron) return "cron";
  throw new Error("one of --dry-run or --cron is required (no default mode)");
}

async function countPersistedCityListings(city: string): Promise<number | null> {
  try {
    const client = getSupabaseServerClient();
    const { count, error } = await client
      .from("property_listings")
      .select("id", { count: "exact", head: true })
      .eq("city", city);
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.warn(`[mass-acquisition] city count unavailable; falling back to national universe: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function materializeScaleUniverse(runId: string) {
  const fullUniverse = buildQueryUniverseV2();
  const currentCityListings = await countPersistedCityListings(MASS_CAMPAIGN_CITY);
  const campaignActive = currentCityListings !== null && currentCityListings < MASS_CAMPAIGN_BOOTSTRAP_TARGET;
  const queries = campaignActive
    ? fullUniverse.queries.filter((query) => query.city === MASS_CAMPAIGN_CITY)
    : fullUniverse.queries;

  const universe = {
    ...fullUniverse,
    total_queries: queries.length,
    cities_covered: new Set(queries.map((query) => query.city)).size,
    districts_covered: new Set(queries.filter((query) => query.district).map((query) => `${query.city}::${query.district}`)).size,
    queries,
  };

  const path = join(tmpdir(), `${runId}-query-universe-v2.json`);
  writeFileSync(path, JSON.stringify(universe), "utf8");
  return { path, universe, campaignActive, currentCityListings };
}

async function resolveGithubMassBatch(nowIso: string): Promise<{ batchSize: number; active: string[]; persistedBudget: number }> {
  const state = await loadBudgetState();
  const active = activeEngines(state, nowIso);
  if (active.length === 0) return { batchSize: 0, active, persistedBudget: state.current_budget };

  // Do not bulldoze the safety state. One surviving engine stays at the
  // conservative 4-query ceiling. With >=2 active engines, GitHub may use a
  // modest floor of 8, then follows the persisted adaptive budget up to 24.
  const batchSize = active.length === 1
    ? Math.min(4, state.current_budget)
    : Math.min(GITHUB_MAX_BATCH, Math.max(8, state.current_budget));
  return { batchSize, active, persistedBudget: state.current_budget };
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const runId = `openserp-github-${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const scheduledAtIso = new Date().toISOString();
  const scale = await materializeScaleUniverse(runId);
  const runtimeEnv: NodeJS.ProcessEnv = {
    ...process.env,
    OPENSERP_NATIVE_RESULT_LIMIT: GITHUB_NATIVE_RESULT_LIMIT,
  };

  console.log(JSON.stringify({
    event: "QUERY_UNIVERSE_V2_READY",
    universe_version: scale.universe.universe_version,
    total_queries: scale.universe.total_queries,
    cities_covered: scale.universe.cities_covered,
    districts_covered: scale.universe.districts_covered,
    mass_campaign_city: MASS_CAMPAIGN_CITY,
    mass_campaign_target: MASS_CAMPAIGN_BOOTSTRAP_TARGET,
    current_city_listings: scale.currentCityListings,
    mass_campaign_active: scale.campaignActive,
    native_result_limit: Number(GITHUB_NATIVE_RESULT_LIMIT),
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
