import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const variant = process.env.AUDIT_VARIANT ?? null;
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? (variant ? `data/audits/ux-bottom-nav-10of10-1/${variant}/ui-polish-p1-mobile` : "data/audits/ui-polish-p1-mobile");

const routes = [
  ["search", "/search"],
  ["favorites", "/favorites"],
  ["map", "/map"],
  ["alerts", "/alerts"],
  ["compare", "/compare"],
  ["mon-projet", "/mon-projet"],
];

const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
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
          const main = document.querySelector("main");
          const h1 = document.querySelector("h1");
          const rect = (element) => {
            if (!element) return null;
            const box = element.getBoundingClientRect();
            return { x: Math.round(box.x * 10) / 10, y: Math.round(box.y * 10) / 10, width: Math.round(box.width * 10) / 10, height: Math.round(box.height * 10) / 10 };
          };
          return {
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            scrollHeight: root.scrollHeight,
            bodyBackground: getComputedStyle(document.body).backgroundColor,
            header: rect(header),
            main: rect(main),
            bottomNav: rect(bottomNav),
            bottomNavVariant: bottomNav?.getAttribute("data-mobile-bottom-nav") ?? null,
            activeBottomNavHref: activeBottomNav?.getAttribute("data-mobile-bottom-nav-item") ?? null,
            heading: h1?.textContent?.trim() ?? null,
            buttonCount: document.querySelectorAll("button").length,
            linkCount: document.querySelectorAll("a").length,
          };
        });

        const horizontalOverflow = metrics.scrollWidth > metrics.clientWidth + 1;
        const bottomNavPresent = Boolean(metrics.bottomNav);
        if (horizontalOverflow) failures.push(`${route} @ ${viewportKey}: horizontal overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
        if (!bottomNavPresent) failures.push(`${route} @ ${viewportKey}: mobile bottom nav missing`);

        const screenshot = `${routeKey}-${viewportKey}.png`;
        await page.screenshot({ path: `${outputDir}/${screenshot}`, fullPage: true });
        results.push({ route, routeKey, viewport: viewportKey, width, height, status, screenshot, horizontalOverflow, bottomNavPresent, consoleErrorCount: consoleErrors.length, consoleErrors: consoleErrors.slice(0, 10), ...metrics });
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
  schemaVersion: "UI_POLISH_P1_MOBILE_AUDIT_V1",
  generatedAt: new Date().toISOString(),
  baseUrl,
  routes: routes.map(([, route]) => route),
  viewports: viewports.map(([name, width, height]) => ({ name, width, height })),
  screenshotCount: results.filter((item) => item.screenshot).length,
  failures,
  results,
};

await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(`${outputDir}/SUMMARY.md`, [
  "# UI Polish P1 — Mobile Audit",
  "",
  `- Screenshots: ${report.screenshotCount}/12`,
  `- Failures: ${failures.length}`,
  `- Routes: ${report.routes.join(", ")}`,
  "- Viewports: 390×844 / 430×932",
  "",
  "This audit records factual layout/runtime evidence only. Visual scores are assigned only after human inspection of the screenshots.",
  "",
  ...failures.map((failure) => `- FAIL: ${failure}`),
  "",
].join("\n"));

if (failures.length > 0) throw new Error(`UI P1 mobile audit failed with ${failures.length} finding(s)`);
