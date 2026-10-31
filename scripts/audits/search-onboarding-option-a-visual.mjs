import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Visual proof for the exact Search onboarding proposal, with REAL visible DOM
// selectors. Do not use .last(): QuickFilters mounts a hidden desktop fallback
// while the mobile drawer is visible.
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3218";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/search-onboarding-option-a");
const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
];
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, colorScheme: "light", reducedMotion: "reduce" });
    const findings = [];
    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    try {
      const response = await page.goto(new URL("/search", baseUrl).href, { waitUntil: "domcontentloaded", timeout: 60000 });
      if (response?.status() !== 200) findings.push(`HTTP_${response?.status()}`);
      await page.locator("[data-search-quick-filters]").waitFor({ state: "visible", timeout: 20000 });
      await page.locator("[data-search-filter-trigger]").click();
      const visible = page.locator('[role="group"][aria-label="Type de bien"]:visible');
      await visible.first().waitFor({ state: "visible", timeout: 15000 });
      const targetCards = visible.locator("[data-property-visual-family]");
      const targetCardCount = await targetCards.count();
      const targets = await targetCards.evaluateAll(nodes => nodes.map(node => ({
        family: node.getAttribute("data-property-visual-family"),
        background: (node.querySelector("[aria-hidden='true']") instanceof HTMLElement)
          ? node.querySelector("[aria-hidden='true']").style.backgroundImage : "",
      })));
      if (targetCardCount !== 6) findings.push(`TARGET_CARD_COUNT_${targetCardCount}`);
      if (targets.some(x => !x.background.includes("/visuals/property-types/target/"))) findings.push("TARGET_ASSETS_MISSING");
      const mobile = viewport.width < 640;
      const sheetVisible = await page.locator("[data-search-mobile-filter-sheet]:visible").count();
      if (mobile && sheetVisible !== 1) findings.push("MOBILE_SHEET_NOT_VISIBLE");
      if (!mobile && sheetVisible !== 0) findings.push("MOBILE_SHEET_ON_DESKTOP");
      const chipCount = await page.locator("[data-premium-quickfilters-row] .premium-quickfilter-chip").count();
      if (chipCount !== 5) findings.push(`QUICK_FILTERS_${chipCount}`);
      const horizontalOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (horizontalOverflow) findings.push("HORIZONTAL_OVERFLOW");
      const countHeading = page.locator("[data-search-results-toolbar] h1");
      const heading = await countHeading.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent?.trim() ?? "",
          clipped: element.scrollWidth > element.clientWidth + 1,
          x: rect.x,
          right: rect.right,
        };
      });
      const toolbarLayout = await page.locator("[data-search-results-toolbar]").evaluate(element => {
        const pieces = [...element.children].map(child => {
          const box = child.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom, width: box.width };
        });
        return { flexWrap: getComputedStyle(element).flexWrap, pieces };
      });
      if (mobile && (
        toolbarLayout.flexWrap !== "wrap" ||
        toolbarLayout.pieces.length < 2 ||
        toolbarLayout.pieces[1].top < toolbarLayout.pieces[0].bottom - 1
      )) findings.push("MOBILE_RESULTS_TOOLBAR_NOT_WRAPPED");
      if (heading.clipped || heading.x < 0 || heading.right > viewport.width + 1) {
        findings.push("RESULT_COUNT_TRUNCATED");
      }
      // Keep both accessible Liste/Carte targets inside the visible mobile segment.
      // A CSS-only count fix must not shrink the adjacent switcher to one button.
      if (mobile) {
        const mobileViewBounds = await page.locator("[data-search-mobile-view-select]:visible").evaluate(segment => {
          const bounds = segment.getBoundingClientRect();
          return {
            segmentWidth: bounds.width,
            buttons: [...segment.querySelectorAll("button")].map(button => {
              const rect = button.getBoundingClientRect();
              return { left: rect.left, right: rect.right, width: rect.width,
                clipped: rect.left < bounds.left - 1 || rect.right > bounds.right + 1 };
            }),
          };
        });
        if (mobileViewBounds.buttons.length !== 2 ||
            mobileViewBounds.buttons.some(button => button.clipped || button.width < 44)) {
          findings.push("MOBILE_VIEW_SWITCHER_CLIPPED");
        }
      }
      if (consoleErrors.length) findings.push(`PAGE_ERRORS_${consoleErrors.length}`);
      const screenshot = `search-after-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({ ...viewport, screenshot, targetCardCount, targets, sheetVisible, chipCount, horizontalOverflow, heading, toolbarLayout, findings, consoleErrors });
    } catch (error) {
      findings.push(`AUDIT_ERROR_${error instanceof Error ? error.message : String(error)}`);
      results.push({ ...viewport, findings, consoleErrors });
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
const findingCount = results.reduce((n, row) => n + row.findings.length, 0);
const screenshotCount = results.filter(row => row.screenshot).length;
const report = { schemaVersion: "AKARFINDER_SEARCH_OPTION_A_AFTER_V1", generatedAt: new Date().toISOString(),
  screenshotCount, scenarioCount: viewports.length, findingCount, results };
await writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ scenarioCount: viewports.length, screenshotCount, findingCount }));
if (findingCount > 0 || screenshotCount !== viewports.length) process.exitCode = 1;
