import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Page } from "playwright";
import { decideRabatMarketZonesGeoJson } from "@/lib/geo/rabat-market-zones-geojson";
import {
  buildRabatIntelligenceGeoJson,
  type IntelligenceMetricInput,
} from "@/lib/map/intelligence-payload";
import {
  buildCityMarketIntelligencePayload,
} from "@/lib/map/city-market-intelligence-payload";
import type { CityMarketMetricRow } from "@/lib/map/city-market-intelligence";
import type { IntelligenceMode } from "@/lib/map/intelligence-scale";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3214";
const OUT = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/carte-market-synthetic";
const FIXTURE_VERSION = "synthetic-market-v1";
const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 900 },
] as const;
const validRabatDistricts = new Set(["agdal", "hay-riad", "souissi", "hassan"]);

function modeFromUrl(url: URL): IntelligenceMode {
  const mode = url.searchParams.get("mode");
  if (mode === "density" || mode === "listings") return mode;
  return "price";
}

function bucket(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 10_000;
}

function eligibleCanaryKey(): string {
  for (let index = 0; index < 100_000; index += 1) {
    const value = `synthetic-market-audit-${index}`;
    if (bucket(value) < 100) return value;
  }
  throw new Error("Unable to derive deterministic geometry canary key");
}

function normalizeSlug(value: string | null): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const casablancaMetrics: CityMarketMetricRow[] = [
  {
    districtSlug: "maarif",
    displayName: "Maârif",
    transactionType: "sale",
    runtimeResolved: true,
    areaKm2: 3.2,
    areaBasis: "casablanca_osm_shadow",
    listingCount: 32,
    pricePerM2SampleCount: 18,
    medianPricePerM2Mad: 16_400,
    observedListingDensityPerKm2: 10,
    priceReliability: "strong",
    freshnessStatus: "fresh_confirmed",
    snapshotVersion: FIXTURE_VERSION,
  },
  {
    districtSlug: "racine",
    displayName: "Racine",
    transactionType: "sale",
    runtimeResolved: true,
    areaKm2: 2.4,
    areaBasis: "casablanca_osm_shadow",
    listingCount: 24,
    pricePerM2SampleCount: 14,
    medianPricePerM2Mad: 18_900,
    observedListingDensityPerKm2: 10,
    priceReliability: "strong",
    freshnessStatus: "fresh_confirmed",
    snapshotVersion: FIXTURE_VERSION,
  },
  {
    districtSlug: "ain-diab",
    displayName: "Aïn Diab",
    transactionType: "sale",
    runtimeResolved: true,
    areaKm2: 4.1,
    areaBasis: "casablanca_osm_shadow",
    listingCount: 19,
    pricePerM2SampleCount: 11,
    medianPricePerM2Mad: 21_600,
    observedListingDensityPerKm2: 4.63,
    priceReliability: "moderate",
    freshnessStatus: "fresh_confirmed",
    snapshotVersion: FIXTURE_VERSION,
  },
];

const geometryDecision = decideRabatMarketZonesGeoJson();
if (!geometryDecision.enabled) {
  throw new Error(`Synthetic certification requires reviewed Rabat geometry, got ${geometryDecision.reason}`);
}

const syntheticPrice = [14_200, 17_100, 20_300, 12_900] as const;
const syntheticListings = [22, 31, 14, 26] as const;
const syntheticReliability = ["strong", "strong", "moderate", "strong"] as const;
const rabatMetrics: IntelligenceMetricInput[] = geometryDecision.collection.features.map((feature, index) => ({
  zoneId: feature.properties.zoneId,
  displayName: feature.properties.displayName,
  transactionType: "sale",
  areaKm2: feature.properties.areaKm2,
  listingCount: syntheticListings[index] ?? 12,
  pricePerM2SampleCount: Math.max(7, (syntheticListings[index] ?? 12) - 4),
  medianPricePerM2Mad: syntheticPrice[index] ?? 15_000,
  observedListingDensityPerKm2: Number(((syntheticListings[index] ?? 12) / feature.properties.areaKm2).toFixed(2)),
  priceReliability: syntheticReliability[index] ?? "moderate",
  freshnessStatus: "fresh_confirmed",
  snapshotVersion: FIXTURE_VERSION,
}));

