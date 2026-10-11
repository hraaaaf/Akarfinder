import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3205";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-lot8-multicity";
await mkdir(outDir, { recursive: true });

// National source registry coverage: each of the 17 canonical neighborhood
// routes across 8 Moroccan cities. Never synthesize unregistered geographies.
// Keep Fès first to preserve an early diagnostic on failure.
const cities = [
  { slug: "fes", districtSlug: "ville-nouvelle", city: "Fès", district: "Ville Nouvelle" },
  { slug: "fes", districtSlug: "fes-el-bali", city: "Fès", district: "Fès el-Bali" },
  { slug: "casablanca", districtSlug: "maarif", city: "Casablanca", district: "Maârif" },
  { slug: "casablanca", districtSlug: "finance-city", city: "Casablanca", district: "Casablanca Finance City" },
  { slug: "casablanca", districtSlug: "bouskoura", city: "Casablanca", district: "Bouskoura" },
  { slug: "rabat", districtSlug: "hay-riad", city: "Rabat", district: "Hay Riad" },
  { slug: "rabat", districtSlug: "agdal", city: "Rabat", district: "Agdal" },
  { slug: "rabat", districtSlug: "hassan", city: "Rabat", district: "Hassan" },
  { slug: "marrakech", districtSlug: "gueliz", city: "Marrakech", district: "Guéliz" },
  { slug: "marrakech", districtSlug: "hivernage", city: "Marrakech", district: "Hivernage" },
  { slug: "marrakech", districtSlug: "route-de-lourika", city: "Marrakech", district: "Route de l'Ourika" },
  { slug: "tanger", districtSlug: "malabata", city: "Tanger", district: "Malabata" },
  { slug: "tanger", districtSlug: "ville-nouvelle", city: "Tanger", district: "Ville Nouvelle" },
  { slug: "agadir", districtSlug: "founty", city: "Agadir", district: "Founty" },
  { slug: "agadir", districtSlug: "talborjt", city: "Agadir", district: "Talborjt" },
  { slug: "kenitra", districtSlug: "centre-ville", city: "Kénitra", district: "Centre-ville" },
  { slug: "mohammedia", districtSlug: "centre", city: "Mohammedia", district: "Centre" },
];
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "iphone14promax", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 900 },
  { name: "desktop", width: 1280, height: 900 },
];

function basemapTileZoom(url) {
  if (!url.includes("tiles.openfreemap.org")) return null;
  const match = url.match(/\/(\d+)\/\d+\/\d+\.(?:pbf|png)(?:\?|$)/);
  return match ? Number(match[1]) : null;
}

const report = { ok: false, cases: [], generatedAt: new Date().toISOString() };
let liveTileProofCases = 0;
const browser = await chromium.launch({ headless: true });

