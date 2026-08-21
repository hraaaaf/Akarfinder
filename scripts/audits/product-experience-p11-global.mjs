import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3231";
const outputDir = process.env.OUTPUT_DIR ?? "artifacts/product-experience-p11-global";
const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];

const surfaces = [
  { lot: "P3", name: "accueil", url: "/" },
  { lot: "P4", name: "search", url: "/search" },
  { lot: "P4", name: "map", url: "/map?city=rabat&layer=explore", expectedFailures: ["/api/geo/rabat-market-intelligence:503"] },
  { lot: "P5", name: "listing", url: "/visual-qa/announcement-page-pro-conversion" },
  { lot: "P6", name: "ville", url: "/immobilier/rabat" },
  { lot: "P6", name: "quartier", url: "/immobilier/rabat/agdal" },
  { lot: "P7", name: "mon-projet", url: "/mon-projet", expectedFailures: ["/api/me/continuity:401"] },
  { lot: "P8", name: "publication", url: "/vendre/dossier" },
  { lot: "P9", name: "professionnels", url: "/pro" },
  { lot: "P10", name: "a-propos", url: "/a-propos" },
  { lot: "P10", name: "comment-ca-marche", url: "/comment-ca-marche" },
  { lot: "P10", name: "faq", url: "/faq" },
  { lot: "P10", name: "contact", url: "/contact" },
  { lot: "P10", name: "demande-retrait", url: "/demande-retrait" },
  { lot: "P10", name: "conditions-utilisation", url: "/conditions-utilisation" },
  { lot: "P10", name: "politique-confidentialite", url: "/politique-confidentialite" },
];

function failureKey(response) {
  try {
    const u = new URL(response.url());
    return `${u.pathname}:${response.status()}`;
  } catch {
    return `invalid:${response.status()}`;
  }
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const surface of surfaces) {
    for (const [viewport, width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: "light" });
      const failedResponses = [];
      const consoleErrors = [];
      page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(response); });
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      try {
        const response = await page.goto(`${baseUrl}${surface.url}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
        await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
        await page.waitForTimeout(surface.name === "map" ? 1800 : 550);
        const metrics = await page.evaluate(() => {
          const root = document.documentElement;
          const logo = document.querySelector('img[alt="AkarFinder"]');
          const nav = document.querySelector("[data-mobile-bottom-nav]");
          return {
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            h1Count: document.querySelectorAll("h1").length,
            mainCount: document.querySelectorAll("main").length,
            logoPresent: Boolean(logo),
            footerPresent: Boolean(document.querySelector("footer")),
            mobileNavPresent: Boolean(nav),
            mobileNavVisible: nav instanceof HTMLElement && getComputedStyle(nav).display !== "none" && nav.getClientRects().length > 0,
            finalPath: window.location.pathname,
          };
        });
        const status = response?.status() ?? 0;
        const allowed = new Set(surface.expectedFailures ?? []);
        const unexpectedFailures = failedResponses.map(failureKey).filter((key) => !allowed.has(key));
        const genericExpectedBudget = failedResponses.map(failureKey).filter((key) => allowed.has(key)).length;
        let genericBudget = genericExpectedBudget;
        const unexpectedConsole = consoleErrors.filter((message) => {
          if (message.startsWith("Failed to load resource:") && genericBudget > 0) { genericBudget -= 1; return false; }
          if (surface.name === "map" && message.includes("market intelligence HTTP 503")) return false;
          return true;
        });
        const local = [];
        if (status !== 200) local.push(`HTTP_${status}`);
        if (metrics.scrollWidth > metrics.clientWidth + 1) local.push("HORIZONTAL_OVERFLOW");
        if (metrics.h1Count !== 1) local.push(`H1_COUNT_${metrics.h1Count}`);
        if (metrics.mainCount !== 1) local.push(`MAIN_COUNT_${metrics.mainCount}`);
        if (!metrics.logoPresent) local.push("CANONICAL_LOGO_MISSING");
        if (unexpectedFailures.length) local.push(`RESOURCE_HTTP_ERRORS_${unexpectedFailures.length}`);
        if (unexpectedConsole.length) local.push(`CONSOLE_ERRORS_${unexpectedConsole.length}`);
        if (width < 768 && metrics.mobileNavPresent && !metrics.mobileNavVisible) local.push("MOBILE_NAV_PRESENT_BUT_HIDDEN");
        if (width >= 768 && metrics.mobileNavVisible) local.push("MOBILE_NAV_VISIBLE_DESKTOP");
        findings.push(...local.map((finding) => ({ lot: surface.lot, surface: surface.name, viewport, finding })));
        const screenshot = `${surface.lot.toLowerCase()}-${surface.name}-${viewport}.png`;
        await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
        results.push({ ...surface, viewport, width, height, status, screenshot, metrics, unexpectedFailures, unexpectedConsole, findings: local });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        findings.push({ lot: surface.lot, surface: surface.name, viewport, finding: `AUDIT_ERROR_${message}` });
        results.push({ ...surface, viewport, width, height, error: message });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "AKARFINDER_PRODUCT_EXPERIENCE_P11_V1",
  baseCommit: process.env.GITHUB_SHA ?? null,
  surfaceCount: surfaces.length,
  viewportCount: viewports.length,
  expectedScreenshotCount: surfaces.length * viewports.length,
  screenshotCount: results.filter((item) => item.screenshot).length,
  findingCount: findings.length,
  findingSurfaceCount: new Set(findings.map((item) => `${item.lot}:${item.surface}`)).size,
  findings,
  results,
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ surfaceCount: report.surfaceCount, expectedScreenshotCount: report.expectedScreenshotCount, screenshotCount: report.screenshotCount, findingCount: report.findingCount, findingSurfaceCount: report.findingSurfaceCount }, null, 2));
if (report.screenshotCount !== report.expectedScreenshotCount || report.findingCount !== 0) {
  throw new Error(`P11 global certification failed: ${report.screenshotCount}/${report.expectedScreenshotCount}, findings=${report.findingCount}`);
}
