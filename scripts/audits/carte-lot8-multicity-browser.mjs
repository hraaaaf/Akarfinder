import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3205";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-lot8-multicity";
await mkdir(outDir, { recursive: true });

// Run the requested Fès / iPhone 14 Pro Max proof first so a diagnostic capture
// is still preserved if a later certification assertion fails.
const cities = [
  { slug: "fes", districtSlug: "ville-nouvelle", city: "Fès", district: "Ville Nouvelle" },
  { slug: "casablanca", districtSlug: "maarif", city: "Casablanca", district: "Maârif" },
  { slug: "marrakech", districtSlug: "gueliz", city: "Marrakech", district: "Guéliz" },
  { slug: "tanger", districtSlug: "malabata", city: "Tanger", district: "Malabata" },
  { slug: "agadir", districtSlug: "founty", city: "Agadir", district: "Founty" },
];
const viewports = [
  { name: "iphone14promax", width: 430, height: 932, onlyCity: "fes" },
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];

function basemapTileZoom(url) {
  if (!url.includes("tiles.openfreemap.org")) return null;
  const match = url.match(/\/(\d+)\/\d+\/\d+\.(?:pbf|png)(?:\?|$)/);
  return match ? Number(match[1]) : null;
}

const report = { ok: false, cases: [], generatedAt: new Date().toISOString() };
const browser = await chromium.launch({ headless: true });

try {
  for (const cityCase of cities) {
    for (const viewport of viewports) {
      if (viewport.onlyCity && viewport.onlyCity !== cityCase.slug) continue;

      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const pageErrors = [];
      const tileResponses = [];
      let highZoomTileCount = 0;
      page.on("pageerror", (error) => pageErrors.push(String(error)));
      page.on("response", (response) => {
        const zoom = basemapTileZoom(response.url());
        if (zoom === null) return;
        tileResponses.push({ url: response.url(), status: response.status(), zoom });
        if (zoom >= 9 && response.ok()) highZoomTileCount += 1;
      });

      try {
        await page.goto(`${baseUrl}/map?city=${cityCase.slug}&district=${cityCase.districtSlug}&layer=explore`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        // The actual product checks a *qualified OSM center* before mounting
        // neighborhood MapLibre. Without one it deliberately shows the sourced
        // city canvas + district decision rail, never a synthetic district map.
        const geoResponse = await page.request.get(
          `${baseUrl}/api/geo/national-territories?city=${encodeURIComponent(cityCase.slug)}`,
        );
        if (!geoResponse.ok()) throw new Error(`${cityCase.slug}: V5 geo source HTTP ${geoResponse.status()}`);
        const geo = await geoResponse.json();
        const sourceCity = cityCase.slug === "mohammedia" ? "mohammadia" : cityCase.slug;
        if (geo.view !== "city" || geo.place?.slug !== sourceCity) {
          throw new Error(`${cityCase.slug}: V5 city context unavailable or mismatched`);
        }
        const sourceDistrict = geo.neighborhoods?.find((item) => item.slug === cityCase.districtSlug);
        const hasQualifiedCenter = Boolean(
          sourceDistrict?.sourceKinds?.includes("osm_neighborhood_label")
          && sourceDistrict?.center
          && Number.isFinite(sourceDistrict.center.lng)
          && Number.isFinite(sourceDistrict.center.lat)
          && Math.abs(sourceDistrict.center.lng) <= 180
          && Math.abs(sourceDistrict.center.lat) <= 90,
        );
        const mapCanvas = page.locator(".maplibregl-canvas");
        let renderedBasemap;
        let renderMode;
        if (hasQualifiedCenter) {
          const maplibre = page.locator(
            `[data-maplibre-spike][data-maplibre-city="${cityCase.slug}"][data-maplibre-district="${cityCase.districtSlug}"]`,
          );
          await maplibre.waitFor({ state: "attached", timeout: 20000 });
          await mapCanvas.waitFor({ state: "attached", timeout: 10000 });
          await page.waitForFunction(() => {
            const e = document.querySelector("[data-maplibre-spike]");
            if (!e) return false;
            const count = Number(e.getAttribute("data-maplibre-basemap-feature-count"));
            const zoom = Number(e.getAttribute("data-l3-camera-zoom"));
            return e.getAttribute("data-maplibre-render-state") === "ready"
              && e.getAttribute("data-maplibre-source-state") === "available"
              && Number.isFinite(count) && count > 0
              && Number.isFinite(zoom) && zoom >= 9;
          }, null, { timeout: 20000 });
          renderedBasemap = await maplibre.evaluate((e) => ({
            provider: e.getAttribute("data-maplibre-source"),
            featureCount: Number(e.getAttribute("data-maplibre-basemap-feature-count")),
            zoom: Number(e.getAttribute("data-l3-camera-zoom")),
          }));
          if (!["openfreemap", "carto"].includes(renderedBasemap.provider)
              || renderedBasemap.featureCount < 1 || renderedBasemap.zoom < 9) {
            throw new Error(`${cityCase.slug}/${viewport.name}: no actual high-zoom basemap ${JSON.stringify(renderedBasemap)}`);
          }
          renderMode = "qualified-neighborhood-2d";
        } else {
          // Fès/Ville Nouvelle 430px was visually confirmed to take exactly
          // this honest fallback; the map NEVER claims a sourced district center.
          const national = page.locator('[data-akarfinder-national-map][data-akarfinder-national-view="city"]');
          await national.waitFor({ state: "visible", timeout: 20000 });
          await mapCanvas.waitFor({ state: "visible", timeout: 10000 });
          await page.waitForFunction(() => {
            const map = window.__AKARFINDER_NATIONAL_MAP__;
            if (!map) return false;
            try {
              return map.queryRenderedFeatures().some((feature) =>
                !String(feature.layer?.id || "").startsWith("akarfinder-national-"));
            } catch { return false; }
          }, null, { timeout: 20000 });
          if (await page.locator("[data-maplibre-spike]").count() !== 0) {
            throw new Error(`${cityCase.slug}/${viewport.name}: unsourced district must not mount a synthetic center`);
          }
          renderedBasemap = await page.evaluate(() => {
            const map = window.__AKARFINDER_NATIONAL_MAP__;
            return {
              provider: "national-basemap",
              featureCount: map.queryRenderedFeatures().filter((feature) =>
                !String(feature.layer?.id || "").startsWith("akarfinder-national-")).length,
              zoom: map.getZoom(),
            };
          });
          if (renderedBasemap.featureCount < 1) {
            throw new Error(`${cityCase.slug}/${viewport.name}: fallback city basemap has no rendered real features`);
          }
          renderMode = "source-honest-city-fallback";
        }
        await page.waitForTimeout(450);

        // Preserve the actual rendered viewport before any visibility/layout assertions.
        await page.screenshot({ path: `${outDir}/${cityCase.slug}-${cityCase.districtSlug}-${viewport.width}x${viewport.height}.png`, fullPage: false });

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
          highZoomTileCount,
          renderedBasemap,
          renderMode,
          hasQualifiedCenter,
          decisionRail: true,
          tileResponses,
        });
      } catch (error) {
        await page.screenshot({ path: `${outDir}/failure-${cityCase.slug}-${viewport.name}.png`, fullPage: false }).catch(() => {});
        throw error;
      } finally {
        await page.close();
      }
    }
  }
  report.ok = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack || error.message : String(error);
  throw error;
} finally {
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
