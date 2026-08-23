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
const report = { ok: false, api: null, cases: [] };

const apiResponse = await fetch(`${baseUrl}/api/geo/national-territories?city=casablanca`);
const api = await apiResponse.json();
if (!apiResponse.ok) throw new Error(`city API ${apiResponse.status}`);
if (api.view !== "city" || api.place?.slug !== "casablanca") throw new Error("Casablanca city payload missing");
if (api.meta?.neighborhoodCount < 1500) throw new Error(`neighborhoodCount ${api.meta?.neighborhoodCount}`);
if (api.meta?.centeredNeighborhoodCount < 100) throw new Error(`centeredNeighborhoodCount ${api.meta?.centeredNeighborhoodCount}`);
if (api.meta?.certifiedNeighborhoodBoundaryCount !== 0) throw new Error(`unexpected published neighborhood geometry ${api.meta?.certifiedNeighborhoodBoundaryCount}`);
if (api.certifiedNeighborhoodBoundaries?.features?.length !== 0) throw new Error("N2 must not publish uncertified neighborhood polygons");
const maarif = api.neighborhoods.find((item) => item.slug === "maarif");
const postalMaarif = api.neighborhoods.find((item) => item.slug === "quartier-maarif");
if (!maarif?.center || !maarif.sourceKinds?.includes("osm_neighborhood_label")) throw new Error("Maârif mapped OSM label missing");
if (postalMaarif?.center || !postalMaarif?.sourceKinds?.includes("barid_postal_neighborhood")) throw new Error("Barid no-center fallback missing");
report.api = {
  neighborhoodCount: api.meta.neighborhoodCount,
  centeredNeighborhoodCount: api.meta.centeredNeighborhoodCount,
  certifiedNeighborhoodBoundaryCount: api.meta.certifiedNeighborhoodBoundaryCount,
};

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const mobile = viewport.width <= 430;
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: 1,
    });
    if (mobile) {
      await context.addInitScript(() => {
        const nativeMatchMedia = window.matchMedia.bind(window);
        Object.defineProperty(window, "matchMedia", {
          configurable: true,
          value: (query) => {
            const result = nativeMatchMedia(query);
            if (query !== "(pointer: coarse)") return result;
            return new Proxy(result, {
              get(target, property) {
                if (property === "matches") return true;
                const value = Reflect.get(target, property, target);
                return typeof value === "function" ? value.bind(target) : value;
              },
            });
          },
        });
      });
    }
    const page = await context.newPage();
    const diagnostics = { pageErrors: [], requestFailures: [] };
    page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
    page.on("requestfailed", (request) => diagnostics.requestFailures.push({ url: request.url(), error: request.failure()?.errorText || "unknown" }));

    try {
      await page.goto(`${baseUrl}/map?city=casablanca&layer=explore`, { waitUntil: "domcontentloaded", timeout: 30000 });
      const shell = page.locator('[data-akarfinder-national-map]');
      await shell.waitFor({ state: "visible", timeout: 30000 });
      await page.waitForFunction(() => document.querySelector('[data-akarfinder-national-map]')?.getAttribute('data-akarfinder-national-view') === 'city', null, { timeout: 30000 });
      const canvas = page.locator('.maplibregl-canvas');
      await canvas.waitFor({ state: "visible", timeout: 30000 });
      await page.waitForFunction(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        return Boolean(map?.getLayer("akarfinder-national-neighborhood-labels")) && (map?.querySourceFeatures("akarfinder-national-neighborhood-points").length ?? 0) >= 100;
      }, null, { timeout: 20000 });

      await page.waitForFunction(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        return Boolean(map) && !map.isMoving() && map.isStyleLoaded();
      }, null, { timeout: 10000 });

      // N2 is an overlay on the real MapLibre/OpenFreeMap basemap, never a marker-only canvas.
      // Require rendered third-party cartographic features so roads/place context is visibly present
      // beneath AkarFinder city + neighborhood layers before screenshots are accepted.
      await page.waitForFunction(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        if (!map?.isStyleLoaded()) return false;
        const baseLayers = (map.getStyle().layers ?? []).filter((layer) => !layer.id.startsWith("akarfinder-"));
        const renderedBaseFeatures = map.queryRenderedFeatures().filter((feature) => !feature.layer.id.startsWith("akarfinder-"));
        return baseLayers.length >= 20 && renderedBaseFeatures.length >= 20;
      }, null, { timeout: 15000 });

      const layerState = await page.evaluate(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        const baseLayers = (map?.getStyle().layers ?? []).filter((layer) => !layer.id.startsWith("akarfinder-"));
        const renderedBaseFeatures = map?.queryRenderedFeatures().filter((feature) => !feature.layer.id.startsWith("akarfinder-")).length ?? 0;
        return {
          points: map?.querySourceFeatures("akarfinder-national-neighborhood-points").length ?? 0,
          labels: Boolean(map?.getLayer("akarfinder-national-neighborhood-labels")),
          dots: Boolean(map?.getLayer("akarfinder-national-neighborhood-dots")),
          fakeFill: Boolean(map?.getLayer("akarfinder-national-neighborhood-fill")),
          basemapLayerCount: baseLayers.length,
          renderedBasemapFeatureCount: renderedBaseFeatures,
          basemapHasLine: baseLayers.some((layer) => layer.type === "line"),
          basemapHasSymbol: baseLayers.some((layer) => layer.type === "symbol"),
        };
      });
      if (!layerState.labels || !layerState.dots || layerState.points < 100 || layerState.fakeFill) {
        throw new Error(`neighborhood map layers invalid ${JSON.stringify(layerState)}`);
      }
      if (layerState.basemapLayerCount < 20 || layerState.renderedBasemapFeatureCount < 20 || !layerState.basemapHasLine || !layerState.basemapHasSymbol) {
        throw new Error(`real basemap missing or not rendered ${JSON.stringify(layerState)}`);
      }

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`horizontal overflow ${overflow}`);
      await page.screenshot({ path: `${outDir}/casablanca-neighborhoods-${viewport.name}-after.png`, fullPage: false });

      const projected = await page.evaluate(({ lng, lat }) => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        const p = map.project([lng, lat]);
        const rect = map.getCanvas().getBoundingClientRect();
        return { pageX: rect.left + p.x, pageY: rect.top + p.y, localX: p.x, localY: p.y };
      }, maarif.center);

      if (mobile) {
        await page.touchscreen.tap(projected.pageX, projected.pageY);
      } else {
        await canvas.hover({ position: { x: projected.localX, y: projected.localY } });
        await canvas.click({ position: { x: projected.localX, y: projected.localY } });
      }
      const active = page.locator('[data-akarfinder-neighborhood-preview="maarif"]');
      await active.waitFor({ state: "visible", timeout: 5000 });
      await active.getByText(/aucun contour de quartier publié/i).waitFor({ state: "visible", timeout: 5000 });
      const activeHref = await active.getByRole("link", { name: /Rechercher à Maârif/i }).getAttribute("href");
      if (!activeHref?.includes("city=Casablanca") || !activeHref.includes("district=Ma%C3%A2rif")) throw new Error(`Maârif Search handoff ${activeHref}`);
      await page.screenshot({ path: `${outDir}/active-maarif-${viewport.name}-after.png`, fullPage: false });

      const input = page.getByRole("textbox", { name: "Rechercher un quartier à Casablanca" });
      await input.fill("QUARTIER MAARIF");
      const postalSuggestion = page.locator('[data-akarfinder-neighborhood-suggestion="quartier-maarif"]');
      await postalSuggestion.waitFor({ state: "visible", timeout: 5000 });
      await postalSuggestion.click();
      const postalCard = page.locator('[data-akarfinder-neighborhood-preview="quartier-maarif"]');
      await postalCard.waitFor({ state: "visible", timeout: 5000 });
      await postalCard.getByText(/repère cartographique indisponible/i).waitFor({ state: "visible", timeout: 5000 });
      const postalHref = await postalCard.getByRole("link", { name: /Rechercher à QUARTIER MAARIF/i }).getAttribute("href");
      if (!postalHref?.includes("district=QUARTIER%20MAARIF")) throw new Error(`postal Search handoff ${postalHref}`);
      await page.screenshot({ path: `${outDir}/postal-maarif-${viewport.name}-after.png`, fullPage: false });

      const criticalRequestFailures = diagnostics.requestFailures.filter((failure) => failure.url.startsWith(baseUrl) && failure.error !== "net::ERR_ABORTED");
      if (diagnostics.pageErrors.length || criticalRequestFailures.length) {
        throw new Error(`browser diagnostics ${JSON.stringify({ pageErrors: diagnostics.pageErrors, criticalRequestFailures })}`);
      }
      report.cases.push({ viewport: viewport.name, overflow, layerState, diagnostics, mappedSelection: true, noCenterFallback: true, searchHandoff: true });
    } finally {
      await context.close();
    }
  }
  report.ok = true;
} finally {
  await browser.close();
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
}
