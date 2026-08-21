import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3215";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/product-experience-p5-listings");
const route = "/visual-qa/announcement-page-pro-conversion";
const scenarios = [
  { name: "after-390", width: 390, height: 844 },
  { name: "after-430", width: 430, height: 932 },
  { name: "after-768", width: 768, height: 900 },
  { name: "after-1280", width: 1280, height: 900 },
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
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
      const metrics = await page.evaluate(() => {
        const visibleTop = (selector) => {
          const node = document.querySelector(selector);
          if (!(node instanceof HTMLElement)) return null;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) return null;
          return rect.top + window.scrollY;
        };
        const header = document.querySelector('[data-search-global-header="exact-white"]');
        const headerBackground = header instanceof HTMLElement ? getComputedStyle(header).backgroundColor : null;
        const summaryKeys = Array.from(document.querySelectorAll("[data-p5-listing-summary]"))
          .map((node) => node.getAttribute("data-p5-listing-summary"));
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          h1Count: document.querySelectorAll("h1").length,
          mainCount: document.querySelectorAll("main").length,
          canonicalLogoCount: document.querySelectorAll('img[src="/brand/logo-v2/logo-header-light.png"]').length,
          headerBackground,
          hierarchyCount: document.querySelectorAll('[data-p5-listing-hierarchy="active"]').length,
          summaryKeys,
          summaryTop: visibleTop('[data-p5-listing-hierarchy="active"]'),
          intelligenceTop: visibleTop('[data-p5-listing-intelligence="detail"]'),
          mobileDecisionTop: visibleTop('[data-p5-listing-decision="mobile"]'),
          mobileSourceTop: visibleTop('[data-p5-listing-source="mobile"]'),
          desktopDecisionTop: visibleTop('[data-p5-listing-decision="desktop"]'),
          desktopSourceTop: visibleTop('[data-p5-listing-source="desktop"]'),
        };
      });

      if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      if (metrics.h1Count !== 1) localFindings.push(`H1_COUNT_${metrics.h1Count}`);
      if (metrics.mainCount !== 1) localFindings.push(`MAIN_COUNT_${metrics.mainCount}`);
      if (metrics.canonicalLogoCount < 1) localFindings.push("CANONICAL_LOGO_MISSING");
      if (metrics.headerBackground !== "rgb(255, 255, 255)") localFindings.push(`HEADER_NOT_EXACT_WHITE_${metrics.headerBackground}`);
      if (metrics.hierarchyCount !== 1) localFindings.push(`P5_HIERARCHY_COUNT_${metrics.hierarchyCount}`);
      if (JSON.stringify(metrics.summaryKeys) !== JSON.stringify(["confidence", "market", "living"])) {
        localFindings.push(`P5_SUMMARY_KEYS_${metrics.summaryKeys.join("_")}`);
      }
      if (metrics.summaryTop == null || metrics.intelligenceTop == null || metrics.summaryTop >= metrics.intelligenceTop) {
        localFindings.push("P5_SUMMARY_NOT_BEFORE_INTELLIGENCE");
      }

      if (scenario.width < 1024) {
        if (metrics.mobileDecisionTop == null) localFindings.push("P5_MOBILE_DECISION_MISSING");
        if (metrics.mobileSourceTop == null) localFindings.push("P5_MOBILE_SOURCE_MISSING");
        if (
          metrics.summaryTop != null &&
          metrics.mobileDecisionTop != null &&
          metrics.mobileSourceTop != null &&
          metrics.intelligenceTop != null &&
          !(metrics.summaryTop < metrics.mobileDecisionTop && metrics.mobileDecisionTop < metrics.mobileSourceTop && metrics.mobileSourceTop < metrics.intelligenceTop)
        ) {
          localFindings.push("P5_MOBILE_ORDER_INVALID");
        }
      } else {
        if (metrics.desktopDecisionTop == null) localFindings.push("P5_DESKTOP_DECISION_MISSING");
        if (metrics.desktopSourceTop == null) localFindings.push("P5_DESKTOP_SOURCE_MISSING");
      }

      if (failedResponses.length > 0) localFindings.push(`RESOURCE_HTTP_ERRORS_${failedResponses.length}`);
      if (consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);

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
  schemaVersion: "AKARFINDER_PRODUCT_EXPERIENCE_P5_V1",
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
if (report.screenshotCount !== scenarios.length) throw new Error(`P5 capture incomplete: ${report.screenshotCount}/${scenarios.length}`);
if (findings.length > 0) throw new Error(`P5 certification failed with ${findings.length} finding(s)`);
