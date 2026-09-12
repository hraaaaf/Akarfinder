import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3218";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/p1-home-after");
const expectedH1 = "1er moteur de recherche immobilier au Maroc";

const scenarios = [
  { name: "home-after-390", width: 390, height: 844 },
  { name: "home-after-768", width: 768, height: 1024 },
  { name: "home-after-1280", width: 1280, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({
      viewport: { width: scenario.width, height: scenario.height },
      colorScheme: "light",
      reducedMotion: "reduce",
    });

    const localFindings = [];
    const failedResponses = [];
    const consoleErrors = [];

    page.on("response", (response) => {
      if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    try {
      const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });

      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        h1Count: document.querySelectorAll("h1").length,
        mainCount: document.querySelectorAll("main").length,
        bodyHeight: document.body.scrollHeight,
      }));

      const h1 = (await page.locator("h1").first().textContent())?.trim() ?? "";
      const standardCount = await page.locator('[data-home-standard="home-v1"]').count();
      const trustCount = await page.locator('[data-home-trust-strip="v1"]').count();
      const vivreIciCount = await page.locator('[data-home-standard-slot="vivre-ici"]').count();
      const compactCitiesCount = await page.locator('[data-home-city-layout="compact-v1"]').count();
      const homeListingsCount = await page.locator('[data-home-listings]').count();
      const homeActionCount = await page.locator('[data-home-action]').count();
      const legacyCompagnonLinks = await page.locator('a[href="/compagnon"]').count();
      const intelligencePanelCount = await page.locator('[data-home-intelligence]').count();

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (metrics.h1Count !== 1) localFindings.push(`H1_COUNT_${metrics.h1Count}`);
      if (metrics.mainCount !== 1) localFindings.push(`MAIN_COUNT_${metrics.mainCount}`);
      if (h1 !== expectedH1) localFindings.push(`H1_MISMATCH_${h1}`);
      if (standardCount !== 1) localFindings.push(`HOME_STANDARD_COUNT_${standardCount}`);
      if (trustCount !== 1) localFindings.push(`TRUST_STRIP_COUNT_${trustCount}`);
      if (vivreIciCount !== 1) localFindings.push(`VIVRE_ICI_SLOT_COUNT_${vivreIciCount}`);
      if (compactCitiesCount !== 1) localFindings.push(`COMPACT_CITIES_COUNT_${compactCitiesCount}`);
      if (homeListingsCount !== 0) localFindings.push(`HOME_LISTINGS_PRESENT_${homeListingsCount}`);
      if (homeActionCount !== 3) localFindings.push(`HOME_ACTION_COUNT_${homeActionCount}`);
      if (legacyCompagnonLinks !== 0) localFindings.push(`LEGACY_COMPAGNON_LINKS_${legacyCompagnonLinks}`);
      if (intelligencePanelCount !== 0) localFindings.push(`INTELLIGENCE_PANEL_PRESENT_${intelligencePanelCount}`);
      if (failedResponses.length > 0) localFindings.push(`RESOURCE_HTTP_ERRORS_${failedResponses.length}`);
      if (consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

      results.push({
        ...scenario,
        screenshot,
        h1,
        findings: localFindings,
        failedResponses,
        consoleErrors,
        standardCount,
        trustCount,
        vivreIciCount,
        compactCitiesCount,
        homeListingsCount,
        homeActionCount,
        legacyCompagnonLinks,
        intelligencePanelCount,
        ...metrics,
      });
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
  schemaVersion: "AKARFINDER_P1_HOME_AFTER_V1",
  generatedAt: new Date().toISOString(),
  gitSha: process.env.GITHUB_SHA ?? null,
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));

if (report.screenshotCount !== scenarios.length) throw new Error(`P1 HOME AFTER capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`P1 HOME AFTER certification failed with ${findings.length} finding(s)`);
