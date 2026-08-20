import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/experience-p1-a1-fidelity-shell";

const routes = [
  { key: "home", url: "/", role: "brand" },
  { key: "search", url: "/search", role: "application" },
  { key: "map", url: "/map?city=rabat&layer=explore", role: "application" },
  { key: "acheter", url: "/acheter", role: "intent" },
  { key: "louer", url: "/louer", role: "intent" },
  { key: "neuf", url: "/neuf", role: "intent" },
  { key: "rabat", url: "/immobilier/rabat", role: "geo" },
  { key: "mon-projet", url: "/mon-projet", role: "journey" },
  { key: "vendre", url: "/vendre", role: "conversion" },
  { key: "agences", url: "/pro/agences", role: "professional" },
];

const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];

function expectedHeaderHeight(width) {
  return width >= 1024 ? 63 : 67;
}

function isNear(actual, expected, tolerance = 3) {
  return Math.abs(actual - expected) <= tolerance;
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const findings = [];

try {
  for (const route of routes) {
    for (const [viewport, width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: "light" });
      try {
        const response = await page.goto(`${baseUrl}${route.url}`, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
        await page.evaluate(async () => {
          if (document.fonts?.ready) await document.fonts.ready;
        });
        await page.waitForTimeout(route.key === "map" ? 1_800 : 650);

        const metrics = await page.evaluate(() => {
          const root = document.documentElement;
          const header = document.querySelector("header");
          const h1 = document.querySelector("h1");
          const bottomNav = document.querySelector("[data-mobile-bottom-nav]");
          const shellRoot = document.querySelector("#main-content");
          const headerRect = header?.getBoundingClientRect();
          const bottomNavVisible =
            bottomNav instanceof HTMLElement &&
            getComputedStyle(bottomNav).display !== "none" &&
            bottomNav.getClientRects().length > 0;

          return {
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            heading: h1?.textContent?.replace(/\s+/g, " ").trim() ?? null,
            shell: shellRoot?.getAttribute("data-experience-shell") ?? null,
            headerHeight: headerRect?.height ?? 0,
            headerMode: header?.getAttribute("data-search-global-header") ?? null,
            bottomNavVisible,
            pathname: window.location.pathname,
          };
        });

        const localFindings = [];
        const status = response?.status() ?? 0;
        if (!response || status >= 400) localFindings.push(`HTTP_${status || "NO_RESPONSE"}`);
        if (!metrics.heading) localFindings.push("MISSING_H1");
        if (metrics.shell !== "p1-a1") localFindings.push(`SHELL_MARKER_${metrics.shell ?? "MISSING"}`);
        if (metrics.scrollWidth > metrics.clientWidth + 1) {
          localFindings.push(`HORIZONTAL_OVERFLOW_${metrics.scrollWidth}_${metrics.clientWidth}`);
        }

        if (route.key === "home") {
          const normalized = metrics.heading?.toLowerCase() ?? "";
          if (!normalized.includes("1er moteur de recherche immobilier au maroc")) {
            localFindings.push("HOME_H1_DRIFT");
          }
        } else {
          const expected = expectedHeaderHeight(width);
          if (!isNear(metrics.headerHeight, expected)) {
            localFindings.push(`HEADER_HEIGHT_${metrics.headerHeight.toFixed(1)}_EXPECTED_${expected}`);
          }
        }

        if (route.key === "search" && metrics.headerMode !== "exact-white") {
          localFindings.push(`SEARCH_C2_HEADER_DRIFT_${metrics.headerMode ?? "MISSING"}`);
        }

        if (width < 768 && !metrics.bottomNavVisible) localFindings.push("MOBILE_BOTTOM_NAV_MISSING");
        if (width >= 768 && metrics.bottomNavVisible) localFindings.push("MOBILE_BOTTOM_NAV_VISIBLE_DESKTOP");

        const screenshot = `${route.key}-${viewport}.png`;
        await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

        findings.push(...localFindings.map((finding) => ({ route: route.key, viewport, finding })));
        results.push({ route: route.key, role: route.role, viewport, width, height, status, screenshot, findings: localFindings, ...metrics });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        findings.push({ route: route.key, viewport, finding: `AUDIT_ERROR_${message}` });
        results.push({ route: route.key, role: route.role, viewport, width, height, error: message });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const expectedScreenshotCount = routes.length * viewports.length;
const screenshotCount = results.filter((result) => result.screenshot).length;
const report = {
  schemaVersion: "EXPERIENCE_P1_A1_FIDELITY_SHELL_V1",
  generatedAt: new Date().toISOString(),
  routeCount: routes.length,
  viewportCount: viewports.length,
  expectedScreenshotCount,
  screenshotCount,
  findingCount: findings.length,
  findingRouteCount: new Set(findings.map((item) => item.route)).size,
  findings,
  results,
};

await writeFile(path.join(outputDir, "metrics.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  routeCount: report.routeCount,
  viewportCount: report.viewportCount,
  screenshotCount: report.screenshotCount,
  expectedScreenshotCount: report.expectedScreenshotCount,
  findingCount: report.findingCount,
  findingRouteCount: report.findingRouteCount,
}, null, 2));

if (screenshotCount !== expectedScreenshotCount) {
  throw new Error(`P1-A1 screenshots incomplete: ${screenshotCount}/${expectedScreenshotCount}`);
}
if (findings.length > 0) {
  throw new Error(`P1-A1 fidelity findings: ${findings.length}`);
}
