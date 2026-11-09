import { readFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve(process.env.NCI_L7_OUTPUT_DIR ?? "artifacts/neighborhood-context-l7-refresh-quality");
const report = JSON.parse(await readFile(path.join(outputDir, "quality-report.json"), "utf8"));
const plan = JSON.parse(await readFile(path.join(outputDir, "refresh-plan.json"), "utf8"));
const findings = [];

if (report.schema !== "NEIGHBORHOOD_CONTEXT_L7_QUALITY_FRESHNESS_REPORT_V1") findings.push("schema");
if (report.ok !== true) findings.push("report_not_ok");
if (report.production_provider_claim !== false) findings.push("production_provider_claim");
if (report.thresholds_frozen !== false) findings.push("thresholds_frozen");
if (report.network_in_render_path !== false) findings.push("network_in_render_path");
if (report.default_refresh_mode !== "plan") findings.push("default_refresh_mode");
if (report.default_refresh_network_calls !== 0) findings.push("default_refresh_network_calls");
if (report.live_requires_configured_endpoints !== true) findings.push("live_requires_configured_endpoints");

if (report.freshness_policy?.max_age_ms !== 2_592_000_000) findings.push("freshness_max_age_ms");
if (report.freshness_policy?.max_age_days !== 30) findings.push("freshness_max_age_days");

const inventory = report.target_inventory ?? {};
if (inventory.total !== 21) findings.push("target_total");
if (inventory.queryable !== 17) findings.push("queryable_targets");
if (inventory.blocked_missing_reference_point !== 4) findings.push("blocked_targets");
const expectedBlocked = [
  "district_casablanca_ain_diab",
  "district_casablanca_bourgogne",
  "district_casablanca_racine",
  "district_rabat_souissi",
];
if (JSON.stringify(inventory.blocked_ids ?? []) !== JSON.stringify(expectedBlocked)) findings.push("blocked_ids");

const baseline = report.baseline?.summary ?? {};
if (baseline.eligible_neighborhoods !== 21) findings.push("baseline_neighborhoods");
if (baseline.eligible_cities !== 8) findings.push("baseline_cities");
if (baseline.runtime_models !== 6) findings.push("baseline_runtime_models");
if (baseline.missing_runtime_models !== 15) findings.push("baseline_missing_models");
// Anchors depend on the explicit 30-day source TTL. The August 2026 seed
// correctly yields ZERO in November 2026; never demand the historical 12.
const rows = Array.isArray(report.baseline?.neighborhoods) ? report.baseline.neighborhoods : [];
const actualAnchors = rows.flatMap((row) => Array.isArray(row.anchors) ? row.anchors : []);
const actualCount = actualAnchors.length;
if (rows.length !== 21) findings.push("baseline_row_count");
if (baseline.total_anchors !== actualCount) findings.push("baseline_anchor_count_mismatch");
if (baseline.neighborhoods_with_anchors !== rows.filter((row) => (row.anchors?.length ?? 0) > 0).length) {
  findings.push("baseline_neighborhoods_with_anchors_mismatch");
}
if (rows.some((row) => row.anchor_count !== (row.anchors?.length ?? 0))) {
  findings.push("baseline_row_anchor_count_mismatch");
}
const reportTime = Date.parse(report.generated_at ?? "");
if (!Number.isFinite(reportTime)) findings.push("invalid_report_timestamp");
for (const anchor of actualAnchors) {
  const seen = Date.parse(anchor.observed_at ?? "");
  if (anchor.freshness_status !== "fresh" ||
      !Number.isFinite(seen) ||
      !Number.isFinite(reportTime) ||
      seen > reportTime ||
      reportTime - seen > 30 * 24 * 60 * 60 * 1000) {
    findings.push("stale_or_future_poi_anchor");
    break;
  }
}
const provenance = report.provenance_audit ?? {};
if (provenance.anchor_count !== actualCount) findings.push("provenance_anchor_count_mismatch");
if (provenance.missing_evidence_count !== 0) findings.push("provenance_missing_evidence");
if (!Array.isArray(provenance.findings) || provenance.findings.length !== 0) findings.push("provenance_findings");

const cost = report.operational_cost ?? {};
if (cost.default_network_calls !== 0) findings.push("cost_default_network_calls");
if (cost.live_queryable_targets !== 17) findings.push("cost_live_queryable_targets");
if (cost.provider_monetary_cost !== null) findings.push("provider_monetary_cost_invented");
if (cost.monetary_cost_certified !== false) findings.push("provider_monetary_cost_certified");

const size = report.read_model_size ?? {};
if (size.runtime_models !== 6) findings.push("size_runtime_models");
for (const key of ["serialized_bytes", "serialized_kib", "baseline_serialized_bytes", "baseline_serialized_kib"]) {
  if (!Number.isFinite(size[key]) || size[key] <= 0) findings.push(`size_${key}`);
}

if (!Array.isArray(report.canaries) || report.canaries.length !== 5) findings.push("canary_count");
if (!Array.isArray(report.regression_check?.findings) || report.regression_check.findings.length !== 0) findings.push("self_regressions");

const latency = report.read_model_latency_ms ?? {};
for (const key of ["median", "p95", "max"]) {
  if (!Number.isFinite(latency[key]) || latency[key] < 0) findings.push(`latency_${key}`);
}
if (latency.gate_threshold_ms !== null) findings.push("latency_threshold_invented");

if (!Array.isArray(report.findings) || report.findings.length !== 0) findings.push("report_findings");

if (plan.schema !== "NEIGHBORHOOD_CONTEXT_L7_REFRESH_PLAN_V1") findings.push("plan_schema");
if (plan.mode !== "plan") findings.push("plan_mode");
if (plan.network_calls !== 0) findings.push("plan_network_calls");
if (plan.live_requires_configured_endpoints !== true) findings.push("plan_live_config");
if (plan.production_provider_claim !== false) findings.push("plan_production_claim");
if (plan.targets !== 21 || plan.queryable_targets !== 17 || plan.blocked_targets !== 4) findings.push("plan_counts");
if (!Array.isArray(plan.findings) || plan.findings.length !== 0) findings.push("plan_findings");

if (findings.length) {
  console.error(JSON.stringify({ ok: false, findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  targets: inventory,
  baseline,
  provenance_audit: provenance,
  freshness_policy: report.freshness_policy,
  operational_cost: report.operational_cost,
  read_model_size: report.read_model_size,
  canaries: report.canaries,
  read_model_latency_ms: report.read_model_latency_ms,
  thresholds_frozen: report.thresholds_frozen,
  default_refresh_network_calls: report.default_refresh_network_calls,
}, null, 2));
