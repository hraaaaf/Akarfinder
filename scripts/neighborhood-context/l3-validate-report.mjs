import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve(process.env.NCI_L3_OUTPUT_DIR ?? "artifacts/neighborhood-context-l3");
const reportPath = path.join(outputDir, "report.json");
if (!fs.existsSync(reportPath)) throw new Error(`Missing L3 report: ${reportPath}`);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

if (!report.ok) throw new Error(`L3 technical truth gate not met: ${JSON.stringify(report.findings ?? [])}`);
if ((report.findings?.length ?? 0) !== 0) throw new Error("L3 runtime findings must be zero");
if (report.summary?.model_count !== 6) throw new Error("L3 requires exactly six pilot read-models");
if (!Array.isArray(report.models) || report.models.length !== 6) throw new Error("L3 report must provide six actual models");
if (report.network_in_render_path !== false) throw new Error("L3 render path must remain network-free");

// Historical seed exercises >= 5 anchors *only at its original August 2026 date*.
// It MUST NOT be reinterpreted as fresh merely so the CI can pass in November.
if (report.historical_fixture?.ok !== true ||
    report.historical_fixture?.as_of !== "2026-08-24T20:50:00.000Z" ||
    report.historical_fixture?.summary?.model_count !== 6 ||
    (report.historical_fixture?.summary?.total_anchors ?? 0) < 5 ||
    (report.historical_fixture?.findings?.length ?? 0) !== 0) {
  throw new Error("L3 historical regression fixture failed");
}
const expectedReady = report.summary.total_anchors >= 5;
if (report.live_coverage_ready !== expectedReady) throw new Error("L3 live coverage readiness misrepresented");
if (report.source_is_expired === true && report.summary.total_anchors !== 0) {
  throw new Error("L3 expired seed must not publish any anchors");
}
for (const model of report.models ?? []) {
  if (model.anchor_count !== (model.anchors?.length ?? 0)) {
    throw new Error(`anchor_count mismatch: ${model.canonical_neighborhood_id}`);
  }
  for (const anchor of model.anchors ?? []) {
    if (anchor.freshness_status !== "fresh") throw new Error(`stale anchor published: ${anchor.poi_id}`);
    if (!anchor.poi_id || !anchor.source_id || !anchor.attribution || !anchor.observed_at) {
      throw new Error(`missing provenance: ${anchor.poi_id}`);
    }
  }
}
console.log(`L3 technical PASS: ${report.summary.model_count} live models, ${report.summary.total_anchors} current anchors, ${report.historical_fixture.summary.total_anchors} historical-fixture anchors, live_coverage_ready=${report.live_coverage_ready}, 0 findings; network-free.`);
