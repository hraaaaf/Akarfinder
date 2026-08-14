import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const metricsPath = process.env.AUDIT_METRICS_PATH ?? "data/audits/ui-all-pages-baseline/metrics.json";
const outputPath = process.env.AUDIT_CERTIFICATION_PATH ?? "data/audits/ui-all-pages-baseline/certification.json";
const report = JSON.parse(await readFile(metricsPath, "utf8"));

const certification = {
  schemaVersion: "UI_ALL_PAGES_CERTIFICATION_V1",
  generatedAt: new Date().toISOString(),
  inventoryPageCount: report.inventoryPageCount,
  renderablePageCount: report.renderablePageCount,
  blockedPageCount: report.blockedPageCount,
  expectedScreenshotCount: report.expectedScreenshotCount,
  screenshotCount: report.screenshotCount,
  findingCount: report.findingCount,
  findingRouteCount: report.findingRouteCount,
  blocked: report.blocked,
  pass:
    report.screenshotCount === report.expectedScreenshotCount &&
    report.findingCount === 0 &&
    report.findingRouteCount === 0,
};

await writeFile(path.resolve(outputPath), `${JSON.stringify(certification, null, 2)}\n`);
console.log(JSON.stringify(certification, null, 2));

if (!certification.pass) {
  throw new Error(
    `All-pages certification failed: screenshots ${certification.screenshotCount}/${certification.expectedScreenshotCount}, findings ${certification.findingCount} across ${certification.findingRouteCount} routes`,
  );
}
