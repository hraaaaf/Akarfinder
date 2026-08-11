import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3115";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const outDir = process.env.AUDIT_DIR ?? path.join("data", "audits", "ux-search-navigation-hierarchy-5", variant);
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, columns: 2, headerMax: 54, topMax: 260, cardMax: 390, desktopNav: false },
  { name: "mobile-390x844", width: 390, height: 844, columns: 2, headerMax: 54, topMax: 260, cardMax: 390, desktopNav: false },
  { name: "tablet-768x900", width: 768, height: 900, columns: 2, headerMax: 56, topMax: 275, cardMax: 620, desktopNav: false },
  { name: "desktop-1024x800", width: 1024, height: 800, columns: 3, headerMax: 56, topMax: 270, cardMax: 420, desktopNav: true },
  { name: "desktop-1280x900", width: 1280, height: 900, columns: 4, headerMax: 56, topMax: 270, cardMax: 420, desktopNav: true },
  { name: "desktop-1440x900", width: 1440, height: 900, columns: 4, headerMax: 56, topMax: 270, cardMax: 420, desktopNav: true },
];

const cityPairs = [
  ["Agadir", "Appartement"], ["Agadir", "Villa"],
  ["Marrakech", "Appartement"], ["Marrakech", "Villa"],
  ["Casablanca", "Appartement"], ["Casablanca", "Villa"],
  ["Rabat", "Appartement"], ["Rabat", "Villa"],
  ["Tanger", "Appartement"], ["Tanger", "Villa"],
  ["Fès", "Appartement"], ["Fès", "Villa"],
];

const listings = cityPairs.map(([city, propertyType], index) => ({
  id: `ux-search-navigation-hierarchy-5-${index + 1}`,
  title: `${propertyType} de certification hiérarchie à ${city}`,
  city,
  neighborhood: city === "Rabat" && index === 6 ? "Agdal" : city === "Rabat" ? "Quartier non certifié" : undefined,
  price: 1250000 + index * 125000,
  currency: "DH",
  surface_m2: 72 + index * 7,
  price_per_m2: 16500,
  property_type: propertyType,
  transaction_type: "buy",
  bedrooms: 2,
  bathrooms: 1,
  freshness_label: "Récent",
  source_type: "Source analysée",
  reliability_label: "Informations complètes",
  reliability_score: 88,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture déterministe UX-SEARCH-5.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 90,
  source_name: "AkarFinder",
  duplicate_score: 0.1,
  listing_url: `https://fixture.example/${encodeURIComponent(city)}/${propertyType.toLowerCase()}/${index}`,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
  source_access_level: "indexed_only",
  acquisition_channel: "first_party_user",
  origin_type: "first_party_user",
}));

