import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3135";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const outDir = process.env.AUDIT_DIR ?? path.join("data", "audits", "ux-search-final-visual-certification-7", variant);

// Final certification deliberately keeps city=Rabat active so the filter-chip state is
// part of the proof. Thresholds therefore include the legitimate active-chip row while
// remaining bounded by the certified UX-SEARCH-1/2/3 density envelope.
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, columns: 2, firstTopMax: 235, cardMax: 365 },
  { name: "mobile-390x844", width: 390, height: 844, columns: 2, firstTopMax: 235, cardMax: 365 },
  { name: "tablet-768x900", width: 768, height: 900, columns: 2, firstTopMax: 250, cardMax: 535 },
  { name: "desktop-1024x800", width: 1024, height: 800, columns: 3, firstTopMax: 250, cardMax: 430 },
  { name: "desktop-1280x900", width: 1280, height: 900, columns: 4, firstTopMax: 250, cardMax: 430 },
  { name: "desktop-1440x900", width: 1440, height: 900, columns: 4, firstTopMax: 250, cardMax: 430 },
];

const neighborhoods = ["Agdal", "Hay Riad", "Souissi", "Hassan", "Océan", "Aviation", "Akkari", "Yacoub El Mansour", "Agdal", "Hay Riad", "Souissi", "Hassan"];
const propertyTypes = ["Appartement", "Villa", "Maison", "Studio", "Terrain", "Bureau", "Riad", "Appartement", "Villa", "Maison", "Studio", "Bureau"];

