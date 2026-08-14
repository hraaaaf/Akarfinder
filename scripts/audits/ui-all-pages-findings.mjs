import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const inputPath = process.env.BASELINE_METRICS ?? "data/audits/ui-all-pages-baseline/metrics.json";
const outputDir = process.env.FINDINGS_OUTPUT_DIR ?? "data/audits/ui-all-pages-findings";

const report = JSON.parse(await readFile(inputPath, "utf8"));
const findings = Array.isArray(report.findings) ? report.findings : [];

function familyOf(finding) {
  if (finding.startsWith("HORIZONTAL_OVERFLOW_")) return "overflow";
  if (finding.startsWith("HTTP_")) return "http";
  if (finding.startsWith("REDIRECT_")) return "redirect";
  if (finding === "MISSING_H1") return "h1";
  if (finding.startsWith("CONSOLE_ERRORS_")) return "console";
  if (finding.startsWith("AUDIT_ERROR_")) return "audit_error";
  return "other";
}

const byRoute = new Map();
const byFamily = new Map();
for (const item of findings) {
  const family = familyOf(item.finding);
  const routeEntry = byRoute.get(item.routePattern) ?? { routePattern: item.routePattern, findings: [], families: new Set(), viewports: new Set() };
  routeEntry.findings.push(item);
  routeEntry.families.add(family);
  routeEntry.viewports.add(item.viewport);
  byRoute.set(item.routePattern, routeEntry);

  const familyEntry = byFamily.get(family) ?? { family, count: 0, routes: new Set() };
  familyEntry.count += 1;
  familyEntry.routes.add(item.routePattern);
  byFamily.set(family, familyEntry);
}

const routeSummary = [...byRoute.values()]
  .map((entry) => ({
    routePattern: entry.routePattern,
    findingCount: entry.findings.length,
    families: [...entry.families].sort(),
    viewports: [...entry.viewports].sort(),
    findings: entry.findings,
  }))
  .sort((a, b) => b.findingCount - a.findingCount || a.routePattern.localeCompare(b.routePattern));

const familySummary = [...byFamily.values()]
  .map((entry) => ({ family: entry.family, count: entry.count, routeCount: entry.routes.size, routes: [...entry.routes].sort() }))
  .sort((a, b) => b.routeCount - a.routeCount || b.count - a.count || a.family.localeCompare(b.family));

const cleanRoutes = (report.results ?? [])
  .map((item) => item.routePattern)
  .filter(Boolean)
  .filter((route, index, all) => all.indexOf(route) === index)
  .filter((route) => !byRoute.has(route))
  .sort();

const classified = {
  schemaVersion: "UI_ALL_PAGES_FINDINGS_V1",
  sourceSchemaVersion: report.schemaVersion ?? null,
  inventoryPageCount: report.inventoryPageCount ?? null,
  renderablePageCount: report.renderablePageCount ?? null,
  blockedPageCount: report.blockedPageCount ?? null,
  screenshotCount: report.screenshotCount ?? null,
  findingCount: findings.length,
  findingRouteCount: routeSummary.length,
  cleanRouteCount: cleanRoutes.length,
  familySummary,
  routeSummary,
  cleanRoutes,
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "findings.json"), `${JSON.stringify(classified, null, 2)}\n`);

const lines = [
  "# UI All Pages — Findings",
  "",
  `- Screenshots: ${classified.screenshotCount ?? "n/a"}`,
  `- Routes with findings: ${classified.findingRouteCount}`,
  `- Clean routes: ${classified.cleanRouteCount}`,
  `- Findings: ${classified.findingCount}`,
  "",
  "## Families",
  "",
  ...familySummary.map((entry) => `- ${entry.family}: ${entry.count} findings / ${entry.routeCount} routes`),
  "",
  "## Routes",
  "",
  ...routeSummary.map((entry) => `- ${entry.routePattern}: ${entry.findingCount} — ${entry.families.join(", ")}`),
  "",
];
await writeFile(path.join(outputDir, "findings.md"), `${lines.join("\n")}\n`);

console.log(JSON.stringify({
  screenshotCount: classified.screenshotCount,
  findingCount: classified.findingCount,
  findingRouteCount: classified.findingRouteCount,
  cleanRouteCount: classified.cleanRouteCount,
  families: familySummary.map(({ family, count, routeCount }) => ({ family, count, routeCount })),
}, null, 2));
