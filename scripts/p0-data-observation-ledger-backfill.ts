import { createClient } from "@supabase/supabase-js";

import { runObservationLedgerBackfill } from "../lib/observation-ledger/supabase-observation-ledger.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

async function main(): Promise<void> {
  const supabaseUrl = required("SUPABASE_URL");
  const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const snapshot = process.env.OBSERVATION_LEDGER_SNAPSHOT?.trim()
    || `observation_ledger_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const writeRequested = process.env.OBSERVATION_LEDGER_WRITE === "true";
  const writeAcknowledged = process.env.OBSERVATION_LEDGER_WRITE_ACK === "I_UNDERSTAND_INTERNAL_ONLY";

  if (writeRequested && !writeAcknowledged) {
    throw new Error(
      "Write mode requires OBSERVATION_LEDGER_WRITE_ACK=I_UNDERSTAND_INTERNAL_ONLY",
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await runObservationLedgerBackfill(client, {
    snapshot,
    dryRun: !writeRequested,
    pageSize: positiveInteger("OBSERVATION_LEDGER_PAGE_SIZE", 500),
    maxObservations: positiveInteger("OBSERVATION_LEDGER_MAX_OBSERVATIONS", 10_000),
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Observation Ledger backfill failed: ${message}\n`);
  process.exitCode = 1;
});
