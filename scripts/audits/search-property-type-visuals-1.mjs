import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3141";
const outDir = process.env.AUDIT_DIR ?? path.join("data", "audits", "search-property-type-visuals-1");

const viewports = [
  { name: "mobile-390x844", width: 390, height: 844, columns: 2 },
  { name: "mobile-430x932", width: 430, height: 932, columns: 2 },
  { name: "tablet-768x900", width: 768, height: 900, columns: 2 },
  { name: "desktop-1280x900", width: 1280, height: 900, columns: 4 },
];

const expected = [
  { key: "apartment", label: "Appartement", color: "rgb(23, 105, 224)" },
  { key: "villa", label: "Villa", color: "rgb(22, 132, 58)" },
  { key: "land", label: "Terrain", color: "rgb(234, 106, 0)" },
  { key: "office", label: "Bureau", color: "rgb(115, 82, 199)" },
  { key: "commercial", label: "Local commercial", color: "rgb(0, 140, 163)" },
  { key: "riad", label: "Riad", color: "rgb(185, 130, 19)" },
];

const fixtureDefinitions = [
  { propertyType: "Appartement", title: "Appartement à vendre à Maarif", neighborhood: "Maarif", price: 1350000, surface: 112, bedrooms: 3, bathrooms: 2 },
  { propertyType: "Villa", title: "Villa à vendre à Californie", neighborhood: "Californie", price: 2950000, surface: 240, bedrooms: 4, bathrooms: 3 },
  { propertyType: "Terrain", title: "Terrain à vendre à Sidi Maarouf", neighborhood: "Sidi Maarouf", price: 980000, surface: 500, bedrooms: 0, bathrooms: 0 },
  { propertyType: "Bureau", title: "Bureau à vendre à Anfa", neighborhood: "Anfa", price: 1750000, surface: 160, bedrooms: 0, bathrooms: 0 },
  // Current business taxonomy has no Local commercial enum. The presentation resolver
  // intentionally derives this visual family from certified listing text without changing DB types.
  { propertyType: "Bureau", title: "Local commercial à vendre à Gauthier", neighborhood: "Gauthier", price: 2100000, surface: 120, bedrooms: 0, bathrooms: 1 },
  { propertyType: "Riad", title: "Riad à vendre à Médina", neighborhood: "Médina", price: 3800000, surface: 190, bedrooms: 5, bathrooms: 4 },
];

const listings = fixtureDefinitions.map((item, index) => ({
  id: `property-visual-${index + 1}`,
  title: item.title,
  city: index === 5 ? "Marrakech" : "Casablanca",
  neighborhood: item.neighborhood,
  price: item.price,
  currency: "DH",
  surface_m2: item.surface,
  price_per_m2: Math.round(item.price / item.surface),
  property_type: item.propertyType,
  // Deliberately identical across all six cards: the visual distinction must come from property type.
  transaction_type: "buy",
  bedrooms: item.bedrooms,
  bathrooms: item.bathrooms,
  freshness_label: "Récent",
  source_type: "Source publique",
  reliability_label: "Source indexée",
  reliability_score: 70,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture déterministe de certification du système visuel par type de bien.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 82,
  source_name: "Source publique",
  duplicate_score: 0.05,
  listing_url: `https://fixture.example/property-visual/${index + 1}`,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
  source_access_level: "indexed_only",
  acquisition_channel: "external_index",
  origin_type: "external_index",
  allowed_ctas: ["view_original", "view_source"],
}));

