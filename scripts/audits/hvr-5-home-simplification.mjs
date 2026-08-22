import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3220";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/hvr-5-home-simplification");
const scenarios = [
  { name: "hvr5-home-390x844", width: 390, height: 844 },
  { name: "hvr5-home-430x932", width: 430, height: 932 },
  { name: "hvr5-home-768x900", width: 768, height: 900 },
  { name: "hvr5-home-1280x900", width: 1280, height: 900 },
];
const expectedHrefs = ["/search", "/compagnon", "/vendre", "/pro"];
const forbiddenCopy = [
  "Votre recherche, simplement",
  "Préparez votre projet au Maroc, où que vous soyez.",
  "Vous savez déjà ce que vous cherchez ?",
  "4 000 000 DH",
  "Biens enregistrés",
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
      const grid = page.locator('[data-hvr5-action-grid="compact"]');
      await grid.waitFor({ state: "visible", timeout: 20_000 });

      const cards = grid.locator("[data-hvr5-action]");
      const cardCount = await cards.count();
      const hrefs = await cards.evaluateAll((nodes) =>
        nodes.map((node) => (node instanceof HTMLAnchorElement ? node.getAttribute("href") ?? "" : "")),
      );
      const bodyText = await page.locator("body").innerText();
      const heading = (await grid.locator("h2").innerText()).trim();
      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      }));

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (heading !== "Que voulez-vous faire maintenant ?") localFindings.push(`HEADING_${heading}`);
      if (cardCount !== 4) localFindings.push(`CARD_COUNT_${cardCount}`);
      if (JSON.stringify(hrefs) !== JSON.stringify(expectedHrefs)) localFindings.push(`HREFS_${hrefs.join("|")}`);
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
        heading,
        cardCount,
        hrefs,
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
  schemaVersion: "HVR_5_HOME_SIMPLIFICATION_PROOF_V1",
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`HVR-5 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`HVR-5 visual proof failed with ${findings.length} finding(s)`);
