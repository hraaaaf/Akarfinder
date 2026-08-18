import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3209";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-lot9-market-modes";
await mkdir(outDir, { recursive: true });

const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 900 },
  { name: "desktop", width: 1280, height: 900 },
];

function basemapTileZoom(url) {
  if (!url.includes("tiles.openfreemap.org")) return null;
  const match = url.match(/\/(\d+)\/\d+\/\d+\.(?:pbf|png)(?:\?|$)/);
  return match ? Number(match[1]) : null;
}

async function requireApiMode(page, mode) {
  const response = await page.request.get(
    `${baseUrl}/api/geo/market-intelligence?city=casablanca&mode=${mode}&transaction=sale`,
  );
  if (response.status() !== 200) {
    throw new Error(`${mode}: market intelligence API returned ${response.status()} ${await response.text()}`);
  }
  const payload = await response.json();
  if (payload.mode !== mode) throw new Error(`${mode}: API mode mismatch`);
  if (payload.city?.slug !== "casablanca") throw new Error(`${mode}: API city mismatch`);
  if (!Array.isArray(payload.districts) || !payload.districts.some((row) => row.districtSlug === "maarif")) {
    throw new Error(`${mode}: Maârif district metric missing`);
  }
  if (mode === "density") {
    const maarif = payload.districts.find((row) => row.districtSlug === "maarif");
    if (maarif.areaBasis !== "casablanca_osm_shadow") {
      throw new Error(`density: Maârif must declare casablanca_osm_shadow area basis, got ${maarif.areaBasis}`);
    }
  }
  return payload;
}

const report = { ok: false, cases: [], generatedAt: new Date().toISOString() };
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const pageErrors = [];
    const tileResponses = [];
    let highZoomTileCount = 0;
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("response", (response) => {
      const zoom = basemapTileZoom(response.url());
      if (zoom == null) return;
      tileResponses.push({ url: response.url(), status: response.status(), zoom });
      if (zoom >= 9 && response.ok()) highZoomTileCount += 1;
    });

    await page.goto(`${baseUrl}/map?city=casablanca&layer=price`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.getByText("Chargement de la carte…", { exact: true }).waitFor({ state: "hidden", timeout: 30000 });
    await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 10000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-akarfinder-intelligence-mode]').length === 3, null, { timeout: 10000 });
    await page.waitForFunction(() => document.querySelector('[data-akarfinder-intelligence-legend="price"]'), null, { timeout: 10000 });

    const pricePayload = await requireApiMode(page, "price");
    const densityPayload = await requireApiMode(page, "density");
    const listingsPayload = await requireApiMode(page, "listings");

    const toolbar = page.locator("[data-akarfinder-generic-premium-toolbar]");
    await toolbar.waitFor({ state: "visible", timeout: 10000 });
    const tabs = toolbar.locator("[data-akarfinder-intelligence-mode]");
    if (await tabs.count() !== 3) throw new Error(`${viewport.name}: expected exactly three market mode tabs`);

    await tabs.filter({ hasText: "Densité" }).click();
    await page.waitForURL(/layer=density/, { timeout: 10000 });
    await page.waitForFunction(() => document.querySelector('[data-akarfinder-intelligence-legend="density"]'), null, { timeout: 10000 });

    await toolbar.locator('[data-akarfinder-intelligence-mode="listings"]').click();
    await page.waitForURL(/layer=listings/, { timeout: 10000 });
    await page.waitForFunction(() => document.querySelector('[data-akarfinder-intelligence-legend="listings"]'), null, { timeout: 10000 });

    await page.screenshot({
      path: `${outDir}/casablanca-market-modes-${viewport.width}x${viewport.height}.png`,
      fullPage: false,
    });

    await page.goto(`${baseUrl}/map?city=casablanca&district=maarif&layer=listings`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.getByText("Chargement de la carte…", { exact: true }).waitFor({ state: "hidden", timeout: 30000 });
    await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 10000 });

    const fullPanel = page.getByRole("complementary", { name: /Fiche repère quartier Maârif/i });
    const compactPanel = page.locator("[data-akarfinder-mobile-compact-panel]");
    const panel = viewport.width <= 767 ? compactPanel : fullPanel;
    await panel.waitFor({ state: "visible", timeout: 20000 });

    const metric = viewport.width <= 767
      ? page.locator("[data-akarfinder-lot9-compact-metric]")
      : page.locator("[data-akarfinder-lot9-panel-metric]");
    await metric.waitFor({ state: "visible", timeout: 10000 });
    const metricText = (await metric.textContent())?.trim() ?? "";
    if (!metricText || /Données 2024-2025/.test(metricText)) {
      throw new Error(`${viewport.name}: selected district still exposes static benchmark instead of Lot 9 metric`);
    }

    const panelBox = await panel.boundingBox();
    if (!panelBox) throw new Error(`${viewport.name}: selected district panel has no bounding box`);
    if (panelBox.x < -1 || panelBox.x + panelBox.width > viewport.width + 1 || panelBox.y < -1 || panelBox.y + panelBox.height > viewport.height + 1) {
      throw new Error(`${viewport.name}: selected district panel escapes viewport ${JSON.stringify(panelBox)}`);
    }
    if (viewport.width <= 767 && panelBox.height > 230) {
      throw new Error(`${viewport.name}: compact district preview too tall ${JSON.stringify(panelBox)}`);
    }

    const searchLink = viewport.width <= 767
      ? panel.getByRole("link", { name: /Rechercher ici/i })
      : panel.getByRole("link", { name: /Rechercher dans ce quartier/i });
    const searchHref = await searchLink.getAttribute("href");
    const searchUrl = new URL(searchHref || "", baseUrl);
    if (searchUrl.pathname !== "/search" || searchUrl.searchParams.get("city") !== "Casablanca" || searchUrl.searchParams.get("district") !== "Maârif") {
      throw new Error(`${viewport.name}: Search handoff mismatch ${searchHref}`);
    }

    await page.screenshot({
      path: `${outDir}/casablanca-maarif-listings-${viewport.width}x${viewport.height}.png`,
      fullPage: false,
    });

    if (pageErrors.length) throw new Error(`${viewport.name}: browser page errors ${JSON.stringify(pageErrors)}`);

    report.cases.push({
      viewport: viewport.name,
      highZoomTileCount,
      tileResponses: tileResponses.slice(-20),
      priceAvailable: pricePayload.legend.availableCount,
      densityAvailable: densityPayload.legend.availableCount,
      listingsAvailable: listingsPayload.legend.availableCount,
      metricText,
      panelBox,
      searchHref,
    });
    await page.close();
  }

  report.ok = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack || error.message : String(error);
  throw error;
} finally {
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
