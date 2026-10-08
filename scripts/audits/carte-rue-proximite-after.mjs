import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3210";
const outDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/carte-rue-proximite-after";
const sourceHead = process.env.GITHUB_SHA ?? "unknown";

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

async function landmarkBox(page) {
  const label = page.locator('.maplibre-spike-target-landmark-label').filter({ hasText: "Twin Center" }).first();
  await label.waitFor({ state: "visible", timeout: 20000 });
  const box = await label.boundingBox();
  if (!box) throw new Error("Twin Center landmark label has no bounding box");
  return box;
}

async function recenterTwinCenter(page, viewport) {
  const canvas = page.locator("canvas.maplibregl-canvas");
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error(`${viewport.name}: canvas missing`);

  // A flat map starts focused on the neighborhood, so Twin Center can legitimately
  // be outside the initial mobile viewport. Zoom out through real wheel gestures
  // until its sourced landmark label enters the screen; do not invent a location
  // or force a MapLibre internal camera state.
  const twin = page.locator('.maplibre-spike-target-landmark-label').filter({ hasText: "Twin Center" }).first();
  const inViewport = async () => {
    if (!(await twin.count())) return false;
    const box = await twin.boundingBox();
    if (!box) return false;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    return cx > 22 && cx < viewport.width - 22 && cy > 130 && cy < Math.min(viewport.height - 125, canvasBox.height - 95);
  };
  const zoomOutPoint = {
    x: canvasBox.x + canvasBox.width * 0.5,
    y: canvasBox.y + canvasBox.height * 0.43,
  };
  for (let step = 0; step < 8 && !(await inViewport()); step += 1) {
    await page.mouse.move(zoomOutPoint.x, zoomOutPoint.y);
    await page.mouse.wheel(0, 520);
    await page.waitForTimeout(350);
  }
  if (!(await inViewport())) throw new Error(`${viewport.name}: Twin Center not reachable after real zoom-out gestures`);

  const desired = {
    x: canvasBox.x + canvasBox.width * 0.50,
    y: canvasBox.y + canvasBox.height * (viewport.width <= 1023 ? 0.36 : 0.46),
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const label = await landmarkBox(page);
    const current = { x: label.x + label.width / 2, y: label.y + label.height / 2 };
    const dx = desired.x - current.x;
    const dy = desired.y - current.y;
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) break;

    const start = {
      x: canvasBox.x + canvasBox.width * 0.34,
      y: canvasBox.y + canvasBox.height * 0.34,
    };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + dx, start.y + dy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(450);
  }

  // Use native canvas wheel zoom for the BEFORE baseline. This avoids depending
  // on viewport-specific control visibility while preserving the real product renderer.
  await page.mouse.move(desired.x, desired.y);
  await page.mouse.wheel(0, -620);
  await page.waitForTimeout(350);
  await page.mouse.wheel(0, -620);
  await page.waitForTimeout(350);
  await page.mouse.wheel(0, -420);
  await page.waitForTimeout(700);

  // One final small correction after zooming.
  const finalLabel = await landmarkBox(page);
  const current = { x: finalLabel.x + finalLabel.width / 2, y: finalLabel.y + finalLabel.height / 2 };
  const dx = desired.x - current.x;
  const dy = desired.y - current.y;
  if (Math.abs(dx) >= 8 || Math.abs(dy) >= 8) {
    const start = {
      x: canvasBox.x + canvasBox.width * 0.32,
      y: canvasBox.y + canvasBox.height * 0.30,
    };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + dx, start.y + dy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  // Wheel gestures may stop at quartier zoom depending on viewport / device scaling.
  // Continue interacting with the real map until its observed street zoom tier is reached.
  const shell = page.locator('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
  for (let step = 0; step < 6; step += 1) {
    if ((await shell.getAttribute("data-maplibre-zoom-tier")) === "street") break;
    await page.mouse.move(desired.x, desired.y);
    await page.mouse.wheel(0, -360);
    await page.waitForTimeout(350);
  }
  const observedTier = await shell.getAttribute("data-maplibre-zoom-tier");
  if (observedTier !== "street") {
    throw new Error(`${viewport.name}: real wheel zoom could not reach street tier (observed ${observedTier})`);
  }

  return {
    canvasBox,
    desired,
    twinCenterBox: await landmarkBox(page),
    observedTier,
  };
}

await mkdir(outDir, { recursive: true });
const report = {
  ok: false,
  phase: "AFTER",
  pilot: "Twin Center — Boulevard Mohamed Zerktouni × Boulevard Al Massira Al Khadra",
  sourceHead,
  generatedAt: new Date().toISOString(),
  cases: [],
};

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const pageErrors = [];
    let highZoomTileCount = 0;
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("response", (response) => {
      const zoom = basemapTileZoom(response.url());
      if (zoom !== null && zoom >= 14 && response.ok()) highZoomTileCount += 1;
    });

    try {
      await page.goto(`${baseUrl}/map?city=casablanca&district=maarif&layer=explore`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      const maplibre = page.locator('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
      await maplibre.waitFor({ state: "visible", timeout: 20000 });
      await page.waitForFunction(() => {
        const shell = document.querySelector('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
        return shell?.getAttribute("data-maplibre-render-state") === "ready"
          && shell?.getAttribute("data-maplibre-camera-mode") === "north-up-flat";
      }, null, { timeout: 30000 });

      const camera = await recenterTwinCenter(page, viewport);
      await page.waitForTimeout(900);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`${viewport.name}: horizontal overflow ${overflow}`);
      if (pageErrors.length) throw new Error(`${viewport.name}: page errors ${JSON.stringify(pageErrors)}`);

      const attrs = await maplibre.evaluate((el) => ({
        basemap: el.getAttribute("data-maplibre-basemap-language"),
        buildings: el.getAttribute("data-maplibre-building-language"),
        polish: el.getAttribute("data-maplibre-polish"),
        streetLanguage: el.getAttribute("data-maplibre-street-language"),
        labelPolicy: el.getAttribute("data-maplibre-label-policy"),
        boundarySemantic: el.getAttribute("data-maplibre-boundary-semantic"),
        buildingCount: Number(el.getAttribute("data-maplibre-building-count") ?? 0),
        buildingFootprints: Number(el.getAttribute("data-maplibre-building-footprint-count") ?? 0),
        zoomTier: el.getAttribute("data-maplibre-zoom-tier"),
      }));
      if (attrs.polish !== "flat-basemap-v02") throw new Error(`${viewport.name}: V0.2 flat polish mismatch ${attrs.polish}`);
      if (attrs.streetLanguage !== "architectural-paper-v2") throw new Error(`${viewport.name}: Rue street-language mismatch ${attrs.streetLanguage}`);
      if (attrs.buildingCount !== 0) throw new Error(`${viewport.name}: 3D volumes unexpectedly rendered`);
      if (attrs.buildingFootprints <= 0) throw new Error(`${viewport.name}: missing real 2D building footprints at street zoom`);
      if (attrs.zoomTier !== "street") throw new Error(`${viewport.name}: expected street detail zoom tier, observed ${attrs.zoomTier}`);

      await page.screenshot({
        path: `${outDir}/twin-center-after-${viewport.width}x${viewport.height}.png`,
        fullPage: false,
      });

      report.cases.push({
        viewport: viewport.name,
        ...camera,
        overflow,
        highZoomTileCount,
        attrs,
      });
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
