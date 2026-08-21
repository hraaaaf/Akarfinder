import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/product-experience-city-colors";
const routes = [
  { key: "national", path: "/map?layer=explore" },
  { key: "casablanca", path: "/map?city=casablanca&layer=explore" },
];
const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];
const expectedCityColors = ["agadir", "casablanca", "fes", "marrakech", "rabat", "tanger"];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const rows = [];
const findings = [];

function addFinding(route, viewport, code, detail = null) {
  findings.push({ route, viewport, code, ...(detail == null ? {} : { detail }) });
}

for (const route of routes) {
  for (const [viewport, width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    const response = await page.goto(`${baseURL}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForSelector("[data-p4-map-layout]", { timeout: 20_000 });
    await page.waitForSelector(".maplibregl-map", { timeout: 20_000 });

    if (route.key === "national") {
      await page.waitForFunction(() =>
        document.querySelectorAll('[data-akarfinder-city-color-overview="true"]').length >= 6,
        { timeout: 20_000 },
      );
    } else {
      await page.waitForSelector(
        '[data-akarfinder-territorial-explorer][data-akarfinder-selected-city="true"]',
        { timeout: 20_000 },
      );
    }

    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => null);
    await page.waitForTimeout(750);

    const metrics = await page.evaluate(() => {
      const unique = (values) => [...new Set(values.filter(Boolean))].sort();
      const coloredMarkers = [...document.querySelectorAll('[data-akarfinder-city-color-overview="true"]')];
      const coloredChips = [...document.querySelectorAll('[data-akarfinder-city-color-chip]')];
      const canvas = document.querySelector("[data-p4-map-canvas]");
      const header = document.querySelector("header");
      const logos = [...document.querySelectorAll('header img[alt="AkarFinder"]')].map((img) => img.getAttribute("src") ?? "");
      const cityExplorer = document.querySelector('[data-akarfinder-territorial-explorer][data-akarfinder-selected-city="true"]');
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasMapLibre: Boolean(document.querySelector(".maplibregl-map")),
        exactWhiteHeader: header?.getAttribute("data-search-global-header") === "exact-white",
        canonicalLogos: logos,
        cityOverviewActive: canvas?.getAttribute("data-akarfinder-city-color-overview-active") === "true",
        coloredMarkerSlugs: unique(coloredMarkers.map((node) => node.getAttribute("data-akarfinder-city-color"))),
        coloredChipSlugs: unique(coloredChips.map((node) => node.getAttribute("data-akarfinder-city-color-chip"))),
        identityOnlyMarkerCount: coloredMarkers.filter((node) => node.getAttribute("data-akarfinder-city-color-meaning") === "identity-only").length,
        nationalLegendPresent: Boolean(document.querySelector('[data-akarfinder-city-color-legend="identity-only"]')),
        selectedCityExplorer: Boolean(cityExplorer),
        cityExplorerText: cityExplorer?.textContent ?? "",
        districtControlCount: cityExplorer?.querySelectorAll("button").length ?? 0,
        clusterMarkerCount: document.querySelectorAll(".maplibre-cluster-marker").length,
      };
    });

    const status = response?.status() ?? 0;
    if (status === 0 || status >= 400) addFinding(route.key, viewport, "HTTP", status);
    if (!metrics.hasMapLibre) addFinding(route.key, viewport, "MAPLIBRE_MISSING");
    if (metrics.scrollWidth > metrics.clientWidth + 1) addFinding(route.key, viewport, "HORIZONTAL_OVERFLOW", `${metrics.scrollWidth}>${metrics.clientWidth}`);
    if (!metrics.exactWhiteHeader) addFinding(route.key, viewport, "EXACT_WHITE_REGRESSION");
    if (!metrics.canonicalLogos.length || metrics.canonicalLogos.some((src) => !src.includes("/brand/logo-v2/logo-header-"))) {
      addFinding(route.key, viewport, "CANONICAL_LOGO_REGRESSION", metrics.canonicalLogos);
    }

    if (route.key === "national") {
      if (!metrics.cityOverviewActive) addFinding(route.key, viewport, "CITY_OVERVIEW_NOT_ACTIVE");
      if (JSON.stringify(metrics.coloredMarkerSlugs) !== JSON.stringify(expectedCityColors)) {
        addFinding(route.key, viewport, "CITY_MARKER_PALETTE_MISMATCH", metrics.coloredMarkerSlugs);
      }
      if (JSON.stringify(metrics.coloredChipSlugs) !== JSON.stringify(expectedCityColors)) {
        addFinding(route.key, viewport, "CITY_CHIP_PALETTE_MISMATCH", metrics.coloredChipSlugs);
      }
      if (metrics.identityOnlyMarkerCount !== 6) addFinding(route.key, viewport, "IDENTITY_ONLY_MARKER_COUNT", metrics.identityOnlyMarkerCount);
      if (!metrics.nationalLegendPresent) addFinding(route.key, viewport, "CITY_COLOR_LEGEND_MISSING");
      if (metrics.clusterMarkerCount < 8) addFinding(route.key, viewport, "BASE_CITY_MARKERS_REGRESSED", metrics.clusterMarkerCount);
    } else {
      if (metrics.cityOverviewActive) addFinding(route.key, viewport, "CITY_OVERVIEW_LEAKS_INTO_CITY");
      if (metrics.coloredMarkerSlugs.length) addFinding(route.key, viewport, "COLORED_CITY_MARKERS_LEAK_INTO_CITY", metrics.coloredMarkerSlugs);
      if (!metrics.selectedCityExplorer) addFinding(route.key, viewport, "CASABLANCA_CITY_EXPLORER_REGRESSION");
      if (!metrics.cityExplorerText.includes("Casablanca")) addFinding(route.key, viewport, "CASABLANCA_CITY_CONTEXT_REGRESSION");
      if (metrics.districtControlCount < 2) addFinding(route.key, viewport, "CASABLANCA_DISTRICT_CONTROLS_REGRESSION", metrics.districtControlCount);
    }

    const screenshot = `${route.key}-${viewport}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false });
    rows.push({ route: route.key, viewport, width, height, status, screenshot, ...metrics });
    await page.close();
  }
}

await browser.close();

const result = {
  schema: "AKARFINDER_PRODUCT_EXPERIENCE_CITY_COLORS_V1",
  routeCount: routes.length,
  viewportCount: viewports.length,
  expectedScreenshotCount: routes.length * viewports.length,
  screenshotCount: rows.length,
  findingCount: findings.length,
  rows,
  findings,
};

await fs.writeFile(path.join(outputDir, "metrics.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  screenshotCount: result.screenshotCount,
  expectedScreenshotCount: result.expectedScreenshotCount,
  findingCount: result.findingCount,
  findings: result.findings,
}, null, 2));
if (findings.length || result.screenshotCount !== result.expectedScreenshotCount) process.exit(1);