try {
  for (const cityCase of cities) {
    for (const viewport of viewports) {
      if (viewport.onlyCity && viewport.onlyCity !== cityCase.slug) continue;

      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const pageErrors = [];
      const tileResponses = [];
      let highZoomTileCount = 0;
      let tileGateSettled = false;
      let resolveTiles;
      let rejectTiles;
      let basemapEvidence = "live-tiles";
      const tilesReady = new Promise((resolve, reject) => {
        resolveTiles = resolve;
        rejectTiles = reject;
      });
      const tileGateTimeout = setTimeout(() => {
        if (tileGateSettled) return;
        tileGateSettled = true;
        rejectTiles(new Error(`${cityCase.slug}/${viewport.name}: no real high-zoom basemap tiles rendered within 8s`));
      }, 8000);

      page.on("pageerror", (error) => pageErrors.push(String(error)));
      page.on("response", (response) => {
        const zoom = basemapTileZoom(response.url());
        if (zoom === null) return;
        tileResponses.push({ url: response.url(), status: response.status(), zoom });
        if (zoom >= 9 && response.ok()) {
          highZoomTileCount += 1;
          if (highZoomTileCount >= 2 && !tileGateSettled) {
            tileGateSettled = true;
            clearTimeout(tileGateTimeout);
            resolveTiles();
          }
        }
      });

      try {
        await page.goto(`${baseUrl}/map?city=${cityCase.slug}&district=${cityCase.districtSlug}&layer=explore`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        const maplibre = page.locator(`[data-maplibre-spike][data-maplibre-city="${cityCase.slug}"][data-maplibre-district="${cityCase.districtSlug}"]`);
        await maplibre.waitFor({ state: "attached", timeout: 20000 });
        const mapCanvas = page.locator(".maplibregl-canvas");
        await mapCanvas.waitFor({ state: "attached", timeout: 10000 });
        await page.waitForFunction(
          ({ citySlug, districtSlug }) => {
            const shell = document.querySelector(`[data-maplibre-spike][data-maplibre-city="${citySlug}"][data-maplibre-district="${districtSlug}"]`);
            return shell?.getAttribute("data-maplibre-render-state") === "ready";
          },
          { citySlug: cityCase.slug, districtSlug: cityCase.districtSlug },
          { timeout: 20000 },
        );
        try {
          await tilesReady;
          liveTileProofCases += 1;
        } catch (tileError) {
          basemapEvidence = "external-provider-timeout";
          console.warn(`${cityCase.slug}/${viewport.name}: ${String(tileError)}; continuing product/layout assertions and preserving screenshot evidence`);
        }
        await page.waitForTimeout(450);

        // Preserve the actual rendered viewport before any visibility/layout assertions.
        await page.screenshot({ path: `${outDir}/${cityCase.slug}-${cityCase.districtSlug}-${viewport.width}x${viewport.height}.png`, fullPage: false });

        // Each registered city/quartier must use the SAME actual AkarFinder
        // flat 2D vector renderer, not just a blue page-shell CSS treatment.
        const nationalMapState = await maplibre.evaluate((el) => {
          const attr = (key) => el.getAttribute(key);
          return {
            nationalFlat: attr("data-maplibre-national-flat"),
            palette: attr("data-maplibre-cartographic-palette"),
            hierarchy: attr("data-maplibre-hierarchy-pass"),
            camera: attr("data-maplibre-camera-mode"),
            focus: attr("data-maplibre-focus-semantic"),
            pitch: Number(attr("data-maplibre-actual-pitch")),
            bearing: Number(attr("data-maplibre-actual-bearing")),
            footprints: Number(attr("data-maplibre-building-footprint-count")),
            volumes: Number(attr("data-maplibre-building-count")),
            adminBoundary: attr("data-maplibre-boundary-semantic"),
            city: attr("data-maplibre-city"),
            district: attr("data-maplibre-district"),
          };
        });
        if (nationalMapState.nationalFlat !== "akarfinder-national-v1"
          || nationalMapState.palette !== "akarfinder-c1-c2-map-v1"
          || nationalMapState.hierarchy !== "readable-footprints-roads-v2"
          || nationalMapState.camera !== "north-up-flat"
          || nationalMapState.focus !== "context-focus-not-boundary"
          || nationalMapState.pitch !== 0 || nationalMapState.bearing !== 0
          || nationalMapState.volumes !== 0) {
          throw new Error(`${cityCase.slug}/${viewport.name}: nationwide 2D contract failed ${JSON.stringify(nationalMapState)}`);
        }
        if (cityCase.slug !== "casablanca" && nationalMapState.adminBoundary !== "none") {
          throw new Error(`${cityCase.slug}/${viewport.name}: invented administrative district geometry`);
        }
        if (basemapEvidence === "live-tiles" && nationalMapState.footprints < 1) {
          throw new Error(`${cityCase.slug}/${viewport.name}: live urban vector tiles but no real building footprints`);
        }
        const rail = page.locator("[data-p4-map-decision-rail]");
        await rail.waitFor({ state: "visible", timeout: 10000 });
        const panelBox = await rail.boundingBox();
        if (!panelBox) throw new Error(`${cityCase.slug}/${viewport.name}: decision rail has no bounding box`);
        if (panelBox.x < -1 || panelBox.x + panelBox.width > viewport.width + 1 || panelBox.y < -1 || panelBox.y + panelBox.height > viewport.height + 1) {
          throw new Error(`${cityCase.slug}/${viewport.name}: decision rail escapes viewport ${JSON.stringify(panelBox)}`);
        }

        const searchLink = rail.getByRole("link", { name: new RegExp(`Voir les biens disponibles à ${cityCase.district}`, "i") });
        const searchHref = await searchLink.getAttribute("href");
        if (!searchHref) throw new Error(`${cityCase.slug}/${viewport.name}: Search handoff missing`);
        const searchUrl = new URL(searchHref, baseUrl);
        if (searchUrl.pathname !== "/search" || searchUrl.searchParams.get("city") !== cityCase.city || searchUrl.searchParams.get("district") !== cityCase.district) {
          throw new Error(`${cityCase.slug}/${viewport.name}: Search handoff mismatch ${searchHref}`);
        }

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 1) throw new Error(`${cityCase.slug}/${viewport.name}: horizontal overflow ${overflow}`);

        if (viewport.width <= 767) {
          if (panelBox.height > 230) throw new Error(`${cityCase.slug}/${viewport.name}: mobile decision sheet too tall ${JSON.stringify(panelBox)}`);
          if (panelBox.y < viewport.height * 0.5) throw new Error(`${cityCase.slug}/${viewport.name}: insufficient visible map band ${JSON.stringify(panelBox)}`);
          if (panelBox.y + panelBox.height > viewport.height - 76) throw new Error(`${cityCase.slug}/${viewport.name}: decision sheet overlaps bottom navigation ${JSON.stringify(panelBox)}`);
        }

        if (pageErrors.length) throw new Error(`${cityCase.slug}/${viewport.name}: browser page errors ${JSON.stringify(pageErrors)}`);

        report.cases.push({
          city: cityCase.city,
          district: cityCase.district,
          viewport: viewport.name,
          searchHref,
          panelBox,
          overflow,
          mapRendered: true,
          nationalMapState,
          highZoomTileCount,
          basemapEvidence,
          decisionRail: true,
          tileResponses,
        });
      } finally {
        clearTimeout(tileGateTimeout);
        await page.close();
      }
    }
  }
  if (report.cases.length !== cities.length * viewports.length) {
    throw new Error(`national registry audit only covered ${report.cases.length}/${cities.length * viewports.length} viewport cases`);
  }
  if (liveTileProofCases < 1) {
    throw new Error("national registry run produced no successful real high-zoom OpenFreeMap tile evidence");
  }
  report.registeredNeighborhoods = cities.length;
  report.registeredCities = [...new Set(cities.map((item) => item.slug))].length;
  report.expectedViewportCases = cities.length * viewports.length;
  report.liveTileProofCases = liveTileProofCases;
  report.ok = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack || error.message : String(error);
  throw error;
} finally {
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
