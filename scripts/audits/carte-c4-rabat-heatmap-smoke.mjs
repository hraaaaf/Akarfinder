import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3204";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-c4-rabat-heatmap";
await mkdir(outDir, { recursive: true });

const CENTER = { lng: -6.8416, lat: 34.0209 };
const ZOOM = 10.2;
const TILE_SIZE = 512;

function mercator(lng, lat) {
  const x = (lng + 180) / 360;
  const rad = lat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
  return { x, y };
}

function project(lng, lat, width, height) {
  const world = TILE_SIZE * 2 ** ZOOM;
  const p = mercator(lng, lat);
  const c = mercator(CENTER.lng, CENTER.lat);
  return { x: (p.x - c.x) * world + width / 2, y: (p.y - c.y) * world + height / 2 };
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, coordinates) {
  if (!coordinates.length || !pointInRing(point, coordinates[0])) return false;
  return !coordinates.slice(1).some((hole) => pointInRing(point, hole));
}

function pointInGeometry(point, geometry) {
  if (geometry.type === "Polygon") return pointInPolygon(point, geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  return false;
}

function bboxForGeometry(geometry) {
  const points = geometry.type === "Polygon"
    ? geometry.coordinates.flat()
    : geometry.coordinates.flat(2);
  return points.reduce((box, [lng, lat]) => ({
    minLng: Math.min(box.minLng, lng), maxLng: Math.max(box.maxLng, lng),
    minLat: Math.min(box.minLat, lat), maxLat: Math.max(box.maxLat, lat),
  }), { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity });
}

function pickClickableFeature(payload, width, height) {
  const candidates = [];
  for (const feature of payload.features) {
    const box = bboxForGeometry(feature.geometry);
    for (let ix = 1; ix < 10; ix += 1) {
      for (let iy = 1; iy < 10; iy += 1) {
        const lng = box.minLng + (box.maxLng - box.minLng) * ix / 10;
        const lat = box.minLat + (box.maxLat - box.minLat) * iy / 10;
        if (!pointInGeometry([lng, lat], feature.geometry)) continue;
        const pixel = project(lng, lat, width, height);
        // Avoid top controls, bottom legend and extreme canvas edges.
        if (pixel.x < 40 || pixel.x > width - 40 || pixel.y < 155 || pixel.y > height - 170) continue;
        const distance = Math.hypot(pixel.x - width / 2, pixel.y - height / 2);
        candidates.push({ feature, lng, lat, pixel, distance });
      }
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0] || null;
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
    const target = pickClickableFeature(listingsPayload, box.width, box.height);
    if (!target) throw new Error(`No clickable polygon interior found for ${viewport.name}`);

    await page.mouse.click(box.x + target.pixel.x, box.y + target.pixel.y);
    const district = {
      market_zone_rabat_agdal: "agdal",
      market_zone_rabat_hay_riad: "hay-riad",
      market_zone_rabat_souissi: "souissi",
      market_zone_rabat_centre: "hassan",
    }[target.feature.properties.zoneId];
    if (!district) throw new Error(`Unexpected zone ${target.feature.properties.zoneId}`);

    const panel = page.locator(`aside[aria-label="Zone ${target.feature.properties.displayName}"]`);
    await panel.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForURL((url) => url.searchParams.get("city") === "rabat" && url.searchParams.get("district") === district, { timeout: 10000 });
    const searchHref = await panel.getByRole("link", { name: /Rechercher dans cette zone/i }).getAttribute("href");
    if (!searchHref || !searchHref.startsWith("/search") || !searchHref.includes("city=rabat") || !searchHref.includes(`district=${district}`)) {
      throw new Error(`Unexpected zone search href: ${searchHref}`);
    }

    if (diagnostics.pageErrors.length || diagnostics.requestFailures.length) {
      throw new Error(`Browser diagnostics failed: ${JSON.stringify(diagnostics)}`);
    }

    await page.screenshot({ path: `${outDir}/c4-${viewport.name}-${viewport.width}x${viewport.height}.png`, fullPage: true });
    report.viewports.push({
      ...viewport,
      zoneId: target.feature.properties.zoneId,
      district,
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
