import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildNeighborhoodContextRuntimeCatalog,
  validateNeighborhoodContextReadModel,
} from "@/lib/neighborhood-context/read-model";

async function main() {
  const outputDir = path.resolve(process.env.NCI_L3_OUTPUT_DIR ?? "artifacts/neighborhood-context-l3");
  const now = new Date();
  const models = buildNeighborhoodContextRuntimeCatalog(now);
  const findings = models.flatMap((model) =>
    validateNeighborhoodContextReadModel(model).map((finding) => `${model.canonical_neighborhood_id}:${finding}`),
  );
  const summary = {
    model_count: models.length,
    covered: models.filter((model) => model.coverage_status === "covered").length,
    partial: models.filter((model) => model.coverage_status === "partial").length,
    insufficient: models.filter((model) => model.coverage_status === "insufficient").length,
    unavailable: models.filter((model) => model.coverage_status === "unavailable").length,
    total_anchors: models.reduce((sum, model) => sum + model.anchor_count, 0),
    unique_pois: new Set(models.flatMap((model) => model.anchors.map((anchor) => anchor.poi_id))).size,
  };
  const report = {
    schema: "NEIGHBORHOOD_CONTEXT_L3_READ_MODEL_REPORT_V1",
    generated_at: now.toISOString(),
    ok: findings.length === 0 && models.length === 6 && summary.total_anchors >= 5,
    source_mode: "ann-l5-certified-seed",
    network_in_render_path: false,
    summary,
    findings,
    models,
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
