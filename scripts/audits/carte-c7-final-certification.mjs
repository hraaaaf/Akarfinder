// Current C7 certification: active Rabat market UI, not retired C3 zone sheet.
// Four viewports with API interception only, no database fixture persistence.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3207";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-c7-final";
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
  const result = await page.evaluate(async ({ baseUrl, mode }) => {
    const response = await fetch(
      `${baseUrl}/api/geo/market-intelligence?city=rabat&mode=${mode}&transaction=sale`,
    );
    return { status: response.status, text: await response.text() };
  }, { baseUrl, mode });
  if (result.status !== 200) {
    throw new Error(`${mode}: market intelligence API returned ${result.status} ${result.text}`);
  }
  const payload = JSON.parse(result.text);
  if (payload.mode !== mode) throw new Error(`${mode}: API mode mismatch`);
  if (payload.city?.slug !== "rabat") throw new Error(`${mode}: API city mismatch`);
  if (!Array.isArray(payload.districts) || !payload.districts.some((row) => row.districtSlug === "agdal")) {
    throw new Error(`${mode}: Agdal district metric missing`);
  }
  if (mode === "density") {
    const agdal = payload.districts.find((row) => row.districtSlug === "agdal");
    if (agdal.areaBasis !== "rabat_osm_shadow") {
      throw new Error(`density: Agdal must declare rabat_osm_shadow area basis, got ${agdal.areaBasis}`);
    }
  }
  return payload;
}

async function waitForSettledLegend(page, mode) {
  await page.waitForFunction((expectedMode) => {
    const legend = document.querySelector(`[data-akarfinder-intelligence-legend="${expectedMode}"]`);
    if (!legend) return false;
    const text = legend.textContent || "";
    return !text.includes("Calcul des annonces observées") && !text.includes("temporairement indisponibles");
  }, mode, { timeout: 15000 });
}

const report = { ok: false, cases: [], generatedAt: new Date().toISOString() };
const browser = await chromium.launch({ headless: true });
const fixtureMode = process.env.MARKET_BROWSER_FIXTURE === "1";