function casablancaPayload(mode: IntelligenceMode) {
  return buildCityMarketIntelligencePayload({
    citySlug: "casablanca",
    cityDisplayName: "Casablanca",
    metrics: casablancaMetrics,
    mode,
    transaction: "sale",
  });
}

function rabatPayload(mode: IntelligenceMode) {
  return buildRabatIntelligenceGeoJson({
    geometry: geometryDecision.collection,
    metrics: rabatMetrics,
    mode,
    transaction: "sale",
  });
}

async function installSyntheticRoutes(page: Page) {
  await page.route("**/api/geo/market-intelligence?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("city") !== "casablanca") {
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ status: "synthetic_fixture_scope_mismatch" }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "x-akarfinder-synthetic-fixture": FIXTURE_VERSION },
      body: JSON.stringify(casablancaPayload(modeFromUrl(url))),
    });
  });

  await page.route("**/api/geo/rabat-market-intelligence?**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "x-akarfinder-synthetic-fixture": FIXTURE_VERSION },
      body: JSON.stringify(rabatPayload(modeFromUrl(url))),
    });
  });
}

async function findInteractivePoint(page: Page) {
  const canvas = page.locator(".maplibregl-canvas");
  const box = await canvas.boundingBox();
  if (!box) return null;
  const points: Array<{ x: number; y: number; d: number }> = [];
  for (let y = 180; y <= Math.max(181, box.height - 160); y += 24) {
    for (let x = 40; x <= Math.max(41, box.width - 40); x += 24) {
      points.push({ x, y, d: Math.hypot(x - box.width / 2, y - box.height / 2) });
    }
  }
  points.sort((a, b) => a.d - b.d);
  for (const point of points) {
    await page.mouse.move(box.x + point.x, box.y + point.y);
    const pointer = await canvas.evaluate((element) => (element as HTMLElement).style.cursor === "pointer");
    if (pointer) return { box, point };
  }
  return null;
}

async function waitForInteractivePoint(page: Page) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await findInteractivePoint(page);
    if (result) return result;
    await page.waitForTimeout(150);
  }
  return null;
}

async function certifyCasablanca(browser: Awaited<ReturnType<typeof chromium.launch>>, report: any) {
  const canaryKey = eligibleCanaryKey();
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    await context.addCookies([{
      name: "akar_geometry_canary",
      value: canaryKey,
      url: BASE_URL,
      sameSite: "Lax",
    }]);
    const page = await context.newPage();
    await installSyntheticRoutes(page);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    try {
      await page.goto(`${BASE_URL}/map?city=Casablanca&layer=price`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 20_000 });
      await page.locator('[data-akarfinder-intelligence-legend="price"], [data-akarfinder-intelligence-layer="price"]').first().waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForFunction(() => {
        const text = document.body.innerText;
        return !text.includes("Calcul des annonces observées") && !text.includes("temporairement indisponibles");
      }, null, { timeout: 15_000 });

      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        canvasCount: document.querySelectorAll(".maplibregl-canvas").length,
        priceMode: document.querySelector('[data-akarfinder-intelligence-legend="price"], [data-akarfinder-intelligence-layer="price"]') != null,
        territorialActive: document.querySelector('[data-akarfinder-territorial-layer="active"]') != null,
      }));
      if (metrics.scrollWidth > metrics.clientWidth + 1) throw new Error(`Casablanca ${viewport.name}: horizontal overflow`);
      if (metrics.canvasCount < 1 || !metrics.priceMode) throw new Error(`Casablanca ${viewport.name}: intelligence UI missing`);
      if (!metrics.territorialActive) throw new Error(`Casablanca ${viewport.name}: territorial geometry inactive`);
      if (pageErrors.length) throw new Error(`Casablanca ${viewport.name}: page errors ${pageErrors.join(" | ")}`);

      const screenshot = `${OUT}/casablanca-price-${viewport.name}.png`;
      await page.screenshot({ path: screenshot, fullPage: false });
      report.cases.push({ family: "city-market", city: "casablanca", viewport: viewport.name, metrics, screenshot });
    } finally {
      await context.close();
    }
  }
}

