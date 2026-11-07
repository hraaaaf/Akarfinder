import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

// Source-preserving L4-D: eight prominent cities at national zoom, all V5
// cities available through Search/zoom. Never invent a city or boundary.
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3213";
const outDir = (process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-national-neighborhoods-n2-after") + "/l4d-major";
await mkdir(outDir, { recursive: true });

const main = ["casablanca", "rabat", "marrakech", "tanger", "fes", "agadir", "meknes", "oujda"];
const secondary = ["kenitra", "mohammadia"];
const vps = [
  { name: "390", width: 390, height: 844, isMobile: true },
  { name: "430", width: 430, height: 932, isMobile: true },
  { name: "768", width: 768, height: 900, isMobile: false },
  { name: "1280", width: 1280, height: 900, isMobile: false },
];
const report = { ok: false, cases: [], source: null, failure: null };

const sourceResponse = await fetch(baseUrl + "/api/geo/national-territories");
if (!sourceResponse.ok) throw Error("national V5 API is unavailable: " + sourceResponse.status);
const source = await sourceResponse.json();
if (source.view !== "morocco" || source.status !== "ok" || !Array.isArray(source.places)) {
  throw Error("V5 national territory source response malformed");
}
for (const city of [...main, ...secondary]) {
  const place = source.places.find(p => p.slug === city);
  if (!place?.center) throw Error("expected major or requested secondary city is not sourced: " + city);
}
report.source = { total: source.places.length, main: main.map(slug => source.places.find(p => p.slug === slug)?.name) };

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of vps) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile, hasTouch: viewport.isMobile, deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errs = [];
    page.on("pageerror", e => errs.push({ message: String(e), stack: e.stack }));
    const row = { viewport: viewport.name, state: "started" };
    try {
      await page.goto(baseUrl + "/map?layer=explore", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.locator('[data-akarfinder-national-map][data-akarfinder-national-view="morocco"]').waitFor({ state: "visible", timeout: 18000 });
      await page.waitForFunction(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        return Boolean(map?.isStyleLoaded() && !map.isMoving() &&
          map.getLayer("akarfinder-national-city-labels") &&
          map.getLayer("akarfinder-national-secondary-city-labels") &&
          map.getLayer("akarfinder-national-city-hits") &&
          map.getLayer("akarfinder-national-secondary-city-hits") &&
          map.getLayer("akarfinder-national-secondary-city-line"));
      }, null, { timeout: 22000 });

      const state = await page.evaluate(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        const source = map.getStyle().sources["akarfinder-national-city-points"];
        const features = source?.data?.features || [];
        const ids = ["akarfinder-national-city-labels", "akarfinder-national-secondary-city-labels",
          "akarfinder-national-city-hits", "akarfinder-national-secondary-city-hits",
          "akarfinder-national-city-line", "akarfinder-national-secondary-city-line"];
        const layers = ids.map(id => ({
          id, filter: map.getFilter(id), minzoom: map.getLayer(id)?.minzoom ?? 0,
        }));
        return { zoom: map.getZoom(), features: features.length,
          slugs: features.map(f => f.properties?.slug).filter(Boolean),
          layers, canvases: document.querySelectorAll(".maplibregl-canvas").length,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      if (state.features !== source.places.filter(p => p.center).length ||
          state.slugs.length < 300 || state.canvases !== 1 || state.overflow > 1) {
        throw Error("national source/viewport regressed: " + JSON.stringify(state));
      }
      if (state.zoom >= 8.25) throw Error("initial map unexpectedly shows secondary cities at zoom " + state.zoom);
      const byId = Object.fromEntries(state.layers.map(x => [x.id, x]));
      const expectedMainFilter = JSON.stringify(["in", ["get", "slug"], ["literal", main]]);
      const expectedSecondaryFilter = JSON.stringify(["!", ["in", ["get", "slug"], ["literal", main]]]);
      for (const id of ["akarfinder-national-city-labels", "akarfinder-national-city-hits", "akarfinder-national-city-line"]) {
        if (JSON.stringify(byId[id]?.filter) !== expectedMainFilter) throw Error("nonmajor city visible on national " + id);
      }
      for (const id of ["akarfinder-national-secondary-city-labels", "akarfinder-national-secondary-city-hits", "akarfinder-national-secondary-city-line"]) {
        if (JSON.stringify(byId[id]?.filter) !== expectedSecondaryFilter || byId[id].minzoom < 8.25) {
          throw Error("secondary city visible too early in " + id + ": " + JSON.stringify(byId[id]));
        }
      }
      for (const slug of [...main, ...secondary]) {
        if (!state.slugs.includes(slug)) throw Error("sourced city dropped from national index: " + slug);
      }
      await page.waitForFunction(() =>
        document.querySelector("[data-akarfinder-national-map]")?.getAttribute("data-akarfinder-zoom-stage") === "major",
        null, { timeout: 6000 });
      // The third-party basemap may carry independent place-name layers.
      // Record whether our style suppression is active; source attributions
      // and road/street labels must not be muted.
      const basemap = await page.evaluate(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        const placePattern = /(?:^|[-_])(place|city|town|village|hamlet|settlement)(?:[-_]|$)/i;
        return (map.getStyle().layers || []).filter(layer =>
          layer.type === "symbol" && !layer.id.startsWith("akarfinder-") && placePattern.test(layer.id))
          .map(layer => ({ id: layer.id, textOpacity: map.getPaintProperty(layer.id, "text-opacity") }));
      });
      for (const item of basemap) {
        if (JSON.stringify(item.textOpacity) !== JSON.stringify(["step", ["zoom"], 0, 8.25, 0.58])) {
          throw Error("unfiltered basemap town label " + item.id + ": " + JSON.stringify(item.textOpacity));
        }
      }
      await page.screenshot({ path: outDir + "/national-major-" + viewport.name + ".png", fullPage: false });
      row.national = { zoom: state.zoom, featured: main.length, sourceCities: state.features, canvases: state.canvases, overflow: state.overflow, mutedBasemapPlaceLayers: basemap.map(x => x.id) };
      // Simulate a user zooming in: the source-backed secondary label layers
      // become eligible; the national view remains restricted at initial zoom.
      await page.evaluate(() => window.__AKARFINDER_NATIONAL_MAP__.jumpTo({ zoom: 8.6 }));
      const secondaryState = await page.evaluate(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        return { zoom: map.getZoom(), labels: Boolean(map.getLayer("akarfinder-national-secondary-city-labels")),
          citySource: map.getStyle().sources["akarfinder-national-city-points"]?.data?.features?.length ?? 0 };
      });
      if (secondaryState.zoom < 8.25 || !secondaryState.labels ||
          secondaryState.citySource !== state.features) throw Error("secondary towns unavailable after zoom");
      await page.waitForFunction(() =>
        document.querySelector("[data-akarfinder-national-map]")?.getAttribute("data-akarfinder-zoom-stage") === "local",
        null, { timeout: 6000 });
      await page.screenshot({ path: outDir + "/regional-secondary-" + viewport.name + ".png", fullPage: false });
      row.zoomed = { zoom: secondaryState.zoom, sourceCities: secondaryState.citySource };
      // At higher zoom without a selected city, do NOT claim that a
      // neighborhood inventory was loaded; the stage remains "local".
      await page.evaluate(() => window.__AKARFINDER_NATIONAL_MAP__.jumpTo({ zoom: 9.8 }));
      await page.waitForFunction(() =>
        document.querySelector("[data-akarfinder-national-map]")?.getAttribute("data-akarfinder-zoom-stage") === "local",
        null, { timeout: 6000 });

      // A sourced city selection unlocks only sourced neighborhood centers.
      await page.goto(baseUrl + "/map?city=mohammedia&layer=explore", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.locator('[data-akarfinder-national-map][data-akarfinder-national-view="city"]').waitFor({ state: "visible", timeout: 18000 });
      await page.waitForFunction(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        return Boolean(map?.isStyleLoaded() &&
          map.getLayer("akarfinder-national-neighborhood-dots") &&
          map.getLayer("akarfinder-national-neighborhood-hits") &&
          map.getLayer("akarfinder-national-neighborhood-labels"));
      }, null, { timeout: 17000 });
      const neighborhoodMinZoom = await page.evaluate(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        const ids = ["akarfinder-national-neighborhood-dots", "akarfinder-national-neighborhood-hits",
          "akarfinder-national-neighborhood-labels"];
        return ids.map(id => ({ id, minzoom: map.getLayer(id)?.minzoom ?? null }));
      });
      if (neighborhoodMinZoom.some(item => item.minzoom !== 9.5)) {
        throw Error("neighborhood markers are visible before the sourced neighborhood zoom: " + JSON.stringify(neighborhoodMinZoom));
      }
      await page.evaluate(() => window.__AKARFINDER_NATIONAL_MAP__.jumpTo({ zoom: 9.8 }));
      await page.waitForFunction(() =>
        document.querySelector("[data-akarfinder-national-map]")?.getAttribute("data-akarfinder-zoom-stage") === "neighborhood",
        null, { timeout: 8000 });
      await page.screenshot({ path: outDir + "/city-neighborhood-" + viewport.name + ".png", fullPage: false });
      await page.evaluate(() => window.__AKARFINDER_NATIONAL_MAP__.jumpTo({ zoom: 12.2 }));
      await page.waitForFunction(() =>
        document.querySelector("[data-akarfinder-national-map]")?.getAttribute("data-akarfinder-zoom-stage") === "street",
        null, { timeout: 8000 });
      await page.screenshot({ path: outDir + "/city-street-" + viewport.name + ".png", fullPage: false });
      row.zoomLadder = { neighborhoodZoom: 9.8, streetZoom: 12.2, neighborhoodsMinZoom: 9.5, sourceCity: "mohammadia" };
      if (errs.length) throw Error("browser JS errors: " + JSON.stringify(errs));
      row.state = "passed";
    } catch (error) {
      row.state = "failed";
      row.error = String(error);
      row.browserErrors = errs;
      if (!report.failure) report.failure = { viewport: viewport.name, error: String(error) };
      try { await page.screenshot({ path: outDir + "/failed-" + viewport.name + ".png", fullPage: false }); } catch {}
    } finally {
      report.cases.push(row);
      await context.close();
    }
  }
} finally {
  await browser.close();
  report.ok = report.cases.length === 4 && report.cases.every(item => item.state === "passed");
  await writeFile(outDir + "/report.json", JSON.stringify(report, null, 2));
}
if (!report.ok) throw Error("L4-D major-cities national UI not certified: " + JSON.stringify(report.failure));
