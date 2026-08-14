import { chromium } from "playwright";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const inventoryPath = process.env.INVENTORY_PATH ?? "data/audits/ui-all-pages-inventory/inventory.json";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/ui-all-pages-baseline";
const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
const pages = inventory.pages.filter((page) => page.fixtureUrl);
const blocked = inventory.pages.filter((page) => !page.fixtureUrl);
const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];

function safeName(routePattern) {
  if (routePattern === "/") return "home";
  return routePattern.replace(/^\//, "").replaceAll("/", "__").replaceAll("[", "_").replaceAll("]", "_");
}

function resourceFailureMatches(expected, actual) {
  try {
    const parsed = new URL(actual.url);
    return parsed.pathname === expected.path && actual.status === expected.status;
  } catch {
    return false;
  }
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const pageDef of pages) {
    for (const [viewport, width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: "light" });
      const consoleErrors = [];
      const failedResponses = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("response", (response) => {
        if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
      });
      try {
        const response = await page.goto(`${baseUrl}${pageDef.fixtureUrl}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
        await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
        await page.waitForTimeout(pageDef.routePattern === "/map" ? 1800 : 550);

        const metrics = await page.evaluate(() => {
          const root = document.documentElement;
          const nav = document.querySelector("[data-mobile-bottom-nav]");
          const navVisible = nav instanceof HTMLElement && getComputedStyle(nav).display !== "none" && nav.getClientRects().length > 0;
          return {
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            scrollHeight: root.scrollHeight,
            heading: document.querySelector("h1")?.textContent?.trim() ?? null,
            mobileNavPresent: Boolean(nav),
            mobileNavVisible: navVisible,
            finalPathname: window.location.pathname,
            finalSearch: window.location.search,
            title: document.title,
          };
        });
        const status = response?.status() ?? 0;
        const overflow = metrics.scrollWidth > metrics.clientWidth + 1;
        const requestedPath = new URL(pageDef.fixtureUrl, baseUrl).pathname;
        const expectedFinalPath = pageDef.expectedFinalPath ?? requestedPath;
        const redirected = metrics.finalPathname !== requestedPath;
        const expectedResourceFailures = pageDef.expectedResourceFailures ?? [];
        const matchedExpectedFailures = failedResponses.filter((actual) =>
          expectedResourceFailures.some((expected) => resourceFailureMatches(expected, actual)),
        );
        const unexpectedFailedResponses = failedResponses.filter((actual) =>
          !expectedResourceFailures.some((expected) => resourceFailureMatches(expected, actual)),
        );
        let genericExpectedConsoleBudget = matchedExpectedFailures.length;
        const unexpectedConsoleErrors = consoleErrors.filter((message) => {
          if (message.startsWith("Failed to load resource:") && genericExpectedConsoleBudget > 0) {
            genericExpectedConsoleBudget -= 1;
            return false;
          }
          return true;
        });

        const localFindings = [];
        if (!response || status >= 400) localFindings.push(`HTTP_${status || "NO_RESPONSE"}`);
        if (overflow) localFindings.push(`HORIZONTAL_OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
        if (!metrics.heading) localFindings.push("MISSING_H1");
        if (metrics.finalPathname !== expectedFinalPath) {
          localFindings.push(`UNEXPECTED_FINAL_PATH_${requestedPath}_EXPECTED_${expectedFinalPath}_GOT_${metrics.finalPathname}`);
        }
        if (unexpectedFailedResponses.length > 0) {
          localFindings.push(`RESOURCE_HTTP_ERRORS_${unexpectedFailedResponses.length}`);
        }
        if (unexpectedConsoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${unexpectedConsoleErrors.length}`);
        findings.push(...localFindings.map((finding) => ({ routePattern: pageDef.routePattern, viewport, finding })));

        const screenshot = `${safeName(pageDef.routePattern)}-${viewport}.png`;
        await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
        results.push({
          ...pageDef,
          viewport,
          width,
          height,
          status,
          screenshot,
          overflow,
          redirected,
          expectedFinalPath,
          failedResponses: failedResponses.slice(0, 20),
          expectedResourceFailureCount: matchedExpectedFailures.length,
          unexpectedFailedResponses: unexpectedFailedResponses.slice(0, 20),
          consoleErrors: consoleErrors.slice(0, 20),
          unexpectedConsoleErrors: unexpectedConsoleErrors.slice(0, 20),
          consoleErrorCount: consoleErrors.length,
          unexpectedConsoleErrorCount: unexpectedConsoleErrors.length,
          findings: localFindings,
          ...metrics,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        findings.push({ routePattern: pageDef.routePattern, viewport, finding: `AUDIT_ERROR_${message}` });
        results.push({ ...pageDef, viewport, width, height, error: message });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "UI_ALL_PAGES_BASELINE_V2",
  generatedAt: new Date().toISOString(),
  inventoryPageCount: inventory.pageCount,
  renderablePageCount: pages.length,
  blockedPageCount: blocked.length,
  blocked,
  viewportCount: viewports.length,
  expectedScreenshotCount: pages.length * viewports.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findingRouteCount: new Set(findings.map((item) => item.routePattern)).size,
  findings,
  results,
};

await writeFile(path.join(outputDir, "metrics.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  inventoryPageCount: report.inventoryPageCount,
  renderablePageCount: report.renderablePageCount,
  blockedPageCount: report.blockedPageCount,
  expectedScreenshotCount: report.expectedScreenshotCount,
  screenshotCount: report.screenshotCount,
  findingCount: report.findingCount,
  findingRouteCount: report.findingRouteCount,
}, null, 2));

if (report.screenshotCount !== report.expectedScreenshotCount) {
  throw new Error(`Baseline incomplete: ${report.screenshotCount}/${report.expectedScreenshotCount} screenshots`);
}
