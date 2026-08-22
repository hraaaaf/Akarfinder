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
const forbiddenWording = ["Biens récents", "Nouveautés", "Recommandés pour vous"];

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
      const section = page.locator('[data-home-listings="hvr-3"]');
      await section.waitFor({ state: "visible", timeout: 20_000 });

      const heading = (await section.locator("h2").innerText()).trim();
      const bodyText = await page.locator("body").innerText();
      const cards = section.locator("[data-home-listing-card]");
      const cardCount = await cards.count();
      const emptyStateCount = await section.locator("[data-home-listings-empty]").count();

      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (heading !== "Biens à découvrir") localFindings.push(`HEADING_${heading}`);
      if (!bodyText.includes("Quelques biens actuellement visibles dans AkarFinder.")) localFindings.push("SUBTITLE_MISSING");
      for (const token of forbiddenWording) {
        if (bodyText.includes(token)) localFindings.push(`FORBIDDEN_WORDING_${token.replace(/\s+/g, "_")}`);
      }
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (cardCount < 1 || cardCount > 4) localFindings.push(`CARD_COUNT_${cardCount}`);
      if (emptyStateCount > 0 && cardCount > 0) localFindings.push("CARDS_AND_EMPTY_STATE");

      const ids = await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-listing-id") ?? ""));
      if (ids.some((id) => !id.trim())) localFindings.push("EMPTY_LISTING_ID");
      if (new Set(ids).size !== ids.length) localFindings.push("DUPLICATE_LISTING_ID");

      const hrefs = await cards.evaluateAll((nodes) =>
        nodes.map((node) => (node instanceof HTMLAnchorElement ? node.getAttribute("href") ?? "" : "")),
      );
      if (hrefs.some((href) => !href || (!href.startsWith("/listings/") && !/^https?:\/\//.test(href)))) {
        localFindings.push("INVALID_CARD_DESTINATION");
      }

      const prices = await section.locator("[data-home-listing-price]").allInnerTexts();
      if (prices.some((price) => /^\s*0\s*(DH|MAD)\b/i.test(price))) localFindings.push("ZERO_PRICE_RENDERED");

      const citySection = page.locator('[data-hvr2-city-grid="direct"]');
      const cityBox = await citySection.boundingBox();
      const listingBox = await section.boundingBox();
      if (!cityBox || !listingBox) {
        localFindings.push("MISSING_SECTION_BOX");
      } else if (listingBox.y <= cityBox.y) {
        localFindings.push("LISTINGS_NOT_AFTER_CITIES");
      }

      const screenshot = `${scenario.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({
        ...scenario,
        screenshot,
        cardCount,
        listingIds: ids,
        hrefs,
        prices,
        findings: localFindings,
        consoleErrors,
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
  schemaVersion: "HVR_3_HOME_LISTINGS_PROOF_V1",
  generatedAt: new Date().toISOString(),
  scenarioCount: scenarios.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== scenarios.length) throw new Error(`HVR-3 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`HVR-3 visual proof failed with ${findings.length} finding(s)`);
