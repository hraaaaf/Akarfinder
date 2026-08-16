import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3209";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l9-akar-estimate-history");
const route = "/visual-qa/announcement-page-akar-estimate-history";
const scenarios = [
  { name: "history-390", state: "history", width: 390, height: 844, section: true, count: 3 },
  { name: "history-430", state: "history", width: 430, height: 932, section: true, count: 3 },
  { name: "history-768", state: "history", width: 768, height: 900, section: true, count: 3 },
  { name: "history-1280", state: "history", width: 1280, height: 900, section: true, count: 3 },
  { name: "single-390", state: "single", width: 390, height: 844, section: true, count: 1 },
  { name: "hidden-390", state: "hidden", width: 390, height: 844, section: false, count: 0 },
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

      const section = page.locator('[data-price-history="ann-l9"]');
      const sectionCount = await section.count();
      if (scenario.section && sectionCount !== 1) localFindings.push(`SECTION_COUNT_${sectionCount}_EXPECTED_1`);
      if (!scenario.section && sectionCount !== 0) localFindings.push(`SECTION_COUNT_${sectionCount}_EXPECTED_0`);

      if (scenario.section && sectionCount === 1) {
        const text = await section.evaluate((node) => node.textContent ?? "");
        if (!text.includes("Évolution du prix affiché")) localFindings.push("TITLE_MISSING");
        if (!text.includes("prix affichés observés")) localFindings.push("ASKING_PRICE_COPY_MISSING");
        if (!text.includes("pas de prix de transaction")) localFindings.push("TRANSACTION_DISCLAIMER_MISSING");
        if (!text.includes(`${scenario.count} observation`)) localFindings.push("OBSERVATION_COUNT_MISSING");
        if (text.includes("AkarEstimate")) localFindings.push("UNCERTIFIED_ESTIMATE_EXPOSED");
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
  schemaVersion: "ANNOUNCEMENT_PAGE_L9_AKAR_ESTIMATE_HISTORY_VISUAL_V1",
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
if (report.screenshotCount !== scenarios.length) throw new Error(`ANN-L9 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`ANN-L9 visual certification failed with ${findings.length} finding(s)`);
