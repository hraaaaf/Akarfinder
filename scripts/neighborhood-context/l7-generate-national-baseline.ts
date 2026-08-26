import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildNeighborhoodContextNationalBaseline,
  validateNeighborhoodContextNationalBaseline,
} from "@/lib/neighborhood-context/national-baseline";

async function main() {
  const outputDir = path.resolve(process.env.NCI_L7_OUTPUT_DIR ?? "artifacts/neighborhood-context-l7-national-baseline");
  const now = new Date();
  const baseline = buildNeighborhoodContextNationalBaseline(now);
  const findings = validateNeighborhoodContextNationalBaseline(baseline);

  const report = {
    schema: "NEIGHBORHOOD_CONTEXT_L7_NATIONAL_BASELINE_REPORT_V1",
    generated_at: now.toISOString(),
    ok: findings.length === 0,
    baseline_only: true,
    thresholds_frozen: false,
    production_provider_claim: false,
    network_in_render_path: false,
    findings,
    baseline,
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
