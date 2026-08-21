import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3223";
const outputDir = process.env.OUTPUT_DIR ?? "artifacts/product-experience-p10-secondary";
const routes = [
  "/a-propos",
  "/comment-ca-marche",
  "/faq",
  "/contact",
  "/demande-retrait",
  "/conditions-utilisation",
  "/politique-confidentialite",
];
const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const rows = [];
const findings = [];

try {
  for (const route of routes) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(300);
      const metrics = await page.evaluate(() => {
        const root = document.documentElement;
        const header = document.querySelector("header");
        return {
          clientWidth: root.clientWidth,
          scrollWidth: root.scrollWidth,
          h1Count: document.querySelectorAll("h1").length,
          mainCount: document.querySelectorAll("main").length,
          logoCount: document.querySelectorAll('img[alt="AkarFinder"]').length,
          headerColor: header ? getComputedStyle(header).backgroundColor : null,
          shellPresent: Boolean(document.querySelector('[data-secondary-page-shell="akarfinder-v1"]')),
          footerPresent: Boolean(document.querySelector("#footer")),
          bottomNavPresent: Boolean(document.querySelector('[data-mobile-bottom-nav="exact-light-blue"]')),
        };
      });
      const status = response?.status() ?? null;
      const slug = route.slice(1).replaceAll("/", "-");
      const screenshot = `${slug}-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      rows.push({ route, ...viewport, status, ...metrics, screenshot });

      if (status !== 200) findings.push({ route, ...viewport, finding: `HTTP_${status}` });
      if (metrics.scrollWidth > metrics.clientWidth) findings.push({ route, ...viewport, finding: "HORIZONTAL_OVERFLOW" });
      if (metrics.h1Count !== 1) findings.push({ route, ...viewport, finding: `H1_COUNT_${metrics.h1Count}` });
      if (metrics.mainCount !== 1) findings.push({ route, ...viewport, finding: `MAIN_COUNT_${metrics.mainCount}` });
      if (metrics.logoCount < 1) findings.push({ route, ...viewport, finding: "CANONICAL_LOGO_MISSING" });
      if (metrics.headerColor !== "rgb(255, 255, 255)") findings.push({ route, ...viewport, finding: `HEADER_NOT_EXACT_WHITE_${metrics.headerColor}` });
      if (!metrics.shellPresent) findings.push({ route, ...viewport, finding: "SECONDARY_SHELL_MISSING" });
      if (!metrics.footerPresent) findings.push({ route, ...viewport, finding: "FOOTER_MISSING" });
      if (!metrics.bottomNavPresent) findings.push({ route, ...viewport, finding: "BOTTOM_NAV_MISSING" });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "AKARFINDER_PRODUCT_EXPERIENCE_P10_V1",
  routes,
  screenshotCount: rows.length,
  findingCount: findings.length,
  findings,
  viewports: rows,
};
await writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (rows.length !== routes.length * viewports.length || findings.length) {
  throw new Error(`P10 certification failed with ${findings.length} finding(s)`);
}
