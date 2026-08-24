import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve(process.env.NCI_L1_OUTPUT_DIR ?? "artifacts/neighborhood-context-l1");
const reportPath = path.join(outputDir, "report.json");
if (!fs.existsSync(reportPath)) throw new Error(`Missing L1 report: ${reportPath}`);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  throw new Error(
    `Neighborhood Context L1 gate failed: available=${report.summary?.available_pilots ?? "?"}/${report.summary?.pilot_count ?? "?"}, findings=${report.truth_findings?.length ?? "?"}`,
  );
}
if ((report.truth_findings?.length ?? 0) !== 0) throw new Error("Truth findings must be zero");
if ((report.summary?.available_pilots ?? 0) < (report.minimum_available_pilots ?? 4)) {
  throw new Error("Available pilot threshold not met");
}
if ((report.summary?.certified_seed_pilots ?? 0) > 0 && !report.certified_seed?.run_id) {
  throw new Error("Certified seed usage requires explicit source run provenance");
}
console.log(
  `L1 PASS: ${report.summary.available_pilots}/${report.summary.pilot_count} available pilots ` +
  `(live=${report.summary.live_pilots}, certified_seed=${report.summary.certified_seed_pilots}), ` +
  `${report.summary.total_pois} canonical POIs, 0 truth findings.`,
);
