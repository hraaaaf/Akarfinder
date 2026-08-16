import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3202";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l1-visual");
const route = "/visual-qa/announcement-page";
const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const [label, width, height] of viewports) {
    const page = await browser.newPage({
      viewport: { width, height },
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    const consoleErrors = [];
    const failedResponses = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
    });

    try {
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
      await page.evaluate(async () => {
        if (document.fonts?.ready) await document.fonts.ready;
      });
      await page.waitForTimeout(600);

      const metrics = await page.evaluate(() => {
        const root = document.documentElement;
        const visible = (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        };

        const mobileDock = document.querySelector('nav[aria-label="Actions rapides pour ce bien"]');
        const dockInteractive = mobileDock
          ? Array.from(mobileDock.querySelectorAll("a[href], button")).filter(visible)
          : [];
        const dockTargetHeights = dockInteractive.map((element) => ({
          label: element.getAttribute("aria-label") || element.textContent?.replace(/\s+/g, " ").trim() || element.tagName,
          height: Math.round(element.getBoundingClientRect().height),
        }));

        const desktopProject = Array.from(document.querySelectorAll('aside a[href="/mon-projet"]')).find(visible) ?? null;
        const desktopProjectHeight = desktopProject instanceof HTMLElement
          ? Math.round(desktopProject.getBoundingClientRect().height)
          : null;

        const header = document.querySelector('[data-search-global-header="exact-white"]');
        const shell = document.querySelector('[data-announcement-premium-shell="ann-l1"]');

        return {
          clientWidth: root.clientWidth,
          scrollWidth: root.scrollWidth,
          h1Count: document.querySelectorAll("h1").length,
          mainCount: document.querySelectorAll("main").length,
          headerVisible: visible(header),
          shellVisible: visible(shell),
          mobileDockVisible: visible(mobileDock),
          dockTargetHeights,
          desktopProjectVisible: visible(desktopProject),
          desktopProjectHeight,
          pathname: location.pathname,
        };
      });

      const localFindings = [];
      const status = response?.status() ?? 0;
      if (!response || status >= 400) localFindings.push(`HTTP_${status || "NO_RESPONSE"}`);
      if (metrics.pathname !== route) localFindings.push(`UNEXPECTED_PATH_${metrics.pathname}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) {
        localFindings.push(`HORIZONTAL_OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
      }
      if (metrics.h1Count !== 1) localFindings.push(`H1_COUNT_${metrics.h1Count}`);
      if (metrics.mainCount !== 1) localFindings.push(`MAIN_COUNT_${metrics.mainCount}`);
      if (!metrics.headerVisible) localFindings.push("SEARCH_HEADER_MISSING");
      if (!metrics.shellVisible) localFindings.push("ANN_L1_SHELL_MISSING");
      if (failedResponses.length > 0) localFindings.push(`RESOURCE_HTTP_ERRORS_${failedResponses.length}`);
      if (consoleErrors.length > 0) localFindings.push(`CONSOLE_ERRORS_${consoleErrors.length}`);

      if (width < 1024) {
        if (!metrics.mobileDockVisible) localFindings.push("MOBILE_DECISION_DOCK_MISSING");
        const undersized = metrics.dockTargetHeights.filter((item) => item.height < 44);
        if (undersized.length > 0) {
          localFindings.push(`MOBILE_TOUCH_TARGET_LT44_${undersized.map((item) => `${item.label}:${item.height}`).join("|")}`);
        }
      } else {
        if (!metrics.desktopProjectVisible) localFindings.push("DESKTOP_MON_PROJET_MISSING");
        if ((metrics.desktopProjectHeight ?? 0) < 44) {
          localFindings.push(`DESKTOP_MON_PROJET_LT44_${metrics.desktopProjectHeight ?? 0}`);
        }
      }

      const screenshot = `announcement-page-${label}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

      findings.push(...localFindings.map((finding) => ({ viewport: label, finding })));
      results.push({
        viewport: label,
        width,
        height,
        status,
        screenshot,
        failedResponses: failedResponses.slice(0, 20),
        consoleErrors: consoleErrors.slice(0, 20),
        findings: localFindings,
        ...metrics,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      findings.push({ viewport: label, finding: `AUDIT_ERROR_${message}` });
      results.push({ viewport: label, width, height, error: message });
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "ANNOUNCEMENT_PAGE_L1_VISUAL_V1",
  route,
  generatedAt: new Date().toISOString(),
  viewportCount: viewports.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};

await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  route: report.route,
  viewportCount: report.viewportCount,
  screenshotCount: report.screenshotCount,
  findingCount: report.findingCount,
  findings: report.findings,
}, null, 2));

if (report.screenshotCount !== viewports.length) {
  throw new Error(`ANN-L1 visual capture incomplete: ${report.screenshotCount}/${viewports.length}`);
}
if (findings.length > 0) {
  throw new Error(`ANN-L1 visual certification failed with ${findings.length} finding(s)`);
}