function intersects(a, b) {
  if (!a || !b) return false;
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

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
    body: JSON.stringify({
      listings,
      total: listings.length,
      limit: 100,
      offset: 0,
      source: "search-property-type-visuals-ci",
      generated_at: new Date().toISOString(),
    }),
  }));
  await page.route("**/api/search/gateway?**", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }),
  }));

  const response = await page.goto(`${baseUrl}/search?city=Casablanca&view=list`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 400) failures.push(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
  await page.waitForFunction(() => document.querySelectorAll("[data-search-listing-card]").length >= 6, null, { timeout: 30_000 });
  await page.waitForTimeout(350);

  const metrics = await page.evaluate(({ expected }) => {
    const cards = Array.from(document.querySelectorAll("[data-search-listing-card]")).slice(0, 6);
    const grid = document.querySelector("[data-search-continuous-flow] > div.grid");
    const overlap = (a, b) => {
      if (!a || !b) return false;
      return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    };
    const cardAudits = cards.map((card, index) => {
      const artwork = card.querySelector("[data-indexed-property-artwork]");
      const price = card.querySelector("[data-card-price]");
      const favorite = card.querySelector("[data-card-favorite]");
      const image = card.querySelector("[data-card-image]");
      const textNodes = artwork ? Array.from(artwork.querySelectorAll("div")) : [];
      const expectedLabel = expected[index]?.label ?? "";
      const typeLabel = textNodes.find((node) => node.textContent?.trim().toLocaleLowerCase("fr") === expectedLabel.toLocaleLowerCase("fr"));
      const indexedDisclosure = textNodes.find((node) => node.textContent?.trim().toLocaleLowerCase("fr") === "annonce indexée");
      const imageRect = image?.getBoundingClientRect() ?? null;
      const typeRect = typeLabel?.getBoundingClientRect() ?? null;
      const disclosureRect = indexedDisclosure?.getBoundingClientRect() ?? null;
      const favoriteRect = favorite?.getBoundingClientRect() ?? null;
      const artworkImgs = artwork ? artwork.querySelectorAll("img").length : 0;
      return {
        key: artwork?.getAttribute("data-indexed-property-artwork") ?? null,
        label: typeLabel?.textContent?.trim() ?? null,
        priceColor: price ? getComputedStyle(price).color : null,
        artworkImgs,
        typeInsideImage: Boolean(typeRect && imageRect && typeRect.left >= imageRect.left && typeRect.right <= imageRect.right && typeRect.top >= imageRect.top && typeRect.bottom <= imageRect.bottom),
        disclosureInsideImage: Boolean(disclosureRect && imageRect && disclosureRect.left >= imageRect.left && disclosureRect.right <= imageRect.right && disclosureRect.top >= imageRect.top && disclosureRect.bottom <= imageRect.bottom),
        typeDisclosureOverlap: overlap(typeRect, disclosureRect),
        typeFavoriteOverlap: overlap(typeRect, favoriteRect),
        disclosureFavoriteOverlap: overlap(disclosureRect, favoriteRect),
        finiteRect: Boolean(imageRect && Number.isFinite(imageRect.width) && Number.isFinite(imageRect.height) && imageRect.width > 0 && imageRect.height > 0),
        hasPrice: Boolean(price?.textContent?.trim()),
        hasTitle: Boolean(card.querySelector("[data-card-title]")?.textContent?.trim()),
        hasLocation: Boolean(card.querySelector("[data-card-location]")?.textContent?.trim()),
        hasFacts: Boolean(card.querySelector("[data-card-facts]")),
        hasProvenance: Boolean(card.querySelector("[data-card-provenance]")),
      };
    });
    return {
      cardCount: cards.length,
      columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      uniqueKeys: new Set(cardAudits.map((item) => item.key)).size,
      cards: cardAudits,
    };
  }, { expected });

  if (metrics.cardCount !== 6) failures.push(`${viewport.name}: expected 6 cards, got ${metrics.cardCount}`);
  if (metrics.columns !== viewport.columns) failures.push(`${viewport.name}: expected ${viewport.columns} columns, got ${metrics.columns}`);
  if (metrics.scrollWidth > metrics.clientWidth + 1) failures.push(`${viewport.name}: horizontal overflow ${metrics.scrollWidth - metrics.clientWidth}px`);
  if (metrics.uniqueKeys !== 6) failures.push(`${viewport.name}: expected 6 unique property visuals, got ${metrics.uniqueKeys}`);

  metrics.cards.forEach((card, index) => {
    const exp = expected[index];
    if (card.key !== exp.key) failures.push(`${viewport.name}: card ${index + 1} expected ${exp.key}, got ${card.key}`);
    if (card.label?.toLocaleLowerCase("fr") !== exp.label.toLocaleLowerCase("fr")) failures.push(`${viewport.name}: card ${index + 1} label drift (${card.label ?? "missing"})`);
    if (card.priceColor !== exp.color) failures.push(`${viewport.name}: ${exp.key} price color ${card.priceColor} != ${exp.color}`);
    if (card.artworkImgs !== 0) failures.push(`${viewport.name}: ${exp.key} indexed artwork contains third-party img element`);
    if (!card.typeInsideImage || !card.disclosureInsideImage || !card.finiteRect) failures.push(`${viewport.name}: ${exp.key} artwork geometry invalid`);
    if (card.typeDisclosureOverlap || card.typeFavoriteOverlap || card.disclosureFavoriteOverlap) failures.push(`${viewport.name}: ${exp.key} top-layer collision`);
    if (!card.hasPrice || !card.hasTitle || !card.hasLocation || !card.hasFacts || !card.hasProvenance) failures.push(`${viewport.name}: ${exp.key} card hierarchy incomplete`);
  });

  const screenshot = path.join(outDir, `${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  results.push({ ...viewport, ...metrics, screenshot });
  await context.close();
}

await browser.close();

const axes = {
  sixFamilies: failures.filter((item) => item.includes("expected 6") || item.includes("card ")).length === 0,
  canonicalColors: failures.filter((item) => item.includes("price color")).length === 0,
  proprietaryArtwork: failures.filter((item) => item.includes("third-party img")).length === 0,
  geometry: failures.filter((item) => item.includes("geometry") || item.includes("collision") || item.includes("overflow") || item.includes("columns")).length === 0,
  hierarchy: failures.filter((item) => item.includes("hierarchy")).length === 0,
};
const machineScore = (Object.values(axes).filter(Boolean).length / Object.keys(axes).length) * 10;
const report = {
  target: {
    sha256: "004b46faab6a642674b9dac1eb623599418c3e22564884e38f2304725ce0909a",
    dimensions: "1448x1086",
  },
  machineScore,
  axes,
  failures,
  viewports: results,
  note: "Machine score certifies implementation contracts only; final TARGET fidelity score requires human visual comparison.",
};

await fs.writeFile(path.join(outDir, "metrics.json"), JSON.stringify(report, null, 2));
await fs.writeFile(
  path.join(outDir, "report.md"),
  `# Search Property Type Visuals certification\n\nMachine contract: **${machineScore.toFixed(1)}/10**\n\nTARGET SHA-256: \`${report.target.sha256}\`\n\n${failures.length ? failures.map((item) => `- FAIL: ${item}`).join("\n") : "- PASS: six-family machine contract satisfied."}\n\nFinal visual fidelity to TARGET is scored separately after screenshot inspection.\n`,
);
console.log(JSON.stringify(report, null, 2));
if (failures.length || machineScore < 10) process.exit(1);
