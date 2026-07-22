#!/usr/bin/env tsx
// OPENSERP-GITHUB-NATIVE-INGESTION-INTEGRATION-1
// DATA-MASS-ACQUISITION-QUERY-UNIVERSE-V2-1
// GitHub-hosted ingestion is the scale lane: it builds the deterministic V2
// national query universe into the runner's ephemeral temp directory and
// passes that read-only fixture to the existing orchestrator. Vercel's
// serverless route remains untouched and keeps its historical bundled V1
// fixture, so no serverless filesystem write is introduced.

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import { acquireIngestionRunLock, releaseIngestionRunLock } from "@/lib/openserp-ingestion/run-lock";
import { runIngestionCycle } from "@/lib/openserp-ingestion/run-orchestrator";
import { buildQueryUniverseV2 } from "@/lib/openserp-ingestion/query-universe-v2";

const ROUTE_MAX_DURATION_MS = 120_000;
const LOCK_LEASE_SECONDS = Math.round(ROUTE_MAX_DURATION_MS / 1000 + 30);

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

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const runId = `openserp-github-${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const scheduledAtIso = new Date().toISOString();
  const scale = materializeScaleUniverse(runId);

  console.log(JSON.stringify({
    event: "QUERY_UNIVERSE_V2_READY",
    universe_version: scale.universe.universe_version,
    total_queries: scale.universe.total_queries,
    cities_covered: scale.universe.cities_covered,
    districts_covered: scale.universe.districts_covered,
  }));

  if (mode === "dry-run") {
    const { metrics } = await runIngestionCycle({
      runId,
      scheduledAtIso,
      universePath: scale.path,
      write: false,
      persistState: false,
      routeMaxDurationMs: ROUTE_MAX_DURATION_MS,
    });
    console.log(JSON.stringify({ ok: true, status: "DRY_RUN_COMPLETED", run_id: runId, metrics }, null, 2));
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
    const { metrics } = await runIngestionCycle({
      runId,
      scheduledAtIso,
      universePath: scale.path,
      write: true,
      routeMaxDurationMs: ROUTE_MAX_DURATION_MS,
    });
    console.log(JSON.stringify({ ok: true, status: "COMPLETED", run_id: runId, metrics }, null, 2));
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
