import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/ui-polish-p3";
const routeFilter = process.env.AUDIT_ROUTE ?? null;

const routes = [
  ["favorites", "/favorites"],
  ["map", "/map"],
  ["alerts", "/alerts"],
  ["compare", "/compare"],
  ["mon-projet", "/mon-projet"],
].filter(([key, route]) => !routeFilter || routeFilter === key || routeFilter === route);

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
  for (const [routeKey, route] of routes) {
    for (const [viewportKey, width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: "light" });
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      try {
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
          return {
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            scrollHeight: root.scrollHeight,
            headerHeight: header ? Math.round(header.getBoundingClientRect().height * 10) / 10 : null,
            bottomNavPresent: Boolean(bottomNav),
            activeBottomNavHref: activeBottomNav?.getAttribute("data-mobile-bottom-nav-item") ?? null,
            heading: h1?.textContent?.trim() ?? null,
          };
        });

        const horizontalOverflow = metrics.scrollWidth > metrics.clientWidth + 1;
        if (horizontalOverflow) failures.push(`${route} @ ${viewportKey}: overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
        if (width < 768 && !metrics.bottomNavPresent) failures.push(`${route} @ ${viewportKey}: mobile bottom nav missing`);
        if (width >= 768 && metrics.bottomNavPresent) failures.push(`${route} @ ${viewportKey}: mobile bottom nav visible at md+`);

        const screenshot = `${routeKey}-${viewportKey}.png`;
        await page.screenshot({ path: `${outputDir}/${screenshot}`, fullPage: true });
        results.push({ route, routeKey, viewport: viewportKey, width, height, status, screenshot, horizontalOverflow, consoleErrors: consoleErrors.slice(0, 10), consoleErrorCount: consoleErrors.length, ...metrics });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(message);
        results.push({ route, routeKey, viewport: viewportKey, width, height, error: message });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "UI_POLISH_P3_VISUAL_AUDIT_V1",
  generatedAt: new Date().toISOString(),
  baseUrl,
  routeFilter,
  routes: routes.map(([, route]) => route),
  viewports: viewports.map(([name, width, height]) => ({ name, width, height })),
  screenshotCount: results.filter((item) => item.screenshot).length,
  failures,
  results,
};

await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) throw new Error(`P3 visual audit failed with ${failures.length} finding(s)`);
