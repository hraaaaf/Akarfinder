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
    let highZoomTileCount = 0;
    page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
    page.on("requestfailed", (request) => diagnostics.requestFailures.push({ url: request.url(), error: request.failure()?.errorText || "unknown" }));
    page.on("response", (response) => {
      const zoom = basemapTileZoom(response.url());
      if (zoom === null) return;
      diagnostics.basemapTileResponses.push({ url: response.url(), status: response.status(), zoom });
      if (zoom >= 9 && response.ok()) highZoomTileCount += 1;
    });

    try {
      await page.goto(`${baseUrl}/map?city=casablanca&district=maarif&layer=explore`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.getByText("Chargement de la carte…", { exact: true }).waitFor({ state: "hidden", timeout: 30000 });
      await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 10000 });
      const preview = page.locator('[data-akarfinder-neighborhood-preview="maarif"]');
      await preview.waitFor({ state: "visible", timeout: 20000 });
      await page.waitForTimeout(500);

      const panelBox = await preview.boundingBox();
      if (!panelBox) throw new Error(`${viewport.name}: Maârif preview has no bounding box`);
      if (panelBox.x < -1 || panelBox.x + panelBox.width > viewport.width + 1 || panelBox.y < -1 || panelBox.y + panelBox.height > viewport.height + 1) {
        throw new Error(`${viewport.name}: Maârif preview escapes viewport ${JSON.stringify(panelBox)}`);
      }
      if (await preview.getByRole("heading", { name: "Maârif", exact: true }).count() !== 1) throw new Error(`${viewport.name}: Maârif heading missing`);
      const searchLink = preview.getByRole("link", { name: /Rechercher à Maârif/i });
      const searchHref = await searchLink.getAttribute("href");
      if (!searchHref) throw new Error(`${viewport.name}: Search handoff missing`);
      const searchUrl = new URL(searchHref, baseUrl);
      if (searchUrl.pathname !== "/search" || searchUrl.searchParams.get("city") !== "Casablanca" || searchUrl.searchParams.get("district") !== "Maârif") {
        throw new Error(`${viewport.name}: Search handoff mismatch ${searchHref}`);
      }
      if (diagnostics.pageErrors.length) throw new Error(`${viewport.name}: browser page errors ${JSON.stringify(diagnostics.pageErrors)}`);
      await page.screenshot({ path: `${outDir}/casablanca-maarif-${viewport.width}x${viewport.height}.png`, fullPage: false });
      report.cases.push({ viewport: viewport.name, searchHref, panelBox, mapRendered: true, highZoomTileCount, diagnostics });
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
