import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { buildNeighborhoodContextNationalBaseline } from "@/lib/neighborhood-context/national-baseline";
import { buildNeighborhoodContextRuntimeCatalog } from "@/lib/neighborhood-context/read-model";
import {
  NEIGHBORHOOD_CONTEXT_L7_FRESHNESS_MAX_AGE_MS,
  detectNeighborhoodContextBaselineRegressions,
  getNeighborhoodContextNationalRefreshTargets,
  getNeighborhoodContextQualityCanaries,
  validateNeighborhoodContextNationalRefreshTargets,
} from "@/lib/neighborhood-context/national-refresh";

const OUTPUT_DIR = path.resolve(process.env.NCI_L7_OUTPUT_DIR ?? "artifacts/neighborhood-context-l7-refresh-quality");
const LATENCY_ITERATIONS = 25;

function percentile(values: number[], quantile: number): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.min(ordered.length - 1, Math.max(0, Math.ceil(quantile * ordered.length) - 1));
  return ordered[index];
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

async function main() {
  const now = new Date();
  const baseline = buildNeighborhoodContextNationalBaseline(now);
  const runtimeCatalog = buildNeighborhoodContextRuntimeCatalog(now);
  const targets = getNeighborhoodContextNationalRefreshTargets();
  const targetFindings = validateNeighborhoodContextNationalRefreshTargets(targets);
  const regressions = detectNeighborhoodContextBaselineRegressions(baseline, baseline);
  const canaries = getNeighborhoodContextQualityCanaries(baseline);

  const latencySamples: number[] = [];
  for (let index = 0; index < LATENCY_ITERATIONS; index += 1) {
    const started = performance.now();
    buildNeighborhoodContextRuntimeCatalog(now);
    latencySamples.push(performance.now() - started);
  }

  let refreshPlan: unknown = null;
  try {
    refreshPlan = JSON.parse(await readFile(path.join(OUTPUT_DIR, "refresh-plan.json"), "utf8"));
  } catch {
    refreshPlan = null;
  }

  const blockedIds = targets
    .filter((target) => target.target_status === "blocked_missing_reference_point")
    .map((target) => target.canonical_neighborhood_id)
    .sort();
  const queryableTargets = targets.filter((target) => target.target_status === "queryable").length;

  const baselineAnchors = baseline.neighborhoods.flatMap((row) => row.anchors);
  const provenanceFindings = baselineAnchors.flatMap((anchor) => {
    const missing: string[] = [];
    if (!anchor.source_id) missing.push("source_id");
    if (!anchor.source_url) missing.push("source_url");
    if (!anchor.attribution) missing.push("attribution");
    if (!anchor.license_policy) missing.push("license_policy");
    if (!anchor.license_url) missing.push("license_url");
    if (!anchor.observed_at) missing.push("observed_at");
    if (anchor.freshness_status !== "fresh") missing.push("freshness");
    return missing.map((field) => `${anchor.poi_id}:${field}`);
  });

  const findings = [
    ...targetFindings,
    ...regressions.map((finding) => `self_regression:${finding.canonical_neighborhood_id}:${finding.kind}`),
    ...provenanceFindings.map((finding) => `provenance:${finding}`),
  ];

  const runtimeCatalogBytes = Buffer.byteLength(JSON.stringify(runtimeCatalog), "utf8");
  const baselineBytes = Buffer.byteLength(JSON.stringify(baseline), "utf8");

  const report = {
    schema: "NEIGHBORHOOD_CONTEXT_L7_QUALITY_FRESHNESS_REPORT_V1",
    generated_at: now.toISOString(),
    ok: findings.length === 0,
    production_provider_claim: false,
    thresholds_frozen: false,
    network_in_render_path: false,
    default_refresh_mode: "plan",
    default_refresh_network_calls: 0,
    live_requires_configured_endpoints: true,
    freshness_policy: {
      max_age_ms: NEIGHBORHOOD_CONTEXT_L7_FRESHNESS_MAX_AGE_MS,
      max_age_days: NEIGHBORHOOD_CONTEXT_L7_FRESHNESS_MAX_AGE_MS / 86_400_000,
      inherited_from: "NeighborhoodPoiV1",
    },
    target_inventory: {
      total: targets.length,
      queryable: queryableTargets,
      blocked_missing_reference_point: blockedIds.length,
      blocked_ids: blockedIds,
    },
    provenance_audit: {
      anchor_count: baselineAnchors.length,
      missing_evidence_count: provenanceFindings.length,
      findings: provenanceFindings,
    },
    operational_cost: {
      default_network_calls: 0,
      live_queryable_targets: queryableTargets,
      provider_monetary_cost: null,
      monetary_cost_certified: false,
      note: "No paid production provider is configured or claimed; monetary cost is therefore not fabricated.",
    },
    read_model_size: {
      runtime_models: runtimeCatalog.length,
      serialized_bytes: runtimeCatalogBytes,
      serialized_kib: round(runtimeCatalogBytes / 1024),
      baseline_serialized_bytes: baselineBytes,
      baseline_serialized_kib: round(baselineBytes / 1024),
    },
    baseline,
    canaries,
    regression_check: {
      compared_to_self: true,
      findings: regressions,
    },
    read_model_latency_ms: {
      iterations: LATENCY_ITERATIONS,
      median: round(percentile(latencySamples, 0.5)),
      p95: round(percentile(latencySamples, 0.95)),
      max: round(Math.max(...latencySamples)),
      gate_threshold_ms: null,
      note: "Measured read-only in-process latency; no arbitrary release threshold is asserted in L7-B.",
    },
    refresh_plan: refreshPlan,
    findings,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(path.join(OUTPUT_DIR, "quality-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
