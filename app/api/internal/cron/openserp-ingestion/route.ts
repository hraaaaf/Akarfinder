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

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.OPENSERP_CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
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

  const lock = await acquireIngestionRunLock(runId);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, status: lock.reason, run_id: runId }, { status: 200 });
  }

  try {
    const { metrics } = await runIngestionCycle({
      runId,
      scheduledAtIso,
      write: true,
    });
    return NextResponse.json({ ok: true, status: "COMPLETED", metrics }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, status: "RUN_FAILED", error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  } finally {
    await releaseIngestionRunLock();
  }
}

// Reject any method other than GET (Vercel Cron always issues GET).
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
