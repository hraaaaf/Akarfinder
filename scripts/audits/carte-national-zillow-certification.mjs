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
      reducedMotion: "reduce",
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
      // The canonical /map opens PremiumInteractiveMap (SVG/TopoJSON).
      // MapLibre's national city-layer contract still belongs to the legacy city router,
      // not to the current national entry. Keep independent API inventory checks above.
      const shell = page.locator('[data-premium-map][data-map-level="national"]');
      await shell.waitFor({ state: "visible", timeout: 30000 });
      await page.waitForFunction(
        () => document.querySelector('[data-premium-map]')?.getAttribute('data-topology-state') === 'ready',
        null,
        { timeout: 30000 },
      );
      const svg = page.locator('[data-region-map-svg]');
      await svg.waitFor({ state: "visible", timeout: 15000 });
      const layerState = {
        topologyState: await shell.getAttribute("data-topology-state"),
        regions: await page.locator('[data-region-slug]').count(),
        regionButtons: await page.locator('[data-region-list-slug]').count(),
      };
      if (layerState.regions !== 12 || layerState.regionButtons !== 12 || layerState.topologyState !== "ready") {
        throw new Error(`premium national topology incomplete ${JSON.stringify(layerState)}`);
      }
      const geometryState = await page.evaluate(() => {
        const mapRect = document.querySelector('section[aria-label="Carte interactive du Maroc"]')?.getBoundingClientRect();
        const svgRect = document.querySelector('[data-region-map-svg]')?.getBoundingClientRect();
        return {
          mapHeight: mapRect?.height ?? 0,
          svgHeight: svgRect?.height ?? 0,
          svgWidth: svgRect?.width ?? 0,
        };
      });
      if (geometryState.mapHeight < 550 || geometryState.svgHeight < geometryState.mapHeight - 2 || geometryState.svgWidth < 200) {
        throw new Error(`premium national map geometry invalid ${JSON.stringify(geometryState)}`);
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

      // Verify real SVG navigation (touch on mobile, focus+Enter on desktop).
      const region = page.locator('[data-region-slug="casablanca-settat"]');
      await region.waitFor({ state: "visible", timeout: 10000 });
      if (mobile) {
        await region.tap();
      } else {
        await region.focus();
        await page.keyboard.press("Enter");
      }
      await page.locator('[data-premium-map][data-map-level="region"]').waitFor({ state: "visible", timeout: 10000 });
      const city = page.locator('[data-city-list-slug="casablanca"]');
      await city.waitFor({ state: "visible", timeout: 10000 });
      await page.screenshot({ path: `${outDir}/active-casablanca-${viewport.name}-after.png`, fullPage: false });
      if (mobile) await city.tap();
      else await city.click();
      await page.locator('[data-premium-map][data-map-level="city"]').waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("heading", { name: "Casablanca", exact: true }).waitFor({ state: "visible", timeout: 10000 });

      // Preserve a separate API geography inventory, even though SVG is backed by TopoJSON.
      const casaResponse = await fetch(`${baseUrl}/api/geo/national-territories?city=casablanca`);
      const casaPayload = await casaResponse.json();
      if (!casaResponse.ok || casaPayload.meta?.neighborhoodCount < 1500) {
        throw new Error(`Casablanca neighborhood inventory ${casaPayload.meta?.neighborhoodCount}`);
      }

      const maarif = page.locator('[data-map-side-panel] button').filter({ hasText: "Maârif" }).first();
      await maarif.waitFor({ state: "visible", timeout: 10000 });
      if (mobile) await maarif.tap();
      else await maarif.click();
      const selected = page.locator('[data-selected-quartier="maarif"]');
      await selected.waitFor({ state: "visible", timeout: 10000 });
      await selected.locator('[data-local-evidence="unavailable"]').waitFor({ state: "visible", timeout: 10000 });
      const districtText = await page.locator('[data-map-side-panel]').innerText();
      if (!districtText.includes("Aucune statistique non sourcée") ||
          /DH\\/m²|repère vérifié|17\\s?600|15 repères/i.test(districtText)) {
        throw new Error("Maârif still shows fabricated local figures or hides the unavailable-data message");
      }
      const searchLink = await selected.locator('[data-explorer-selected]').getAttribute("href");
      if (searchLink !== "/immobilier/casablanca/maarif") {
        throw new Error(`Maârif Search handoff wrong: ${searchLink}`);
      }
      await page.screenshot({ path: `${outDir}/casablanca-${viewport.name}-after.png`, fullPage: false });

      // Returning to Morocco must restore the 12-region SVG and selection list.
      await page.getByRole("navigation", { name: "Fil d’Ariane cartographique" })
        .getByRole("button", { name: "Maroc", exact: true }).click();
      await page.locator('[data-premium-map][data-map-level="national"]').waitFor({ state: "visible", timeout: 10000 });
      if (await page.locator('[data-region-list-slug]').count() !== 12) {
        throw new Error("Returning to Morocco did not restore all 12 regions");
      }

      const criticalRequestFailures = diagnostics.requestFailures.filter((failure) => failure.url.startsWith(baseUrl) && failure.error !== "net::ERR_ABORTED");
      if (diagnostics.pageErrors.length || criticalRequestFailures.length) {
        throw new Error(`browser diagnostics ${JSON.stringify({ pageErrors: diagnostics.pageErrors, criticalRequestFailures })}`);
      }
      report.cases.push({ viewport: viewport.name, overflow, layerState, geometryState, touchSignals, diagnostics, activeSelection: true, cityDrilldown: true });
    } finally {
      await context.close();
    }
  }
  report.ok = true;
} finally {
  await browser.close();
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
}
