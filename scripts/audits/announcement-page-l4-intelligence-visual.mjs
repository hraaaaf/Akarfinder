import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3205";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l4-intelligence");
const route = "/visual-qa/announcement-page-intelligence";
const scenarios = [
  { name: "full-390", state: "full", width: 390, height: 844, card: true, score: "86/100", items: 3 },
  { name: "full-1280", state: "full", width: 1280, height: 900, card: true, score: "86/100", items: 3 },
  { name: "no-score-390", state: "no-score", width: 390, height: 844, card: true, score: null, items: 0 },
  { name: "no-score-1280", state: "no-score", width: 1280, height: 900, card: true, score: null, items: 0 },
  { name: "no-market-390", state: "no-market", width: 390, height: 844, card: true, score: "78/100", items: 1 },
  { name: "attention-390", state: "attention", width: 390, height: 844, card: true, score: "67/100", items: 2 },
  { name: "attention-1280", state: "attention", width: 1280, height: 900, card: true, score: "67/100", items: 2 },
  { name: "minimal-390", state: "minimal", width: 390, height: 844, card: false, score: null, items: 0 },
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
    page.on("response", (response) => { if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() }); });
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    const localFindings = [];

    try {
      const response = await page.goto(`${baseUrl}${route}?state=${scenario.state}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForTimeout(300);

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

      const card = page.locator('[data-akar-insight-card="ann-l4"]');
      const cardCount = await card.count();
      if (scenario.card && cardCount !== 1) localFindings.push(`CARD_COUNT_${cardCount}_EXPECTED_1`);
      if (!scenario.card && cardCount !== 0) localFindings.push(`CARD_COUNT_${cardCount}_EXPECTED_0`);

      if (scenario.card && cardCount === 1) {
        const version = await card.getAttribute("data-akar-intelligence-version");
        if (version !== "1.0") localFindings.push(`VERSION_${version ?? "missing"}`);
        const score = card.locator("[data-akar-score]");
        const scoreCount = await score.count();
        if (scenario.score == null && scoreCount !== 0) localFindings.push(`UNEXPECTED_SCORE_${await score.first().textContent().catch(() => "")}`);
        if (scenario.score != null) {
          if (scoreCount !== 1) localFindings.push(`SCORE_COUNT_${scoreCount}`);
          else {
            const normalized = (await score.textContent())?.replace(/\s+/g, "") ?? "";
            if (!normalized.includes(scenario.score)) localFindings.push(`SCORE_${normalized}_EXPECTED_${scenario.score}`);
          }
        }
        const itemCount = await card.locator("[data-akar-insight-item]").count();
        if (itemCount !== scenario.items) localFindings.push(`ITEM_COUNT_${itemCount}_EXPECTED_${scenario.items}`);

        const coreBox = await page.locator('[data-announcement-property-core="ann-l3"]').boundingBox();
        const cardBox = await card.boundingBox();
        if (!coreBox || !cardBox || cardBox.y < coreBox.y + coreBox.height - 2) localFindings.push("INTELLIGENCE_NOT_AFTER_CORE");
      }

      const bodyText = await page.locator("body").innerText();
      if (bodyText.includes("Compatibilité personnalisée non calculée")) localFindings.push("UNCALCULATED_FIT_EXPOSED");
      if (bodyText.includes("Analyse structurée")) localFindings.push("LEGACY_ANALYSIS_CARD_EXPOSED");
      if (scenario.state === "minimal" && bodyText.includes("AkarFinder Intelligence")) localFindings.push("EMPTY_INTELLIGENCE_SHELL_EXPOSED");

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
  schemaVersion: "ANNOUNCEMENT_PAGE_L4_AKAR_INTELLIGENCE_VISUAL_V1",
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
if (report.screenshotCount !== scenarios.length) throw new Error(`ANN-L4 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`ANN-L4 intelligence certification failed with ${findings.length} finding(s)`);
