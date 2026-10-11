import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve(process.env.NCI_L3_OUTPUT_DIR ?? "artifacts/neighborhood-context-l3");
const reportPath = path.join(outputDir, "report.json");
if (!fs.existsSync(reportPath)) throw new Error(`Missing L3 report: ${reportPath}`);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
if (!report.ok) throw new Error(`L3 report not ok: ${JSON.stringify(report.findings ?? [])}`);
if ((report.findings?.length ?? 0) !== 0) throw new Error("L3 findings must be zero");
if (report.summary?.model_count !== 6) throw new Error("L3 requires exactly six pilot read-models");
const maarif = (report.models ?? []).find((model) => model.canonical_neighborhood_id === "district_casablanca_maarif");
if (!maarif) throw new Error("L3 requires the Maârif pilot read-model");
if (maarif.source?.mode !== "maarif-couche2-osm-refresh") throw new Error(`Maârif runtime source mismatch: ${maarif.source?.mode}`);
if (maarif.coverage_status !== "partial" || maarif.anchor_count !== 4) {
  throw new Error(`Maârif current context must be partial/4, got ${maarif.coverage_status}/${maarif.anchor_count}`);
}
if ((maarif.anchors ?? []).some((anchor) =>
  anchor.relation !== "near_certified_reference"
  || anchor.territorial_wording !== "Autour du repère quartier"
)) {
  throw new Error("Maârif current context must remain proximity-only");
}
const legacy = (report.models ?? []).filter((model) => model.canonical_neighborhood_id !== "district_casablanca_maarif");
if (!legacy.every((model) => model.anchor_count === 0 && model.coverage_status === "unavailable")) {
  throw new Error("Expired legacy contexts must remain fail-closed");
}
if (!report.truth_gate || !Object.values(report.truth_gate).every(Boolean)) {
  throw new Error(`L3 truth_gate failed: ${JSON.stringify(report.truth_gate ?? null)}`);
}
if (report.network_in_render_path !== false) throw new Error("L3 render path must remain network-free");
for (const model of report.models ?? []) {
  if (model.anchor_count !== (model.anchors?.length ?? 0)) throw new Error(`anchor_count mismatch: ${model.canonical_neighborhood_id}`);
  for (const anchor of model.anchors ?? []) {
    if (anchor.freshness_status !== "fresh") throw new Error(`stale anchor published: ${anchor.poi_id}`);
    if (!anchor.poi_id || !anchor.source_id || !anchor.attribution || !anchor.observed_at) throw new Error(`missing provenance: ${anchor.poi_id}`);
  }
}
console.log(`L3 PASS: ${report.summary.model_count} models, Maârif partial/4 from Couche 2 refresh, expired legacy contexts fail-closed, 0 findings, network-free render path.`);
