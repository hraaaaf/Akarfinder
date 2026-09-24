import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3205";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-lot8-casablanca-after";
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

const report = { ok: false, cases: [], generatedAt: new Date().toISOString() };
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const diagnostics = { pageErrors: [], requestFailures: [], basemapTileResponses: [] };
    let resolveHighZoomTiles;
    let rejectHighZoomTiles;
    let highZoomTileCount = 0;
    let highZoomTileGateSettled = false;
    const highZoomTilesReady = new Promise((resolve, reject) => {
      resolveHighZoomTiles = resolve;
      rejectHighZoomTiles = reject;
    });
    const tileGateTimeout = setTimeout(() => {
      if (highZoomTileGateSettled) return;
      highZoomTileGateSettled = true;
      rejectHighZoomTiles(new Error(`${viewport.name}: no real high-zoom basemap tiles rendered within 20s`));
    }, 20000);

    page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
    page.on("requestfailed", (request) => diagnostics.requestFailures.push({ url: request.url(), error: request.failure()?.errorText || "unknown" }));
    page.on("response", (response) => {
      const zoom = basemapTileZoom(response.url());
      if (zoom === null) return;
      diagnostics.basemapTileResponses.push({ url: response.url(), status: response.status(), zoom });
      if (zoom >= 9 && response.ok()) {
        highZoomTileCount += 1;
        if (highZoomTileCount >= 2 && !highZoomTileGateSettled) {
          highZoomTileGateSettled = true;
          clearTimeout(tileGateTimeout);
          resolveHighZoomTiles();
        }
      }
    });

    try {
      await page.goto(`${baseUrl}/map?city=casablanca&district=maarif&layer=explore`, { waitUntil: "domcontentloaded", timeout: 30000 });
      const maplibre = page.locator('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
      await maplibre.waitFor({ state: "visible", timeout: 20000 });
      await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 10000 });
      await page.waitForFunction(() => {
        const shell = document.querySelector('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
        return shell?.getAttribute("data-maplibre-render-state") === "ready";
      }, null, { timeout: 20000 });
      const rtlStatus = await maplibre.getAttribute("data-maplibre-rtl-status");
      if (rtlStatus !== "loaded") throw new Error(`${viewport.name}: MapLibre RTL shaping not loaded (${rtlStatus})`);
      const boundarySemantic = await maplibre.getAttribute("data-maplibre-boundary-semantic");
      if (boundarySemantic !== "administrative-arrondissement") throw new Error(`${viewport.name}: Maârif boundary semantic mismatch (${boundarySemantic})`);
      const boundaryDisclosure = await page.locator(".maplibre-spike-map-note-copy").textContent();
      if (!boundaryDisclosure?.includes("Arrondissement Maârif")) throw new Error(`${viewport.name}: arrondissement disclosure missing`);
      const boundaryBadge = page.locator(".maplibre-spike-boundary-badge");
      await boundaryBadge.waitFor({ state: "visible", timeout: 5000 });
      if ((await boundaryBadge.textContent())?.trim() !== "Contour administratif") {
        throw new Error(`${viewport.name}: visible administrative contour badge mismatch`);
      }
      await highZoomTilesReady;

      const rail = page.locator("[data-p4-map-decision-rail]");
      await rail.waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(500);

      const panelBox = await rail.boundingBox();
      if (!panelBox) throw new Error(`${viewport.name}: Vivre Ici rail has no bounding box`);
      const layoutDiagnostics = await page.evaluate(() => {
        const layout = document.querySelector("[data-p4-map-layout]");
        const railElement = document.querySelector("[data-p4-map-decision-rail]");
        const maplibreElement = document.querySelector("[data-maplibre-spike]");
        const layoutStyle = layout ? getComputedStyle(layout) : null;
        const railStyle = railElement ? getComputedStyle(railElement) : null;
        const rect = (element) => element ? (() => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; })() : null;
        return {
          innerHeight: window.innerHeight,
          visualViewportHeight: window.visualViewport?.height ?? null,
          maplibrePresent: Boolean(maplibreElement),
          layoutRect: rect(layout),
          railRect: rect(railElement),
          layout: layoutStyle ? {
            display: layoutStyle.display,
            height: layoutStyle.height,
            minHeight: layoutStyle.minHeight,
            maxHeight: layoutStyle.maxHeight,
            gridTemplateColumns: layoutStyle.gridTemplateColumns,
            gridTemplateRows: layoutStyle.gridTemplateRows,
            overflow: layoutStyle.overflow,
          } : null,
          rail: railStyle ? {
            position: railStyle.position,
            height: railStyle.height,
            minHeight: railStyle.minHeight,
            maxHeight: railStyle.maxHeight,
            overflowY: railStyle.overflowY,
            boxSizing: railStyle.boxSizing,
            gridColumn: railStyle.gridColumn,
          } : null,
          railClientHeight: railElement?.clientHeight ?? null,
          railScrollHeight: railElement?.scrollHeight ?? null,
        };
      });
      console.log(`${viewport.name}: layout diagnostics ${JSON.stringify(layoutDiagnostics)}`);
      if (panelBox.x < -1 || panelBox.x + panelBox.width > viewport.width + 1 || panelBox.y < -1 || panelBox.y + panelBox.height > viewport.height + 1) {
        throw new Error(`${viewport.name}: Vivre Ici rail escapes viewport ${JSON.stringify({ panelBox, layoutDiagnostics })}`);
      }
      if (await rail.getByRole("heading", { name: "Maârif", exact: true }).count() !== 1) throw new Error(`${viewport.name}: Maârif heading missing`);
      const searchLink = rail.getByRole("link", { name: /Voir les biens disponibles à Maârif/i });
      const searchHref = await searchLink.getAttribute("href");
      if (!searchHref) throw new Error(`${viewport.name}: Search handoff missing`);
      const searchUrl = new URL(searchHref, baseUrl);
      if (searchUrl.pathname !== "/search" || searchUrl.searchParams.get("city") !== "Casablanca" || searchUrl.searchParams.get("district") !== "Maârif") {
        throw new Error(`${viewport.name}: Search handoff mismatch ${searchHref}`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`${viewport.name}: horizontal overflow ${overflow}`);
      if (diagnostics.pageErrors.length) throw new Error(`${viewport.name}: browser page errors ${JSON.stringify(diagnostics.pageErrors)}`);
      await page.screenshot({ path: `${outDir}/casablanca-maarif-${viewport.width}x${viewport.height}.png`, fullPage: false });

      const contextResponse = await page.request.get(`${baseUrl}/api/geo/neighborhood-context?city=casablanca&district=maarif`);
      if (!contextResponse.ok()) throw new Error(`${viewport.name}: local context API returned ${contextResponse.status()}`);
      const contextBody = await contextResponse.json();
      const localContext = contextBody?.context;
      if (contextBody?.status !== "ok" || !localContext) throw new Error(`${viewport.name}: local context payload unavailable`);
      if (localContext.source?.mode !== "maarif-couche2-osm-refresh") throw new Error(`${viewport.name}: wrong local context source ${localContext.source?.mode}`);
      if (localContext.anchor_count !== 4) throw new Error(`${viewport.name}: expected 4 local anchors, got ${localContext.anchor_count}`);
      const expectedLocalNames = [
        "Université Mundiapolis",
        "Marché Central du Maârif",
        "Clinique Badr مصحة بدر",
        "Parc du Vélodrome",
      ];
      if (JSON.stringify(localContext.anchors.map((anchor) => anchor.name)) !== JSON.stringify(expectedLocalNames)) {
        throw new Error(`${viewport.name}: local anchor order/content mismatch ${JSON.stringify(localContext.anchors.map((anchor) => anchor.name))}`);
      }
      if (localContext.anchors.some((anchor) => anchor.territorial_wording === "Dans le quartier")) {
        throw new Error(`${viewport.name}: false inside-neighborhood wording detected`);
      }

      const localTab = rail.getByRole("button", { name: "Vie locale", exact: true });
      await localTab.click();
      await page.waitForFunction(() => document.querySelector("[data-p4-map-decision-rail]")?.getAttribute("data-vivre-ici-tab") === "local");
      const localGuide = rail.locator("[data-couche2-local-guide]");
      await localGuide.waitFor({ state: "visible", timeout: 5000 });
      const renderedLocalNames = await localGuide.locator(".p4-premium-local-guide-list article > strong").allTextContents();
      if (JSON.stringify(renderedLocalNames.map((value) => value.trim())) !== JSON.stringify(expectedLocalNames)) {
        throw new Error(`${viewport.name}: rendered local anchors mismatch ${JSON.stringify(renderedLocalNames)}`);
      }
      const renderedWordings = await localGuide.locator(".p4-premium-local-guide-list article > small").allTextContents();
      if (renderedWordings.length !== 4 || renderedWordings.some((value) => value.trim() !== "Autour du repère quartier")) {
        throw new Error(`${viewport.name}: rendered local wording mismatch ${JSON.stringify(renderedWordings)}`);
      }
      const localPanelBox = await rail.boundingBox();
      if (!localPanelBox) throw new Error(`${viewport.name}: local-life rail has no bounding box`);
      if (localPanelBox.x < -1 || localPanelBox.x + localPanelBox.width > viewport.width + 1 || localPanelBox.y < -1 || localPanelBox.y + localPanelBox.height > viewport.height + 1) {
        throw new Error(`${viewport.name}: local-life rail escapes viewport ${JSON.stringify(localPanelBox)}`);
      }
      const localOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (localOverflow > 1) throw new Error(`${viewport.name}: local-life horizontal overflow ${localOverflow}`);
      await page.screenshot({ path: `${outDir}/casablanca-maarif-local-${viewport.width}x${viewport.height}.png`, fullPage: false });

      report.cases.push({
        viewport: viewport.name,
        searchHref,
        panelBox,
        localPanelBox,
        layoutDiagnostics,
        overflow,
        localOverflow,
        mapRendered: true,
        rtlStatus,
        boundarySemantic,
        boundaryDisclosure,
        boundaryBadge: "Contour administratif",
        localContextSource: localContext.source.mode,
        localAnchorCount: localContext.anchor_count,
        localAnchorNames: expectedLocalNames,
        localTerritorialWording: "Autour du repère quartier",
        highZoomTileCount,
        diagnostics,
      });
    } finally {
      clearTimeout(tileGateTimeout);
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
