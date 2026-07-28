#!/usr/bin/env tsx

import { createClient } from "@supabase/supabase-js";

import { summarizeOdmDivergences } from "@/lib/odm/odm-divergence-analyzer";
import type { OdmDualReadDivergence } from "@/lib/odm/odm-dual-read-shadow";
import {
  ODM_SHADOW_TELEMETRY_RETENTION_DAYS,
  ODM_SHADOW_TELEMETRY_TABLE,
} from "@/lib/odm/odm-shadow-telemetry-store";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const retentionCutoff = new Date(
    Date.now() - ODM_SHADOW_TELEMETRY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { error: pruneError } = await supabase
    .from(ODM_SHADOW_TELEMETRY_TABLE)
    .delete()
    .lt("created_at", retentionCutoff);
  if (pruneError) throw new Error(`telemetry_prune_failed: ${pruneError.message}`);

  const { data, error } = await supabase
    .from(ODM_SHADOW_TELEMETRY_TABLE)
    .select([
      "version",
      "stable_key_hash",
      "legacy_count",
      "odm_count",
      "canonical_overlap_count",
      "canonical_overlap_rate",
      "rank_overlap_at_10",
      "trusted_price_comparisons",
      "trusted_price_divergences",
      "trusted_surface_comparisons",
      "trusted_surface_divergences",
      "metric_generated_at",
    ].join(","))
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`telemetry_read_failed: ${error.message}`);

  const metrics: OdmDualReadDivergence[] = (data ?? []).map((row) => ({
    version: "odm_dual_read_v1",
    stable_key_hash: String(row.stable_key_hash),
    legacy_count: Number(row.legacy_count),
    odm_count: Number(row.odm_count),
    canonical_overlap_count: Number(row.canonical_overlap_count),
    canonical_overlap_rate: Number(row.canonical_overlap_rate),
    rank_overlap_at_10: Number(row.rank_overlap_at_10),
    trusted_price_comparisons: Number(row.trusted_price_comparisons),
    trusted_price_divergences: Number(row.trusted_price_divergences),
    trusted_surface_comparisons: Number(row.trusted_surface_comparisons),
    trusted_surface_divergences: Number(row.trusted_surface_divergences),
    generated_at: String(row.metric_generated_at),
  }));

  const summary = summarizeOdmDivergences(metrics.reverse());
  console.log(JSON.stringify({
    generated_at: new Date().toISOString(),
    retention_days: ODM_SHADOW_TELEMETRY_RETENTION_DAYS,
    ...summary,
  }, null, 2));

  if (summary.stop_public_canary) process.exitCode = 2;
}

main().catch((error) => {
  console.error("[odm-shadow-telemetry-report]", error);
  process.exit(1);
});