listings.push(
  { ...listings[0], id: "ux-search-navigation-hierarchy-5-oujda", title: "Appartement de contrôle à Oujda", city: "Oujda", neighborhood: undefined, listing_url: "https://fixture.example/oujda/appartement/1" },
  { ...listings[0], id: "ux-search-navigation-hierarchy-5-meknes", title: "Maison de contrôle à Meknès", city: "Meknès", neighborhood: undefined, property_type: "Maison", listing_url: "https://fixture.example/meknes/maison/1" },
);

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.route("https://commons.wikimedia.org/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#7593a8"/><path d="M0 360L220 180l180 150 170-130 390 340H0z" fill="#d9c8a3"/></svg>' });
  });
  await page.route("**/api/search?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "ux-search-5-ci", generated_at: new Date().toISOString() }) });
  });
  await page.route("**/api/search/gateway?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }) });
  });

  const response = await page.goto(`${baseUrl}/search?view=list`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 400) failures.push(`${viewport.name}: search route returned ${response?.status() ?? "no response"}`);
  await page.waitForFunction(() => document.querySelectorAll("article[data-property-active]").length >= 14, null, { timeout: 30_000 });
  await page.waitForSelector('[data-search-global-header="exact-white"]', { timeout: 20_000 });
  await page.waitForTimeout(450);

  const metrics = await page.evaluate(() => {
    const header = document.querySelector('[data-search-global-header="exact-white"]');
    const headerBox = header?.getBoundingClientRect() ?? null;
    const brandImage = header?.querySelector('a[aria-label="AkarFinder - accueil"] img');
    const brandBox = brandImage?.getBoundingClientRect() ?? null;
    const searchInput = document.querySelector('[data-search-primary-search]');
    const searchBox = searchInput?.getBoundingClientRect() ?? null;
    const cards = Array.from(document.querySelectorAll("article[data-property-active]")).slice(0, 14);
    const grid = document.querySelector("[data-search-continuous-flow] > div.grid");
    const heights = cards.map((card) => Math.round(card.getBoundingClientRect().height * 10) / 10);
    const brokenImages = cards.flatMap((card) => Array.from(card.querySelectorAll('[data-card-image] img'))).filter((img) => !(img.complete && img.naturalWidth > 0)).length;
    const visualClasses = cards.map((card) => card.querySelector('[data-visual-inventory-class]')?.getAttribute('data-visual-inventory-class') ?? null);
    const desktopNav = header?.querySelector('nav[aria-label="Navigation principale"]');
    const mobileMenu = header?.querySelector('[aria-label="Ouvrir le menu"]');
    const account = header?.querySelector('[aria-label="Mon compte"]');
    const visible = (node) => Boolean(node && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden' && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0);
    const navLinks = Array.from(desktopNav?.querySelectorAll('a') ?? []).filter(visible).map((node) => node.textContent?.trim() ?? '');
    return {
      headerHeight: headerBox ? Math.round(headerBox.height * 10) / 10 : null,
      headerWidth: headerBox ? Math.round(headerBox.width * 10) / 10 : null,
      brandX: brandBox ? Math.round(brandBox.x * 10) / 10 : null,
      brandCenterDelta: brandBox ? Math.round(Math.abs((brandBox.left + brandBox.width / 2) - window.innerWidth / 2) * 10) / 10 : null,
      searchX: searchBox ? Math.round(searchBox.x * 10) / 10 : null,
      desktopAlignmentDelta: brandBox && searchBox ? Math.round(Math.abs(brandBox.x - searchBox.x) * 10) / 10 : null,
      firstTop: cards[0] ? Math.round(cards[0].getBoundingClientRect().top * 10) / 10 : null,
      maxCardHeight: heights.length ? Math.max(...heights) : null,
      cardCount: cards.length,
      columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      brokenImages,
      contextualCount: visualClasses.filter((value) => value === 'contextual_illustration').length,
      neighborhoodCount: visualClasses.filter((value) => value === 'neighborhood_photo').length,
      genericCount: visualClasses.filter((value) => value === 'generic_illustration').length,
      desktopNavVisible: visible(desktopNav),
      mobileMenuVisible: visible(mobileMenu),
      accountVisible: visible(account),
      navLinks,
    };
  });

  if (metrics.headerHeight == null || metrics.headerHeight > viewport.headerMax) failures.push(`${viewport.name}: exact-white header height ${metrics.headerHeight}px > ${viewport.headerMax}px`);
  if (metrics.headerWidth == null || Math.abs(metrics.headerWidth - viewport.width) > 1) failures.push(`${viewport.name}: header does not span viewport (${metrics.headerWidth}px)`);
  if (viewport.desktopNav) {
    if (metrics.desktopAlignmentDelta == null || metrics.desktopAlignmentDelta > 3) failures.push(`${viewport.name}: header/Search left alignment delta ${metrics.desktopAlignmentDelta}px > 3px`);
    const expectedNav = ["Acheter", "Louer", "Neuf", "Agences", "Conseils"];
    if (JSON.stringify(metrics.navLinks) !== JSON.stringify(expectedNav)) failures.push(`${viewport.name}: certified desktop nav drift ${JSON.stringify(metrics.navLinks)}`);
  } else if (metrics.brandCenterDelta == null || metrics.brandCenterDelta > 1) {
    failures.push(`${viewport.name}: mobile/tablet logo center delta ${metrics.brandCenterDelta}px > 1px`);
  }
  if (metrics.columns !== viewport.columns) failures.push(`${viewport.name}: expected ${viewport.columns} columns, got ${metrics.columns}`);
  if (metrics.firstTop == null || metrics.firstTop > viewport.topMax) failures.push(`${viewport.name}: first card top ${metrics.firstTop}px > ${viewport.topMax}px`);
  if (metrics.maxCardHeight == null || metrics.maxCardHeight > viewport.cardMax) failures.push(`${viewport.name}: card height ${metrics.maxCardHeight}px > ${viewport.cardMax}px`);
  if (metrics.cardCount !== 14) failures.push(`${viewport.name}: expected 14 cards, got ${metrics.cardCount}`);
  if (metrics.overflow > 1) failures.push(`${viewport.name}: horizontal overflow ${metrics.overflow}px`);
  if (metrics.brokenImages !== 0) failures.push(`${viewport.name}: ${metrics.brokenImages} broken visual(s)`);
  if (metrics.contextualCount !== 11 || metrics.neighborhoodCount !== 1 || metrics.genericCount !== 2) failures.push(`${viewport.name}: UX-SEARCH-4 visual inventory predecessor drift (${metrics.contextualCount}/${metrics.neighborhoodCount}/${metrics.genericCount})`);
  if (metrics.desktopNavVisible !== viewport.desktopNav) failures.push(`${viewport.name}: desktop navigation visibility mismatch`);
  if (metrics.mobileMenuVisible !== !viewport.desktopNav) failures.push(`${viewport.name}: mobile menu visibility mismatch`);
  if (!metrics.accountVisible) failures.push(`${viewport.name}: Mon compte action must remain available`);

  const screenshot = path.join(outDir, `${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  results.push({ ...viewport, ...metrics, screenshot });
  await context.close();
}

await browser.close();

const scoreParts = {
  hierarchy: failures.filter((item) => item.includes("header height") || item.includes("alignment delta") || item.includes("logo center") || item.includes("header does not span")).length === 0 ? 3.5 : 0,
  navigationContinuity: failures.filter((item) => item.includes("navigation visibility") || item.includes("menu visibility") || item.includes("Mon compte") || item.includes("desktop nav drift")).length === 0 ? 2 : 0,
  responsiveDensity: failures.filter((item) => item.includes("columns") || item.includes("first card") || item.includes("card height")).length === 0 ? 2 : 0,
  predecessorIntegrity: failures.filter((item) => item.includes("predecessor drift") || item.includes("broken visual")).length === 0 ? 1.5 : 0,
  overflow: failures.filter((item) => item.includes("overflow")).length === 0 ? 1 : 0,
};
const score = Object.values(scoreParts).reduce((sum, value) => sum + value, 0);
const report = { variant, baseUrl, score, scoreParts, failures, viewports: results };
await fs.writeFile(path.join(outDir, "metrics.json"), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(outDir, "report.md"), `# UX-SEARCH-5 Navigation & Hierarchy Polish — ${variant}\n\nScore contract: **${score.toFixed(1)}/10**\n\n${failures.length ? failures.map((item) => `- FAIL: ${item}`).join("\n") : "- PASS: certified exact-white Search header, responsive navigation, predecessor density and visual integrity all pass."}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length || score < 9) process.exit(1);
