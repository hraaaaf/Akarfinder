import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3217";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/product-experience-p6-quartier-ville");
const routes = [
  { kind: "ville", route: "/immobilier/rabat", experience: "ville" },
  { kind: "quartier", route: "/immobilier/rabat/agdal", experience: "quartier" },
];
const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const routeCase of routes) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport, colorScheme: "light", reducedMotion: "reduce" });
      const localFindings = [];
      try {
        const response = await page.goto(`${baseUrl}${routeCase.route}`, { waitUntil: "networkidle", timeout: 60_000 });
        await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
        try {
          await page.locator('[data-p6-territory-map][data-map-ready="true"]').waitFor({ state: "attached", timeout: 20_000 });
        } catch {
          localFindings.push("P6_MAP_NOT_READY");
        }

        const metrics = await page.evaluate(({ expectedExperience }) => {
          const top = (selector) => {
            const node = document.querySelector(selector);
            if (!(node instanceof HTMLElement)) return null;
            const rect = node.getBoundingClientRect();
            return rect.top + window.scrollY;
          };
          const header = document.querySelector('[data-search-global-header="exact-white"]');
          const headerBackground = header instanceof HTMLElement ? getComputedStyle(header).backgroundColor : null;
          const experience = document.querySelector(`[data-p6-experience="${expectedExperience}"]`);
          const surface = document.querySelector('[data-p6-surface="active"]');
          return {
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            h1Count: document.querySelectorAll("h1").length,
            mainCount: document.querySelectorAll("main").length,
            canonicalLogoCount: document.querySelectorAll('img[src="/brand/logo-v2/logo-header-light.png"]').length,
            headerBackground,
            experiencePresent: Boolean(experience),
            summaryCount: surface?.querySelectorAll("[data-p6-summary]").length ?? 0,
            territoryMapCount: surface?.querySelectorAll("[data-p6-territory-map]").length ?? 0,
            bronzeClassCount: surface ? Array.from(surface.querySelectorAll("[class]")).filter((node) => node.getAttribute("class")?.includes("bronze")).length : 0,
            territoryTop: top('[data-p6-stage="territoire"]'),
            goodsTop: top('[data-p6-stage="biens"]'),
            decisionTop: top('[data-p6-stage="decision"]'),
          };
        }, { expectedExperience: routeCase.experience });

        if ((response?.status() ?? 0) !== 200) localFindings.push(`HTTP_${response?.status() ?? 0}`);
        if (metrics.scrollWidth > metrics.clientWidth + 1) localFindings.push(`OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
        if (metrics.h1Count !== 1) localFindings.push(`H1_COUNT_${metrics.h1Count}`);
        if (metrics.mainCount !== 1) localFindings.push(`MAIN_COUNT_${metrics.mainCount}`);
        if (metrics.canonicalLogoCount < 1) localFindings.push("CANONICAL_LOGO_MISSING");
        if (metrics.headerBackground !== "rgb(255, 255, 255)") localFindings.push(`HEADER_NOT_EXACT_WHITE_${metrics.headerBackground}`);
        if (!metrics.experiencePresent) localFindings.push("P6_EXPERIENCE_MISSING");
        if (metrics.summaryCount !== 3) localFindings.push(`P6_SUMMARY_COUNT_${metrics.summaryCount}`);
        if (metrics.territoryMapCount !== 1) localFindings.push(`P6_MAP_COUNT_${metrics.territoryMapCount}`);
        if (metrics.bronzeClassCount !== 0) localFindings.push(`P6_BRONZE_CLASS_COUNT_${metrics.bronzeClassCount}`);
        if (
          metrics.territoryTop == null ||
          metrics.goodsTop == null ||
          metrics.decisionTop == null ||
          !(metrics.territoryTop < metrics.goodsTop && metrics.goodsTop < metrics.decisionTop)
        ) localFindings.push("P6_CANONICAL_ORDER_INVALID");

        const screenshot = `${routeCase.kind}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
        results.push({ ...routeCase, ...viewport, screenshot, findings: localFindings, ...metrics });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        localFindings.push(`AUDIT_ERROR_${message}`);
        results.push({ ...routeCase, ...viewport, findings: localFindings, error: message });
      } finally {
        findings.push(...localFindings.map((finding) => ({ kind: routeCase.kind, width: viewport.width, height: viewport.height, finding })));
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "AKARFINDER_PRODUCT_EXPERIENCE_P6_V1",
  generatedAt: new Date().toISOString(),
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findings,
  results,
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ screenshotCount: report.screenshotCount, findingCount: report.findingCount, findings }, null, 2));
if (report.screenshotCount !== 8) throw new Error(`P6 capture incomplete: ${report.screenshotCount}/8`);
if (findings.length > 0) throw new Error(`P6 certification failed with ${findings.length} finding(s)`);
