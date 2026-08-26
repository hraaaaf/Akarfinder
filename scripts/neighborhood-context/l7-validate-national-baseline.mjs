import { readFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve(process.env.NCI_L7_OUTPUT_DIR ?? "artifacts/neighborhood-context-l7-national-baseline");
const report = JSON.parse(await readFile(path.join(outputDir, "report.json"), "utf8"));
const findings = [];

if (report.schema !== "NEIGHBORHOOD_CONTEXT_L7_NATIONAL_BASELINE_REPORT_V1") findings.push("schema");
if (report.ok !== true) findings.push("report_not_ok");
if (report.baseline_only !== true) findings.push("baseline_only");
if (report.thresholds_frozen !== false) findings.push("thresholds_must_remain_unfrozen");
if (report.production_provider_claim !== false) findings.push("production_provider_claim");
if (report.network_in_render_path !== false) findings.push("network_in_render_path");
if (!Array.isArray(report.findings) || report.findings.length !== 0) findings.push("baseline_findings");

const baseline = report.baseline ?? {};
const summary = baseline.summary ?? {};
if (summary.eligible_neighborhoods !== 21) findings.push("eligible_neighborhoods");
if (summary.eligible_cities !== 8) findings.push("eligible_cities");
if (summary.runtime_models !== 6) findings.push("runtime_models");
if (summary.missing_runtime_models !== 15) findings.push("missing_runtime_models");
if (!Array.isArray(baseline.neighborhoods) || baseline.neighborhoods.length !== 21) findings.push("neighborhood_rows");

const statusCounts = summary.status_counts ?? {};
const statusTotal = ["covered", "partial", "insufficient", "unavailable"]
  .reduce((sum, key) => sum + Number(statusCounts[key] ?? 0), 0);
if (statusTotal !== 21) findings.push("status_total");

const missingRows = Array.isArray(baseline.neighborhoods)
  ? baseline.neighborhoods.filter((row) => row.runtime_model_present === false)
  : [];
if (missingRows.some((row) => row.coverage_status !== "unavailable" || row.anchor_count !== 0)) {
  findings.push("missing_runtime_not_fail_closed");
}

if (findings.length > 0) {
  console.error(JSON.stringify({ ok: false, findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  eligible_neighborhoods: summary.eligible_neighborhoods,
  eligible_cities: summary.eligible_cities,
  runtime_models: summary.runtime_models,
  missing_runtime_models: summary.missing_runtime_models,
  status_counts: summary.status_counts,
  neighborhoods_with_anchors: summary.neighborhoods_with_anchors,
  total_anchors: summary.total_anchors,
  covered_rate_percent: summary.covered_rate_percent,
  thresholds_frozen: report.thresholds_frozen,
}, null, 2));
