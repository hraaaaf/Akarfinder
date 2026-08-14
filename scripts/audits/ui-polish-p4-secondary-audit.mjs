import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3199";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/ui-polish-p4";

const routes = [
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
        await page.waitForTimeout(800);

        const metrics = await page.evaluate(() => {
          const root = document.documentElement;
          const header = document.querySelector("header");
          const h1 = document.querySelector("h1");
          return {
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            scrollHeight: root.scrollHeight,
            headerPresent: Boolean(header),
            headerHeight: header ? Math.round(header.getBoundingClientRect().height * 10) / 10 : null,
            heading: h1?.textContent?.trim() ?? null,
            bodyBackground: getComputedStyle(document.body).backgroundColor,
          };
        });

        const horizontalOverflow = metrics.scrollWidth > metrics.clientWidth + 1;
        if (horizontalOverflow) failures.push(`${route} @ ${viewportKey}: overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
        if (!metrics.headerPresent) failures.push(`${route} @ ${viewportKey}: header missing`);
        if (!metrics.heading) failures.push(`${route} @ ${viewportKey}: h1 missing`);

        const screenshot = `${routeKey}-${viewportKey}.png`;
        await page.screenshot({ path: `${outputDir}/${screenshot}`, fullPage: true });
        results.push({
          route,
          routeKey,
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
  schemaVersion: "UI_POLISH_P4_SECONDARY_AUDIT_V1",
  generatedAt: new Date().toISOString(),
  baseUrl,
  routes: routes.map(([, route]) => route),
  viewports: viewports.map(([name, width, height]) => ({ name, width, height })),
  screenshotCount: results.filter((item) => item.screenshot).length,
  failures,
  results,
};

await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) throw new Error(`P4 visual audit failed with ${failures.length} finding(s)`);
