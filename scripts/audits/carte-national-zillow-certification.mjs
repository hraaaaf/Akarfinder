import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3212";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-national-zillow-after";
await mkdir(outDir, { recursive: true });

const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
];
const required = ["casablanca", "rabat", "marrakech", "fes", "tanger", "agadir", "meknes", "oujda", "sale", "temara", "kenitra", "tetouan", "el-jadida", "nador", "essaouira"];
const report = { ok: false, api: null, cases: [] };

const apiResponse = await fetch(`${baseUrl}/api/geo/national-territories`);
const api = await apiResponse.json();
if (!apiResponse.ok) throw new Error(`national API ${apiResponse.status}`);
if (api.meta?.cityCount < 300) throw new Error(`cityCount ${api.meta?.cityCount}`);
if (api.meta?.boundaryCount < 250) throw new Error(`boundaryCount ${api.meta?.boundaryCount}`);
if (api.meta?.neighborhoodCount < 10000) throw new Error(`neighborhoodCount ${api.meta?.neighborhoodCount}`);
const placeSlugs = new Set(api.places.map((place) => place.slug));
const boundarySlugs = new Set(api.boundaries.features.map((feature) => feature.properties?.slug));
for (const slug of required) {
  if (!placeSlugs.has(slug)) throw new Error(`required place missing ${slug}`);
  if (!boundarySlugs.has(slug)) throw new Error(`required boundary missing ${slug}`);
}
report.api = { cityCount: api.meta.cityCount, boundaryCount: api.meta.boundaryCount, neighborhoodCount: api.meta.neighborhoodCount };

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
      await page.goto(`${baseUrl}/map?layer=explore`, { waitUntil: "domcontentloaded", timeout: 30000 });
      const shell = page.locator("[data-akarfinder-national-map]");
      await shell.waitFor({ state: "visible", timeout: 30000 });
      const canvas = page.locator(".maplibregl-canvas");
      await canvas.waitFor({ state: "visible", timeout: 30000 });
      await page.waitForFunction(() => document.querySelector('[data-akarfinder-national-map]')?.getAttribute('data-akarfinder-national-view') === 'morocco', null, { timeout: 30000 });
      await page.waitForTimeout(800);

      const layerState = await page.evaluate(() => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        return {
          hasBoundary: Boolean(map?.getLayer("akarfinder-national-city-fill")),
          hasLabels: Boolean(map?.getLayer("akarfinder-national-city-labels")),
          boundaryFeatures: map?.querySourceFeatures("akarfinder-national-city-boundaries").length ?? 0,
        };
      });
      if (!layerState.hasBoundary || !layerState.hasLabels || layerState.boundaryFeatures < 200) {
        throw new Error(`map layers incomplete ${JSON.stringify(layerState)}`);
      }
      const touchSignals = await page.evaluate(() => ({
        maxTouchPoints: navigator.maxTouchPoints,
        coarse: window.matchMedia("(pointer: coarse)").matches,
      }));
      if (mobile && (touchSignals.maxTouchPoints < 1 || !touchSignals.coarse)) {
        throw new Error(`mobile touch contract missing ${JSON.stringify(touchSignals)}`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`horizontal overflow ${overflow}`);
      await page.screenshot({ path: `${outDir}/morocco-${viewport.name}-after.png`, fullPage: false });

      const casa = api.places.find((place) => place.slug === "casablanca");
      const projected = await page.evaluate(({ lng, lat }) => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        const p = map.project([lng, lat]);
        const rect = map.getCanvas().getBoundingClientRect();
        return { x: rect.left + p.x, y: rect.top + p.y };
      }, casa.center);
      await page.waitForFunction(({ x, y }) => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        const rect = map.getCanvas().getBoundingClientRect();
        const local = { x: x - rect.left, y: y - rect.top };
        return map.queryRenderedFeatures(local, { layers: ["akarfinder-national-city-hits", "akarfinder-national-city-fill"] })
          .some((feature) => feature.properties?.slug === "casablanca");
      }, projected, { timeout: 10000 });

      if (mobile) {
        await page.touchscreen.tap(projected.x, projected.y);
        await page.locator('[data-akarfinder-city-preview="casablanca"]').waitFor({ state: "visible", timeout: 5000 });
        await page.getByRole("button", { name: "Explorer Casablanca" }).click();
      } else {
        await page.mouse.click(projected.x, projected.y);
      }
      await page.waitForURL(/city=casablanca/, { timeout: 10000 });
      await page.waitForFunction(() => document.querySelector('[data-akarfinder-national-map]')?.getAttribute('data-akarfinder-national-view') === 'city', null, { timeout: 30000 });
      const casaResponse = await fetch(`${baseUrl}/api/geo/national-territories?city=casablanca`);
      const casaPayload = await casaResponse.json();
      if (!casaResponse.ok || casaPayload.meta?.neighborhoodCount < 1500) throw new Error(`Casablanca neighborhood inventory ${casaPayload.meta?.neighborhoodCount}`);
      await page.getByRole("heading", { name: "Casablanca" }).waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("button", { name: "Revenir à la carte du Maroc" }).waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${outDir}/casablanca-${viewport.name}-after.png`, fullPage: false });

      if (diagnostics.pageErrors.length || diagnostics.requestFailures.length) throw new Error(`browser diagnostics ${JSON.stringify(diagnostics)}`);
      report.cases.push({ viewport: viewport.name, overflow, layerState, touchSignals, diagnostics, cityDrilldown: true });
    } finally {
      await context.close();
    }
  }
  report.ok = true;
} finally {
  await browser.close();
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
}
