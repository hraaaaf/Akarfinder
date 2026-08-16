import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3207";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l7-street-reality");
const route = "/visual-qa/announcement-page-street-reality";
const scenarios = [
  { name: "exact-390", state: "exact", width: 390, height: 844, section: true, context: false, fallback: false },
  { name: "exact-430", state: "exact", width: 430, height: 932, section: true, context: false, fallback: false },
  { name: "exact-768", state: "exact", width: 768, height: 900, section: true, context: false, fallback: false },
  { name: "exact-1280", state: "exact", width: 1280, height: 900, section: true, context: false, fallback: false },
  { name: "context-390", state: "context", width: 390, height: 844, section: true, context: true, fallback: false },
  { name: "context-1280", state: "context", width: 1280, height: 900, section: true, context: true, fallback: false },
  { name: "fallback-390", state: "fallback", width: 390, height: 844, section: true, context: false, fallback: true },
  { name: "hidden-390", state: "hidden", width: 390, height: 844, section: false, context: false, fallback: false },
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
    const failedResponses = [];
    const consoleErrors = [];
    const localFindings = [];
    page.on("response", (response) => {
      if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    try {
      const response = await page.goto(`${baseUrl}${route}?state=${scenario.state}`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
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

      const section = page.locator('[data-street-reality="ann-l7"]');
      const sectionCount = await section.count();
      if (scenario.section && sectionCount !== 1) localFindings.push(`SECTION_COUNT_${sectionCount}_EXPECTED_1`);
      if (!scenario.section && sectionCount !== 0) localFindings.push(`SECTION_COUNT_${sectionCount}_EXPECTED_0`);

      if (scenario.section && sectionCount === 1) {
        const text = await section.innerText();
        if (!text.includes("Vue de rue à proximité")) localFindings.push("NEARBY_STREET_LABEL_MISSING");
        if (text.includes("Photo du bien")) localFindings.push("PROPERTY_PHOTO_CLAIM_EXPOSED");
        if (!text.includes("Fixture QA Street Provider")) localFindings.push("ATTRIBUTION_MISSING");
        if (!/À \d+ m du point de référence/.test(text)) localFindings.push("DISTANCE_MISSING");
        if (!text.includes("Capture juil. 2026")) localFindings.push("CAPTURE_DATE_MISSING");
        const cards = await section.locator("article").count();
        if (cards !== 2) localFindings.push(`ASSET_CARD_COUNT_${cards}_EXPECTED_2`);
        const links = await section.locator('a[target="_blank"]').count();
        if (links !== 2) localFindings.push(`VIEWER_LINK_COUNT_${links}_EXPECTED_2`);

        if (scenario.context) {
          if (!text.includes("position du bien n’est pas utilisée comme localisation exacte")) localFindings.push("CONTEXT_DISCLAIMER_MISSING");
          if (!text.includes("Rayon public ≤ 600 m")) localFindings.push("CONTEXT_THRESHOLD_MISSING");
          if (!text.includes("pas depuis le bien")) localFindings.push("CONTEXT_DISTANCE_DISCLAIMER_MISSING");
        } else {
          if (!text.includes("Ces images ne sont pas des photos du logement")) localFindings.push("PROPERTY_PHOTO_DISCLAIMER_MISSING");
          if (!text.includes("Rayon public ≤ 250 m")) localFindings.push("EXACT_THRESHOLD_MISSING");
        }

        const fallbackCount = await section.getByText("Aperçu indisponible — ouvrir la vue source", { exact: true }).count();
        if (scenario.fallback && fallbackCount !== 1) localFindings.push(`FALLBACK_COUNT_${fallbackCount}_EXPECTED_1`);
        if (!scenario.fallback && fallbackCount !== 0) localFindings.push(`UNEXPECTED_FALLBACK_${fallbackCount}`);
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
  schemaVersion: "ANNOUNCEMENT_PAGE_L7_STREET_REALITY_VISUAL_V1",
  route,
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  scenarioCount: report.scenarioCount,
  screenshotCount: report.screenshotCount,
  findingCount: report.findingCount,
  findings,
}, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`ANN-L7 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`ANN-L7 visual certification failed with ${findings.length} finding(s)`);
