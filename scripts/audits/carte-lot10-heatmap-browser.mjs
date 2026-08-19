import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3210";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-lot10-heatmap";
await mkdir(outDir, { recursive: true });

const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 900 },
  { name: "desktop-1280", width: 1280, height: 900 },
];

function bucket(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 10_000;
}

function eligibleCanaryKey() {
  for (let index = 0; index < 100_000; index += 1) {
    const value = `lot10-heatmap-${index}`;
    if (bucket(value) < 100) return value;
  }
  throw new Error("Unable to derive deterministic Casablanca geometry canary key");
}

function basemapTileZoom(url) {
  if (!url.includes("tiles.openfreemap.org")) return null;
  const match = url.match(/\/(\d+)\/\d+\/\d+\.(?:pbf|png)(?:\?|$)/);
  return match ? Number(match[1]) : null;
}

async function readMode(context, mode) {
  const response = await context.request.get(
    `${baseUrl}/api/geo/market-intelligence?city=casablanca&mode=${mode}&transaction=sale`,
  );
  if (response.status() !== 200) {
    throw new Error(`${mode}: market API HTTP ${response.status()} ${await response.text()}`);
  }
  const payload = await response.json();
  if (payload.mode !== mode || payload.city?.slug !== "casablanca") {
    throw new Error(`${mode}: payload identity mismatch`);
  }
  const maarif = payload.districts?.find((district) => district.districtSlug === "maarif");
  if (!maarif) throw new Error(`${mode}: Maârif metric row missing`);
  if (mode === "density" && maarif.areaBasis !== "casablanca_osm_shadow") {
    throw new Error(`density: Maârif area basis mismatch ${maarif.areaBasis}`);
  }
  return payload;
}

async function waitLegendSettled(page, mode) {
  const legend = page.locator(`[data-akarfinder-intelligence-legend="${mode}"]`);
  await legend.waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(
    (expectedMode) => {
      const element = document.querySelector(`[data-akarfinder-intelligence-legend="${expectedMode}"]`);
      if (!element) return false;
      const text = element.textContent || "";
      return !/Calcul des annonces observées|temporairement indisponibles/i.test(text);
    },
    mode,
    { timeout: 15_000 },
  );
  return legend;
}

