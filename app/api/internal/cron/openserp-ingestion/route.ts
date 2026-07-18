// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — section 19.
// Internal cron entry point. Never linked from the UI, never exposes the
// secret, refuses execution unless the secret matches AND every required
// flag is true, and is a safe no-op (200, no write) on any missing flag or
// overlapping run rather than a hard error.

import { NextResponse, type NextRequest } from "next/server";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import { acquireIngestionRunLock, releaseIngestionRunLock } from "@/lib/openserp-ingestion/run-lock";
import { runIngestionCycle } from "@/lib/openserp-ingestion/run-orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — the lease must
// comfortably outlive maxDuration so it never expires while this
// invocation is still legitimately running (which would let a second,
// overlapping invocation take over mid-flight) -- but expires soon enough
// after a kill (FUNCTION_INVOCATION_TIMEOUT or otherwise) that the next
// attempt can self-heal without any manual cleanup.
const LOCK_LEASE_SECONDS = Math.round(maxDuration + 30);

// Vercel's own Cron Jobs feature auto-injects `Authorization: Bearer
// $CRON_SECRET` on every scheduled invocation IFF an env var literally named
// CRON_SECRET is configured (https://vercel.com/docs/cron-jobs/manage-cron-jobs)
// -- a project-specific name like OPENSERP_CRON_SECRET would never receive
// that automatic header, so a scheduled run would always 401. Checking
// CRON_SECRET first uses that automatic mechanism; OPENSERP_CRON_SECRET
// stays supported too, for a manually-authenticated run (section 40) using a
// dedicated secret rather than the project-wide one.
function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  if (!header) return false;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;
  const openSerpSecret = process.env.OPENSERP_CRON_SECRET;
  if (openSerpSecret && header === `Bearer ${openSerpSecret}`) return true;
  return false;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isOpenSerpIngestionCronAuthorized()) {
    return NextResponse.json({ ok: true, status: "NOOP_FLAGS_DISABLED" }, { status: 200 });
  }

  const runId = `openserp-cron-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const scheduledAtIso = new Date().toISOString();

  const lock = await acquireIngestionRunLock(runId, LOCK_LEASE_SECONDS);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, status: lock.reason, run_id: runId }, { status: 200 });
  }

  try {
    const { metrics } = await runIngestionCycle({
      runId,
      scheduledAtIso,
      write: true,
      routeMaxDurationMs: maxDuration * 1000,
    });
    return NextResponse.json({ ok: true, status: "COMPLETED", metrics }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, status: "RUN_FAILED", error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  } finally {
    // If the function is killed by the platform before this line ever
    // runs, the lease itself expires after LOCK_LEASE_SECONDS -- no
    // manual cleanup is required (see
    // lib/openserp-ingestion/state/ingestion-run-lock-repository.ts).
    await releaseIngestionRunLock(runId);
  }
}

// Reject any method other than GET (Vercel Cron always issues GET).
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
