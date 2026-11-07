import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

// City-focus UI: same live MapLibre national source across city selection.
// 8 sourced city choices, one highlighted card, no 8 duplicated map instances.
// Browser-only and read-only: no inventory, geodata or database writes.
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3213";
const outDir = (process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-national-neighborhoods-n2-after") + "/l4c-focus";
await mkdir(outDir, { recursive: true });

const viewports = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "430", width: 430, height: 932, mobile: true },
  { name: "768", width: 768, height: 900, mobile: false },
  { name: "1280", width: 1280, height: 900, mobile: false },
];
const cities = ["casablanca", "rabat", "marrakech", "tanger", "fes", "agadir", "meknes", "oujda"];
const expectedChoices = (target) => target === "mohammadia"
  ? [...cities.slice(0, 7), "mohammadia"] : cities;
const report = { ok: false, cases: [], failure: null };

async function verifyFocus(page, citySlug, viewportName) {
  await page.locator('[data-akarfinder-national-map][data-akarfinder-national-view="city"]').waitFor({ state: "visible", timeout: 20000 });
  const panel = page.locator("[data-akarfinder-city-comparison]");
  await panel.waitFor({ state: "visible", timeout: 16000 });
  if ((await panel.locator("[data-akarfinder-city-option]").count()) !== 8) {
    throw new Error("not all 8 V5 cities appear in the same comparison strip");
  }
  const buttons = await panel.locator("[data-akarfinder-city-option]").evaluateAll(items =>
    items.map(item => ({ slug: item.getAttribute("data-akarfinder-city-option"), pressed: item.getAttribute("aria-pressed") })));
  if (buttons.filter(item => item.pressed === "true").length !== 1 ||
      !buttons.some(item => item.slug === citySlug && item.pressed === "true") ||
      expectedChoices(citySlug).some(slug => !buttons.some(item => item.slug === slug))) {
    throw new Error("city focus buttons have incorrect selection state " + JSON.stringify(buttons));
  }
  await page.waitForFunction((slug) => {
    const map = window.__AKARFINDER_NATIONAL_MAP__;
    // MapLibre getFilter throws if the target style layer has not been added
    // yet. Wait for BOTH sourced layers before reading either filter.
    if (!map?.isStyleLoaded() || map.isMoving()) return false;
    if (!map.getLayer("akarfinder-national-city-active-line") ||
        !map.getLayer("akarfinder-national-city-focus-halo")) return false;
    const filter = map.getFilter("akarfinder-national-city-active-line");
    const haloFilter = map.getFilter("akarfinder-national-city-focus-halo");
    return Array.isArray(filter) && Array.isArray(haloFilter) &&
      filter[0] === "==" && filter[2] === slug &&
      JSON.stringify(filter) === JSON.stringify(haloFilter);
  }, citySlug, { timeout: 25000 });
  const mapState = await page.evaluate(() => {
    const map = window.__AKARFINDER_NATIONAL_MAP__;
    const source = map?.getStyle()?.sources?.["akarfinder-national-city-points"];
    const data = source?.data;
    const features = data && typeof data === "object" && Array.isArray(data.features) ? data.features : [];
    return {
      citySourceCount: features.length,
      citySlugs: features.map(feature => feature?.properties?.slug).filter(Boolean),
      mapZoom: map?.getZoom(),
      activeFilter: map?.getFilter("akarfinder-national-city-active-line"),
      haloFilter: map?.getFilter("akarfinder-national-city-focus-halo"),
      activeLineWidth: map?.getPaintProperty("akarfinder-national-city-active-line", "line-width"),
      mapCanvasCount: document.querySelectorAll(".maplibregl-canvas").length,
    };
  });
  if (mapState.citySourceCount < 8 || cities.some(slug => !mapState.citySlugs.includes(slug))) {
    throw new Error("city context was replaced with a single city " + JSON.stringify(mapState));
  }
  if (mapState.mapCanvasCount !== 1) throw new Error("city comparison created duplicate MapLibre canvases " + mapState.mapCanvasCount);
  if (mapState.mapZoom > 7.1) throw new Error("camera isolates the chosen city rather than regional context: " + mapState.mapZoom);
  if (JSON.stringify(mapState.activeFilter) !== JSON.stringify(mapState.haloFilter)) {
    throw new Error("outline and halo are not focused on the same source feature");
  }
  // The eight equal-size choices must not cover the responsive decision sheet.
  const panelBounds = await panel.boundingBox();
  const sheetBounds = await page.locator("[data-p4-map-decision-rail]").boundingBox();
  if (!panelBounds || !sheetBounds) throw new Error("city chooser or decision sheet is missing");
  const overlapW = Math.max(0, Math.min(panelBounds.x + panelBounds.width, sheetBounds.x + sheetBounds.width) - Math.max(panelBounds.x, sheetBounds.x));
  const overlapH = Math.max(0, Math.min(panelBounds.y + panelBounds.height, sheetBounds.y + sheetBounds.height) - Math.max(panelBounds.y, sheetBounds.y));
  if (overlapW * overlapH > 1) throw new Error("city chooser overlaps the responsive decision sheet: " + JSON.stringify({ panelBounds, sheetBounds }));
  if (citySlug === "casablanca" && await page.locator("[data-vivre-ici-3d-toggle]").count()) {
    throw new Error("Casablanca regional comparison unexpectedly activates 3D/satellite");
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error("horizontal overflow at " + viewportName + ": " + overflow);
  return { cityCount: mapState.citySourceCount, zoom: mapState.mapZoom, canvas: mapState.mapCanvasCount, overflow };
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile, hasTouch: viewport.mobile, deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push({ message: String(error), stack: error.stack, url: page.url() }));
    const item = { viewport: viewport.name, before: null, after: null, citySwitch: false, errors: [] };
    try {
      await page.goto(baseUrl + "/map?city=mohammedia&layer=explore", { waitUntil: "domcontentloaded", timeout: 35000 });
      item.before = await verifyFocus(page, "mohammadia", viewport.name);
      await page.screenshot({ path: outDir + "/focus-mohammedia-" + viewport.name + ".png", fullPage: false });
      await page.locator('[data-akarfinder-city-option="casablanca"]').click();
      await page.waitForURL(url => url.searchParams.get("city") === "casablanca" && url.searchParams.get("layer") === "explore", { timeout: 15000 });
      item.after = await verifyFocus(page, "casablanca", viewport.name);
      item.citySwitch = true;
      await page.screenshot({ path: outDir + "/focus-casablanca-" + viewport.name + ".png", fullPage: false });
      if (errors.length) throw new Error("React/browser exceptions " + JSON.stringify(errors));
    } catch (error) {
      if (!report.failure) report.failure = { viewport: viewport.name, error: String(error) };
      item.errors = errors;
      item.error = String(error);
      try { await page.screenshot({ path: outDir + "/failure-" + viewport.name + ".png", fullPage: false }); } catch {}
    } finally {
      report.cases.push(item);
      await context.close();
    }
  }
} finally {
  await browser.close();
  report.ok = report.cases.length === 4 && report.cases.every(x => x.citySwitch === true && !x.error);
  await writeFile(outDir + "/report.json", JSON.stringify(report, null, 2));
}
if (!report.ok) throw new Error("L4-C city focus source-context UI FAILED: " + JSON.stringify(report.failure));
