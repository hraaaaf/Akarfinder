import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3211";
const outDir = process.env.AUDIT_OUTPUT_DIR || "data/audits/partner-market-p5-after";
await mkdir(outDir, { recursive: true });

const cities = [
  { slug: "casablanca", district: "maarif", displayName: "Casablanca" },
  { slug: "rabat", district: "agdal", displayName: "Rabat" },
  { slug: "marrakech", district: "gueliz", displayName: "Marrakech" },
  { slug: "tanger", district: "malabata", displayName: "Tanger" },
  { slug: "agadir", district: "founty", displayName: "Agadir" },
  { slug: "fes", district: "ville-nouvelle", displayName: "Fès" },
];
const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
];
const modes = ["price", "density", "listings"];
const report = { ok: false, generatedAt: new Date().toISOString(), api: [], visual: [] };

for (const city of cities) {
  const cityReport = { city: city.slug, displayName: city.displayName, modes: {} };
  for (const mode of modes) {
    const response = await fetch(`${baseUrl}/api/geo/market-intelligence?city=${city.slug}&mode=${mode}&transaction=sale`);
    let payload = null;
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw new Error(`${city.slug}/${mode}: API returned ${response.status}`);
    const districts = Array.isArray(payload?.districts) ? payload.districts : [];
    cityReport.modes[mode] = {
      status: response.status,
      districtCount: districts.length,
      availableCount: Number(payload?.legend?.availableCount ?? 0),
      nonNeutralCount: districts.filter((district) => district?.neutral === false).length,
      runtimeResolvedCount: districts.filter((district) => district?.runtimeResolved === true).length,
      areaCount: districts.filter((district) => Number(district?.areaKm2) > 0).length,
      sampleCount: districts.reduce((sum, district) => sum + Number(district?.sampleCount ?? 0), 0),
      snapshotVersions: [...new Set(districts.map((district) => district?.snapshotVersion).filter(Boolean))],
    };
  }
  report.api.push(cityReport);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const city of cities) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
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
        const nationalMap = await page.locator("[data-akarfinder-national-map]").count();
        const genericShell = await page.locator("[data-akarfinder-generic-map-shell=\"true\"]").count();
        const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (diagnostics.pageErrors.length > 0) throw new Error(`${city.slug}/${viewport.name}: browser page error`);
        if (bodyOverflow > 1) throw new Error(`${city.slug}/${viewport.name}: horizontal overflow ${bodyOverflow}px`);
        if (marketPremium + nationalMap + genericShell < 1) throw new Error(`${city.slug}/${viewport.name}: no recognized map shell`);
        await page.screenshot({ path: `${outDir}/${city.slug}-${viewport.name}-after.png`, fullPage: false });
        report.visual.push({ city: city.slug, viewport: viewport.name, marketPremium, nationalMap, genericShell, bodyOverflow, diagnostics });
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
