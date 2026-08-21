import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/product-experience-p4-search-map";
const routes = [
  { key: "search", path: "/search?city=Rabat&view=split" },
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

function finding(route, viewport, code, detail = null) {
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

    if (route.key === "search") {
      await page.waitForSelector("[data-p4-search-map-panel]", { timeout: 20_000 });
      await page.waitForSelector("[data-search-list-pane]", { timeout: 20_000 });
    } else {
      await page.waitForSelector("[data-p4-map-layout]", { timeout: 20_000 });
      await page.waitForSelector("[data-p4-map-decision-rail]", { timeout: 20_000 });
    }

    await page.waitForSelector(".maplibregl-map", { timeout: 20_000 }).catch(() => null);
    // MapLibre can exist before its remote style/tiles have visually settled, especially at 390 px.
    // Wait for network quiescence, then one short paint window so AFTER evidence is deterministic.
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => null);
    await page.waitForTimeout(750);

    const metrics = await page.evaluate(({ routeKey, viewportWidth }) => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          x: Math.round(box.x * 10) / 10,
          y: Math.round(box.y * 10) / 10,
          width: Math.round(box.width * 10) / 10,
          height: Math.round(box.height * 10) / 10,
          bottom: Math.round(box.bottom * 10) / 10,
          position: style.position,
          display: style.display,
          visibility: style.visibility,
        };
      };

      const header = document.querySelector("header");
      const logos = [...document.querySelectorAll('header img[alt="AkarFinder"]')].map(
        (img) => img.getAttribute("src") ?? "",
      );
      const maplibre = document.querySelector(".maplibregl-map");
      const mapCanvas = routeKey === "search"
        ? document.querySelector("[data-p4-search-map-canvas]")
        : document.querySelector("[data-p4-map-canvas]");
      const basemapContract = document.querySelector('[data-p4-basemap="territorial-muted"]');
      const centralFailClosed = document.querySelector('[data-p4-map-canvas] [data-akarfinder-market-intelligence-map] > [role="status"]');
      const failClosedStyle = centralFailClosed ? getComputedStyle(centralFailClosed) : null;

      return {
        viewportWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        exactWhiteHeader: header?.getAttribute("data-search-global-header") === "exact-white",
        canonicalLogos: logos,
        hasMapLibre: Boolean(maplibre),
        hasTerritorialBasemapContract: Boolean(basemapContract),
        hasMapCanvas: Boolean(mapCanvas),
        centralFailClosedVisible: Boolean(
          centralFailClosed &&
          failClosedStyle &&
          failClosedStyle.display !== "none" &&
          failClosedStyle.visibility !== "hidden"
        ),
        searchLayout: rect('[data-search-view-layout="split"]'),
        searchMapPane: rect("[data-search-map-pane]"),
        searchListPane: rect("[data-search-list-pane]"),
        searchMapPanel: rect("[data-p4-search-map-panel]"),
        searchMapCanvas: rect("[data-p4-search-map-canvas]"),
        mapLayout: rect("[data-p4-map-layout]"),
        mapCanvas: rect("[data-p4-map-canvas]"),
        mapRail: rect("[data-p4-map-decision-rail]"),
      };
    }, { routeKey: route.key, viewportWidth: width });

    const status = response?.status() ?? 0;
    if (status === 0 || status >= 400) finding(route.key, viewport, "HTTP", status);
    if (metrics.scrollWidth > metrics.clientWidth + 1) {
      finding(route.key, viewport, "HORIZONTAL_OVERFLOW", `${metrics.scrollWidth}>${metrics.clientWidth}`);
    }
    if (!metrics.canonicalLogos.length) finding(route.key, viewport, "CANONICAL_LOGO_MISSING");
    if (metrics.canonicalLogos.some((src) => !src.includes("/brand/logo-v2/logo-header-"))) {
      finding(route.key, viewport, "NON_CANONICAL_LOGO", metrics.canonicalLogos);
    }
    if (!metrics.exactWhiteHeader) finding(route.key, viewport, "EXACT_WHITE_REGRESSION");
    if (!metrics.hasMapLibre) finding(route.key, viewport, "MAPLIBRE_RENDERER_MISSING");
    if (!metrics.hasTerritorialBasemapContract) finding(route.key, viewport, "TERRITORIAL_BASEMAP_CONTRACT_MISSING");
    if (!metrics.hasMapCanvas) finding(route.key, viewport, "MAP_CANVAS_MISSING");

    if (route.key === "search") {
      const mapPane = metrics.searchMapPane;
      const listPane = metrics.searchListPane;
      const mapPanel = metrics.searchMapPanel;
      const mapCanvas = metrics.searchMapCanvas;
      if (!mapPane || !listPane || !mapPanel || !mapCanvas) {
        finding(route.key, viewport, "SEARCH_SPLIT_STRUCTURE_MISSING");
      } else if (width >= 1024) {
        const combined = mapPane.width + listPane.width;
        const mapShare = combined > 0 ? mapPane.width / combined : 0;
        if (!(mapPane.x < listPane.x)) finding(route.key, viewport, "SEARCH_MAP_NOT_LEFT_OF_LIST", { mapPane, listPane });
        if (mapShare < 0.55 || mapShare > 0.65) finding(route.key, viewport, "SEARCH_DESKTOP_RATIO_OUT_OF_RANGE", mapShare);
        if (mapPane.width <= listPane.width) finding(route.key, viewport, "SEARCH_MAP_NOT_DOMINANT", { map: mapPane.width, list: listPane.width });
      } else {
        if (!(mapPane.y < listPane.y)) finding(route.key, viewport, "SEARCH_MAP_NOT_FIRST", { mapPane, listPane });
        if (mapCanvas.height < Math.min(420, height * 0.44)) finding(route.key, viewport, "SEARCH_MAP_TOO_SHORT", mapCanvas.height);
        const overlap = mapPane.bottom - listPane.y;
        if (overlap < 15 || overlap > 50) finding(route.key, viewport, "SEARCH_SHEET_OVERLAP_OUT_OF_RANGE", overlap);
      }
    }

    if (route.key === "map") {
      const layout = metrics.mapLayout;
      const canvas = metrics.mapCanvas;
      const rail = metrics.mapRail;
      if (!layout || !canvas || !rail) {
        finding(route.key, viewport, "MAP_DECISION_SHELL_MISSING");
      } else if (width >= 1024) {
        const combined = canvas.width + rail.width;
        const canvasShare = combined > 0 ? canvas.width / combined : 0;
        if (!(canvas.x < rail.x)) finding(route.key, viewport, "MAP_CANVAS_NOT_LEFT_OF_RAIL", { canvas, rail });
        if (canvasShare < 0.58 || canvasShare > 0.62) finding(route.key, viewport, "MAP_DESKTOP_RATIO_OUT_OF_RANGE", canvasShare);
        if (Math.abs(canvas.height - rail.height) > 2) finding(route.key, viewport, "MAP_RAIL_HEIGHT_MISMATCH", { canvas: canvas.height, rail: rail.height });
      } else {
        const maxRailHeight = width < 430 ? 212 : width < 768 ? 224 : 310;
        if (canvas.width < width - 2) finding(route.key, viewport, "MAP_MOBILE_CANVAS_NOT_FULL_WIDTH", canvas.width);
        if (rail.height > maxRailHeight) finding(route.key, viewport, "MAP_SHEET_TOO_TALL", { height: rail.height, max: maxRailHeight });
        if (rail.position !== "absolute") finding(route.key, viewport, "MAP_SHEET_NOT_OVERLAY", rail.position);
        if (rail.y < height * 0.55) finding(route.key, viewport, "MAP_FIRST_AREA_TOO_SHORT", rail.y);
      }
      if (metrics.centralFailClosedVisible) finding(route.key, viewport, "CENTRAL_FAIL_CLOSED_CARD_VISIBLE");
    }

    const screenshot = `${route.key}-${viewport}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false });
    rows.push({ route: route.key, viewport, width, height, status, screenshot, ...metrics });
    await page.close();
  }
}

await browser.close();

const result = {
  schema: "AKARFINDER_PRODUCT_EXPERIENCE_P4_SEARCH_MAP_V1",
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
if (findings.length) process.exit(1);
