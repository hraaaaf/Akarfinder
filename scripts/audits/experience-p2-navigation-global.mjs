import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/experience-p2-navigation-global";
const routes = [
  { key: "search", path: "/search?city=Rabat&view=split" },
  { key: "map", path: "/map?city=rabat&layer=explore" },
  { key: "listing", path: "/visual-qa/announcement-page" },
];
const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const rows = [];
const findings = [];

for (const route of routes) {
  for (const [viewport, width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    const response = await page.goto(`${baseURL}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(route.key === "map" ? 1_500 : 500);

    const metrics = await page.evaluate((key) => {
      const header = document.querySelector("header");
      const logos = [...document.querySelectorAll('header img[alt="AkarFinder"]')].map(
        (img) => img.getAttribute("src") ?? "",
      );
      return {
        h1: document.querySelector("h1")?.textContent?.trim() ?? "",
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        exactWhiteHeader: header?.getAttribute("data-search-global-header") === "exact-white",
        canonicalLogos: logos,
        key,
      };
    }, route.key);

    const status = response?.status() ?? 0;
    const screenshot = `${route.key}-${viewport}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

    if (status === 0 || status >= 400) findings.push({ route: route.key, viewport, code: "HTTP", detail: status });
    if (!metrics.h1) findings.push({ route: route.key, viewport, code: "H1_MISSING" });
    if (metrics.scrollWidth > metrics.clientWidth + 1) findings.push({ route: route.key, viewport, code: "HORIZONTAL_OVERFLOW", detail: `${metrics.scrollWidth}>${metrics.clientWidth}` });
    if (!metrics.canonicalLogos.length) findings.push({ route: route.key, viewport, code: "CANONICAL_LOGO_MISSING" });
    if (metrics.canonicalLogos.some((src) => !src.includes("/brand/logo-v2/logo-header-"))) findings.push({ route: route.key, viewport, code: "NON_CANONICAL_LOGO", detail: metrics.canonicalLogos });
    if ((route.key === "search" || route.key === "map") && !metrics.exactWhiteHeader) findings.push({ route: route.key, viewport, code: "EXACT_WHITE_REGRESSION" });

    rows.push({ route: route.key, viewport, width, height, status, screenshot, ...metrics });
    await page.close();
  }
}

const behaviorPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await behaviorPage.goto(`${baseURL}/search?city=Rabat&view=split`, {
  waitUntil: "domcontentloaded",
  timeout: 45_000,
});
await behaviorPage.waitForSelector("[data-search-sort-select]", { timeout: 20_000 });
await behaviorPage.waitForTimeout(500);

const startHistoryLength = await behaviorPage.evaluate(() => window.history.length);
await behaviorPage.selectOption("[data-search-sort-select]", "price-asc");
await behaviorPage.waitForFunction(() => new URL(window.location.href).searchParams.get("sort") === "price_asc", null, { timeout: 5_000 });
const firstHref = await behaviorPage.evaluate(() => `${window.location.pathname}${window.location.search}`);

await behaviorPage.selectOption("[data-search-sort-select]", "price-desc");
await behaviorPage.waitForFunction(() => new URL(window.location.href).searchParams.get("sort") === "price_desc", null, { timeout: 5_000 });
const secondHref = await behaviorPage.evaluate(() => `${window.location.pathname}${window.location.search}`);
const endHistoryLength = await behaviorPage.evaluate(() => window.history.length);

if (endHistoryLength < startHistoryLength + 2) findings.push({ route: "search", viewport: "1280x900", code: "HISTORY_NOT_PUSHED", detail: `${startHistoryLength}->${endHistoryLength}` });

await behaviorPage.evaluate(() => window.history.back());
await behaviorPage.waitForFunction((expected) => `${window.location.pathname}${window.location.search}` === expected, firstHref, { timeout: 5_000 });
const backSort = await behaviorPage.locator("[data-search-sort-select]").inputValue();
if (backSort !== "price-asc") findings.push({ route: "search", viewport: "1280x900", code: "BACK_STATE_NOT_RESTORED", detail: backSort });

await behaviorPage.evaluate(() => window.history.forward());
await behaviorPage.waitForFunction((expected) => `${window.location.pathname}${window.location.search}` === expected, secondHref, { timeout: 5_000 });
const forwardSort = await behaviorPage.locator("[data-search-sort-select]").inputValue();
if (forwardSort !== "price-desc") findings.push({ route: "search", viewport: "1280x900", code: "FORWARD_STATE_NOT_RESTORED", detail: forwardSort });
await behaviorPage.waitForTimeout(100);

const mapHref = await behaviorPage.locator('a[href^="/map"]').first().getAttribute("href");
if (!mapHref) {
  findings.push({ route: "search", viewport: "1280x900", code: "MAP_LINK_MISSING" });
} else {
  const parsedMap = new URL(mapHref, "https://akarfinder.local");
  if (parsedMap.searchParams.get("city") !== "rabat") findings.push({ route: "search", viewport: "1280x900", code: "MAP_CONTEXT_CITY_MISSING", detail: mapHref });
  if (parsedMap.searchParams.get("sort") !== "price_desc") findings.push({ route: "search", viewport: "1280x900", code: "MAP_CONTEXT_SORT_MISSING", detail: mapHref });
}

const listingLinks = behaviorPage.locator('a[href^="/listings/"]');
const listingCount = await listingLinks.count();
if (listingCount === 0) {
  findings.push({ route: "search", viewport: "1280x900", code: "LISTING_LINK_MISSING" });
} else {
  const listingHref = await listingLinks.first().getAttribute("href");
  const parsedListing = new URL(listingHref ?? "", "https://akarfinder.local");
  const returnTo = parsedListing.searchParams.get("return_to");
  if (returnTo !== secondHref) findings.push({ route: "search", viewport: "1280x900", code: "LISTING_RETURN_CONTEXT_MISMATCH", detail: { returnTo, secondHref } });
}

await behaviorPage.close();
await browser.close();

const result = {
  schema: "EXPERIENCE_P2_NAVIGATION_GLOBAL_V1",
  routeCount: routes.length,
  viewportCount: viewports.length,
  expectedScreenshotCount: routes.length * viewports.length,
  screenshotCount: rows.length,
  findingCount: findings.length,
  rows,
  behavior: {
    startHistoryLength,
    endHistoryLength,
    firstHref,
    secondHref,
    backSort,
    forwardSort,
    mapHref,
    listingCount,
  },
  findings,
};

await fs.writeFile(path.join(outputDir, "metrics.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ screenshotCount: result.screenshotCount, expectedScreenshotCount: result.expectedScreenshotCount, findingCount: result.findingCount, behavior: result.behavior }, null, 2));
if (findings.length) process.exit(1);
