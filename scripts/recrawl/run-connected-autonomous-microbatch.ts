import { writeFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

import { runConnectedAutonomousMicrobatch } from "../../lib/recrawl/connected-autonomous-microbatch.js";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function writeReport(payload: unknown): Promise<void> {
  const reportPath = process.env.AUTONOMOUS_RECRAWL_REPORT_PATH?.trim();
  if (!reportPath) return;
  await writeFile(reportPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
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

  const payload = {
    verdict: writeEnabled ? "CONNECTED_MICROBATCH_EXECUTED" : "CONNECTED_MICROBATCH_DRY_RUN",
    publication_eligible: false as const,
    report,
  };
  await writeReport(payload);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch(async (error) => {
  const payload = {
    verdict: "CONNECTED_MICROBATCH_FAILED",
    error: error instanceof Error ? error.message : String(error),
    publication_eligible: false as const,
  };
  try {
    await writeReport(payload);
  } catch (reportError) {
    console.error(`failed_to_write_report:${reportError instanceof Error ? reportError.message : String(reportError)}`);
  }
  console.error(JSON.stringify(payload));
  process.exitCode = 1;
});
