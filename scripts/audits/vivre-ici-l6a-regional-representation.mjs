import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

// L6-A visual truth: prove an actual secondary-city label is rendered in
// viewport, not merely a source/layer whose features lie off-screen.
// In city/street mode municipal boundaries must fade instead of pretending
// to represent a district. Source and provider attributions remain untouched.
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3213";
const outDir = (process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-national-neighborhoods-n2-after") + "/l6a-regional";
await mkdir(outDir, { recursive: true });
const viewports = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "430", width: 430, height: 932, mobile: true },
  { name: "768", width: 768, height: 900, mobile: false },
  { name: "1280", width: 1280, height: 900, mobile: false },
];
const response = await fetch(baseUrl + "/api/geo/national-territories");
if (!response.ok) throw Error("L6-A V5 source API " + response.status);
const payload = await response.json();
const target = payload.places?.find(x => x.slug === "kenitra");
if (payload.status !== "ok" || payload.view !== "morocco" ||
    !target?.center || !Number.isFinite(target.center.lng) || !Number.isFinite(target.center.lat)) {
  throw Error("L6-A regional target Kénitra must have a real V5 center");
}
const result = { ok: false, target: { slug: target.slug, center: target.center }, cases: [], failure: null };
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile, hasTouch: viewport.mobile, deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push({ message: String(error), stack: error.stack }));
    const row = { viewport: viewport.name, state: "started" };
    try {
      await page.goto(baseUrl + "/map?layer=explore", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.locator('[data-akarfinder-national-map][data-akarfinder-national-view="morocco"]')
        .waitFor({ state: "visible", timeout: 20000 });
      await page.waitForFunction(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        return Boolean(map?.isStyleLoaded() && map.getLayer("akarfinder-national-secondary-city-labels"));
      }, null, { timeout: 15000 });
      await page.screenshot({ path: outDir + "/before-national-" + viewport.name + ".png", fullPage: false });
      await page.evaluate((center) => window.__AKARFINDER_NATIONAL_MAP__.jumpTo({
        center: [center.lng, center.lat], zoom: 8.6,
      }), target.center);
      await page.waitForFunction(() =>
        document.querySelector("[data-akarfinder-national-map]")?.getAttribute("data-akarfinder-zoom-stage") === "local",
        null, { timeout: 8000 });
      // Must be a label rendered by MapLibre itself inside the current
      // geographic viewport. Check rendered features (not source-only).
      await page.waitForFunction(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        if (!map?.isStyleLoaded() || map.isMoving()) return false;
        return map.queryRenderedFeatures(undefined, {
          layers: ["akarfinder-national-secondary-city-labels"],
        }).some(feature => feature.properties?.slug === "kenitra");
      }, null, { timeout: 20000 });
      const geo = await page.evaluate(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        const hits = map.queryRenderedFeatures(undefined, {
          layers: ["akarfinder-national-secondary-city-labels"],
        }).filter(feature => feature.properties?.slug === "kenitra");
        return {
          renderedKenitraLabel: hits.length,
          zoom: map.getZoom(),
          center: map.getCenter().toArray(),
          canvases: document.querySelectorAll(".maplibregl-canvas").length,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      if (geo.renderedKenitraLabel < 1 || geo.canvases !== 1 || geo.overflow > 1) {
        throw Error("secondary city is off-screen or not rendered: " + JSON.stringify(geo));
      }
      await page.screenshot({ path: outDir + "/after-secondary-kenitra-" + viewport.name + ".png", fullPage: false });
      row.secondary = geo;

      await page.goto(baseUrl + "/map?city=mohammedia&layer=explore", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.locator('[data-akarfinder-national-map][data-akarfinder-national-view="city"]')
        .waitFor({ state: "visible", timeout: 20000 });
      await page.waitForFunction(() => Boolean(
        window.__AKARFINDER_NATIONAL_MAP__?.getLayer("akarfinder-national-city-active-line")
      ), null, { timeout: 15000 });
      await page.evaluate(() => window.__AKARFINDER_NATIONAL_MAP__.jumpTo({ zoom: 12.2 }));
      await page.waitForFunction(() =>
        document.querySelector("[data-akarfinder-national-map]")?.getAttribute("data-akarfinder-zoom-stage") === "street",
        null, { timeout: 8000 });
      const emphasis = await page.evaluate(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        const ids = ["akarfinder-national-city-active-line", "akarfinder-national-city-active-fill",
          "akarfinder-national-city-focus-halo", "akarfinder-national-secondary-city-line"];
        const result = {};
        for (const id of ids) {
          const prop = id.includes("fill") ? "fill-opacity" : "line-opacity";
          const value = map.getPaintProperty(id, prop);
          result[id] = value;
        }
        return result;
      });
      // Strong blue municipal shapes must have an explicit zero-opacity
      // street stop, so streets and sourced local labels are the visual focus.
      for (const [id, value] of Object.entries(emphasis)) {
        if (!Array.isArray(value) || value.at(-1) !== 0) {
          throw Error("municipal outline does not fade at street zoom " + id + " " + JSON.stringify(value));
        }
      }
      await page.screenshot({ path: outDir + "/after-street-faded-" + viewport.name + ".png", fullPage: false });
      row.street = { municipalOutlinesFade: true, zoom: 12.2 };
      if (pageErrors.length) throw Error("browser errors " + JSON.stringify(pageErrors));
      row.state = "passed";
    } catch (error) {
      row.error = String(error);
      row.pageErrors = pageErrors;
      row.state = "failed";
      if (!result.failure) result.failure = { viewport: viewport.name, error: String(error) };
      try { await page.screenshot({ path: outDir + "/failure-" + viewport.name + ".png", fullPage: false }); } catch {}
    } finally {
      result.cases.push(row);
      await context.close();
    }
  }
} finally {
  await browser.close();
  result.ok = result.cases.length === 4 && result.cases.every(x => x.state === "passed");
  await writeFile(outDir + "/report.json", JSON.stringify(result, null, 2));
}
if (!result.ok) throw Error("L6-A viewport-safe regional labels / faded city boundaries not certified: " + JSON.stringify(result.failure));
