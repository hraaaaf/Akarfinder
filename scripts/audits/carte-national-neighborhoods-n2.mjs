import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3213";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-national-neighborhoods-n2-after";
await mkdir(outDir, { recursive: true });

const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
];
const report = { ok: false, api: null, cases: [], failure: null };

function isValidCenter(center) {
  return Boolean(center) && Number.isFinite(center.lng) && Number.isFinite(center.lat) && center.lng >= -180 && center.lng <= 180 && center.lat >= -90 && center.lat <= 90;
}

async function waitForNationalOverlay(page) {
  await page.locator('[data-akarfinder-national-map]').waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('[data-akarfinder-national-map]')?.getAttribute('data-akarfinder-national-view') === 'city', null, { timeout: 30000 });
  await page.locator('.maplibregl-canvas').waitFor({ state: "visible", timeout: 30000 });
  await page.locator('[data-akarfinder-national-neighborhood-overlay][data-city="casablanca"]').waitFor({ state: "attached", timeout: 20000 });
  await page.waitForFunction(() => {
    const map = window.__AKARFINDER_NATIONAL_MAP__;
    return Boolean(map?.isStyleLoaded()) && Boolean(map?.getSource("akarfinder-national-neighborhood-points")) && Boolean(map?.getLayer("akarfinder-national-neighborhood-labels")) && Boolean(map?.getLayer("akarfinder-national-neighborhood-dots"));
  }, null, { timeout: 20000 });
  await page.waitForFunction(() => {
    const map = window.__AKARFINDER_NATIONAL_MAP__;
    if (!map?.isStyleLoaded() || map.isMoving()) return false;
    const baseLayers = (map.getStyle().layers ?? []).filter((layer) => !layer.id.startsWith("akarfinder-"));
    const renderedBaseFeatures = map.queryRenderedFeatures().filter((feature) => !feature.layer.id.startsWith("akarfinder-"));
    const renderedDots = map.queryRenderedFeatures().filter((feature) => feature.layer.id === "akarfinder-national-neighborhood-dots");
    return baseLayers.length >= 20 && renderedBaseFeatures.length >= 20 && renderedDots.length >= 1;
  }, null, { timeout: 15000 });
}

