import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3219";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/hvr-4-neighborhood-action");
const scenarios = [
  { name: "hvr4-home-390x844", width: 390, height: 844 },
  { name: "hvr4-home-430x932", width: 430, height: 932 },
  { name: "hvr4-home-768x900", width: 768, height: 900 },
  { name: "hvr4-home-1280x900", width: 1280, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height }, colorScheme: "light", reducedMotion: "reduce" });
    const localFindings = [];
    const consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

    try {
      const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      // HVR-4 formerly required the neighborhood teaser on Home. The current product decision
      // keeps Vivre ici as a standalone destination but expressly removes its homepage promo.
      const sectionCount = await page.locator('[data-home-neighborhood-intelligence="nci-l5"], [data-home-standard-slot="vivre-ici"]').count();
      const cardCount = await page.locator("[data-home-neighborhood-card]").count();
      const mapNavCount = await page.locator('a[href="/map"]').count();
      const metrics = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (sectionCount !== 0 || cardCount !== 0) localFindings.push(`REJECTED_HOME_MAP_PROMO_${sectionCount}_${cardCount}`);
      if (mapNavCount < 1) localFindings.push("STANDALONE_VIVRE_ICI_NAV_MISSING");
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({ ...scenario, screenshot, sectionCount, cardCount, mapNavCount, findings: localFindings, consoleErrors, ...metrics });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      localFindings.push(`AUDIT_ERROR_${message}`);
      results.push({ ...scenario, findings: localFindings, consoleErrors, error: message });
    } finally {
      findings.push(...localFindings.map((finding) => ({ scenario: scenario.name, finding })));
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = { schemaVersion: "HVR_4_STANDALONE_VIVRE_ICI_HOME_BOUNDARY_V1", generatedAt: new Date().toISOString(), scenarioCount: scenarios.length, screenshotCount: results.filter((item) => item.screenshot).length, findingCount: findings.length, findings, results };
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`HVR-4 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`HVR-4 visual proof failed with ${findings.length} finding(s)`);
