import { createClient } from "@supabase/supabase-js";

import type { OdmDualReadDivergence } from "@/lib/odm/odm-dual-read-shadow";

export const ODM_SHADOW_TELEMETRY_TABLE = "odm_shadow_divergence_events_v1";
export const ODM_SHADOW_TELEMETRY_RETENTION_DAYS = 14;

export type OdmShadowTelemetryWriteResult =
  | { stored: true }
  | { stored: false; reason: "missing_configuration" | "insert_failed" };

export function metricToTelemetryRow(metric: OdmDualReadDivergence) {
  return {
    version: metric.version,
    stable_key_hash: metric.stable_key_hash,
    legacy_count: metric.legacy_count,
    odm_count: metric.odm_count,
    canonical_overlap_count: metric.canonical_overlap_count,
    canonical_overlap_rate: metric.canonical_overlap_rate,
    rank_overlap_at_10: metric.rank_overlap_at_10,
    trusted_price_comparisons: metric.trusted_price_comparisons,
    trusted_price_divergences: metric.trusted_price_divergences,
    trusted_surface_comparisons: metric.trusted_surface_comparisons,
    trusted_surface_divergences: metric.trusted_surface_divergences,
    metric_generated_at: metric.generated_at,
  };
}

export async function persistOdmDualReadMetric(
  metric: OdmDualReadDivergence,
  env: NodeJS.ProcessEnv = process.env,
): Promise<OdmShadowTelemetryWriteResult> {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[odm-shadow-telemetry:disabled]", JSON.stringify({ reason: "missing_configuration" }));
    return { stored: false, reason: "missing_configuration" };
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase
    .from(ODM_SHADOW_TELEMETRY_TABLE)
    .insert(metricToTelemetryRow(metric));

  if (error) {
    console.warn("[odm-shadow-telemetry:error]", JSON.stringify({ code: error.code, message: error.message }));
    return { stored: false, reason: "insert_failed" };
  }

  return { stored: true };
}
