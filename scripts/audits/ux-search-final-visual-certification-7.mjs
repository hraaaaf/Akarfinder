import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3135";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const outDir = process.env.AUDIT_DIR ?? path.join("data", "audits", "ux-search-final-visual-certification-7", variant);

const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, columns: 2, firstTopMax: 340, cardMax: 250 },
  { name: "mobile-390x844", width: 390, height: 844, columns: 2, firstTopMax: 340, cardMax: 250 },
  { name: "tablet-768x900", width: 768, height: 900, columns: 2, firstTopMax: 345, cardMax: 535 },
  { name: "desktop-1024x800", width: 1024, height: 800, columns: 3, firstTopMax: 340, cardMax: 430 },
  { name: "desktop-1280x900", width: 1280, height: 900, columns: 4, firstTopMax: 340, cardMax: 430 },
  { name: "desktop-1440x900", width: 1440, height: 900, columns: 4, firstTopMax: 340, cardMax: 430 },
];

const neighborhoods = ["Agdal", "Hay Riad", "Souissi", "Hassan", "Océan", "Aviation", "Akkari", "Yacoub El Mansour", "Agdal", "Hay Riad", "Souissi", "Hassan"];
const propertyTypes = ["Appartement", "Villa", "Maison", "Studio", "Terrain", "Bureau", "Riad", "Appartement", "Villa", "Maison", "Studio", "Bureau"];
const listings = neighborhoods.map((neighborhood, index) => ({
  id: `ux-search-final-${index + 1}`,
  title: index % 2 === 0 ? `Appartement lumineux avec terrasse à ${neighborhood}` : `Bien familial rénové à ${neighborhood}`,
  city: "Rabat",
  neighborhood,
  price: 1180000 + index * 275000,
  currency: "DH",
  surface_m2: 62 + index * 13,
  price_per_m2: 16800 + index * 170,
  property_type: propertyTypes[index],
  transaction_type: index === 9 ? "rent" : "buy",
  bedrooms: index % 4 === 0 ? 2 : 3,
  bathrooms: index % 3 === 0 ? 1 : 2,
  freshness_label: index % 2 === 0 ? "Récent" : "Mis à jour récemment",
  source_type: "Source analysée",
  reliability_label: "Informations complètes",
  reliability_score: 91,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture déterministe de certification visuelle finale.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 92,
  source_name: index % 3 === 0 ? "AkarFinder" : "Source partenaire",
  duplicate_score: 0.1,
  listing_url: `https://fixture.example/rabat/${index}`,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
  source_access_level: "indexed_only",
  acquisition_channel: "first_party_user",
  origin_type: "first_party_user",
}));

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];
const imageFixture = '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#7f99aa"/><path d="M0 390L240 170l160 150 180-120 380 340H0z" fill="#d8c6a2"/><rect x="390" y="180" width="170" height="210" rx="12" fill="#e9e4d8"/></svg>';

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  for (const pattern of ["https://commons.wikimedia.org/**", "https://upload.wikimedia.org/**"]) {
    await page.route(pattern, async (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: imageFixture }));
  }
  await page.route("**/api/search?**", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "ux-search-final-ci", generated_at: new Date().toISOString() }),
  }));
  await page.route("**/api/search/gateway?**", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }),
  }));

  const response = await page.goto(`${baseUrl}/search?city=Rabat&view=list`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 400) failures.push(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
  await page.waitForFunction(() => document.querySelectorAll("article[data-mobile-compact-card]").length >= 12, null, { timeout: 30_000 });
  await page.waitForSelector('[data-search-global-header="exact-white"]', { timeout: 20_000 });
  await page.waitForTimeout(400);

  const metrics = await page.evaluate(() => {
    const visible = (node) => Boolean(node && getComputedStyle(node).display !== "none" && getComputedStyle(node).visibility !== "hidden" && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0);
    const cards = Array.from(document.querySelectorAll("article[data-mobile-compact-card]")).slice(0, 12);
    const grid = document.querySelector("[data-search-continuous-flow] > div.grid");
    const first = cards[0];
    const sort = document.querySelector("[data-search-sort-select]");
    const viewButtons = Array.from(document.querySelectorAll("[data-search-view-mode-button]")).filter(visible);
    const search = document.querySelector("[data-search-primary-search] input");
    const filter = document.querySelector("[data-search-filter-trigger]");
    const cardRects = cards.map((card) => card.getBoundingClientRect());
    const cardAudits = cards.map((card) => ({
      provenance: Boolean(card.querySelector("[data-card-provenance]")?.textContent?.trim()),
      price: Boolean(card.querySelector("[data-card-price]")),
      title: Boolean(card.querySelector("[data-card-title]")),
      location: Boolean(card.querySelector("[data-card-location]")),
      facts: Boolean(card.querySelector("[data-card-facts]")),
    }));
    return {
      cardCount: cards.length,
      columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
      rowGap: grid ? parseFloat(getComputedStyle(grid).rowGap) : null,
      columnGap: grid ? parseFloat(getComputedStyle(grid).columnGap) : null,
      firstTop: first?.getBoundingClientRect().top ?? null,
      maxCardHeight: Math.max(...cardRects.map((rect) => rect.height)),
      visibleInFirstViewport: cardRects.filter((rect) => rect.top < innerHeight && rect.bottom > 0).length,
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      brokenImages: cards.flatMap((card) => Array.from(card.querySelectorAll("[data-card-image] img"))).filter((img) => !(img.complete && img.naturalWidth > 0)).length,
      sortHeight: sort?.getBoundingClientRect().height ?? 0,
      searchHeight: search?.getBoundingClientRect().height ?? 0,
      filterHeight: filter?.getBoundingClientRect().height ?? 0,
      visibleViewButtons: viewButtons.length,
      minViewButtonHeight: viewButtons.length ? Math.min(...viewButtons.map((node) => node.getBoundingClientRect().height)) : 0,
      cardAudits,
    };
  });

  if (metrics.cardCount !== 12) failures.push(`${viewport.name}: expected 12 cards, got ${metrics.cardCount}`);
  if (metrics.columns !== viewport.columns) failures.push(`${viewport.name}: expected ${viewport.columns} columns, got ${metrics.columns}`);
  if (metrics.firstTop == null || metrics.firstTop > viewport.firstTopMax) failures.push(`${viewport.name}: first card top ${metrics.firstTop}px > ${viewport.firstTopMax}px`);
  if (metrics.maxCardHeight > viewport.cardMax) failures.push(`${viewport.name}: max card ${metrics.maxCardHeight}px > ${viewport.cardMax}px`);
  if (metrics.overflow > 1) failures.push(`${viewport.name}: horizontal overflow ${metrics.overflow}px`);
  if (metrics.brokenImages !== 0) failures.push(`${viewport.name}: broken images ${metrics.brokenImages}`);
  if (metrics.searchHeight < 47.5 || metrics.filterHeight < 47.5) failures.push(`${viewport.name}: primary search/filter touch target below 48px`);
  const sortMin = viewport.width < 640 ? 43.5 : 41.5;
  if (metrics.sortHeight < sortMin) failures.push(`${viewport.name}: sort control ${metrics.sortHeight}px below responsive minimum`);
  if (metrics.cardAudits.some((item) => !item.provenance || !item.price || !item.title || !item.location || !item.facts)) failures.push(`${viewport.name}: card hierarchy/provenance incomplete`);
  if (viewport.width < 640) {
    if (metrics.visibleViewButtons !== 0) failures.push(`${viewport.name}: mobile segmented view must stay hidden to match canonical mockup`);
    if (metrics.rowGap == null || metrics.rowGap > 16) failures.push(`${viewport.name}: row gap ${metrics.rowGap}px > 16px`);
    if (metrics.columnGap == null || metrics.columnGap > 12) failures.push(`${viewport.name}: column gap ${metrics.columnGap}px > 12px`);
    if (metrics.visibleInFirstViewport < 4) failures.push(`${viewport.name}: only ${metrics.visibleInFirstViewport} cards intersect first viewport`);
  } else if (metrics.visibleViewButtons > 0 && metrics.minViewButtonHeight < 39.5) {
    failures.push(`${viewport.name}: visible view control ${metrics.minViewButtonHeight}px < 40px`);
  }
  if (viewport.width >= 1280 && metrics.visibleInFirstViewport < 8) failures.push(`${viewport.name}: fewer than 8 cards intersect first viewport`);

  const screenshot = path.join(outDir, `${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  results.push({ ...viewport, ...metrics, screenshot });
  await context.close();
}

await browser.close();
const contract = {
  hierarchy: failures.filter((x) => x.includes("first card") || x.includes("hierarchy")).length === 0,
  responsiveGrid: failures.filter((x) => x.includes("columns") || x.includes("row gap") || x.includes("column gap")).length === 0,
  controls: failures.filter((x) => x.includes("control") || x.includes("touch target") || x.includes("segmented view") || x.includes("view control")).length === 0,
  visuals: failures.filter((x) => x.includes("broken images") || x.includes("overflow")).length === 0,
  scanSpeed: failures.filter((x) => x.includes("first viewport") || x.includes("first card")).length === 0,
};
const passCount = Object.values(contract).filter(Boolean).length;
const machineScore = (passCount / Object.keys(contract).length) * 10;
const report = { variant, baseUrl, machineScore, contract, failures, viewports: results };
await fs.writeFile(path.join(outDir, "metrics.json"), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(outDir, "report.md"), `# UX Search canonical mockup certification — ${variant}\n\nMachine contract: **${machineScore.toFixed(1)}/10** (${passCount}/${Object.keys(contract).length} axes)\n\n${failures.length ? failures.map((item) => `- FAIL: ${item}`).join("\n") : "- PASS: canonical mockup contract satisfied."}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length || machineScore < 9) process.exit(1);
