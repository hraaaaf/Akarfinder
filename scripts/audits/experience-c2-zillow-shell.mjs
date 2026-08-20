import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3142";
const outDir = process.env.AUDIT_DIR ?? path.join("data", "audits", "experience-c2-zillow-shell");
const viewports = [
  { name: "search-390", width: 390, height: 844 },
  { name: "search-430", width: 430, height: 932 },
  { name: "search-768", width: 768, height: 900 },
  { name: "search-1280", width: 1280, height: 900 },
];

const neighborhoods = ["Agdal", "Hay Riad", "Souissi", "Hassan", "Océan", "Aviation", "Akkari", "Yacoub El Mansour", "Agdal", "Hay Riad", "Souissi", "Hassan"];
const propertyTypes = ["Appartement", "Villa", "Maison", "Studio", "Terrain", "Bureau", "Riad", "Appartement", "Villa", "Maison", "Studio", "Bureau"];
const exactCoordinates = [
  { latitude: 34.0029, longitude: -6.8445 },
  { latitude: 33.9977, longitude: -6.8509 },
  { latitude: 33.9864, longitude: -6.8276 },
  { latitude: 34.0180, longitude: -6.8335 },
];

const listings = neighborhoods.map((neighborhood, index) => ({
  id: `c2-shell-${index + 1}`,
  title: index % 2 === 0 ? `Appartement lumineux à ${neighborhood}` : `Bien familial à ${neighborhood}`,
  city: "Rabat",
  neighborhood,
  price: 1180000 + index * 225000,
  currency: "DH",
  surface_m2: 65 + index * 10,
  price_per_m2: 17000 + index * 130,
  property_type: propertyTypes[index],
  transaction_type: "buy",
  bedrooms: 2 + (index % 3),
  bathrooms: 1 + (index % 2),
  freshness_label: "Récent",
  source_type: "Source analysée",
  reliability_label: "Informations complètes",
  reliability_score: 91,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture C2 déterministe.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 92,
  source_name: "AkarFinder",
  duplicate_score: 0.1,
  listing_url: `https://fixture.example/c2/${index}`,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
  source_access_level: "indexed_only",
  acquisition_channel: "first_party_user",
  origin_type: "first_party_user",
  latitude: exactCoordinates[index]?.latitude ?? null,
  longitude: exactCoordinates[index]?.longitude ?? null,
  geo_precision: exactCoordinates[index] ? "exact" : "unknown",
  geo_source: exactCoordinates[index] ? "manual_import" : "unknown",
}));

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.route("**/api/search?**", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "c2-ci", generated_at: new Date().toISOString() }),
  }));
  await page.route("**/api/search/gateway?**", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }),
  }));

  const response = await page.goto(`${baseUrl}/search?city=Rabat&view=split`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 400) failures.push(`${viewport.name}: HTTP ${response?.status() ?? "none"}`);

  await page.waitForFunction(() => document.querySelectorAll("article[data-mobile-compact-card]").length >= 10, null, { timeout: 30_000 });
  await page.waitForSelector('[data-search-view-layout="split"]', { timeout: 20_000 });
  await page.waitForSelector('[data-search-map-renderer="maplibre"] .maplibregl-canvas', { timeout: 30_000 });
  await page.waitForFunction(
    () => document.querySelectorAll('[data-search-exact-property-marker="true"]').length >= 4,
    null,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(900);

  const metrics = await page.evaluate(() => {
    const layout = document.querySelector('[data-search-view-layout="split"]');
    const mapPane = document.querySelector("[data-search-map-pane]");
    const listPane = document.querySelector("[data-search-list-pane]");
    const firstCard = document.querySelector("article[data-mobile-compact-card]");
    const firstImage = firstCard?.querySelector("[data-card-image]");
    const mapRenderer = document.querySelector('[data-search-map-renderer="maplibre"]');
    const mapCanvas = mapRenderer?.querySelector(".maplibregl-canvas");
    const lr = layout?.getBoundingClientRect();
    const mr = mapPane?.getBoundingClientRect();
    const rr = listPane?.getBoundingClientRect();
    const cr = firstCard?.getBoundingClientRect();
    const ir = firstImage?.getBoundingClientRect();
    const mapCanvasRect = mapCanvas?.getBoundingClientRect();

    return {
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      layoutWidth: lr?.width ?? 0,
      mapWidth: mr?.width ?? 0,
      listWidth: rr?.width ?? 0,
      mapTop: mr?.top ?? 0,
      mapBottom: mr?.bottom ?? 0,
      listTop: rr?.top ?? 0,
      listOverflowY: listPane ? getComputedStyle(listPane).overflowY : "",
      listScrollable: listPane ? listPane.scrollHeight > listPane.clientHeight + 4 : false,
      cardDisplay: firstCard ? getComputedStyle(firstCard).display : "",
      cardWidth: cr?.width ?? 0,
      imageWidth: ir?.width ?? 0,
      cardHeight: cr?.height ?? 0,
      listRadius: listPane ? getComputedStyle(listPane).borderTopLeftRadius : "",
      mapRenderer: mapRenderer?.getAttribute("data-search-map-renderer") ?? "",
      mapCanvasWidth: mapCanvasRect?.width ?? 0,
      mapCanvasHeight: mapCanvasRect?.height ?? 0,
      exactMarkerCount: document.querySelectorAll('[data-search-exact-property-marker="true"]').length,
    };
  });

  if (metrics.overflow > 1) failures.push(`${viewport.name}: horizontal overflow ${metrics.overflow}px`);
  if (metrics.cardDisplay !== "grid") failures.push(`${viewport.name}: split card is not horizontal grid`);
  if (metrics.cardWidth > 0 && (metrics.imageWidth <= 0 || metrics.imageWidth >= metrics.cardWidth * 0.48)) {
    failures.push(`${viewport.name}: split card image ratio ${metrics.imageWidth}/${metrics.cardWidth}`);
  }
  if (metrics.mapRenderer !== "maplibre") failures.push(`${viewport.name}: MapLibre renderer missing`);
  if (metrics.mapCanvasWidth < 250 || metrics.mapCanvasHeight < 240) {
    failures.push(`${viewport.name}: MapLibre canvas too small ${metrics.mapCanvasWidth}x${metrics.mapCanvasHeight}`);
  }
  if (metrics.exactMarkerCount < 4) failures.push(`${viewport.name}: expected 4 exact MapLibre markers, got ${metrics.exactMarkerCount}`);

  if (viewport.width >= 1024) {
    const mapShare = metrics.mapWidth / Math.max(1, metrics.mapWidth + metrics.listWidth);
    if (mapShare < 0.55 || mapShare > 0.67) failures.push(`${viewport.name}: map share ${mapShare.toFixed(3)} outside target band`);
    if (metrics.listOverflowY !== "auto" || !metrics.listScrollable) failures.push(`${viewport.name}: result rail is not independently scrollable`);
  } else {
    if (!(metrics.mapTop < metrics.listTop)) failures.push(`${viewport.name}: map is not first`);
    if (!(metrics.listTop < metrics.mapBottom)) failures.push(`${viewport.name}: results are not docked over map edge`);
    if (parseFloat(metrics.listRadius) < 20) failures.push(`${viewport.name}: dock radius ${metrics.listRadius}`);
  }

  const screenshot = path.join(outDir, `${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });

  await page.click("[data-search-filter-trigger]");
  await page.waitForTimeout(50);
  const bodyOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
  if (viewport.width >= 640 && bodyOverflow === "hidden") failures.push(`${viewport.name}: inline filters still lock body scroll`);
  if (viewport.width < 640 && bodyOverflow !== "hidden") failures.push(`${viewport.name}: phone filter sheet must lock body scroll`);

  results.push({ ...viewport, ...metrics, bodyOverflow, screenshot });
  await context.close();
}

await browser.close();

const axes = {
  responsiveShell: failures.filter((x) => x.includes("map share") || x.includes("map is not first") || x.includes("docked")).length === 0,
  resultRail: failures.filter((x) => x.includes("result rail") || x.includes("split card")).length === 0,
  filterScroll: failures.filter((x) => x.includes("body scroll") || x.includes("filter sheet")).length === 0,
  overflow: failures.filter((x) => x.includes("horizontal overflow")).length === 0,
  realMapRenderer: failures.filter((x) => x.includes("MapLibre")).length === 0,
};

const passed = Object.values(axes).filter(Boolean).length;
const machineScore = (passed / Object.keys(axes).length) * 10;
const report = { baseUrl, machineScore, axes, failures, viewports: results };

await fs.writeFile(path.join(outDir, "metrics.json"), JSON.stringify(report, null, 2));
await fs.writeFile(
  path.join(outDir, "report.md"),
  `# C2 Zillow-like Search shell\n\nMachine contract: **${machineScore.toFixed(1)}/10**\n\n${failures.length ? failures.map((x) => `- FAIL: ${x}`).join("\n") : "- PASS: C2 shell + real MapLibre renderer contract satisfied."}\n`,
);

console.log(JSON.stringify(report, null, 2));
if (failures.length || machineScore < 10) process.exit(1);
