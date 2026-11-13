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
      const searchLink = rail.getByRole("link", { name: /Rechercher des biens à Maârif/i });
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

      // J18-V1: exercise the actual V1 interaction contract on the same build and viewport.
      // Browser/ARIA assertions are not a real NVDA or VoiceOver certification.
      const shell = page.locator('[data-l3-maarif-pilot="true"][data-maplibre-spike]');
      const modes = page.locator('[data-l3-map-modes]');
      const quarter = modes.locator('[data-l3-go-quarter]');
      const street = modes.locator('[data-l3-go-street]');
      const limits = modes.locator('[data-l3-go-admin]');
      if (await page.locator("main").count() !== 1) throw new Error(`${viewport.name}: expected exactly one main landmark`);
      if (await rail.getByRole("heading", { name: "Maârif", level: 1, exact: true }).count() !== 1) {
        throw new Error(`${viewport.name}: one visible Maârif H1 required`);
      }
      if (await modes.count() !== 1 || await modes.locator("button").count() !== 3) {
        throw new Error(`${viewport.name}: V1 must expose exactly three map modes`);
      }
      const targetSizes = {};
      for (const [name, button] of [["quartier", quarter], ["rue", street], ["limites", limits]]) {
        const box = await button.boundingBox();
        if (!box || box.width < 44 || box.height < 44) {
          throw new Error(`${viewport.name}: ${name} touch target below 44px ${JSON.stringify(box)}`);
        }
        targetSizes[name] = { width: box.width, height: box.height };
      }
      if (await shell.getAttribute("data-l3-maarif-view") !== "quartier" ||
          await quarter.getAttribute("aria-pressed") !== "true") {
        throw new Error(`${viewport.name}: initial Quartier mode missing`);
      }

      // In normal public mode, an empty or unverified context must not display fake POI filters.
      const privateQa = await shell.getAttribute("data-j11c-qa-enabled") === "true";
      const publicAnchors = Number(await shell.getAttribute("data-maplibre-anchor-count"));
      if (viewport.width >= 1024 && !privateQa && publicAnchors === 0) {
        await page.waitForFunction(() =>
          document.querySelector('[data-p4-map-decision-rail]')?.getAttribute("data-vivre-ici-empty-context") === "true",
        null, { timeout: 10000 });
        const disclosure = rail.locator('[data-vivre-ici-source-details]');
        if (await disclosure.count() !== 1) throw new Error(`${viewport.name}: collapsed provenance details missing`);
        const detailsOpen = await disclosure.evaluate((node) => node.open);
        if (detailsOpen) throw new Error(`${viewport.name}: zero-source details should be collapsed by default`);
        const summary = disclosure.locator("summary");
        const summaryBox = await summary.boundingBox();
        const summaryFont = await summary.evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
        const introFont = await rail.locator(".p4-premium-empty-evidence").evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
        if (!summaryBox || summaryBox.height < 44 || summaryFont < 12 || introFont < 12) {
          throw new Error(`${viewport.name}: source disclosure / empty text illegible ${JSON.stringify({summaryBox,summaryFont,introFont})}`);
        }
        await summary.focus();
        await summary.press("Enter");
        await page.waitForFunction(() => document.querySelector('[data-vivre-ici-source-details]')?.open === true);
        if (!await disclosure.getByText(/Les prix de quartier ne sont pas publiés/).isVisible()) {
          throw new Error(`${viewport.name}: source disclaimer hidden after opening disclosure`);
        }
        await summary.press("Enter");
        await page.waitForFunction(() => document.querySelector('[data-vivre-ici-source-details]')?.open === false);
        // Overwrite the initial capture only after the empty public context is resolved.
        await page.screenshot({ path: `${outDir}/casablanca-maarif-${viewport.width}x${viewport.height}.png`, fullPage: false, animations: "disabled" });
      }
      const filters = shell.locator(".maplibre-spike-filters");
      if (!privateQa && publicAnchors === 0 && await filters.count() !== 0) {
        throw new Error(`${viewport.name}: empty public POI filter remains visible`);
      }
      if ((privateQa || publicAnchors > 0) && await filters.count() !== 1) {
        throw new Error(`${viewport.name}: sourced/QA POI filter disappeared`);
      }

      await street.focus();
      if (!await street.evaluate((element) => element === document.activeElement)) {
        throw new Error(`${viewport.name}: street mode cannot receive keyboard focus`);
      }
      await street.press("Enter");
      await page.waitForFunction(() => document.querySelector('[data-l3-maarif-pilot="true"]')?.getAttribute("data-l3-maarif-view") === "rue");
      if (await street.getAttribute("aria-pressed") !== "true") {
        throw new Error(`${viewport.name}: street aria-pressed did not update`);
      }
      // The React mode updates before MapLibre's 450ms easeTo animation finishes.
      // The observed camera is only written on map idle with rendered basemap features.
      await page.waitForFunction(() => {
        const root = document.querySelector('[data-l3-maarif-pilot="true"]');
        return root?.getAttribute("data-l3-maarif-view") === "rue"
          && Number(root.getAttribute("data-l3-camera-zoom")) >= 16.95;
      }, null, { timeout: 30000 });
      const rueZoom = Number(await shell.getAttribute("data-l3-camera-zoom"));
      if (rueZoom < 16.95 || rueZoom > 17.4) {
        throw new Error(`${viewport.name}: camera Rue zoom not settled: ${rueZoom}`);
      }
      await page.screenshot({ path: `${outDir}/casablanca-maarif-rue-${viewport.width}x${viewport.height}.png`, fullPage: false, animations: "disabled" });

      await limits.click();
      const unavailable = page.locator('[data-l3-admin-unavailable="true"]');
      await unavailable.waitFor({ state: "visible", timeout: 10000 });
      if (await limits.getAttribute("aria-pressed") !== "true" ||
          await limits.getAttribute("aria-expanded") !== "true" ||
          await limits.getAttribute("aria-controls") !== "maarif-admin-boundary-explanation" ||
          !await unavailable.getByText("Limites non disponibles", { exact: true }).isVisible()) {
        throw new Error(`${viewport.name}: honest Limites panel / ARIA contract failed`);
      }
      if (await page.locator('[data-l3-admin-preview="true"]').count() !== 0) {
        throw new Error(`${viewport.name}: unreviewed administrative outline exposed`);
      }
      await page.screenshot({ path: `${outDir}/casablanca-maarif-limites-${viewport.width}x${viewport.height}.png`, fullPage: false, animations: "disabled" });
      await unavailable.locator('[data-l3-admin-return]').click();
      await page.waitForFunction(() => document.querySelector('[data-l3-maarif-pilot="true"]')?.getAttribute("data-l3-maarif-view") === "quartier");
      if (await limits.getAttribute("aria-controls") !== null ||
          await limits.getAttribute("aria-expanded") !== "false" ||
          await quarter.getAttribute("aria-pressed") !== "true") {
        throw new Error(`${viewport.name}: closing Limites left stale ARIA state`);
      }
      const afterOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (afterOverflow > 1 || diagnostics.pageErrors.length) {
        throw new Error(`${viewport.name}: V1 mode regression ${JSON.stringify({ afterOverflow, pageErrors: diagnostics.pageErrors })}`);
      }
      const v1 = {
        streetZoom: rueZoom,
        desktopEmptyDisclosure: viewport.width >= 1024 && !privateQa && publicAnchors === 0,
        modes: ["quartier", "rue", "limites", "quartier"], keyboardStreet: true,
        touchTargets: targetSizes, publicAnchors, privateQa, emptyFiltersHidden: !privateQa && publicAnchors === 0,
        honestBoundary: true, ariaExpandedReset: true, afterOverflow, pageErrors: diagnostics.pageErrors.length
      };
      report.cases.push({ viewport: viewport.name, searchHref, panelBox, layoutDiagnostics, overflow, mapRendered: true, highZoomTileCount, diagnostics, v1 });
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
