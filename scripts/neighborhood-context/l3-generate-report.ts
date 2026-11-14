import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildNeighborhoodContextRuntimeCatalog,
  validateNeighborhoodContextReadModel,
} from "@/lib/neighborhood-context/read-model";
import { ANN_L5_CERTIFIED_SEED_OBSERVED_AT } from "@/lib/neighborhood-context/certified-seed";

function summarize(models: ReturnType<typeof buildNeighborhoodContextRuntimeCatalog>) {
  return {
    model_count: models.length,
    covered: models.filter((model) => model.coverage_status === "covered").length,
    partial: models.filter((model) => model.coverage_status === "partial").length,
    insufficient: models.filter((model) => model.coverage_status === "insufficient").length,
    unavailable: models.filter((model) => model.coverage_status === "unavailable").length,
    total_anchors: models.reduce((sum, model) => sum + model.anchor_count, 0),
    unique_pois: new Set(models.flatMap((model) => model.anchors.map((anchor) => anchor.poi_id))).size,
  };
}

async function main() {
  const outputDir = path.resolve(process.env.NCI_L3_OUTPUT_DIR ?? "artifacts/neighborhood-context-l3");
  const now = new Date();
  const models = buildNeighborhoodContextRuntimeCatalog(now);
  const findings = models.flatMap((model) =>
    validateNeighborhoodContextReadModel(model).map((finding) => `${model.canonical_neighborhood_id}:${finding}`),
  );
  const summary = summarize(models);

  // The August 2026 seed is now stale. Test that its frozen historical *fixture*
  // can still exercise selection/provenance, without passing those expired pins
  // into the current API, map, or production read-model.
  const historicalAsOf = new Date("2026-08-24T20:50:00.000Z");
  const historical = buildNeighborhoodContextRuntimeCatalog(historicalAsOf);
  const historicalFindings = historical.flatMap((model) =>
    validateNeighborhoodContextReadModel(model).map((finding) => `${model.canonical_neighborhood_id}:${finding}`),
  );
  const historicalSummary = summarize(historical);
  const sourceIsExpired = now.getTime() - Date.parse(ANN_L5_CERTIFIED_SEED_OBSERVED_AT) > 30 * 24 * 60 * 60 * 1000;

  const historicalFixtureOk = historical.length === 6 &&
    historicalFindings.length === 0 &&
    historicalSummary.total_anchors >= 5;
  const freshRuntimeOk = models.length === 6 &&
    findings.length === 0 &&
    models.every((model) => model.anchors.every((anchor) => anchor.freshness_status === "fresh")) &&
    (!sourceIsExpired || summary.total_anchors === 0);

  const report = {
    schema: "NEIGHBORHOOD_CONTEXT_L3_READ_MODEL_REPORT_V1",
    generated_at: now.toISOString(),
    // Technical fail-closed contract, NOT a production POI coverage certification.
    ok: historicalFixtureOk && freshRuntimeOk,
    live_coverage_ready: summary.total_anchors >= 5,
    source_mode: "ann-l5-certified-seed",
    source_observed_at: ANN_L5_CERTIFIED_SEED_OBSERVED_AT,
    source_is_expired: sourceIsExpired,
    network_in_render_path: false,
    summary,
    historical_fixture: {
      as_of: historicalAsOf.toISOString(),
      summary: historicalSummary,
      findings: historicalFindings,
      ok: historicalFixtureOk,
    },
    findings,
    models,
  };
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: report.ok, live_coverage_ready: report.live_coverage_ready,
    source_is_expired: report.source_is_expired, summary: report.summary,
    historical_fixture: report.historical_fixture,
    findings: report.findings, outputDir }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
