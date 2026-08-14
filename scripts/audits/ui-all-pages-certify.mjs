import { readFile } from "node:fs/promises";

const metricsPath = process.env.METRICS_PATH ?? "data/audits/ui-all-pages-baseline/metrics.json";
const report = JSON.parse(await readFile(metricsPath, "utf8"));

const errors = [];
const allowedBlockedModes = new Set(["data-fixture-required", "qa-fixture-required"]);

if (report.screenshotCount !== report.expectedScreenshotCount) {
  errors.push(`incomplete screenshots: ${report.screenshotCount}/${report.expectedScreenshotCount}`);
}
if (report.findingCount !== 0) {
  errors.push(`unexpected findings: ${report.findingCount} across ${report.findingRouteCount} route(s)`);
}
if (!Array.isArray(report.blocked)) {
  errors.push("blocked-page list missing");
} else {
  const invalidBlocked = report.blocked.filter((page) => !allowedBlockedModes.has(page.auditMode) || !page.blocker);
  if (invalidBlocked.length > 0) {
    errors.push(`invalid blocked-page contracts: ${invalidBlocked.map((page) => page.routePattern).join(", ")}`);
  }
}

console.log(JSON.stringify({
  schemaVersion: "UI_ALL_PAGES_CERTIFICATION_V2",
  inventoryPageCount: report.inventoryPageCount,
  renderablePageCount: report.renderablePageCount,
  blockedPageCount: report.blockedPageCount,
  expectedScreenshotCount: report.expectedScreenshotCount,
  screenshotCount: report.screenshotCount,
  findingCount: report.findingCount,
  findingRouteCount: report.findingRouteCount,
  blockedRoutes: Array.isArray(report.blocked) ? report.blocked.map((page) => ({ routePattern: page.routePattern, auditMode: page.auditMode })) : [],
  errors,
}, null, 2));

if (errors.length > 0) {
  throw new Error(`All-pages certification failed: ${errors.join("; ")}`);
}
