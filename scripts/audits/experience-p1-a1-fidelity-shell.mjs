import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/experience-p1-a1-fidelity-shell";
const routes = [
  { key: "home", path: "/" },
  { key: "vendre", path: "/vendre" },
  { key: "search", path: "/search" },
  { key: "map", path: "/map?city=rabat&layer=explore" },
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
    const response = await page.goto(`${baseURL}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForFunction(() => document.readyState === "complete", null, { timeout: 15_000 }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(route.key === "map" ? 1500 : 500);

    const metrics = await page.evaluate((key) => {
      const hero = document.querySelector('[data-home-hero="p1-a1"]');
      const header = document.querySelector("header");
      const logos = [...document.querySelectorAll('header img[alt="AkarFinder"]')].map((img) => img.getAttribute("src") ?? "");
      const typeEntry = document.querySelector('[data-vendre-type-entry="p1-a1"]');
      const paths = document.querySelector('[data-vendre-paths="p1-a1"]');
      return {
        h1: document.querySelector("h1")?.textContent?.trim() ?? "",
        bodyText: document.body.innerText,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        homeHeroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : null,
        homeValueStrip: Boolean(document.querySelector('[data-home-value-strip="p1-a1"]')),
        canonicalLogos: logos,
        exactWhiteHeader: header?.getAttribute("data-search-global-header") === "exact-white",
        propertyTypeCount: key === "vendre" ? document.querySelectorAll('a[href*="property_type="]').length : null,
        vendreTypeEntry: Boolean(typeEntry),
        vendreTypeEntryTop: typeEntry ? Math.round(typeEntry.getBoundingClientRect().top) : null,
        vendrePathsTop: paths ? Math.round(paths.getBoundingClientRect().top) : null,
      };
    }, route.key);

    const status = response?.status() ?? 0;
    const screenshot = `${route.key}-${viewport}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

    if (status >= 400 || status === 0) findings.push({ route: route.key, viewport, code: "HTTP", detail: status });
    if (!metrics.h1) findings.push({ route: route.key, viewport, code: "H1_MISSING" });
    if (metrics.scrollWidth > metrics.clientWidth + 1) findings.push({ route: route.key, viewport, code: "HORIZONTAL_OVERFLOW", detail: `${metrics.scrollWidth}>${metrics.clientWidth}` });
    if (!metrics.canonicalLogos.length) findings.push({ route: route.key, viewport, code: "CANONICAL_LOGO_MISSING" });
    if (metrics.canonicalLogos.some((src) => !src.includes("/brand/logo-v2/logo-header-"))) findings.push({ route: route.key, viewport, code: "NON_CANONICAL_LOGO", detail: metrics.canonicalLogos });

    if (route.key === "home") {
      if (metrics.h1 !== "1er moteur de recherche immobilier au Maroc") findings.push({ route: route.key, viewport, code: "HOME_PHRASE" });
      if (!metrics.bodyText.includes("Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider.")) findings.push({ route: route.key, viewport, code: "HOME_DECISION_COPY" });
      if (metrics.homeValueStrip) findings.push({ route: route.key, viewport, code: "HOME_VALUE_STRIP_REINTRODUCED" });
      if (!metrics.homeHeroHeight || metrics.homeHeroHeight > height * 0.9) findings.push({ route: route.key, viewport, code: "HOME_HERO_TOO_TALL", detail: metrics.homeHeroHeight });
      if (metrics.bodyText.includes("Pourquoi rechercher avec AkarFinder ?")) findings.push({ route: route.key, viewport, code: "HOME_OLD_WHY_SECTION" });
      if (metrics.bodyText.includes("Comparez sans perdre l’essentiel")) findings.push({ route: route.key, viewport, code: "HOME_OLD_MARKET_SECTION" });
    }

    if (route.key === "vendre") {
      if (metrics.h1 !== "Commençons par le type de bien") findings.push({ route: route.key, viewport, code: "VENDRE_TYPE_H1_MISMATCH", detail: metrics.h1 });
      if (metrics.bodyText.includes("Commencez directement par son type")) findings.push({ route: route.key, viewport, code: "VENDRE_REJECTED_COPY_PRESENT" });
      if (!metrics.propertyTypeCount || metrics.propertyTypeCount < 6) findings.push({ route: route.key, viewport, code: "VENDRE_TYPE_ENTRY_MISSING", detail: metrics.propertyTypeCount });
      if (!metrics.vendreTypeEntry) findings.push({ route: route.key, viewport, code: "VENDRE_TYPE_SECTION_MISSING" });
      if (metrics.vendreTypeEntryTop == null || metrics.vendrePathsTop == null || metrics.vendreTypeEntryTop >= metrics.vendrePathsTop) findings.push({ route: route.key, viewport, code: "VENDRE_TYPE_NOT_FIRST", detail: { typeTop: metrics.vendreTypeEntryTop, pathsTop: metrics.vendrePathsTop } });
    }

    if ((route.key === "search" || route.key === "map") && !metrics.exactWhiteHeader) {
      findings.push({ route: route.key, viewport, code: "C2_HEADER_REGRESSION" });
    }

    rows.push({ route: route.key, path: route.path, viewport, width, height, status, screenshot, ...metrics });
    await page.close();
  }
}

await browser.close();
const result = {
  schema: "EXPERIENCE_P1_A1_RECONCILIATION_V4",
  routeCount: routes.length,
  viewportCount: viewports.length,
  expectedScreenshotCount: routes.length * viewports.length,
  screenshotCount: rows.length,
  findingCount: findings.length,
  findingRouteCount: new Set(findings.map((finding) => finding.route)).size,
  rows,
  findings,
};
await fs.writeFile(path.join(outputDir, "metrics.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ routeCount: result.routeCount, viewportCount: result.viewportCount, screenshotCount: result.screenshotCount, expectedScreenshotCount: result.expectedScreenshotCount, findingCount: result.findingCount }, null, 2));
if (findings.length) process.exit(1);
