import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3221";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/hvr-6-final-benchmark");
const scenarios = [
  { name: "hvr6-home-390x844", width: 390, height: 844 },
  { name: "hvr6-home-430x932", width: 430, height: 932 },
  { name: "hvr6-home-768x900", width: 768, height: 900 },
  { name: "hvr6-home-1280x900", width: 1280, height: 900 },
];
const expectedActionHrefs = ["/mon-projet", "/vendre", "/pro"];
const forbiddenCopy = ["Marché observé", "Confiance lisible", "Territoire utile", "Pas de détour", "chiffres d’exemple", "Votre recherche, simplement", "Préparez votre projet au Maroc, où que vous soyez."];

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
      await page.locator('[data-home-search="hvr-1"]').waitFor({ state: "visible", timeout: 20_000 });
      await page.locator('[data-home-action-grid="v1"]').waitFor({ state: "visible", timeout: 20_000 });

      const bodyText = await page.locator("body").innerText();
      const metrics = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
      const trustCount = await page.locator('[data-home-trust-strip="v1"]').count();
      const cityCount = await page.locator("[data-home-city]").count();
      const listingSectionCount = await page.locator("[data-home-listings]").count();
      const listingCount = await page.locator("[data-home-listing-card]").count();
      const neighborhoodCount = await page.locator("[data-home-neighborhood-card]").count();
      const actionCards = page.locator("[data-home-action]");
      const actionCount = await actionCards.count();
      const actionHrefs = await actionCards.evaluateAll((nodes) => nodes.map((node) => node instanceof HTMLAnchorElement ? node.getAttribute("href") ?? "" : ""));
      const legacyCompagnonCount = await page.locator('a[href="/compagnon"]').count();
      const intelligenceCount = await page.locator("[data-home-intelligence]").count();

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (trustCount !== 1) localFindings.push(`TRUST_COUNT_${trustCount}`);
      if (cityCount !== 6) localFindings.push(`CITY_COUNT_${cityCount}`);
      if (listingSectionCount !== 0 || listingCount !== 0) localFindings.push(`LISTINGS_${listingSectionCount}_${listingCount}`);
      if (neighborhoodCount !== 3) localFindings.push(`NEIGHBORHOOD_COUNT_${neighborhoodCount}`);
      if (actionCount !== 3) localFindings.push(`ACTION_COUNT_${actionCount}`);
      if (JSON.stringify(actionHrefs) !== JSON.stringify(expectedActionHrefs)) localFindings.push(`ACTION_HREFS_${actionHrefs.join("|")}`);
      if (legacyCompagnonCount !== 0) localFindings.push(`LEGACY_COMPAGNON_${legacyCompagnonCount}`);
      if (intelligenceCount !== 0) localFindings.push(`INTELLIGENCE_${intelligenceCount}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      for (const token of forbiddenCopy) if (bodyText.includes(token)) localFindings.push(`FORBIDDEN_COPY_${token.replace(/\s+/g, "_")}`);
      if (consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({ ...scenario, screenshot, trustCount, cityCount, listingSectionCount, listingCount, neighborhoodCount, actionCount, actionHrefs, legacyCompagnonCount, intelligenceCount, consoleErrors, findings: localFindings, ...metrics });
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

const report = { schemaVersion: "HVR_6_HOME_V1_FINAL_PROOF", generatedAt: new Date().toISOString(), scenarioCount: scenarios.length, screenshotCount: results.filter((item) => item.screenshot).length, findingCount: findings.length, findings, results };
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`HVR-6 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`HVR-6 final visual proof failed with ${findings.length} finding(s)`);
