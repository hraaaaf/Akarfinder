import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/ui-polish-p5";

const scenarios = [
  ["search", "/search"],
  ["favorites", "/favorites"],
  ["map", "/map"],
  ["alerts", "/alerts"],
  ["compare", "/compare"],
  ["compare-populated", "/compare", { compareIds: ["casablanca-finance-city-terrasse", "casablanca-maarif-studio-renove"] }],
  ["mon-projet", "/mon-projet"],
  ["a-propos", "/a-propos"],
  ["accompagnement", "/accompagnement"],
  ["acheter", "/acheter"],
  ["comment-ca-marche", "/comment-ca-marche"],
  ["compagnon", "/compagnon"],
  ["conditions-utilisation", "/conditions-utilisation"],
  ["contact", "/contact"],
  ["credit", "/credit"],
  ["demande-retrait", "/demande-retrait"],
  ["faq", "/faq"],
];

const mobileNavRequired = new Set([
  "/search",
  "/favorites",
  "/map",
  "/alerts",
  "/compare",
  "/mon-projet",
  "/a-propos",
  "/comment-ca-marche",
  "/conditions-utilisation",
  "/contact",
  "/credit",
  "/demande-retrait",
  "/faq",
]);

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
  for (const [scenarioKey, route, options = {}] of scenarios) {
    for (const [viewportKey, width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: "light" });
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      try {
        if (options.compareIds) {
          await page.addInitScript((ids) => {
            window.localStorage.setItem("akarfinder:compare:listings", JSON.stringify(ids));
          }, options.compareIds);
        }

        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        const status = response?.status() ?? 0;
        if (!response || status >= 400) throw new Error(`${route} @ ${viewportKey}: HTTP ${status || "no response"}`);
        await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
        await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
        await page.waitForTimeout(route === "/map" ? 2200 : 900);

        const metrics = await page.evaluate(() => {
          const root = document.documentElement;
          const bottomNav = document.querySelector("[data-mobile-bottom-nav]");
          const bottomNavVisible = bottomNav instanceof HTMLElement
            && getComputedStyle(bottomNav).display !== "none"
            && bottomNav.getClientRects().length > 0;
          return {
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            scrollHeight: root.scrollHeight,
            heading: document.querySelector("h1")?.textContent?.trim() ?? null,
            bottomNavPresent: Boolean(bottomNav),
            bottomNavVisible,
            finalPathname: window.location.pathname,
          };
        });

        const horizontalOverflow = metrics.scrollWidth > metrics.clientWidth + 1;
        if (horizontalOverflow) failures.push(`${scenarioKey} @ ${viewportKey}: overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
        if (!metrics.heading) failures.push(`${scenarioKey} @ ${viewportKey}: missing H1`);
        if (width < 768 && mobileNavRequired.has(route) && !metrics.bottomNavVisible) {
          failures.push(`${scenarioKey} @ ${viewportKey}: canonical mobile nav missing or hidden`);
        }
        if (width >= 768 && metrics.bottomNavVisible) failures.push(`${scenarioKey} @ ${viewportKey}: mobile nav visible at md+`);

        if (scenarioKey === "compare-populated") {
          const mobileRailVisible = await page.locator("[data-compare-mobile-identity-rail]").isVisible().catch(() => false);
          const desktopTableVisible = await page.locator("[data-compare-desktop-table]").isVisible().catch(() => false);
          if (width < 1024 && !mobileRailVisible) failures.push(`${scenarioKey} @ ${viewportKey}: populated mobile identity rail missing`);
          if (width >= 1024 && !desktopTableVisible) failures.push(`${scenarioKey} @ ${viewportKey}: populated desktop table missing`);
        }

        const screenshot = `${scenarioKey}-${viewportKey}.png`;
        await page.screenshot({ path: `${outputDir}/${screenshot}`, fullPage: true });
        results.push({
          scenarioKey,
          route,
          viewport: viewportKey,
          width,
          height,
          status,
          screenshot,
          horizontalOverflow,
          consoleErrors: consoleErrors.slice(0, 10),
          consoleErrorCount: consoleErrors.length,
          ...metrics,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(message);
        results.push({ scenarioKey, route, viewport: viewportKey, width, height, error: message });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "UI_POLISH_P5_GLOBAL_AUDIT_V1",
  generatedAt: new Date().toISOString(),
  baseUrl,
  scenarios: scenarios.map(([key, route]) => ({ key, route })),
  viewports: viewports.map(([name, width, height]) => ({ name, width, height })),
  screenshotCount: results.filter((item) => item.screenshot).length,
  failures,
  results,
};

await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) throw new Error(`P5 global visual audit failed with ${failures.length} finding(s)`);
