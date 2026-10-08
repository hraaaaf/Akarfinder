import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3211";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/carte-national-market-before";
await mkdir(outDir, { recursive: true });

const cities = [
  { slug: "casablanca", district: "maarif", displayName: "Casablanca" },
  { slug: "rabat", district: "agdal", displayName: "Rabat" },
  { slug: "marrakech", district: "gueliz", displayName: "Marrakech" },
  { slug: "tanger", district: "malabata", displayName: "Tanger" },
  { slug: "agadir", district: "founty", displayName: "Agadir" },
  { slug: "fes", district: "ville-nouvelle", displayName: "Fès" },
];
const visualCities = cities.filter((city) => city.slug !== "rabat");
const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
];
const modes = ["price", "density", "listings"];
const fixtureMode = process.env.MARKET_BROWSER_FIXTURE === "1";

function fixturePayload(city, mode) {
  const districts = [{
    districtSlug: city.district,
    displayName: city.district,
    mode,
    transaction: "sale",
    metricValue: mode === "price" ? 15000 : mode === "density" ? 0.2 : 2,
    sampleCount: 2,
    runtimeResolved: true,
    neutral: false,
    classIndex: 0,
    fillColor: "#22C55E",
    snapshotVersion: "ci-fixture-v1",
    areaKm2: 10,
    areaBasis: "ci_fixture",
  }];
  return {
    city: { slug: city.slug, displayName: city.displayName },
    mode,
    transaction: "sale",
    observedMarketOnly: true,
    scaleMethod: "snapshot_quantiles_v1",
    legend: { availableCount: 1, classCount: 1, thresholds: [], min: districts[0].metricValue, max: districts[0].metricValue, colors: ["#22C55E"], neutralColor: "#E5E7EB" },
    districts,
  };
}

const report = {
  ok: false,
  generatedAt: new Date().toISOString(),
  api: [],
  visual: [],
};

for (const city of cities) {
  const cityReport = { city: city.slug, displayName: city.displayName, modes: {} };
  for (const mode of modes) {
    const payload = fixtureMode ? fixturePayload(city, mode) : await (async () => {
      const response = await fetch(`${baseUrl}/api/geo/market-intelligence?city=${city.slug}&mode=${mode}&transaction=sale`);
        return response.json();
    })();
    const districts = Array.isArray(payload?.districts) ? payload.districts : [];
    cityReport.modes[mode] = {
      status: 200,
      districtCount: districts.length,
      availableCount: Number(payload?.legend?.availableCount ?? 0),
      nonNeutralCount: districts.filter((district) => district?.neutral === false).length,
      runtimeResolvedCount: districts.filter((district) => district?.runtimeResolved === true).length,
      areaCount: districts.filter((district) => Number(district?.areaKm2) > 0).length,
      sampleCount: districts.reduce((sum, district) => sum + Number(district?.sampleCount ?? 0), 0),
      snapshotVersions: [...new Set(districts.map((district) => district?.snapshotVersion).filter(Boolean))],
      error: null,
    };
  }
  report.api.push(cityReport);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const city of visualCities) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      if (fixtureMode) {
        await page.route("**/api/geo/market-intelligence?**", async (route) => {
          const url = new URL(route.request().url());
          const targetCity = cities.find((item) => item.slug === url.searchParams.get("city")) ?? city;
          const routeMode = url.searchParams.get("mode") || "price";
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixturePayload(targetCity, routeMode)) });
        });
      }
      const diagnostics = { pageErrors: [], requestFailures: [] };
      page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
      page.on("requestfailed", (request) => diagnostics.requestFailures.push({
        url: request.url(),
        error: request.failure()?.errorText || "unknown",
      }));
      try {
        await page.goto(`${baseUrl}/map?city=${city.slug}&district=${city.district}&layer=explore`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        const loading = page.getByText("Chargement de la carte…", { exact: true });
        await loading.waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
        const canvas = page.locator(".maplibregl-canvas");
        await canvas.waitFor({ state: "visible", timeout: 20000 });
        await page.waitForTimeout(1200);
        const marketPremium = await page.locator("[data-akarfinder-market-intelligence-map]").count();
        const genericShell = await page.locator("[data-akarfinder-generic-map-shell=\"true\"]").count();
        const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        await page.screenshot({
          path: `${outDir}/${city.slug}-${viewport.name}-before.png`,
          fullPage: false,
        });
        report.visual.push({
          city: city.slug,
          viewport: viewport.name,
          marketPremium,
          genericShell,
          bodyOverflow,
          diagnostics,
        });
      } finally {
        await page.close();
      }
    }
  }
  report.ok = true;
} finally {
  await browser.close();
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
}