function fixturePayload(mode) {
  const values = {
    price: { agdal: 15000, finance: null, souissi: null },
    density: { agdal: 0.16, finance: null, souissi: null },
    listings: { agdal: 2, finance: 0, souissi: 0 },
  }[mode];
  const districts = [
    {
      districtSlug: "agdal",
      displayName: "Agdal",
      mode,
      transaction: "sale",
      metricValue: values.agdal,
      metricUnit: mode === "price" ? "MAD/m²" : mode === "density" ? "annonces/km²" : "annonces",
      sampleCount: mode === "price" ? 2 : 2,
      reliability: mode === "price" ? "limited" : null,
      runtimeResolved: true,
      neutral: mode === "price" ? false : false,
      classIndex: 0,
      fillColor: "#22C55E",
      freshnessStatus: "unconfirmed",
      snapshotVersion: "ci-fixture-v1",
      areaKm2: 12.4,
      areaBasis: "rabat_osm_shadow",
      marketMetrics: {
        priceMedianMadM2: 15000,
        priceSampleCount: 2,
        priceReliability: "limited",
        listingCount: 2,
        listingDensityKm2: 0.16,
      },
    },
    {
      districtSlug: "hay-riad",
      displayName: "Rabat Finance City",
      mode,
      transaction: "sale",
      metricValue: values.finance,
      metricUnit: mode === "price" ? "MAD/m²" : mode === "density" ? "annonces/km²" : "annonces",
      sampleCount: 0,
      reliability: mode === "price" ? "insufficient" : null,
      runtimeResolved: true,
      neutral: true,
      classIndex: null,
      fillColor: "#E5E7EB",
      freshnessStatus: "unconfirmed",
      snapshotVersion: "ci-fixture-v1",
      areaKm2: null,
      areaBasis: null,
      marketMetrics: {
        priceMedianMadM2: null,
        priceSampleCount: 0,
        priceReliability: "insufficient",
        listingCount: 0,
        listingDensityKm2: null,
      },
    },
    {
      districtSlug: "souissi",
      displayName: "Souissi",
      mode,
      transaction: "sale",
      metricValue: values.souissi,
      metricUnit: mode === "price" ? "MAD/m²" : mode === "density" ? "annonces/km²" : "annonces",
      sampleCount: 0,
      reliability: mode === "price" ? "insufficient" : null,
      runtimeResolved: true,
      neutral: true,
      classIndex: null,
      fillColor: "#E5E7EB",
      freshnessStatus: "unconfirmed",
      snapshotVersion: "ci-fixture-v1",
      areaKm2: null,
      areaBasis: null,
      marketMetrics: {
        priceMedianMadM2: null,
        priceSampleCount: 0,
        priceReliability: "insufficient",
        listingCount: 0,
        listingDensityKm2: null,
      },
    },
  ];
  return {
    city: { slug: "rabat", displayName: "Rabat" },
    mode,
    transaction: "sale",
    observedMarketOnly: true,
    scaleMethod: "snapshot_quantiles_v1",
    legend: {
      availableCount: mode === "price" ? 1 : 3,
      classCount: 1,
      thresholds: [],
      min: values.agdal ?? 0,
      max: values.agdal ?? 0,
      colors: ["#22C55E"],
      neutralColor: "#E5E7EB",
    },
    districts,
  };
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    if (fixtureMode) {
      await page.route("**/api/geo/market-intelligence?**", async (route) => {
        const url = new URL(route.request().url());
        const mode = url.searchParams.get("mode") || "price";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(fixturePayload(mode)),
        });
      });
    }
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

    try {
      await page.goto(`${baseUrl}/map?city=rabat&layer=price`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.getByText("Chargement de la carte…", { exact: true }).waitFor({ state: "hidden", timeout: 30000 });
      await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 10000 });
      // Browser verifies MapLibre canvas, market modes, API and screenshots.
      // Preserve network tile responses for diagnosis, not as a cache-sensitive gate.
      await page.waitForFunction(() => document.querySelectorAll('[data-akarfinder-intelligence-mode]').length === 3, null, { timeout: 10000 });
      await page.waitForFunction(() => document.querySelector('[data-akarfinder-intelligence-legend="price"]'), null, { timeout: 10000 });
      await waitForSettledLegend(page, "price");

      const pricePayload = await requireApiMode(page, "price");
      const densityPayload = await requireApiMode(page, "density");
      const listingsPayload = await requireApiMode(page, "listings");
      const agdalListings = listingsPayload.districts.find((row) => row.districtSlug === "agdal");
      if (agdalListings?.metricValue == null) throw new Error("listings: Agdal must expose a factual listing count");
      const expectedListingsCount = Math.round(agdalListings.metricValue).toLocaleString("fr-FR");

      const toolbar = page.locator("[data-akarfinder-generic-premium-toolbar]");
      await toolbar.waitFor({ state: "visible", timeout: 10000 });
      const tabs = toolbar.locator("[data-akarfinder-intelligence-mode]");
      if (await tabs.count() !== 3) throw new Error(`${viewport.name}: expected exactly three market mode tabs`);

      await toolbar.locator('[data-akarfinder-intelligence-mode="density"]').click();
      await page.waitForURL(/layer=density/, { timeout: 10000 });
      await page.waitForFunction(() => document.querySelector('[data-akarfinder-intelligence-mode="density"][aria-selected="true"]'), null, { timeout: 10000 });
      await waitForSettledLegend(page, "density");

      await toolbar.locator('[data-akarfinder-intelligence-mode="listings"]').click();
      await page.waitForURL(/layer=listings/, { timeout: 10000 });
      await page.waitForFunction(() => document.querySelector('[data-akarfinder-intelligence-mode="listings"][aria-selected="true"]'), null, { timeout: 10000 });
      await waitForSettledLegend(page, "listings");

      await page.screenshot({
        path: `${outDir}/rabat-market-modes-${viewport.width}x${viewport.height}.png`,
        fullPage: false,
      });

      await page.goto(`${baseUrl}/map?city=rabat&district=agdal&layer=listings`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.getByText("Chargement de la carte…", { exact: true }).waitFor({ state: "hidden", timeout: 30000 });
      await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 10000 });

      const fullPanel = page.getByRole("complementary", { name: /Fiche repère quartier Agdal/i });
      const compactPanel = page.locator("[data-akarfinder-mobile-compact-panel]");
      const panel = viewport.width <= 767 ? compactPanel : fullPanel;
      await panel.waitFor({ state: "visible", timeout: 20000 });

      const metric = viewport.width <= 767
        ? page.locator("[data-akarfinder-lot9-compact-metric]")
        : page.locator("[data-akarfinder-lot9-panel-metric]");
      await metric.waitFor({ state: "visible", timeout: 10000 });
      await page.waitForFunction(({ mobile, expectedCount }) => {
        const selector = mobile ? "[data-akarfinder-lot9-compact-metric]" : "[data-akarfinder-lot9-panel-metric]";
        const text = document.querySelector(selector)?.textContent || "";
        return !text.includes("Calcul") && !text.includes("indisponible") && text.includes(expectedCount);
      }, { mobile: viewport.width <= 767, expectedCount: expectedListingsCount }, { timeout: 15000 });
      const metricText = (await metric.textContent())?.trim() ?? "";
      if (!metricText || /Données 2024-2025/.test(metricText) || /Calcul/.test(metricText)) {
        throw new Error(`${viewport.name}: selected district did not settle on the Lot 9 metric: ${metricText}`);
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
      if (searchUrl.pathname !== "/search" || searchUrl.searchParams.get("city") !== "Rabat" || searchUrl.searchParams.get("district") !== "Agdal") {
        throw new Error(`${viewport.name}: Search handoff mismatch ${searchHref}`);
      }

      await page.screenshot({
        path: `${outDir}/rabat-agdal-listings-${viewport.width}x${viewport.height}.png`,
        fullPage: false,
      });

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`${viewport.name}: horizontal overflow ${overflow}`);
      if (pageErrors.length) throw new Error(`${viewport.name}: browser page errors ${JSON.stringify(pageErrors)}`);

      report.cases.push({
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        highZoomTileCount,
        overflow,
        tileResponses: tileResponses.slice(-20),
        priceAvailable: pricePayload.legend.availableCount,
        densityAvailable: densityPayload.legend.availableCount,
        listingsAvailable: listingsPayload.legend.availableCount,
        metricText,
        panelBox,
        searchHref,
      });
    } catch (error) {
      await page.screenshot({ path: `${outDir}/failure-${viewport.name}.png`, fullPage: false }).catch(() => {});
      throw error;
    } finally {
      await page.close();
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