async function certifyRabat(browser: Awaited<ReturnType<typeof chromium.launch>>, report: any) {
  const modes: Array<{ tab: string; api: IntelligenceMode }> = [
    { tab: "Prix", api: "price" },
    { tab: "Densité", api: "density" },
    { tab: "Annonces", api: "listings" },
  ];

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await installSyntheticRoutes(page);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    try {
      await page.goto(`${BASE_URL}/map?city=rabat`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.locator("[data-akarfinder-market-intelligence-map]").waitFor({ state: "visible", timeout: 20_000 });
      await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 20_000 });
      await page.locator("[data-akarfinder-intelligence-legend]").waitFor({ state: "visible", timeout: 20_000 });

      let interactive: Awaited<ReturnType<typeof waitForInteractivePoint>> = null;
      for (const mode of modes) {
        if (mode.api !== "price") {
          const response = page.waitForResponse((candidate) => {
            const url = new URL(candidate.url());
            return url.pathname === "/api/geo/rabat-market-intelligence" && url.searchParams.get("mode") === mode.api;
          }, { timeout: 15_000 });
          await page.getByRole("tab", { name: mode.tab }).click();
          const resolved = await response;
          if (resolved.status() !== 200) throw new Error(`Rabat ${viewport.name}: synthetic ${mode.api} returned ${resolved.status()}`);
        }
        interactive = await waitForInteractivePoint(page);
        if (!interactive) throw new Error(`Rabat ${viewport.name}: ${mode.api} polygon not interactive`);
        await page.screenshot({ path: `${OUT}/rabat-${viewport.name}-${mode.api}.png`, fullPage: false });
      }

      if (!interactive) throw new Error(`Rabat ${viewport.name}: no interactive polygon`);
      await page.mouse.click(interactive.box.x + interactive.point.x, interactive.box.y + interactive.point.y);
      await page.waitForURL((url) => url.searchParams.get("city") === "rabat" && validRabatDistricts.has(url.searchParams.get("district") ?? ""), { timeout: 10_000 });

      const district = new URL(page.url()).searchParams.get("district");
      const sheet = page.locator("[data-akarfinder-rich-zone-sheet]");
      await sheet.waitFor({ state: "visible", timeout: 10_000 });
      for (const label of ["Prix médian / m²", "Densité", "Annonces"]) {
        if (await sheet.getByText(label, { exact: true }).count() === 0) throw new Error(`Rabat ${viewport.name}: missing ${label}`);
      }
      const href = await sheet.locator('a[href^="/search?"]').first().getAttribute("href");
      if (!href) throw new Error(`Rabat ${viewport.name}: missing Search CTA`);
      const searchUrl = new URL(href, BASE_URL);
      if (normalizeSlug(searchUrl.searchParams.get("city")) !== "rabat" || normalizeSlug(searchUrl.searchParams.get("district")) !== district) {
        throw new Error(`Rabat ${viewport.name}: Search CTA mismatch`);
      }
      const box = await sheet.boundingBox();
      if (!box || box.x < -1 || box.y < -1 || box.x + box.width > viewport.width + 1 || box.y + box.height > viewport.height + 1) {
        throw new Error(`Rabat ${viewport.name}: rich sheet escapes viewport`);
      }
      if (pageErrors.length) throw new Error(`Rabat ${viewport.name}: page errors ${pageErrors.join(" | ")}`);

      const screenshot = `${OUT}/rabat-${viewport.name}-zone-sheet.png`;
      await page.screenshot({ path: screenshot, fullPage: false });
      report.cases.push({ family: "rabat-c7", city: "rabat", viewport: viewport.name, district, href, screenshot });
    } finally {
      await page.close();
    }
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report: any = {
    ok: false,
    fixture: FIXTURE_VERSION,
    truthScope: "synthetic-ui-only",
    generatedAt: new Date().toISOString(),
    cases: [],
  };
  const browser = await chromium.launch({ headless: true });
  try {
    await certifyCasablanca(browser, report);
    await certifyRabat(browser, report);
    report.ok = true;
  } catch (error) {
    report.error = error instanceof Error ? error.stack ?? error.message : String(error);
    throw error;
  } finally {
    await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
    await writeFile(`${OUT}/README.md`, [
      "# Synthetic Market Certification",
      "",
      `Fixture: ${FIXTURE_VERSION}`,
      "Truth scope: synthetic UI/interaction certification only.",
      "These fixtures never certify live market values, Supabase availability, or production data freshness.",
      "",
    ].join("\n"));
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
  }
}

void main();
