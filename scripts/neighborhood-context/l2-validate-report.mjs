import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve(process.env.NCI_L2_OUTPUT_DIR ?? "artifacts/neighborhood-context-l2");
const reportPath = path.join(outputDir, "report.json");
if (!fs.existsSync(reportPath)) throw new Error(`Missing L2 report: ${reportPath}`);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  throw new Error(`Neighborhood Context L2 gate failed: findings=${report.truth_findings?.length ?? "?"}, anchors=${report.summary?.total_anchors ?? "?"}`);
}
if ((report.truth_findings?.length ?? 0) !== 0) throw new Error("Truth findings must be zero");
if ((report.summary?.pilot_count ?? 0) !== 6) throw new Error("Exactly six pilot neighborhoods are required");
if ((report.summary?.total_anchors ?? 0) < 5) throw new Error("At least five truth-safe anchors are required to exercise L2 selection");
if ((report.summary?.inside_relations ?? 0) > 0) {
  throw new Error("L2 pilot unexpectedly published inside-boundary relations without a certified pilot boundary");
}
for (const pilot of report.pilots ?? []) {
  const categoryCounts = new Map();
  for (const anchor of pilot.anchors ?? []) {
    categoryCounts.set(anchor.category, (categoryCounts.get(anchor.category) ?? 0) + 1);
    if (anchor.relation === "unresolved") throw new Error(`Unresolved anchor published: ${anchor.poi_id}`);
    if (anchor.territorial_wording === "Dans le quartier" && anchor.relation !== "inside_certified_boundary") {
      throw new Error(`False inside wording: ${anchor.poi_id}`);
    }
  }
  for (const [category, count] of categoryCounts) {
    if (count > 2) throw new Error(`Category cap exceeded: ${pilot.canonical_neighborhood_id}/${category}/${count}`);
  }
}
console.log(`L2 PASS: ${report.summary.total_anchors} anchors across 6 pilots, ${report.summary.ready_pilots} ready, ${report.summary.partial_pilots} partial, 0 truth findings.`);