const listings = neighborhoods.map((neighborhood, index) => ({
  id: `ux-search-7-${index + 1}`,
  title: index % 2 === 0
    ? `Appartement lumineux avec terrasse, double orientation et vue dégagée à ${neighborhood}`
    : `Bien familial rénové proche des écoles, commerces et principaux axes de ${neighborhood}`,
  city: "Rabat",
  neighborhood,
  price: index === 10 ? 12850000 : 1180000 + index * 275000,
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
  description: "Fixture déterministe UX-SEARCH-7 pour certification visuelle finale.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 92,
  source_name: index % 3 === 0 ? "AkarFinder" : "Source partenaire",
  duplicate_score: index === 11 ? 0.72 : 0.1,
  listing_url: `https://fixture.example/rabat/${encodeURIComponent(neighborhood.toLowerCase())}/${index}`,
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
let canonicalVisualSignature = null;

const imageFixture = '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#7f99aa"/><path d="M0 390L240 170l160 150 180-120 380 340H0z" fill="#d8c6a2"/><rect x="390" y="180" width="170" height="210" rx="12" fill="#e9e4d8"/></svg>';

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  for (const pattern of ["https://commons.wikimedia.org/**", "https://upload.wikimedia.org/**"]) {
    await page.route(pattern, async (route) => {
      await route.fulfill({ status: 200, contentType: "image/svg+xml", body: imageFixture });
    });
  }
  await page.route("**/api/search?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "ux-search-7-ci", generated_at: new Date().toISOString() }),
    });
  });
  await page.route("**/api/search/gateway?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }) });
  });

  const response = await page.goto(`${baseUrl}/search?city=Rabat&view=list`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 400) failures.push(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
  await page.waitForFunction(() => document.querySelectorAll("article[data-mobile-compact-card]").length >= 12, null, { timeout: 30_000 });
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("article[data-mobile-compact-card]")).slice(0, 12);
    const grid = document.querySelector("[data-search-continuous-flow] > div.grid");
    const header = document.querySelector("[data-search-global-header]");
    const brand = document.querySelector("[data-search-header-brand]");
    const toolbar = document.querySelector("[data-search-results-toolbar]");
    const primaryRow = document.querySelector("[data-search-primary-filter-row]");
    const first = cards[0];
    const cardRects = cards.map((card) => card.getBoundingClientRect());
    const cardHeights = cardRects.map((rect) => rect.height);
    // UX-SEARCH-5 established brand → primary-filter-row as the canonical horizontal
    // alignment contract. Comparing outer section boxes would merely measure padding.
    const alignmentDelta = brand && primaryRow
      ? Math.abs(brand.getBoundingClientRect().left - primaryRow.getBoundingClientRect().left)
      : null;

    const controlSelectors = [
      "[data-search-primary-search] input",
      "[data-search-filter-trigger]",
      "[data-search-mobile-view-select]",
      "[data-search-sort-select]",
    ];
    const controls = controlSelectors.map((selector) => {
      const node = document.querySelector(selector);
      return node ? { selector, height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width } : null;
    }).filter(Boolean);

    const cardAudits = cards.map((card) => {
      const image = card.querySelector("[data-card-image]");
      const price = card.querySelector("[data-card-price]");
      const title = card.querySelector("[data-card-title]");
      const location = card.querySelector("[data-card-location]");
      const facts = card.querySelector("[data-card-facts]");
      const provenance = card.querySelector("[data-card-provenance]");
      const contextual = card.querySelector("[data-contextual-asset-id]");
      const neighborhoodPhoto = card.querySelector("[data-neighborhood-photo-id]");
      const visualClass = card.querySelector("[data-visual-inventory-class]")?.getAttribute("data-visual-inventory-class") ?? null;
      const disclosure = card.querySelector("[data-contextual-illustration-label], [data-neighborhood-photo-disclosure]");
      const nodes = [image, price, title, location, facts, provenance];
      const tops = nodes.map((node) => node?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY);
      const readingOrder = tops.every((value, index) => index === 0 || value >= tops[index - 1] - 1);
      const priceStyle = price ? getComputedStyle(price) : null;
      const titleStyle = title ? getComputedStyle(title) : null;
      const rect = card.getBoundingClientRect();
      const factsOverflow = Boolean(facts && facts.scrollWidth - facts.clientWidth > 1);
      const priceOverflow = Boolean(price && price.scrollWidth - price.clientWidth > 1);
      const locationOverflow = Boolean(location && location.getBoundingClientRect().right > rect.right + 1);
      return {
        readingOrder,
        hasAllLayers: nodes.every(Boolean),
        priceFont: priceStyle ? parseFloat(priceStyle.fontSize) : 0,
        titleFont: titleStyle ? parseFloat(titleStyle.fontSize) : 0,
        factsOverflow,
        priceOverflow,
        locationOverflow,
        visualToken: neighborhoodPhoto?.getAttribute("data-neighborhood-photo-id") ?? contextual?.getAttribute("data-contextual-asset-id") ?? visualClass ?? "none",
        visualClass,
        truthDisclosure: visualClass === "authorized_or_listing_image" || Boolean(disclosure),
        provenanceText: provenance?.textContent?.trim() ?? "",
      };
    });

    const visibleInFirstViewport = cardRects.filter((rect) => rect.top < window.innerHeight && rect.bottom > 0).length;
    const visualTokens = cardAudits.map((item) => item.visualToken);
    const distinctVisuals = new Set(visualTokens).size;
    const brokenImages = cards.flatMap((card) => Array.from(card.querySelectorAll("[data-card-image] img"))).filter((img) => !(img.complete && img.naturalWidth > 0)).length;

    return {
      cardCount: cards.length,
      columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
      rowGap: grid ? parseFloat(getComputedStyle(grid).rowGap) : null,
      columnGap: grid ? parseFloat(getComputedStyle(grid).columnGap) : null,
      firstTop: first?.getBoundingClientRect().top ?? null,
      maxCardHeight: Math.max(...cardHeights),
      headerHeight: header?.getBoundingClientRect().height ?? null,
      toolbarHeight: toolbar?.getBoundingClientRect().height ?? null,
      primaryRowHeight: primaryRow?.getBoundingClientRect().height ?? null,
      alignmentDelta,
      visibleInFirstViewport,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      brokenImages,
      controls,
      cardAudits,
      visualTokens,
      distinctVisuals,
    };
  });

  if (metrics.cardCount !== 12) failures.push(`${viewport.name}: expected 12 cards, got ${metrics.cardCount}`);
  if (metrics.columns !== viewport.columns) failures.push(`${viewport.name}: expected ${viewport.columns} columns, got ${metrics.columns}`);
  if (metrics.firstTop == null || metrics.firstTop > viewport.firstTopMax) failures.push(`${viewport.name}: first card top ${metrics.firstTop}px > ${viewport.firstTopMax}px`);
  if (metrics.maxCardHeight > viewport.cardMax) failures.push(`${viewport.name}: max card ${metrics.maxCardHeight}px > ${viewport.cardMax}px`);
  if (metrics.overflow > 1) failures.push(`${viewport.name}: horizontal overflow ${metrics.overflow}px`);
  if (metrics.brokenImages !== 0) failures.push(`${viewport.name}: broken images ${metrics.brokenImages}`);
  if (metrics.alignmentDelta == null || metrics.alignmentDelta > 1.5) failures.push(`${viewport.name}: header/search alignment delta ${metrics.alignmentDelta}px > 1.5px`);
  if (metrics.headerHeight == null || metrics.headerHeight > 55) failures.push(`${viewport.name}: header ${metrics.headerHeight}px > 55px`);
  if (metrics.cardAudits.some((item) => !item.hasAllLayers || !item.readingOrder)) failures.push(`${viewport.name}: card scan hierarchy incomplete or out of order`);
  if (metrics.cardAudits.some((item) => item.priceOverflow || item.locationOverflow || item.factsOverflow)) failures.push(`${viewport.name}: card micro-clipping detected`);
  if (metrics.cardAudits.some((item) => !item.provenanceText)) failures.push(`${viewport.name}: provenance missing on one or more cards`);
  if (metrics.cardAudits.some((item) => !item.truthDisclosure)) failures.push(`${viewport.name}: fallback visual missing truth disclosure`);
  if (metrics.cardAudits.some((item) => item.priceFont < item.titleFont * 1.08)) failures.push(`${viewport.name}: price is not visually dominant over title`);
  if (metrics.distinctVisuals < 8) failures.push(`${viewport.name}: only ${metrics.distinctVisuals}/12 distinct visual tokens`);

  if (viewport.width < 640) {
    for (const control of metrics.controls) {
      if (control.height < 47.5) failures.push(`${viewport.name}: ${control.selector} touch target ${control.height}px < 48px`);
    }
    if (metrics.rowGap == null || metrics.rowGap > 16) failures.push(`${viewport.name}: row gap ${metrics.rowGap}px > 16px`);
    if (metrics.columnGap == null || metrics.columnGap > 12) failures.push(`${viewport.name}: column gap ${metrics.columnGap}px > 12px`);
    if (metrics.visibleInFirstViewport < 4) failures.push(`${viewport.name}: only ${metrics.visibleInFirstViewport} cards intersect the first viewport`);
  }

  if (viewport.width >= 1280 && metrics.visibleInFirstViewport < 8) {
    failures.push(`${viewport.name}: fewer than 8 cards intersect the first viewport`);
  }

  const signature = metrics.visualTokens.join("|");
  if (canonicalVisualSignature == null) canonicalVisualSignature = signature;
  else if (signature !== canonicalVisualSignature) failures.push(`${viewport.name}: deterministic visual signature drifted across viewports`);

  const screenshot = path.join(outDir, `${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  results.push({ ...viewport, ...metrics, screenshot });
  await context.close();
}

await browser.close();

const mobile = results.filter((item) => item.width < 640);
const desktop = results.filter((item) => item.width >= 1024);
const contract = {
  headerNavigation: failures.filter((x) => x.includes("header") || x.includes("alignment")).length === 0,
  searchFilters: failures.filter((x) => x.includes("touch target")).length === 0,
  desktopDensity: failures.filter((x) => x.includes("desktop-") && (x.includes("columns") || x.includes("max card") || x.includes("first viewport"))).length === 0,
  cards: failures.filter((x) => x.includes("scan hierarchy") || x.includes("micro-clipping") || x.includes("price is not visually dominant")).length === 0,
  visuals: failures.filter((x) => x.includes("broken images") || x.includes("distinct visual") || x.includes("visual signature") || x.includes("truth disclosure")).length === 0,
  hierarchy: failures.filter((x) => x.includes("first card") || x.includes("price is not visually dominant")).length === 0,
  mobileTwoColumns: mobile.every((item) => item.columns === 2),
  scanSpeed: failures.filter((x) => x.includes("first viewport") || x.includes("row gap") || x.includes("column gap") || x.includes("first card")).length === 0,
  trustTransparency: failures.filter((x) => x.includes("provenance") || x.includes("truth disclosure")).length === 0,
};
const contractPassCount = Object.values(contract).filter(Boolean).length;
const machineScore = (contractPassCount / Object.keys(contract).length) * 10;
const report = {
  variant,
  baseUrl,
  machineScore,
  contract,
  failures,
  summary: {
    mobileFirstTopMax: Math.max(...mobile.map((item) => item.firstTop)),
    desktopFirstTopMax: Math.max(...desktop.map((item) => item.firstTop)),
    mobileCardMax: Math.max(...mobile.map((item) => item.maxCardHeight)),
    desktopCardMax: Math.max(...desktop.map((item) => item.maxCardHeight)),
    minDistinctVisuals: Math.min(...results.map((item) => item.distinctVisuals)),
    maxAlignmentDelta: Math.max(...results.map((item) => item.alignmentDelta)),
    maxHeaderHeight: Math.max(...results.map((item) => item.headerHeight)),
  },
  viewports: results,
};

await fs.writeFile(path.join(outDir, "metrics.json"), JSON.stringify(report, null, 2));
await fs.writeFile(
  path.join(outDir, "report.md"),
  `# UX-SEARCH-7 Final Visual Certification — ${variant}\n\nMachine contract: **${machineScore.toFixed(1)}/10** (${contractPassCount}/${Object.keys(contract).length} axes)\n\n${failures.length ? failures.map((item) => `- FAIL: ${item}`).join("\n") : "- PASS: all nine final Search axes satisfy the objective visual/interaction contract."}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (failures.length || machineScore < 9) process.exit(1);
