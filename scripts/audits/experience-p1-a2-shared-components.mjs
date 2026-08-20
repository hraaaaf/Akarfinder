import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/experience-p1-a2-shared-components";
const routes = [
  ["ui-primitives", "/demo/ui-primitives"],
  ["alerts", "/alerts"],
  ["favorites", "/favorites"],
  ["mon-projet", "/mon-projet"],
  ["search", "/search"],
  ["map", "/map?city=rabat&layer=explore"],
];
const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const findings = [];
const rows = [];

for (const [routeName, route] of routes) {
  for (const [viewportName, width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForFunction(() => document.querySelector("h1") !== null, { timeout: 15_000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(routeName === "map" ? 2_000 : 500);
    const status = response?.status() ?? 0;
    const metrics = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() ?? "",
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      uiContract: document.querySelector('[data-ui-contract="p1-a2"]') !== null,
      exactWhiteHeader: document.querySelector('header[data-search-global-header="exact-white"]') !== null,
    }));
    const screenshot = `${routeName}-${viewportName}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

    if (status >= 400 || status === 0) findings.push({ routeName, viewportName, code: "HTTP", detail: status });
    if (!metrics.h1) findings.push({ routeName, viewportName, code: "H1_MISSING" });
    if (metrics.scrollWidth > metrics.clientWidth + 1) findings.push({ routeName, viewportName, code: "HORIZONTAL_OVERFLOW", detail: `${metrics.scrollWidth}>${metrics.clientWidth}` });
    if (routeName === "ui-primitives" && !metrics.uiContract) findings.push({ routeName, viewportName, code: "UI_CONTRACT_MISSING" });
    if ((routeName === "search" || routeName === "map") && !metrics.exactWhiteHeader) findings.push({ routeName, viewportName, code: "C2_HEADER_DRIFT" });
    rows.push({ routeName, route, viewportName, width, height, status, screenshot, ...metrics });
    await page.close();
  }
}
await browser.close();

const result = {
  schema: "EXPERIENCE_P1_A2_SHARED_COMPONENTS_V1",
  routeCount: routes.length,
  viewportCount: viewports.length,
  expectedScreenshotCount: routes.length * viewports.length,
  screenshotCount: rows.length,
  findingCount: findings.length,
  findingRouteCount: new Set(findings.map((item) => item.routeName)).size,
  rows,
  findings,
};
await fs.writeFile(path.join(outputDir, "metrics.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ routeCount: result.routeCount, viewportCount: result.viewportCount, screenshotCount: result.screenshotCount, expectedScreenshotCount: result.expectedScreenshotCount, findingCount: result.findingCount, findingRouteCount: result.findingRouteCount }, null, 2));
if (findings.length) process.exit(1);
