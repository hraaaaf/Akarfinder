#!/usr/bin/env tsx
// OPENSERP-GITHUB-NATIVE-INGESTION-INTEGRATION-1
// Minimal CLI entrypoint for running the existing OpenSERP ingestion
// orchestrator (lib/openserp-ingestion/run-orchestrator.ts) from a plain
// process instead of the Vercel route -- so it can run inside a GitHub
// Actions job talking to a local OpenSERP Docker container. Mirrors
// app/api/internal/cron/openserp-ingestion/route.ts's exact logic (flag
// gate, lease lock, runIngestionCycle call, lock release): same
// functions, same lease-lease-seconds formula, same NOOP semantics. No
// business logic is duplicated here.
//
// Two mutually exclusive modes, one mandatory -- no default, so an
// accidental invocation with no arguments fails loudly instead of
// silently picking a mode:
//   --dry-run   never writes, regardless of any flag. Bypasses the flag
//               gate entirely -- for validating that the orchestrator,
//               the OpenSERP engine, and the DB connection all work
//               end-to-end without ever risking a real write.
//   --cron      mirrors the Vercel cron route exactly: checks
//               isOpenSerpIngestionCronAuthorized() (all 3 Production
//               flags), NOOPs if not authorized, otherwise runs with
//               write=true under the lease lock -- identical semantics
//               to a real scheduled Production invocation.

import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import { acquireIngestionRunLock, releaseIngestionRunLock } from "@/lib/openserp-ingestion/run-lock";
import { runIngestionCycle } from "@/lib/openserp-ingestion/run-orchestrator";

// Identical to the Vercel route's own maxDuration -- not changed by this
// mission (no timeout/budget strategy change authorized).
const ROUTE_MAX_DURATION_MS = 120_000;
const LOCK_LEASE_SECONDS = Math.round(ROUTE_MAX_DURATION_MS / 1000 + 30);

function parseMode(argv: string[]): "dry-run" | "cron" {
  const hasDryRun = argv.includes("--dry-run");
  const hasCron = argv.includes("--cron");
  if (hasDryRun && hasCron) {
    throw new Error("--dry-run and --cron are mutually exclusive");
  }
  if (hasDryRun) return "dry-run";
  if (hasCron) return "cron";
  throw new Error("one of --dry-run or --cron is required (no default mode)");
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const runId = `openserp-github-${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const scheduledAtIso = new Date().toISOString();

  if (mode === "dry-run") {
    const { metrics } = await runIngestionCycle({
      runId,
      scheduledAtIso,
      write: false,
      routeMaxDurationMs: ROUTE_MAX_DURATION_MS,
    });
    console.log(JSON.stringify({ ok: true, status: "DRY_RUN_COMPLETED", run_id: runId, metrics }, null, 2));
    return;
  }

  // --cron
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
      write: true,
      routeMaxDurationMs: ROUTE_MAX_DURATION_MS,
    });
    console.log(JSON.stringify({ ok: true, status: "COMPLETED", run_id: runId, metrics }, null, 2));
  } catch (error) {
    console.log(
      JSON.stringify(
        { ok: false, status: "RUN_FAILED", run_id: runId, error: error instanceof Error ? error.message : String(error) },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    await releaseIngestionRunLock(runId);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
