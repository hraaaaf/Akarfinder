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
      if ((await boundaryBadge.textContent())?.trim() !== "Arrondissement · contour OSM") {
        throw new Error(`${viewport.name}: visible administrative-contour badge mismatch`);
      }
      await highZoomTilesReady;
      let buildingFootprintObservationTimedOut = false;
      try {
        await page.waitForFunction(() => {
          const shell = document.querySelector('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
          return Number(shell?.getAttribute("data-maplibre-building-footprint-count") ?? 0) > 0;
        }, null, { timeout: 10000 });
      } catch {
        buildingFootprintObservationTimedOut = true;
        console.warn(`${viewport.name}: no rendered building footprints observed within 10s; keeping visual capture and reporting zero coverage instead of suppressing the evidence`);
      }
      // Flat target: no Overture extrusion dependency or volume gate.
      const cameraMode = await maplibre.getAttribute("data-maplibre-camera-mode");
      if (cameraMode !== "north-up-flat") throw new Error(`${viewport.name}: flat camera declaration missing (${cameraMode})`);
      if (await page.locator(".maplibre-spike-mode").count()) {
        throw new Error(`${viewport.name}: obsolete 2D/3D control still visible`);
      }
      const overtureState = await maplibre.getAttribute("data-maplibre-overture-state");
      const overtureTotalCount = Number(await maplibre.getAttribute("data-maplibre-overture-total-count") ?? 0);
      const overtureExactCount = Number(await maplibre.getAttribute("data-maplibre-overture-exact-count") ?? 0);
      const overtureEstimatedCount = Number(await maplibre.getAttribute("data-maplibre-overture-estimated-count") ?? 0);
      const overtureRelease = await maplibre.getAttribute("data-maplibre-overture-release");
      const shadowPolicy = await maplibre.getAttribute("data-maplibre-shadow-policy");
      const contextFocus = await maplibre.getAttribute("data-maplibre-context-focus");
      const quarterStyle = await maplibre.getAttribute("data-maplibre-quarter-style");
      const basemapLanguage = await maplibre.getAttribute("data-maplibre-basemap-language");
      const buildingLanguage = await maplibre.getAttribute("data-maplibre-building-language");
      const polish = await maplibre.getAttribute("data-maplibre-polish");
      const boundaryRender = await maplibre.getAttribute("data-maplibre-boundary-render");
      const contextRelief = await maplibre.getAttribute("data-maplibre-context-relief");
      const labelPolicy = await maplibre.getAttribute("data-maplibre-label-policy");
      const contextLabelPolicy = await maplibre.getAttribute("data-maplibre-context-label-policy");
      if (quarterStyle !== "flat-living-v02") {
        throw new Error(`${viewport.name}: flat quarter style contract missing (${quarterStyle})`);
      }
      if (basemapLanguage !== "voyager-inspired-openfreemap-v1") {
        throw new Error(`${viewport.name}: Voyager-inspired basemap language missing (${basemapLanguage})`);
      }
      if (buildingLanguage !== "flat-vector-footprints-v02") {
        throw new Error(`${viewport.name}: flat building language missing (${buildingLanguage})`);
      }
      if (polish !== "flat-basemap-v02") {
        throw new Error(`${viewport.name}: flat polish missing (${polish})`);
      }
      if (boundaryRender !== "administrative-dashed-flat") {
        throw new Error(`${viewport.name}: administrative dashed boundary contract missing (${boundaryRender})`);
      }
      if (contextRelief !== "flat-indicative-zone") {
        throw new Error(`${viewport.name}: flat indicative-zone contract missing (${contextRelief})`);
      }
      if (labelPolicy !== "akarfinder-owned") {
        throw new Error(`${viewport.name}: Maârif label ownership contract missing (${labelPolicy})`);
      }
      if (contextLabelPolicy !== "suppressed-at-quarter-zoom") {
        throw new Error(`${viewport.name}: quarter context-label suppression contract missing (${contextLabelPolicy})`);
      }
      if (shadowPolicy !== "flat-vector-footprints") {
        throw new Error(`${viewport.name}: flat vector footprint policy missing (${shadowPolicy})`);
      }
      if (contextFocus !== "verified-anchor-envelope-not-boundary") {
        throw new Error(`${viewport.name}: Maârif context focus semantic missing (${contextFocus})`);
      }
      if (overtureState !== "idle") throw new Error(`${viewport.name}: 3D bundle activated unexpectedly (${overtureState})`);

      const renderedBuildingVolumes = Number(await maplibre.getAttribute("data-maplibre-building-count") ?? 0);
      const renderedBuildingFootprints = Number(await maplibre.getAttribute("data-maplibre-building-footprint-count") ?? 0);
      if (renderedBuildingVolumes !== 0) throw new Error(`${viewport.name}: non-flat 3D volume instrumentation (${renderedBuildingVolumes})`);
      if (renderedBuildingFootprints <= 0) throw new Error(`${viewport.name}: no actual rendered 2D building footprints`);
      const renderedHeightCoveragePct = null;

      const rail = page.locator("[data-p4-map-decision-rail]");
      await rail.waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(500);

      const panelBox = await rail.boundingBox();
      if (!panelBox) throw new Error(`${viewport.name}: Vivre Ici rail has no bounding box`);
      const layoutDiagnostics = await page.evaluate(() => {
        const layout = document.querySelector("[data-p4-map-layout]");
        const railElement = document.querySelector("[data-p4-map-decision-rail]");
        const mapCanvasElement = document.querySelector("[data-p4-map-canvas]");
        const maplibreElement = document.querySelector("[data-maplibre-spike]");
        const maplibreStyle = maplibreElement ? getComputedStyle(maplibreElement) : null;
        const layoutStyle = layout ? getComputedStyle(layout) : null;
        const railStyle = railElement ? getComputedStyle(railElement) : null;
        const rect = (element) => element ? (() => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; })() : null;
        return {
          innerHeight: window.innerHeight,
          visualViewportHeight: window.visualViewport?.height ?? null,
          maplibrePresent: Boolean(maplibreElement),
          layoutRect: rect(layout),
          mapCanvasRect: rect(mapCanvasElement),
          maplibreRect: rect(maplibreElement),
          maplibreComputed: maplibreStyle ? { height: maplibreStyle.height, minHeight: maplibreStyle.minHeight, maxHeight: maplibreStyle.maxHeight, display: maplibreStyle.display } : null,
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
      if (
        viewport.width <= 1023
        && layoutDiagnostics.mapCanvasRect
        && layoutDiagnostics.maplibreRect
        && Math.abs(layoutDiagnostics.mapCanvasRect.height - layoutDiagnostics.maplibreRect.height) > 2
      ) {
        throw new Error(`${viewport.name}: MapLibre shell height diverges from responsive canvas ${JSON.stringify(layoutDiagnostics)}`);
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

      let sheetInteraction = null;
      if (viewport.width <= 1023) {
        const sheetToggle = rail.getByRole("button", { name: "Développer la fiche Maârif" });
        await sheetToggle.waitFor({ state: "visible", timeout: 5000 });
        if ((await sheetToggle.getAttribute("aria-expanded")) !== "false") {
          throw new Error(`${viewport.name}: floating sheet must start collapsed`);
        }
        const collapsedBox = await rail.boundingBox();
        if (!collapsedBox) throw new Error(`${viewport.name}: collapsed sheet box missing`);
        await sheetToggle.click();
        await page.waitForFunction(
          () => document.querySelector("[data-maarif-target-rail]")?.getAttribute("data-sheet-expanded") === "true",
          null,
          { timeout: 5000 },
        );
        await page.waitForTimeout(350);
        const expandedBox = await rail.boundingBox();
        if (!expandedBox) throw new Error(`${viewport.name}: expanded sheet box missing`);
        const sheetExpandedEnough = expandedBox.height >= collapsedBox.height + 80;
        const sheetExpandedInsideViewport = expandedBox.y >= -1 && expandedBox.y + expandedBox.height <= viewport.height + 1;
        if (!sheetExpandedEnough) {
          console.warn(`${viewport.name}: floating sheet did not expand enough ${JSON.stringify({ collapsedBox, expandedBox })}; preserving capture as visual defect evidence`);
        }
        if (!sheetExpandedInsideViewport) {
          console.warn(`${viewport.name}: expanded floating sheet escapes viewport ${JSON.stringify(expandedBox)}; preserving capture as visual defect evidence`);
        }
        await page.screenshot({ path: `${outDir}/casablanca-maarif-expanded-${viewport.width}x${viewport.height}.png`, fullPage: false });
        const reduceToggle = rail.getByRole("button", { name: "Réduire la fiche Maârif" });
        await reduceToggle.click();
        await page.waitForFunction(
          () => document.querySelector("[data-maarif-target-rail]")?.getAttribute("data-sheet-expanded") === "false",
          null,
          { timeout: 5000 },
        );
        sheetInteraction = {
          collapsedHeight: collapsedBox.height,
          expandedHeight: expandedBox.height,
          deltaHeight: expandedBox.height - collapsedBox.height,
          expandedEnough: sheetExpandedEnough,
          insideViewport: sheetExpandedInsideViewport,
        };
      }

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

      if (viewport.width <= 1023) {
        const collapsedToggle = rail.getByRole("button", { name: "Développer la fiche Maârif" });
        if (await collapsedToggle.count()) {
          await collapsedToggle.click();
          await page.waitForFunction(
            () => document.querySelector("[data-maarif-target-rail]")?.getAttribute("data-sheet-expanded") === "true",
            null,
            { timeout: 5000 },
          );
          await page.waitForTimeout(250);
        }
      }
      const localTab = rail.getByRole("button", { name: "Vie locale", exact: true });
      await localTab.waitFor({ state: "visible", timeout: 5000 });
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
        cameraMode,
        boundaryBadge: "Arrondissement · contour OSM",
        renderedBuildingVolumes,
        renderedBuildingFootprints,
        renderedHeightCoveragePct,
        overtureState,
        overtureTotalCount,
        overtureExactCount,
        overtureEstimatedCount,
        overtureRelease,
        shadowPolicy,
        contextFocus,
        quarterStyle,
        basemapLanguage,
        buildingLanguage,
        polish,
        boundaryRender,
        contextRelief,
        labelPolicy,
        contextLabelPolicy,
        buildingFootprintObservationTimedOut,
        renderedHeightCoverageNote: "not applicable to flat 2D map; true rendered vector building footprints counted",
        sheetInteraction,
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
