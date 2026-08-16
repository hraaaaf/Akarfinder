import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3204";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-c4-rabat-heatmap";
await mkdir(outDir, { recursive: true });

const VALID_DISTRICTS = new Set(["agdal", "hay-riad", "souissi", "hassan"]);

function normalizeSlug(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function waitForIntelligence(page, mode, transaction = "sale") {
  const response = await page.waitForResponse((res) => {
    const url = new URL(res.url());
    return url.pathname === "/api/geo/rabat-market-intelligence" &&
      url.searchParams.get("mode") === mode &&
      url.searchParams.get("transaction") === transaction;
  }, { timeout: 30000 });
  if (response.status() !== 200) throw new Error(`C3 API ${mode}/${transaction} returned HTTP ${response.status()}`);
  return response.json();
}

async function findRenderedInteractivePoint(page, box, viewport) {
  const minY = viewport.name === "mobile" ? 245 : 175;
  const maxY = Math.max(minY + 1, box.height - 175);
  const minX = 42;
  const maxX = Math.max(minX + 1, box.width - 42);
  const step = viewport.name === "mobile" ? 22 : 34;
  const points = [];

  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      points.push({ x, y, distance: Math.hypot(x - box.width / 2, y - box.height / 2) });
    }
  }
  points.sort((a, b) => a.distance - b.distance);

  for (const point of points) {
    await page.mouse.move(box.x + point.x, box.y + point.y);
    const pointer = await page.locator(".maplibregl-canvas").evaluate((canvas) => canvas.style.cursor === "pointer");
    if (pointer) return point;
  }
  return null;
}

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];
const report = { ok: false, viewports: [], generatedAt: new Date().toISOString() };
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const diagnostics = { pageErrors: [], consoleErrors: [], requestFailures: [] };
    page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
    page.on("console", (msg) => { if (msg.type() === "error") diagnostics.consoleErrors.push(msg.text()); });
    page.on("requestfailed", (request) => {
      const url = request.url();
      if (url.includes("/api/geo/rabat-market-intelligence")) diagnostics.requestFailures.push({ url, error: request.failure()?.errorText || "unknown" });
    });

    const pricePromise = waitForIntelligence(page, "price");
    await page.goto(`${baseUrl}/map?city=rabat`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const pricePayload = await pricePromise;
    await page.locator("[data-akarfinder-market-intelligence-map]").waitFor({ state: "visible", timeout: 20000 });
    await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 20000 });
    await page.locator("[data-akarfinder-intelligence-legend]").waitFor({ state: "visible", timeout: 20000 });

    for (const tabName of ["Prix", "Densité", "Annonces"]) {
      const tab = page.getByRole("tab", { name: tabName });
      const fits = await tab.evaluate((element) => element.scrollWidth <= element.clientWidth + 1);
      if (!fits) throw new Error(`C4 ${viewport.name} tab overflow: ${tabName}`);
    }

    const densityPromise = waitForIntelligence(page, "density");
    await page.getByRole("tab", { name: "Densité" }).click();
    const densityPayload = await densityPromise;
    if (densityPayload.properties?.mode !== "density") throw new Error("Density payload mode mismatch");

    const listingsPromise = waitForIntelligence(page, "listings");
    await page.getByRole("tab", { name: "Annonces" }).click();
    const listingsPayload = await listingsPromise;
    if (listingsPayload.properties?.mode !== "listings") throw new Error("Listings payload mode mismatch");

    const canvas = page.locator(".maplibregl-canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("MapLibre canvas has no bounding box");
    const interactivePoint = await findRenderedInteractivePoint(page, box, viewport);
    if (!interactivePoint) throw new Error(`No rendered interactive market-zone polygon found for ${viewport.name}`);

    await page.mouse.click(box.x + interactivePoint.x, box.y + interactivePoint.y);
    await page.waitForURL((url) => url.searchParams.get("city") === "rabat" && VALID_DISTRICTS.has(url.searchParams.get("district") ?? ""), { timeout: 10000 });
    const currentUrl = new URL(page.url());
    const district = currentUrl.searchParams.get("district");
    if (!district || !VALID_DISTRICTS.has(district)) throw new Error(`Unexpected selected district after polygon click: ${district}`);

    const panel = page.locator('aside[aria-label^="Zone "]').first();
    await panel.waitFor({ state: "visible", timeout: 10000 });
    const panelLabel = await panel.getAttribute("aria-label");
    const searchHref = await panel.getByRole("link", { name: /Rechercher dans cette zone/i }).getAttribute("href");
    if (!searchHref) throw new Error("Missing zone Search href");
    const searchUrl = new URL(searchHref, baseUrl);
    if (searchUrl.pathname !== "/search" || normalizeSlug(searchUrl.searchParams.get("city")) !== "rabat" || normalizeSlug(searchUrl.searchParams.get("district")) !== district) {
      throw new Error(`Unexpected zone search href: ${searchHref}`);
    }

    if (diagnostics.pageErrors.length || diagnostics.requestFailures.length) {
      throw new Error(`Browser diagnostics failed: ${JSON.stringify(diagnostics)}`);
    }

    await page.screenshot({ path: `${outDir}/c4-${viewport.name}-${viewport.width}x${viewport.height}.png`, fullPage: true });
    report.viewports.push({
      ...viewport,
      tabsFit: true,
      interactivePoint,
      selectedDistrict: district,
      panelLabel,
      searchHref,
      priceAvailableCount: pricePayload.properties?.legend?.availableCount ?? null,
      densityAvailableCount: densityPayload.properties?.legend?.availableCount ?? null,
      listingsAvailableCount: listingsPayload.properties?.legend?.availableCount ?? null,
      diagnostics,
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
