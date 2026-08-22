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
      const section = page.locator('[data-home-neighborhood-intelligence="hvr-4"]');
      await section.waitFor({ state: "visible", timeout: 20_000 });
      const cards = section.locator("[data-home-neighborhood-card]");
      const cardCount = await cards.count();
      const heading = (await section.locator("h2").innerText()).trim();
      const bodyText = await section.innerText();
      const hrefs = await cards.evaluateAll((nodes) => nodes.map((node) => node instanceof HTMLAnchorElement ? node.getAttribute("href") ?? "" : ""));
      const metrics = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      const sectionBox = await section.boundingBox();

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (heading !== "Comprendre le quartier avant de visiter") localFindings.push(`HEADING_${heading}`);
      if (cardCount !== 3) localFindings.push(`CARD_COUNT_${cardCount}`);
      if (hrefs.some((href) => !/^\/immobilier\/.+\/.+/.test(href))) localFindings.push("INVALID_NEIGHBORHOOD_DESTINATION");
      if (bodyText.includes("Un bien ne se résume pas à ses mètres carrés.")) localFindings.push("LEGACY_HEADING_PRESENT");
      if (/bientôt disponible/i.test(bodyText)) localFindings.push("PASSIVE_FUTURE_COPY_PRESENT");
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (!sectionBox) localFindings.push("MISSING_SECTION_BOX");
      else if (scenario.width >= 1024 && sectionBox.height > 760) localFindings.push(`DESKTOP_SECTION_TOO_TALL_${Math.round(sectionBox.height)}`);

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({ ...scenario, screenshot, cardCount, hrefs, sectionHeight: sectionBox ? Math.round(sectionBox.height) : null, findings: localFindings, consoleErrors, ...metrics });
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

const report = { schemaVersion: "HVR_4_NEIGHBORHOOD_ACTION_PROOF_V1", generatedAt: new Date().toISOString(), scenarioCount: scenarios.length, screenshotCount: results.filter((item) => item.screenshot).length, findingCount: findings.length, findings, results };
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`HVR-4 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`HVR-4 visual proof failed with ${findings.length} finding(s)`);
