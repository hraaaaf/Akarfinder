import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3213";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-national-neighborhoods-n2-after";
await mkdir(outDir, { recursive: true });

// Focused L6-B unit coverage belongs inside the already-authorized N2 audit.
// Do not modify the legacy heavy PR workflow: efficiency policy forbids it.
execFileSync(process.execPath, [
  "--import", "tsx", "--test", "scripts/scrapers/__tests__/carto-basemap-style.test.ts",
], { stdio: "inherit" });

const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
];
const report = { ok: false, api: null, multicityApi: [], cases: [], failure: null };

// L4-A: read-only national source contract. This does NOT certify browser UX in all 8 cities.
const L4_SOURCE_CITIES = ["casablanca", "rabat", "marrakech", "tanger", "agadir", "fes", "kenitra", "mohammedia"];
const unavailableCities = [];

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
    // L4-D: dots are intentionally invisible in city context (zoom ~6.65).
    // Check the real basemap here; assert source dots only after zoom 9.5.
    return baseLayers.length >= 20 && renderedBaseFeatures.length >= 20;
  }, null, { timeout: 15000 });
}

// Eight-city API inventory; source-backed coordinates only, no inferred pins.
for (const city of L4_SOURCE_CITIES) {
  const response = await fetch(`${baseUrl}/api/geo/national-territories?city=${encodeURIComponent(city)}`);
  if (response.status === 404) {
    // Missing source is a product coverage gap, never an excuse for an invented pin.
    unavailableCities.push(city);
    report.multicityApi.push({
      city, status: "unavailable", httpStatus: 404,
      neighborhoods: null, validCenters: null, noCenterCount: null, publishedBoundaries: null,
    });
    continue;
  }
  if (!response.ok) throw new Error(`L4 source API ${city} HTTP ${response.status}`);
  const payload = await response.json();
  // "mohammedia" is the public spelling; the sourced V5 place remains
  // "mohammadia". Require that exact canonical record rather than fabricating
  // an additional city or silently accepting another source.
  const expectedCanonicalSlug = city === "mohammedia" ? "mohammadia" : city;
  if (payload.status !== "ok" || payload.view !== "city" || payload.place?.slug !== expectedCanonicalSlug) {
    throw new Error(`L4 wrong city payload for ${city}: ${payload.place?.slug}`);
  }
  if (!Array.isArray(payload.neighborhoods)) throw new Error(`L4 missing neighborhood catalog for ${city}`);
  if (city === "mohammedia") {
    if (payload.neighborhoods.length === 0) throw new Error("L4 Mohammedia alias has no sourced neighborhood inventory");
    const canonicalResponse = await fetch(`${baseUrl}/api/geo/national-territories?city=mohammadia`);
    if (!canonicalResponse.ok) throw new Error(`L4 canonical Mohammadia HTTP ${canonicalResponse.status}`);
    const canonicalPayload = await canonicalResponse.json();
    if (canonicalPayload.place?.slug !== "mohammadia" ||
        JSON.stringify(canonicalPayload.place) !== JSON.stringify(payload.place) ||
        JSON.stringify(canonicalPayload.neighborhoods) !== JSON.stringify(payload.neighborhoods) ||
        JSON.stringify(canonicalPayload.boundary) !== JSON.stringify(payload.boundary)) {
      throw new Error("L4 Mohammedia alias differs from canonical V5 source data");
    }
  }
  const seen = new Set();
  let validCenters = 0;
  let noCenterCount = 0;
  for (const neighborhood of payload.neighborhoods) {
    if (!neighborhood.slug || seen.has(neighborhood.slug)) throw new Error(`L4 duplicate/missing slug in ${city}: ${neighborhood.slug}`);
    seen.add(neighborhood.slug);
    if (!Array.isArray(neighborhood.sourceKinds) || neighborhood.sourceKinds.length === 0) {
      throw new Error(`L4 neighborhood lacks explicit source in ${city}/${neighborhood.slug}`);
    }
    if (neighborhood.center === null) {
      noCenterCount += 1;
    } else if (isValidCenter(neighborhood.center)) {
      validCenters += 1;
    } else {
      throw new Error(`L4 invalid center (possible invented pin) in ${city}/${neighborhood.slug}`);
    }
    if (neighborhood.boundaryStatus !== "not_claimed") {
      throw new Error(`L4 cannot claim neighborhood boundary ${city}/${neighborhood.slug}`);
    }
  }
  if (payload.meta?.neighborhoodCount !== payload.neighborhoods.length ||
      payload.meta?.centeredNeighborhoodCount !== validCenters) {
    throw new Error(`L4 source counts inconsistent for ${city}`);
  }
  if (payload.meta?.certifiedNeighborhoodBoundaryCount !== 0 ||
      payload.certifiedNeighborhoodBoundaries?.features?.length !== 0) {
    throw new Error(`L4 uncertified geometry was exposed for ${city}`);
  }
  report.multicityApi.push({
    city,
    status: "covered",
    neighborhoods: payload.neighborhoods.length,
    validCenters,
    noCenterCount,
    publishedBoundaries: payload.meta.certifiedNeighborhoodBoundaryCount,
  });
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

// Collect all 8-city BEFORE/AFTER proof before the legacy Casablanca journey.
// Preserve evidence if the older N2 scenario hits an unrelated browser error.
await import("./vivre-ici-l4b-multicity-ui.mjs");

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
    const satelliteRequests = [];
    page.on("request", (req) => { if (/\/World_Imagery\/MapServer\/tile\//.test(req.url())) satelliteRequests.push(req.url()); });
    let auditPhase = "initial-city-load";
    page.on("pageerror", (error) => pageErrors.push({ phase: auditPhase, message: String(error), stack: error.stack, url: page.url() }));

    try {
      const cityUrl = `${baseUrl}/map?city=casablanca&layer=explore`;
      auditPhase = "city-map";
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
      if (!layerState.sourceExists || !layerState.labels || !layerState.dots || layerState.fakeFill) {
        throw new Error(`neighborhood map layers invalid ${JSON.stringify(layerState)}`);
      }
      // At city scale the catalog is available for text Search, but the
      // 347 sourced neighborhood points must NOT crowd the regional map.
      if (layerState.renderedNeighborhoodFeatureCount !== 0) {
        throw new Error(`neighborhood dots leaked at city scale: ${JSON.stringify(layerState)}`);
      }
      if (layerState.basemapLayerCount < 20 || layerState.renderedBasemapFeatureCount < 20) {
        throw new Error(`real basemap missing ${JSON.stringify(layerState)}`);
      }

      let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`horizontal overflow ${overflow}`);
      await page.screenshot({ path: `${outDir}/casablanca-neighborhoods-${viewport.name}-after.png`, fullPage: false });

      // Verify the second presentation tier instead of keeping an obsolete
      // city-zoom expectation: real V5 point features appear at zoom >=9.5.
      await page.evaluate(() => window.__AKARFINDER_NATIONAL_MAP__.jumpTo({ zoom: 9.8 }));
      await page.waitForFunction(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        if (!map?.isStyleLoaded() || map.isMoving() || map.getZoom() < 9.5) return false;
        return map.queryRenderedFeatures().some((feature) =>
          feature.layer.id === "akarfinder-national-neighborhood-dots");
      }, null, { timeout: 15000 });
      const zoomedDots = await page.evaluate(() =>
        window.__AKARFINDER_NATIONAL_MAP__.queryRenderedFeatures()
          .filter((feature) => feature.layer.id === "akarfinder-national-neighborhood-dots").length);
      if (zoomedDots < 1) throw new Error("neighborhood dots missing after zoom 9.5");
      await page.screenshot({ path: `${outDir}/casablanca-neighborhood-zoom-${viewport.name}-after.png`, fullPage: false });

      auditPhase = "mapped-neighborhood";
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
      // LOT01: the Maârif Explore path must stay flat and never request Esri satellite tiles.
      if (await maplibre.getAttribute("data-maplibre-mode") !== "2d") throw new Error("Maârif 2D mode not active");
      const camera = await maplibre.evaluate((node) => ({
        pitch: Number(node.getAttribute("data-l3-camera-pitch")),
        bearing: Number(node.getAttribute("data-l3-camera-bearing")),
        basemapFeatures: Number(node.getAttribute("data-maplibre-basemap-feature-count")),
      }));
      if (Math.abs(camera.pitch) > 0.01 || Math.abs(camera.bearing) > 0.01 || camera.basemapFeatures < 1) {
        throw new Error(`Maârif flat basemap not proven ${JSON.stringify(camera)}`);
      }
      if (satelliteRequests.length) throw new Error(`Esri satellite requested: ${satelliteRequests.length}`);
      const rail = page.locator('[data-p4-map-decision-rail]');
      await rail.waitFor({ state: "visible", timeout: 10000 });
      const activeHref = await rail.getByRole("link", { name: /Rechercher des biens à Maârif/i }).getAttribute("href");
      if (!activeHref?.includes("city=Casablanca") || !activeHref.includes("district=Ma%C3%A2rif")) throw new Error(`Maârif Search handoff ${activeHref}`);
      overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`MapLibre horizontal overflow ${overflow}`);
      await page.screenshot({ path: `${outDir}/active-maarif-${viewport.name}-after.png`, fullPage: false });

      await page.goto(cityUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await waitForNationalOverlay(page);
      auditPhase = "postal-no-center";
      const input = page.getByRole("textbox", { name: "Rechercher un quartier à Casablanca" });
      await input.fill("QUARTIER MAARIF");
      const postalSuggestion = page.locator('[data-akarfinder-neighborhood-suggestion="quartier-maarif"]');
      await postalSuggestion.waitFor({ state: "visible", timeout: 5000 });
      await postalSuggestion.click();
      await page.waitForURL((url) => url.searchParams.get("district") === "quartier-maarif", { timeout: 10000 });
      const postalCard = page.locator('[data-akarfinder-neighborhood-preview="quartier-maarif"]');
      await postalCard.waitFor({ state: "visible", timeout: 5000 });
      await postalCard.getByText(/repère cartographique indisponible/i).waitFor({ state: "visible", timeout: 5000 });
      const postalHref = await postalCard.getByRole("link", { name: /Voir les biens à QUARTIER MAARIF/i }).getAttribute("href");
      if (!postalHref?.includes("district=QUARTIER%20MAARIF")) throw new Error(`postal Search handoff ${postalHref}`);
      await page.screenshot({ path: `${outDir}/postal-maarif-${viewport.name}-after.png`, fullPage: false });

      if (pageErrors.length) throw new Error(`browser page errors ${JSON.stringify(pageErrors)}`);
      report.cases.push({ viewport: viewport.name, overflow, layerState, zoomedDots, mappedSelection: "maplibre-2d", imageryRequests: satelliteRequests.length, noCenterFallback: true, searchHandoff: true });
    } catch (error) {
      report.failure = { viewport: viewport.name, error: String(error) };
      throw error;
    } finally {
      await context.close();
    }
  }
  report.ok = unavailableCities.length === 0;
  if (!report.ok) {
    // Keep CI red while still saving valid Casablanca screenshots and all 8 API findings.
    report.failure = { check: "l4a-national-source-coverage", unavailableCities };
    throw new Error(`L4-A unverified city coverage: ${unavailableCities.join(", ")}`);
  }
} finally {
  await browser.close();
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
}

// L4-B Mohammedia: read-only visual certification on the existing authorized N2 job.
await import("./vivre-ici-l4b-mohammedia-smoke.mjs");

// L4-C: source-backed national city focus + eight comparable choices, four viewports.
await import("./vivre-ici-l4c-city-focus.mjs");

// L4-D: major cities on national map, sourced secondary places shown only after zoom.
await import("./vivre-ici-l4d-major-cities.mjs");

// L6-A: real on-screen secondary label + municipality boundaries fading at street zoom.
await import("./vivre-ici-l6a-regional-representation.mjs");
