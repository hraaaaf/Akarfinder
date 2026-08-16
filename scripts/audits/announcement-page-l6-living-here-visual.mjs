import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3206";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l6-living-here");
const route = "/visual-qa/announcement-page-living-here";
const scenarios = [
  { name: "exact-390", state: "exact", width: 390, height: 844, section: true, map: true, routes: true, isochrones: true },
  { name: "exact-430", state: "exact", width: 430, height: 932, section: true, map: true, routes: true, isochrones: true },
  { name: "exact-768", state: "exact", width: 768, height: 900, section: true, map: true, routes: true, isochrones: true },
  { name: "exact-1280", state: "exact", width: 1280, height: 900, section: true, map: true, routes: true, isochrones: true },
  { name: "context-390", state: "context", width: 390, height: 844, section: true, map: true, routes: false, isochrones: false },
  { name: "context-1280", state: "context", width: 1280, height: 900, section: true, map: true, routes: false, isochrones: false },
  { name: "no-route-390", state: "no-route", width: 390, height: 844, section: true, map: true, routes: false, isochrones: false },
  { name: "hidden-390", state: "hidden", width: 390, height: 844, section: false, map: false, routes: false, isochrones: false },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height }, colorScheme: "light", reducedMotion: "reduce" });
    const failedResponses = [];
    const consoleErrors = [];
    const localFindings = [];
    page.on("response", (response) => { if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() }); });
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

    try {
      const response = await page.goto(`${baseUrl}${route}?state=${scenario.state}`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        h1Count: document.querySelectorAll("h1").length,
        mainCount: document.querySelectorAll("main").length,
      }));
      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (metrics.h1Count !== 1) localFindings.push(`H1_COUNT_${metrics.h1Count}`);
      if (metrics.mainCount !== 1) localFindings.push(`MAIN_COUNT_${metrics.mainCount}`);
      if (failedResponses.length > 0) localFindings.push(`RESOURCE_HTTP_ERRORS_${failedResponses.length}`);
      if (consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);

      const section = page.locator('[data-announcement-living-here="ann-l6"]');
      const sectionCount = await section.count();
      if (scenario.section && sectionCount !== 1) localFindings.push(`SECTION_COUNT_${sectionCount}_EXPECTED_1`);
      if (!scenario.section && sectionCount !== 0) localFindings.push(`SECTION_COUNT_${sectionCount}_EXPECTED_0`);

      if (scenario.section && sectionCount === 1) {
        const text = await section.innerText();
        const mapCount = await section.locator('[aria-label="Carte interactive des lieux à proximité"]').count();
        if (scenario.map && mapCount !== 1) localFindings.push(`MAP_COUNT_${mapCount}_EXPECTED_1`);
        if (!scenario.map && mapCount !== 0) localFindings.push(`MAP_COUNT_${mapCount}_EXPECTED_0`);
        if (scenario.map && mapCount === 1) {
          await page.waitForTimeout(500);
          const canvasCount = await section.locator("canvas.maplibregl-canvas").count();
          if (canvasCount !== 1) localFindings.push(`MAP_CANVAS_COUNT_${canvasCount}_EXPECTED_1`);
        }
        const hasRouteCopy = /\d+ min (à pied|en voiture)/.test(text);
        if (scenario.routes && !hasRouteCopy) localFindings.push("MEASURED_ROUTE_COPY_MISSING");
        if (!scenario.routes && hasRouteCopy) localFindings.push("UNMEASURED_ROUTE_COPY_EXPOSED");
        const isochroneButtons = await section.locator('[aria-label="Isochrones à pied"] button').count();
        if (scenario.isochrones && isochroneButtons !== 4) localFindings.push(`ISOCHRONE_BUTTON_COUNT_${isochroneButtons}_EXPECTED_4`);
        if (!scenario.isochrones && isochroneButtons !== 0) localFindings.push(`UNEXPECTED_ISOCHRONE_BUTTONS_${isochroneButtons}`);
        const verifiedPlaces = await section.locator("li").count();
        if (verifiedPlaces !== 4) localFindings.push(`POI_COUNT_${verifiedPlaces}_EXPECTED_4`);
        if (!text.includes("Fixture QA interne")) localFindings.push("ATTRIBUTION_MISSING");
        if (scenario.state === "context" && !text.includes("aucun temps de trajet depuis ce bien")) localFindings.push("CONTEXT_DISCLAIMER_MISSING");
      }

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({ ...scenario, screenshot, findings: localFindings, failedResponses, consoleErrors, ...metrics });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      localFindings.push(`AUDIT_ERROR_${message}`);
      results.push({ ...scenario, error: message, findings: localFindings, failedResponses, consoleErrors });
    } finally {
      findings.push(...localFindings.map((finding) => ({ scenario: scenario.name, finding })));
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "ANNOUNCEMENT_PAGE_L6_LIVING_HERE_VISUAL_V1",
  route,
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`ANN-L6 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`ANN-L6 visual certification failed with ${findings.length} finding(s)`);
