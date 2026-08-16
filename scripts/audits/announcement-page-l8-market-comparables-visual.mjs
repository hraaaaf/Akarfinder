import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3208";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l8-market-comparables");
const route = "/visual-qa/announcement-page-market-comparables";
const scenarios = [
  { name: "neighborhood-390", state: "neighborhood", width: 390, height: 844, section: true, scope: "neighborhood", position: true },
  { name: "neighborhood-430", state: "neighborhood", width: 430, height: 932, section: true, scope: "neighborhood", position: true },
  { name: "neighborhood-768", state: "neighborhood", width: 768, height: 900, section: true, scope: "neighborhood", position: true },
  { name: "neighborhood-1280", state: "neighborhood", width: 1280, height: 900, section: true, scope: "neighborhood", position: true },
  { name: "city-390", state: "city", width: 390, height: 844, section: true, scope: "city", position: true },
  { name: "city-1280", state: "city", width: 1280, height: 900, section: true, scope: "city", position: true },
  { name: "no-position-390", state: "no-position", width: 390, height: 844, section: true, scope: "neighborhood", position: false },
  { name: "hidden-390", state: "hidden", width: 390, height: 844, section: false, scope: null, position: false },
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

      const section = page.locator('[data-market-comparables="ann-l8"]');
      const sectionCount = await section.count();
      if (scenario.section && sectionCount !== 1) localFindings.push(`SECTION_COUNT_${sectionCount}_EXPECTED_1`);
      if (!scenario.section && sectionCount !== 0) localFindings.push(`SECTION_COUNT_${sectionCount}_EXPECTED_0`);

      if (scenario.section && sectionCount === 1) {
        // Validate authored copy rather than CSS-transformed presentation text.
        // innerText uppercases metric labels because the UI intentionally uses text-transform.
        const text = (await section.textContent()) ?? "";
        if (!text.includes("Marché & comparables")) localFindings.push("TITLE_MISSING");
        if (!text.includes("Médiane observée")) localFindings.push("MEDIAN_MISSING");
        if (!text.includes("Zone centrale P25–P75")) localFindings.push("P25_P75_MISSING");
        if (!text.includes("Comparables observés")) localFindings.push("SAMPLE_LABEL_MISSING");
        if (!text.includes("4")) localFindings.push("SAMPLE_COUNT_MISSING");
        if (!text.includes("prix affichés observés")) localFindings.push("ASKING_PRICE_DISCLAIMER_MISSING");
        if (!text.includes("pas des prix de transaction")) localFindings.push("TRANSACTION_PRICE_DISCLAIMER_MISSING");
        if (!text.includes("ni une estimation certifiée du bien")) localFindings.push("ESTIMATE_DISCLAIMER_MISSING");
        const cards = await section.locator("[data-market-comparable-card]").count();
        if (cards !== 4) localFindings.push(`CARD_COUNT_${cards}_EXPECTED_4`);
        const marketPositionCount = await section.locator('[data-market-position="certified"]').count();
        if (scenario.position && marketPositionCount !== 1) localFindings.push(`POSITION_COUNT_${marketPositionCount}_EXPECTED_1`);
        if (!scenario.position && marketPositionCount !== 0) localFindings.push(`POSITION_COUNT_${marketPositionCount}_EXPECTED_0`);
        if (scenario.scope === "neighborhood" && !text.includes("Périmètre : quartier")) localFindings.push("NEIGHBORHOOD_SCOPE_MISSING");
        if (scenario.scope === "city") {
          if (!text.includes("Périmètre : ville")) localFindings.push("CITY_SCOPE_MISSING");
          if (!text.includes("Échantillon ville utilisé")) localFindings.push("CITY_FALLBACK_COPY_MISSING");
        }
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
  schemaVersion: "ANNOUNCEMENT_PAGE_L8_MARKET_COMPARABLES_VISUAL_V1",
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
if (report.screenshotCount !== scenarios.length) throw new Error(`ANN-L8 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`ANN-L8 visual certification failed with ${findings.length} finding(s)`);
