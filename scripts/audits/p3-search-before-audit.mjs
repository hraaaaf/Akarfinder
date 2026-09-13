import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3220";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/p3-search-before";
const searchPath = "/search?transaction_type=buy&city=Casablanca&min_price=1000000&property_type=Appartement";

const viewports = [
  ["390x844", 390, 844],
  ["768x1024", 768, 1024],
  ["1280x900", 1280, 900],
];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const rows = [];
const findings = [];

try {
  for (const [viewport, width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme: "light", reducedMotion: "reduce" });
    const consoleErrors = [];
    const failedResponses = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
    });

    try {
      const response = await page.goto(`${baseURL}${searchPath}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForFunction(() => document.readyState === "complete", null, { timeout: 15_000 }).catch(() => {});
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(900);

      const metrics = await page.evaluate(() => {
        const isVisible = (element) => {
          if (!element) return false;
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
        };
        const mobileViewSelect = document.querySelector("[data-search-mobile-view-select]");
        const desktopViewSwitcher = document.querySelector("[data-search-desktop-view-switcher]");
        const mapPane = document.querySelector("[data-search-map-pane]");
        const listPane = document.querySelector("[data-search-list-pane]");
        const filterTrigger = document.querySelector("[data-search-filter-trigger]");
        const quickFilters = document.querySelector("[data-premium-quickfilters-row]");
        const activeChipTexts = [...document.querySelectorAll('[data-search-results-section] button')]
          .map((button) => (button.textContent ?? "").replace(/\s+/g, " ").trim())
          .filter((text) => ["Casablanca", "Appartement"].includes(text) || text.startsWith("Max ") || text.startsWith("≥ "));
        const filterCount = document.querySelector(".premium-filter-count")?.textContent?.trim() ?? null;
        return {
          title: document.title,
          h1: document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          mobileViewSelectVisible: isVisible(mobileViewSelect),
          desktopViewSwitcherVisible: isVisible(desktopViewSwitcher),
          mapPaneVisible: isVisible(mapPane),
          listPaneVisible: isVisible(listPane),
          filterTriggerVisible: isVisible(filterTrigger),
          quickFiltersVisible: isVisible(quickFilters),
          filterCount,
          activeChipTexts,
          viewLayout: document.querySelector("[data-search-view-layout]")?.getAttribute("data-search-view-layout") ?? null,
        };
      });

      const screenshot = `search-before-${viewport}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

      if ((response?.status() ?? 0) >= 400 || (response?.status() ?? 0) === 0) {
        findings.push({ viewport, code: "HTTP", detail: response?.status() ?? 0 });
      }
      if (metrics.scrollWidth > metrics.clientWidth + 1) {
        findings.push({ viewport, code: "HORIZONTAL_OVERFLOW", detail: `${metrics.scrollWidth}>${metrics.clientWidth}` });
      }
      if (!metrics.filterTriggerVisible || !metrics.quickFiltersVisible) {
        findings.push({ viewport, code: "PRIMARY_CONTROLS_NOT_VISIBLE", detail: metrics });
      }
      if (width === 390 && !metrics.mobileViewSelectVisible) {
        findings.push({ viewport, code: "MOBILE_VIEW_CONTROL_HIDDEN", detail: "data-search-mobile-view-select is not visible" });
      }

      rows.push({
        requestedPath: searchPath,
        viewport,
        width,
        height,
        status: response?.status() ?? 0,
        screenshot,
        consoleErrors,
        failedResponses,
        ...metrics,
      });
    } catch (error) {
      findings.push({ viewport, code: "AUDIT_ERROR", detail: error instanceof Error ? error.message : String(error) });
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "P3_SEARCH_BEFORE_V1",
  generatedAt: new Date().toISOString(),
  baseURL,
  searchPath,
  viewportCount: viewports.length,
  screenshotCount: rows.length,
  findingCount: findings.length,
  findings,
  rows,
};

await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  viewportCount: report.viewportCount,
  screenshotCount: report.screenshotCount,
  findingCount: report.findingCount,
  findings: report.findings,
}, null, 2));

// BEFORE is evidentiary: known UX findings must not prevent artifact upload.
if (findings.some((finding) => finding.code === "HTTP" || finding.code === "HORIZONTAL_OVERFLOW" || finding.code === "AUDIT_ERROR" || finding.code === "PRIMARY_CONTROLS_NOT_VISIBLE")) {
  process.exit(1);
}
