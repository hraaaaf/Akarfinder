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
const expectedActionHrefs = ["/search", "/compagnon", "/vendre", "/pro"];
const forbiddenCopy = [
  "Marché observé",
  "Confiance lisible",
  "Territoire utile",
  "Pas de détour",
  "chiffres d’exemple",
  "Votre recherche, simplement",
  "Préparez votre projet au Maroc, où que vous soyez.",
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
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    try {
      const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.locator('[data-home-search="hvr-1"]').waitFor({ state: "visible", timeout: 20_000 });
      await page.locator('[data-hvr5-action-grid="compact"]').waitFor({ state: "visible", timeout: 20_000 });

      const bodyText = await page.locator("body").innerText();
      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      }));

      const cityCount = await page.locator("[data-hvr2-city-card]").count();
      const listingCount = await page.locator("[data-home-listing-card]").count();
      const neighborhoodCount = await page.locator("[data-home-neighborhood-card]").count();
      const actionCards = page.locator("[data-hvr5-action]");
      const actionCount = await actionCards.count();
      const actionHrefs = await actionCards.evaluateAll((nodes) =>
        nodes.map((node) => (node instanceof HTMLAnchorElement ? node.getAttribute("href") ?? "" : "")),
      );
      const valueStripCount = await page.locator('[data-home-value-strip="p1-a1"]').count();
      const emptyListingsCount = await page.locator("[data-home-listings-empty]").count();

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (cityCount !== 6) localFindings.push(`CITY_COUNT_${cityCount}`);
      if (listingCount !== 4) localFindings.push(`LISTING_COUNT_${listingCount}`);
      if (emptyListingsCount !== 0) localFindings.push(`LISTINGS_EMPTY_${emptyListingsCount}`);
      if (neighborhoodCount !== 3) localFindings.push(`NEIGHBORHOOD_COUNT_${neighborhoodCount}`);
      if (actionCount !== 4) localFindings.push(`ACTION_COUNT_${actionCount}`);
      if (JSON.stringify(actionHrefs) !== JSON.stringify(expectedActionHrefs)) localFindings.push(`ACTION_HREFS_${actionHrefs.join("|")}`);
      if (valueStripCount !== 0) localFindings.push(`VALUE_STRIP_${valueStripCount}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      for (const token of forbiddenCopy) {
        if (bodyText.includes(token)) localFindings.push(`FORBIDDEN_COPY_${token.replace(/\s+/g, "_")}`);
      }
      if (consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({
        ...scenario,
        screenshot,
        cityCount,
        listingCount,
        neighborhoodCount,
        actionCount,
        actionHrefs,
        valueStripCount,
        emptyListingsCount,
        consoleErrors,
        findings: localFindings,
        ...metrics,
      });
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

const report = {
  schemaVersion: "HVR_6_FINAL_BENCHMARK_PROOF_V1",
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`HVR-6 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`HVR-6 final visual proof failed with ${findings.length} finding(s)`);
