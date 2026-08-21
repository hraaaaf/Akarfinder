import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/city-colors-before";
const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const rows = [];
const findings = [];

for (const [viewport, width, height] of viewports) {
  const page = await browser.newPage({ viewport: { width, height } });
  const response = await page.goto(`${baseURL}/map?layer=explore`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForSelector("[data-p4-map-layout]", { timeout: 20_000 });
  await page.waitForSelector(".maplibregl-map", { timeout: 20_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => null);
  await page.waitForTimeout(750);

  const metrics = await page.evaluate(() => {
    const labels = [...document.querySelectorAll(".maplibre-cluster-marker")]
      .map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const shell = document.querySelector('[data-akarfinder-generic-map-shell="true"]');
    const legend = document.querySelector('[data-akarfinder-intelligence-legend="territory"]');
    const header = document.querySelector("header");
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hasMapLibre: Boolean(document.querySelector(".maplibregl-map")),
      genericNationalShell: Boolean(shell),
      nationalLegend: Boolean(legend),
      clusterMarkerCount: labels.length,
      clusterLabels: labels,
      exactWhiteHeader: header?.getAttribute("data-search-global-header") === "exact-white",
      cityColorOverviewPresent: Boolean(document.querySelector('[data-akarfinder-city-color-overview="true"]')),
    };
  });

  const status = response?.status() ?? 0;
  if (status === 0 || status >= 400) findings.push({ viewport, code: "HTTP", detail: status });
  if (!metrics.hasMapLibre) findings.push({ viewport, code: "MAPLIBRE_MISSING" });
  if (!metrics.genericNationalShell) findings.push({ viewport, code: "NATIONAL_SHELL_MISSING" });
  if (metrics.scrollWidth > metrics.clientWidth + 1) findings.push({ viewport, code: "HORIZONTAL_OVERFLOW", detail: `${metrics.scrollWidth}>${metrics.clientWidth}` });

  const screenshot = `map-national-${viewport}.png`;
  await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false });
  rows.push({ viewport, width, height, status, screenshot, ...metrics });
  await page.close();
}

await browser.close();

const result = {
  schema: "AKARFINDER_CITY_COLORS_BEFORE_V1",
  route: "/map?layer=explore",
  expectedScreenshotCount: viewports.length,
  screenshotCount: rows.length,
  findingCount: findings.length,
  rows,
  findings,
};

await fs.writeFile(path.join(outputDir, "metrics.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  screenshotCount: result.screenshotCount,
  expectedScreenshotCount: result.expectedScreenshotCount,
  findingCount: result.findingCount,
  findings: result.findings,
}, null, 2));
if (rows.length !== viewports.length || findings.length) process.exit(1);
