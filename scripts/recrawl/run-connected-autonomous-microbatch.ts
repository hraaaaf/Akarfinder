import { createClient } from "@supabase/supabase-js";

import { runConnectedAutonomousMicrobatch } from "../../lib/recrawl/connected-autonomous-microbatch.js";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const writeEnabled = process.env.AUTONOMOUS_RECRAWL_WRITE === "true";
  const requestedLimit = Number(process.env.AUTONOMOUS_RECRAWL_LIMIT ?? "3");
  const workerId = process.env.AUTONOMOUS_RECRAWL_WORKER_ID?.trim() || "autonomous-recrawl-microbatch-v1";

  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 3) {
    throw new Error("AUTONOMOUS_RECRAWL_LIMIT must be an integer between 1 and 3");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();
  const report = await runConnectedAutonomousMicrobatch({
    dependencies: { supabase },
    worker_id: workerId,
    limit: requestedLimit,
    now,
    dry_run: !writeEnabled,
  });

  console.log(JSON.stringify({
    verdict: writeEnabled ? "CONNECTED_MICROBATCH_EXECUTED" : "CONNECTED_MICROBATCH_DRY_RUN",
    report,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    verdict: "CONNECTED_MICROBATCH_FAILED",
    error: error instanceof Error ? error.message : String(error),
    publication_eligible: false,
  }));
  process.exitCode = 1;
});
