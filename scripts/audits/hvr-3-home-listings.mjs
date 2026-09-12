import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3218";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/hvr-3-home-listings");
const scenarios = [
  { name: "hvr3-home-390x844", width: 390, height: 844 },
  { name: "hvr3-home-430x932", width: 430, height: 932 },
  { name: "hvr3-home-768x900", width: 768, height: 900 },
  { name: "hvr3-home-1280x900", width: 1280, height: 900 },
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
      const response = await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
      await page.locator('[data-home-standard="home-v1"]').waitFor({ state: "visible", timeout: 20_000 });
      const metrics = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      const sectionCount = await page.locator("[data-home-listings]").count();
      const cardCount = await page.locator("[data-home-listing-card]").count();
      const illustrationCount = await page.getByText("Illustration", { exact: true }).count();
      const vivreIciCount = await page.locator('[data-home-standard-slot="vivre-ici"]').count();

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (sectionCount !== 0) localFindings.push(`HOME_LISTINGS_SECTION_${sectionCount}`);
      if (cardCount !== 0) localFindings.push(`HOME_LISTING_CARDS_${cardCount}`);
      if (illustrationCount !== 0) localFindings.push(`GENERIC_ILLUSTRATIONS_${illustrationCount}`);
      if (vivreIciCount !== 1) localFindings.push(`VIVRE_ICI_SLOT_${vivreIciCount}`);
      if (consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({ ...scenario, screenshot, sectionCount, cardCount, illustrationCount, vivreIciCount, findings: localFindings, consoleErrors, ...metrics });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      localFindings.push(`AUDIT_ERROR_${message}`);
      results.push({ ...scenario, findings: localFindings, consoleErrors, error: message });
    } finally {
      findings.push(...localFindings.map((finding) => ({ scenario: scenario.name, finding })));
      await page.close();
    }
  }
} finally { await browser.close(); }

const report = { schemaVersion: "HVR_3_HOME_LISTINGS_EXCLUSION_PROOF_V2", generatedAt: new Date().toISOString(), scenarioCount: scenarios.length, screenshotCount: results.filter((item) => item.screenshot).length, findingCount: findings.length, findings, results };
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`HVR-3 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`HVR-3 HOME V1 boundary proof failed with ${findings.length} finding(s)`);
