import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3227";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/visual-harmonization-property-types");
const mode = process.env.AUDIT_MODE ?? "after";

const viewports = [
  { name: "390x844", width: 390, height: 844 },
  { name: "768x900", width: 768, height: 900 },
  { name: "1280x900", width: 1280, height: 900 },
];

const routes = [
  { name: "seller-selector", url: "/vendre/dossier", openFilters: false },
  { name: "search-selector", url: "/search", openFilters: true },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const viewport of viewports) {
    for (const route of routes) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
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
        const response = await page.goto(`${baseUrl}${route.url}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
        await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
        await page.waitForTimeout(500);

        if (route.openFilters) {
          await page.locator("[data-search-filter-trigger]").click();
          const selectors = page.locator('[role="group"][aria-label="Type de bien"]');
          await selectors.last().waitFor({ state: "visible", timeout: 10_000 });
          await page.waitForTimeout(250);
        }

        const visibleSelector = page.locator('[role="group"][aria-label="Type de bien"]:visible').first();
        const selectorVisible = (await visibleSelector.count()) > 0;
        if (!selectorVisible) localFindings.push("PROPERTY_SELECTOR_NOT_VISIBLE");

        const visualCards = page.locator("[data-property-visual-family]:visible");
        const harmonizedCardCount = await visualCards.count();
        const premiumImages = page.locator('img[src*="/images/property-types-premium/"]:visible');
        const premiumImageCount = await premiumImages.count();
        const backgrounds = harmonizedCardCount
          ? await visualCards.evaluateAll((nodes) =>
              nodes.map((node) => {
                const artwork = node.querySelector("[aria-hidden='true']");
                return artwork instanceof HTMLElement ? artwork.style.backgroundImage : "";
              }),
            )
          : [];

        if (mode === "after") {
          if (harmonizedCardCount !== 6) localFindings.push(`HARMONIZED_CARD_COUNT_${harmonizedCardCount}`);
          if (premiumImageCount !== 0) localFindings.push(`LEGACY_PREMIUM_SELECTOR_IMAGES_${premiumImageCount}`);
          if (backgrounds.some((value) => !value.includes("/visuals/property-types/target/"))) {
            localFindings.push("NON_TARGET_SELECTOR_ASSET");
          }
        }

        const screenshot = `${route.name}-${viewport.name}.png`;
        await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

        results.push({
          mode,
          route: route.url,
          scenario: route.name,
          ...viewport,
          status: response?.status() ?? 0,
          screenshot,
          selectorVisible,
          harmonizedCardCount,
          premiumImageCount,
          backgrounds,
          failedResponses: failedResponses.slice(0, 20),
          consoleErrors: consoleErrors.slice(0, 20),
          findings: localFindings,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        localFindings.push(`AUDIT_ERROR_${message}`);
        results.push({ mode, route: route.url, scenario: route.name, ...viewport, error: message, findings: localFindings });
      } finally {
        findings.push(...localFindings.map((finding) => ({ route: route.url, viewport: viewport.name, finding })));
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "AKARFINDER_VISUAL_HARMONIZATION_PROPERTY_TYPES_V1",
  mode,
  scenarioCount: routes.length * viewports.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};
await writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ mode, scenarioCount: report.scenarioCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));

if (report.screenshotCount !== report.scenarioCount) throw new Error(`Capture incomplete: ${report.screenshotCount}/${report.scenarioCount}`);
if (mode === "after" && findings.length > 0) throw new Error(`AFTER failed with ${findings.length} finding(s)`);
