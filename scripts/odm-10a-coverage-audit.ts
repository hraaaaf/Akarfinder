#!/usr/bin/env tsx
import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required");
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  const target = positiveInteger("ODM10A_TARGET_COUNT", 100_000);
  const topLimit = positiveInteger("ODM10A_TOP_LIMIT", 30);
  const output = process.env.ODM10A_REPORT_PATH?.trim() || "odm-10a-coverage-report.json";

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc("odm_10a_coverage_audit", {
    p_target_count: target,
    p_top_limit: topLimit,
  });
  if (error) throw new Error(`odm_10a_coverage_audit_failed:${error.message}`);
  if (!data || typeof data !== "object") throw new Error("odm_10a_coverage_audit_empty");

  await writeFile(output, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[ODM-10A] ${message}\n`);
  process.exitCode = 1;
});