const apiResponse = await fetch(`${baseUrl}/api/geo/national-territories?city=casablanca`);
const api = await apiResponse.json();
if (!apiResponse.ok) throw new Error(`city API ${apiResponse.status}`);
if (api.view !== "city" || api.place?.slug !== "casablanca") throw new Error("Casablanca city payload missing");
if (api.meta?.neighborhoodCount < 1500) throw new Error(`neighborhoodCount ${api.meta?.neighborhoodCount}`);
if (api.meta?.centeredNeighborhoodCount < 100) throw new Error(`centeredNeighborhoodCount ${api.meta?.centeredNeighborhoodCount}`);
const validCenteredNeighborhoodCount = api.neighborhoods.filter((item) => isValidCenter(item.center)).length;
if (validCenteredNeighborhoodCount < 100) throw new Error(`validCenteredNeighborhoodCount ${validCenteredNeighborhoodCount}`);
if (api.meta?.certifiedNeighborhoodBoundaryCount !== 0) throw new Error(`unexpected published neighborhood geometry ${api.meta?.certifiedNeighborhoodBoundaryCount}`);
if (api.certifiedNeighborhoodBoundaries?.features?.length !== 0) throw new Error("N2 must not publish uncertified neighborhood polygons");
const maarif = api.neighborhoods.find((item) => item.slug === "maarif");
const postalMaarif = api.neighborhoods.find((item) => item.slug === "quartier-maarif");
if (!isValidCenter(maarif?.center) || !maarif.sourceKinds?.includes("osm_neighborhood_label")) throw new Error("Maârif mapped OSM label missing");
if (postalMaarif?.center || !postalMaarif?.sourceKinds?.includes("barid_postal_neighborhood")) throw new Error("Barid no-center fallback missing");
report.api = {
  neighborhoodCount: api.meta.neighborhoodCount,
  centeredNeighborhoodCount: api.meta.centeredNeighborhoodCount,
  validCenteredNeighborhoodCount,
  certifiedNeighborhoodBoundaryCount: api.meta.certifiedNeighborhoodBoundaryCount,
};

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const mobile = viewport.width <= 430;
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
    if (mobile) {
      await context.addInitScript(() => {
        const nativeMatchMedia = window.matchMedia.bind(window);
        Object.defineProperty(window, "matchMedia", {
          configurable: true,
          value: (query) => {
            const result = nativeMatchMedia(query);
            if (query !== "(pointer: coarse)") return result;
            return new Proxy(result, { get(target, property) { if (property === "matches") return true; const value = Reflect.get(target, property, target); return typeof value === "function" ? value.bind(target) : value; } });
          },
        });
      });
    }
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));

    try {
      const cityUrl = `${baseUrl}/map?city=casablanca&layer=explore`;
      await page.goto(cityUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await waitForNationalOverlay(page);

      const layerState = await page.evaluate(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        const layers = map?.getStyle().layers ?? [];
        const rendered = map?.queryRenderedFeatures() ?? [];
        return {
          sourceExists: Boolean(map?.getSource("akarfinder-national-neighborhood-points")),
          labels: Boolean(map?.getLayer("akarfinder-national-neighborhood-labels")),
          dots: Boolean(map?.getLayer("akarfinder-national-neighborhood-dots")),
          fakeFill: Boolean(map?.getLayer("akarfinder-national-neighborhood-fill")),
          renderedNeighborhoodFeatureCount: rendered.filter((feature) => feature.layer.id === "akarfinder-national-neighborhood-dots").length,
          basemapLayerCount: layers.filter((layer) => !layer.id.startsWith("akarfinder-")).length,
          renderedBasemapFeatureCount: rendered.filter((feature) => !feature.layer.id.startsWith("akarfinder-")).length,
        };
      });
      if (!layerState.sourceExists || !layerState.labels || !layerState.dots || layerState.renderedNeighborhoodFeatureCount < 1 || layerState.fakeFill) throw new Error(`neighborhood map layers invalid ${JSON.stringify(layerState)}`);
      if (layerState.basemapLayerCount < 20 || layerState.renderedBasemapFeatureCount < 20) throw new Error(`real basemap missing ${JSON.stringify(layerState)}`);

      let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`horizontal overflow ${overflow}`);
      await page.screenshot({ path: `${outDir}/casablanca-neighborhoods-${viewport.name}-after.png`, fullPage: false });

      const mappedInput = page.getByRole("textbox", { name: "Rechercher un quartier à Casablanca" });
      await mappedInput.fill("Maârif");
      const mappedSuggestion = page.locator('[data-akarfinder-neighborhood-suggestion="maarif"]');
      await mappedSuggestion.waitFor({ state: "visible", timeout: 5000 });
      await mappedSuggestion.click();

      await page.waitForURL((url) => url.searchParams.get("district") === "maarif", { timeout: 10000 });
      const maplibre = page.locator('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
      await maplibre.waitFor({ state: "visible", timeout: 15000 });
      await page.waitForFunction(() => {
        const shell = document.querySelector('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
        return shell?.getAttribute("data-maplibre-render-state") === "ready";
      }, null, { timeout: 20000 });
      const rail = page.locator('[data-p4-map-decision-rail]');
      await rail.waitFor({ state: "visible", timeout: 10000 });
      const activeHref = await rail.getByRole("link", { name: /Voir les biens disponibles à Maârif/i }).getAttribute("href");
      if (!activeHref?.includes("city=Casablanca") || !activeHref.includes("district=Ma%C3%A2rif")) throw new Error(`Maârif Search handoff ${activeHref}`);
      overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`MapLibre horizontal overflow ${overflow}`);
      await page.screenshot({ path: `${outDir}/active-maarif-${viewport.name}-after.png`, fullPage: false });

      await page.goto(cityUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await waitForNationalOverlay(page);
      const input = page.getByRole("textbox", { name: "Rechercher un quartier à Casablanca" });
      await input.fill("QUARTIER MAARIF");
      const postalSuggestion = page.locator('[data-akarfinder-neighborhood-suggestion="quartier-maarif"]');
      await postalSuggestion.waitFor({ state: "visible", timeout: 5000 });
      await postalSuggestion.click();
      await page.waitForURL((url) => url.searchParams.get("district") === "quartier-maarif", { timeout: 10000 });
      const postalCard = page.locator('[data-akarfinder-neighborhood-preview="quartier-maarif"]');
      await postalCard.waitFor({ state: "visible", timeout: 5000 });
      await postalCard.getByText(/repère cartographique indisponible/i).waitFor({ state: "visible", timeout: 5000 });
      const postalHref = await postalCard.getByRole("link", { name: /Rechercher à QUARTIER MAARIF/i }).getAttribute("href");
      if (!postalHref?.includes("district=QUARTIER%20MAARIF")) throw new Error(`postal Search handoff ${postalHref}`);
      await page.screenshot({ path: `${outDir}/postal-maarif-${viewport.name}-after.png`, fullPage: false });

      if (pageErrors.length) throw new Error(`browser page errors ${JSON.stringify(pageErrors)}`);
      report.cases.push({ viewport: viewport.name, overflow, layerState, mappedSelection: "maplibre", noCenterFallback: true, searchHandoff: true });
    } catch (error) {
      report.failure = { viewport: viewport.name, error: String(error) };
      throw error;
    } finally {
      await context.close();
    }
  }
  report.ok = true;
} finally {
  await browser.close();
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
}
