#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";

import { loadEnvFile } from "@/lib/openserp-ingestion/env";
import { runPropertyIntelligenceBackfill } from "@/lib/property-intelligence/backfill";
import { createSupabaseBackfillDependencies } from "@/lib/property-intelligence/supabase-backfill-adapter";
import { PropertyIntelligenceStore } from "@/lib/property-intelligence/store";

loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env.mission"));

function positiveInteger(value: string | undefined, fallback: number, label: string): number {
  const resolved = value == null || value.trim() === "" ? fallback : Number(value);
  if (!Number.isInteger(resolved) || resolved <= 0) throw new Error(`invalid_${label}`);
  return resolved;
}

async function main(): Promise<void> {
  if (process.env.PROPERTY_INTELLIGENCE_BACKFILL_WRITE === "true") {
    throw new Error("property_intelligence_connected_runner_is_dry_run_only");
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("supabase_url_and_service_role_key_required");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const storeClient = client as unknown as ConstructorParameters<typeof PropertyIntelligenceStore>[0];
  const store = new PropertyIntelligenceStore(storeClient);
  const dependencies = createSupabaseBackfillDependencies(client, store);

  const report = await runPropertyIntelligenceBackfill(dependencies, {
    methodologyVersion: process.env.PROPERTY_INTELLIGENCE_METHODOLOGY_VERSION ?? "property_intelligence_v1",
    inputSnapshot: process.env.PROPERTY_INTELLIGENCE_INPUT_SNAPSHOT ?? `property_intelligence_dry_run_${new Date().toISOString()}`,
    batchSize: positiveInteger(process.env.PROPERTY_INTELLIGENCE_BACKFILL_BATCH_SIZE, 100, "batch_size"),
    maxRows: positiveInteger(process.env.PROPERTY_INTELLIGENCE_BACKFILL_MAX_ROWS, 2_500, "max_rows"),
    startCursor: process.env.PROPERTY_INTELLIGENCE_BACKFILL_START_CURSOR ?? null,
    dryRun: true,
    persistUnknown: false,
  });

  console.log(JSON.stringify({ status: "ok", mode: "dry_run", ...report }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[p0-data-property-intelligence-backfill]", message);
  process.exit(1);
});
