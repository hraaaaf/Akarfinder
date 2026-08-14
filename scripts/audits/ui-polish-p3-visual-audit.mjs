import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/ui-polish-p3";
const routeFilter = process.env.AUDIT_ROUTE ?? null;

const compareStorageKey = "akarfinder:compare:listings";
const populatedCompareIds = [
  "casablanca-finance-city-terrasse",
  "casablanca-maarif-studio-renove",
];

const scenarios = [
  ["favorites", "/favorites", null],
  ["map", "/map", null],
  ["alerts", "/alerts", null],
  ["compare", "/compare", null],
  ["compare-populated", "/compare", { compareIds: populatedCompareIds }],
  ["mon-projet", "/mon-projet", null],
].filter(([key, route]) =>
  !routeFilter
  || routeFilter === key
  || routeFilter === route
  || (routeFilter === "compare" && key === "compare-populated")
);

const expectedMobileActiveHref = {
  "/favorites": "/favorites",
  "/map": "/map",
  "/alerts": "/alerts",
  "/compare": "/favorites",
  "/mon-projet": "/mon-projet",
};

const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];

try {
  for (const [scenarioKey, route, setup] of scenarios) {
    for (const [viewportKey, width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: "light" });
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      try {
        if (setup?.compareIds) {
          await page.addInitScript(
            ({ storageKey, ids }) => {
              window.localStorage.setItem(storageKey, JSON.stringify(ids));
            },
            { storageKey: compareStorageKey, ids: setup.compareIds },
          );
        }

        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        const status = response?.status() ?? 0;
        if (!response || status >= 400) throw new Error(`${route} @ ${viewportKey}: HTTP ${status || "no response"}`);
        await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
        await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
        await page.waitForTimeout(route === "/map" ? 2200 : 900);

        const metrics = await page.evaluate(() => {
          const root = document.documentElement;
          const header = document.querySelector("header");
          const bottomNav = document.querySelector("[data-mobile-bottom-nav]");
          const activeBottomNav = document.querySelector('[data-mobile-bottom-nav-active="true"]');
          const h1 = document.querySelector("h1");
          const compareIdentity = document.querySelector("[data-compare-mobile-identity]");
          const compareDesktopTable = document.querySelector("table");
          const bottomNavVisible = bottomNav instanceof HTMLElement
            && getComputedStyle(bottomNav).display !== "none"
            && bottomNav.getClientRects().length > 0;
          const compareIdentityVisible = compareIdentity instanceof HTMLElement
            && getComputedStyle(compareIdentity).display !== "none"
            && compareIdentity.getClientRects().length > 0;
          const compareDesktopTableVisible = compareDesktopTable instanceof HTMLElement
            && getComputedStyle(compareDesktopTable).display !== "none"
            && compareDesktopTable.getClientRects().length > 0;
          return {
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            scrollHeight: root.scrollHeight,
            headerHeight: header ? Math.round(header.getBoundingClientRect().height * 10) / 10 : null,
            bottomNavPresent: Boolean(bottomNav),
            bottomNavVisible,
            activeBottomNavHref: activeBottomNav?.getAttribute("data-mobile-bottom-nav-item") ?? null,
            heading: h1?.textContent?.trim() ?? null,
            compareCardCount: document.querySelectorAll('[id^="compare-"]').length,
            compareIdentityVisible,
            compareDesktopTableVisible,
          };
        });

        const horizontalOverflow = metrics.scrollWidth > metrics.clientWidth + 1;
        if (horizontalOverflow) failures.push(`${scenarioKey} @ ${viewportKey}: overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
        if (width < 768 && !metrics.bottomNavVisible) failures.push(`${scenarioKey} @ ${viewportKey}: mobile bottom nav missing or hidden`);
        if (width < 768 && metrics.activeBottomNavHref !== expectedMobileActiveHref[route]) {
          failures.push(`${scenarioKey} @ ${viewportKey}: expected active mobile destination ${expectedMobileActiveHref[route]}, got ${metrics.activeBottomNavHref ?? "none"}`);
        }
        if (width >= 768 && metrics.bottomNavVisible) failures.push(`${scenarioKey} @ ${viewportKey}: mobile bottom nav visible at md+`);

        if (scenarioKey === "compare-populated") {
          if (metrics.compareCardCount < populatedCompareIds.length) {
            failures.push(`${scenarioKey} @ ${viewportKey}: expected ${populatedCompareIds.length} populated compare cards, got ${metrics.compareCardCount}`);
          }
          if (width < 1024 && !metrics.compareIdentityVisible) {
            failures.push(`${scenarioKey} @ ${viewportKey}: mobile/tablet compare identity rail missing or hidden`);
          }
          if (width >= 1024 && !metrics.compareDesktopTableVisible) {
            failures.push(`${scenarioKey} @ ${viewportKey}: desktop compare table missing or hidden`);
          }
        }

        const screenshot = `${scenarioKey}-${viewportKey}.png`;
        await page.screenshot({ path: `${outputDir}/${screenshot}`, fullPage: true });
        results.push({ scenario: scenarioKey, route, viewport: viewportKey, width, height, status, screenshot, horizontalOverflow, consoleErrors: consoleErrors.slice(0, 10), consoleErrorCount: consoleErrors.length, ...metrics });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(message);
        results.push({ scenario: scenarioKey, route, viewport: viewportKey, width, height, error: message });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "UI_POLISH_P3_VISUAL_AUDIT_V2",
  generatedAt: new Date().toISOString(),
  baseUrl,
  routeFilter,
  scenarios: scenarios.map(([key, route]) => ({ key, route })),
  viewports: viewports.map(([name, width, height]) => ({ name, width, height })),
  screenshotCount: results.filter((item) => item.screenshot).length,
  failures,
  results,
};

await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) throw new Error(`P3 visual audit failed with ${failures.length} finding(s)`);