const key = eligibleCanaryKey();
const report = {
  ok: false,
  canaryKey: key,
  canaryBucket: bucket(key),
  cases: [],
  generatedAt: new Date().toISOString(),
};

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    await context.addCookies([{
      name: "akar_geometry_canary",
      value: key,
      url: baseUrl,
      sameSite: "Lax",
    }]);

    const geometryResponse = await context.request.get(`${baseUrl}/api/geo/casablanca-arrondissements`);
    if (geometryResponse.status() !== 200) {
      throw new Error(`${viewport.name}: geometry canary HTTP ${geometryResponse.status()} ${await geometryResponse.text()}`);
    }
    const geometry = await geometryResponse.json();
    if (!Array.isArray(geometry.features) || geometry.features.length !== 16) {
      throw new Error(`${viewport.name}: expected 16 materialized Casablanca geometries`);
    }

    const pricePayload = await readMode(context, "price");
    const densityPayload = await readMode(context, "density");
    const listingsPayload = await readMode(context, "listings");

    const page = await context.newPage();
    const pageErrors = [];
    const marketResponses = [];
    const tileResponses = [];
    let highZoomTileCount = 0;
    let tileGateSettled = false;
    let resolveTileGate;
    let rejectTileGate;
    const realTilesReady = new Promise((resolve, reject) => {
      resolveTileGate = resolve;
      rejectTileGate = reject;
    });
    const tileGateTimeout = setTimeout(() => {
      if (tileGateSettled) return;
      tileGateSettled = true;
      rejectTileGate(new Error(`${viewport.name}: fewer than two successful real OpenFreeMap high-zoom tiles within 20s`));
    }, 20_000);

    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text());
    });
    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/geo/market-intelligence")) {
        marketResponses.push({ url, status: response.status() });
      }
      const zoom = basemapTileZoom(url);
      if (zoom == null) return;
      tileResponses.push({ url, status: response.status(), zoom });
      if (zoom >= 9 && response.ok()) {
        highZoomTileCount += 1;
        if (highZoomTileCount >= 2 && !tileGateSettled) {
          tileGateSettled = true;
          clearTimeout(tileGateTimeout);
          resolveTileGate();
        }
      }
    });

    try {
      await page.goto(`${baseUrl}/map?city=casablanca&layer=listings`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await page.getByText("Chargement de la carte…", { exact: true }).waitFor({ state: "hidden", timeout: 30_000 });
      await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 15_000 });
      await page.locator('[data-akarfinder-territorial-layer="active"]').waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForFunction(() => document.querySelectorAll('[data-akarfinder-intelligence-mode]').length === 3, null, { timeout: 10_000 });
      await page.waitForFunction(() => {
        const canvas = document.querySelector(".maplibregl-canvas");
        return Boolean(canvas && canvas.getBoundingClientRect().width > 100 && canvas.getBoundingClientRect().height > 100);
      }, null, { timeout: 10_000 });
      await realTilesReady;

      const toolbar = page.locator("[data-akarfinder-generic-premium-toolbar]");
      await toolbar.waitFor({ state: "visible", timeout: 10_000 });
      const listingsLegend = await waitLegendSettled(page, "listings");
      if (!/Annonces/i.test(await listingsLegend.innerText())) throw new Error(`${viewport.name}: listings legend mismatch`);

      await page.screenshot({
        path: `${outDir}/casablanca-heatmap-listings-${viewport.width}x${viewport.height}.png`,
        fullPage: false,
      });

      const densityResponsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/geo/market-intelligence") && response.url().includes("mode=density") && response.status() === 200,
        { timeout: 15_000 },
      );
      await toolbar.locator('[data-akarfinder-intelligence-mode="density"]').click();
      await page.waitForURL(/layer=density/, { timeout: 10_000 });
      await densityResponsePromise;
      await waitLegendSettled(page, "density");

      const priceResponsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/geo/market-intelligence") && response.url().includes("mode=price") && response.status() === 200,
        { timeout: 15_000 },
      );
      await toolbar.locator('[data-akarfinder-intelligence-mode="price"]').click();
      await page.waitForURL(/layer=price/, { timeout: 10_000 });
      await priceResponsePromise;
      const priceLegend = await waitLegendSettled(page, "price");
      if (pricePayload.legend.availableCount === 0 && !/Aucun quartier ne passe encore le seuil/i.test(await priceLegend.innerText())) {
        throw new Error(`${viewport.name}: price mode must fail closed when no district passes the threshold`);
      }

      const listingsResponsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/geo/market-intelligence") && response.url().includes("mode=listings") && response.status() === 200,
        { timeout: 15_000 },
      );
      await toolbar.locator('[data-akarfinder-intelligence-mode="listings"]').click();
      await page.waitForURL(/layer=listings/, { timeout: 10_000 });
      await listingsResponsePromise;
      await waitLegendSettled(page, "listings");

      // Lot 10 is the semantic heatmap, not the legacy point marker layer. The
      // MapLibre polygon click bridge is locked by the Lot 10 contract test.
      // Browser selection uses the visible territorial district control so the
      // proof remains a genuine, unforced user interaction at every viewport.
      const districtExplorer = page.locator('[data-akarfinder-territorial-explorer="true"]');
      await districtExplorer.waitFor({ state: "visible", timeout: 10_000 });
      const maarifControl = districtExplorer.getByRole("button", { name: "Maârif", exact: true });
      await maarifControl.waitFor({ state: "visible", timeout: 10_000 });
      await maarifControl.click();
      await page.waitForURL(/district=maarif/, { timeout: 10_000 });

      const panel = viewport.width <= 767
        ? page.locator("[data-akarfinder-mobile-compact-panel]")
        : page.getByRole("complementary", { name: /Fiche repère quartier Maârif/i });
      await panel.waitFor({ state: "visible", timeout: 15_000 });
      const metric = viewport.width <= 767
        ? page.locator("[data-akarfinder-lot9-compact-metric]")
        : page.locator("[data-akarfinder-lot9-panel-metric]");
      await metric.waitFor({ state: "visible", timeout: 10_000 });
      await page.waitForFunction(() => {
        const element = document.querySelector("[data-akarfinder-lot9-compact-metric], [data-akarfinder-lot9-panel-metric]");
        const text = element?.textContent || "";
        return Boolean(text.trim()) && !/Calcul du marché|Calcul en cours/i.test(text);
      }, null, { timeout: 15_000 });

      const searchLink = viewport.width <= 767
        ? panel.getByRole("link", { name: /Rechercher ici/i })
        : panel.getByRole("link", { name: /Rechercher dans ce quartier/i });
      const searchHref = await searchLink.getAttribute("href");
      const searchUrl = new URL(searchHref || "", baseUrl);
      if (searchUrl.pathname !== "/search" || searchUrl.searchParams.get("city") !== "Casablanca" || searchUrl.searchParams.get("district") !== "Maârif") {
        throw new Error(`${viewport.name}: Search handoff mismatch ${searchHref}`);
      }

      const panelBox = await panel.boundingBox();
      if (!panelBox) throw new Error(`${viewport.name}: selected panel has no bounding box`);
      if (panelBox.x < -1 || panelBox.y < -1 || panelBox.x + panelBox.width > viewport.width + 1 || panelBox.y + panelBox.height > viewport.height + 1) {
        throw new Error(`${viewport.name}: selected panel escapes viewport ${JSON.stringify(panelBox)}`);
      }
      if (viewport.width <= 767 && panelBox.height > 230) {
        throw new Error(`${viewport.name}: compact selected panel too tall ${JSON.stringify(panelBox)}`);
      }

      await page.screenshot({
        path: `${outDir}/casablanca-heatmap-maarif-${viewport.width}x${viewport.height}.png`,
        fullPage: false,
      });

      if (pageErrors.length) throw new Error(`${viewport.name}: page errors ${JSON.stringify(pageErrors)}`);

      report.cases.push({
        viewport: viewport.name,
        geometryFeatures: geometry.features.length,
        highZoomTileCount,
        priceAvailable: pricePayload.legend.availableCount,
        densityAvailable: densityPayload.legend.availableCount,
        listingsAvailable: listingsPayload.legend.availableCount,
        marketResponses: marketResponses.slice(-12),
        tileResponses: tileResponses.slice(-20),
        selectedMetric: (await metric.textContent())?.trim() || "",
        selectionPath: "territorial-control",
        panelBox,
        searchHref,
      });
    } finally {
      clearTimeout(tileGateTimeout);
      await context.close();
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
