import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve(process.env.NCI_L3_OUTPUT_DIR ?? "artifacts/neighborhood-context-l3");
const reportPath = path.join(outputDir, "report.json");
if (!fs.existsSync(reportPath)) throw new Error(`Missing L3 report: ${reportPath}`);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
if (!report.ok) throw new Error(`L3 report not ok: ${JSON.stringify(report.findings ?? [])}`);
if ((report.findings?.length ?? 0) !== 0) throw new Error("L3 findings must be zero");
if (report.summary?.model_count !== 6) throw new Error("L3 requires exactly six pilot read-models");
if ((report.summary?.total_anchors ?? 0) < 5) throw new Error("L3 must exercise at least five anchors");
if (report.network_in_render_path !== false) throw new Error("L3 render path must remain network-free");
for (const model of report.models ?? []) {
  if (model.anchor_count !== (model.anchors?.length ?? 0)) throw new Error(`anchor_count mismatch: ${model.canonical_neighborhood_id}`);
  for (const anchor of model.anchors ?? []) {
    if (anchor.freshness_status !== "fresh") throw new Error(`stale anchor published: ${anchor.poi_id}`);
    if (!anchor.poi_id || !anchor.source_id || !anchor.attribution || !anchor.observed_at) throw new Error(`missing provenance: ${anchor.poi_id}`);
  }
}
console.log(`L3 PASS: ${report.summary.model_count} models, ${report.summary.total_anchors} anchors, 0 findings, network-free render path.`);
