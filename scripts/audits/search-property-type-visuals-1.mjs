import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3141";
const outDir = process.env.AUDIT_DIR ?? path.join("data", "audits", "search-property-type-visuals-1");
const targetSha256 = "004b46faab6a642674b9dac1eb623599418c3e22564884e38f2304725ce0909a";

const viewports = [
  { name: "mobile-390x844", width: 390, height: 844, columns: 2 },
  { name: "mobile-430x932", width: 430, height: 932, columns: 2 },
  { name: "tablet-768x900", width: 768, height: 900, columns: 2 },
  { name: "desktop-1280x900", width: 1280, height: 900, columns: 4 },
];
const expected = [
  ["apartment", "Appartement", "rgb(23, 105, 224)"],
  ["villa", "Villa", "rgb(22, 132, 58)"],
  ["land", "Terrain", "rgb(234, 106, 0)"],
  ["office", "Bureau", "rgb(115, 82, 199)"],
  ["commercial", "Local commercial", "rgb(0, 140, 163)"],
  ["riad", "Riad", "rgb(185, 130, 19)"],
];
const defs = [
  ["Appartement", "Appartement à vendre à Maarif", "Maarif", 1350000, 112, 3, 2],
  ["Villa", "Villa à vendre à Californie", "Californie", 2950000, 240, 4, 3],
  ["Terrain", "Terrain à vendre à Sidi Maarouf", "Sidi Maarouf", 980000, 500, 0, 0],
  ["Bureau", "Bureau à vendre à Anfa", "Anfa", 1750000, 160, 0, 0],
  ["Bureau", "Local commercial à vendre à Gauthier", "Gauthier", 2100000, 120, 0, 1],
  ["Riad", "Riad à vendre à Médina", "Médina", 3800000, 190, 5, 4],
];
const listings = defs.map(([property_type, title, neighborhood, price, surface_m2, bedrooms, bathrooms], index) => ({
  id: `property-visual-${index + 1}`,
  title,
  city: index === 5 ? "Marrakech" : "Casablanca",
  neighborhood,
  price,
  currency: "DH",
  surface_m2,
  price_per_m2: Math.round(price / surface_m2),
  property_type,
  transaction_type: "buy",
  bedrooms,
  bathrooms,
  freshness_label: "Récent",
  source_type: "Source publique",
  source_name: "Source publique",
  reliability_label: "Source indexée",
  reliability_score: 70,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture déterministe du système visuel par type de bien.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 82,
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

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.route("**/api/search?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ listings, total: 6, limit: 100, offset: 0, source: "property-type-visual-ci", generated_at: new Date().toISOString() }),
  }));
  await page.route("**/api/search/gateway?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }),
  }));

  const response = await page.goto(`${baseUrl}/search?city=Casablanca&view=list`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 400) failures.push(`${viewport.name}: search HTTP ${response?.status() ?? "none"}`);
  await page.waitForFunction(() => document.querySelectorAll("[data-search-listing-card]").length >= 6, null, { timeout: 30_000 });
  await page.waitForTimeout(350);

  const metrics = await page.evaluate(({ expected }) => {
    const cards = Array.from(document.querySelectorAll("[data-search-listing-card]")).slice(0, 6);
    const grid = document.querySelector("[data-search-continuous-flow] > div.grid");
    const overlap = (a, b) => Boolean(a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom));
    const audits = cards.map((card, index) => {
      const artwork = card.querySelector("[data-indexed-property-artwork]");
      const image = card.querySelector("[data-card-image]");
      const favorite = card.querySelector("[data-card-favorite]");
      const price = card.querySelector("[data-card-price]");
      const provenance = card.querySelector("[data-card-provenance]");
      const [key, expectedLabel] = expected[index];
      const label = artwork ? Array.from(artwork.querySelectorAll("div")).find((n) => n.textContent?.trim().toLowerCase() === expectedLabel.toLowerCase()) : null;
      const centerDisclosure = artwork ? Array.from(artwork.querySelectorAll("div")).find((n) => n.textContent?.trim().toLowerCase() === "annonce indexée" && getComputedStyle(n).display !== "none") : null;
      const ir = image?.getBoundingClientRect();
      const lr = label?.getBoundingClientRect();
      const fr = favorite?.getBoundingClientRect();
      const footerText = provenance?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const afterText = provenance ? getComputedStyle(provenance.querySelector("span:first-child"), "::after").content : "";
      const sourceNode = provenance?.querySelector("[data-public-attribution]");
      const sourceAfter = sourceNode ? getComputedStyle(sourceNode, "::after").content : "";
      return {
        key: artwork?.getAttribute("data-indexed-property-artwork") ?? null,
        label: label?.textContent?.trim() ?? null,
        priceColor: price ? getComputedStyle(price).color : null,
        thirdPartyImgs: artwork?.querySelectorAll("img").length ?? 0,
        labelInside: Boolean(ir && lr && lr.left >= ir.left && lr.right <= ir.right && lr.top >= ir.top && lr.bottom <= ir.bottom),
        labelFavoriteOverlap: overlap(lr, fr),
        centerDisclosureVisible: Boolean(centerDisclosure),
        footerIndexed: footerText.includes("Annonce indexée") || afterText.includes("Annonce indexée"),
        footerSource: footerText.includes("Voir sur la source") || sourceAfter.includes("Voir sur la source"),
        hierarchy: ["[data-card-price]", "[data-card-title]", "[data-card-location]", "[data-card-facts]", "[data-card-provenance]"].every((selector) => Boolean(card.querySelector(selector))),
        finiteImage: Boolean(ir && ir.width > 0 && ir.height > 0 && Number.isFinite(ir.width) && Number.isFinite(ir.height)),
        expectedKey: key,
      };
    });
    return {
      cardCount: cards.length,
      columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
      overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      uniqueKeys: new Set(audits.map((item) => item.key)).size,
      cards: audits,
    };
  }, { expected });

  if (metrics.cardCount !== 6) failures.push(`${viewport.name}: expected 6 cards, got ${metrics.cardCount}`);
  if (metrics.columns !== viewport.columns) failures.push(`${viewport.name}: expected ${viewport.columns} columns, got ${metrics.columns}`);
  if (metrics.overflow > 1) failures.push(`${viewport.name}: horizontal overflow ${metrics.overflow}px`);
  if (metrics.uniqueKeys !== 6) failures.push(`${viewport.name}: expected 6 unique artwork keys, got ${metrics.uniqueKeys}`);

  metrics.cards.forEach((card, index) => {
    const [key, label, color] = expected[index];
    if (card.key !== key) failures.push(`${viewport.name}: ${index + 1} key ${card.key} != ${key}`);
    if (card.label?.toLowerCase() !== label.toLowerCase()) failures.push(`${viewport.name}: ${key} label drift`);
    if (card.priceColor !== color) failures.push(`${viewport.name}: ${key} color ${card.priceColor} != ${color}`);
    if (card.thirdPartyImgs !== 0) failures.push(`${viewport.name}: ${key} contains img element`);
    if (!card.labelInside || !card.finiteImage) failures.push(`${viewport.name}: ${key} geometry invalid`);
    if (card.labelFavoriteOverlap) failures.push(`${viewport.name}: ${key} label/favorite collision`);
    if (card.centerDisclosureVisible) failures.push(`${viewport.name}: ${key} centered indexed disclosure diverges from TARGET`);
    if (!card.footerIndexed || !card.footerSource) failures.push(`${viewport.name}: ${key} TARGET footer missing`);
    if (!card.hierarchy) failures.push(`${viewport.name}: ${key} hierarchy incomplete`);
  });

  const screenshot = path.join(outDir, `${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  results.push({ ...viewport, ...metrics, screenshot });
  await context.close();
}
await browser.close();

const axes = {
  sixFamilies: !failures.some((x) => x.includes("key") || x.includes("expected 6") || x.includes("label drift")),
  colors: !failures.some((x) => x.includes(" color ")),
  proprietaryArtwork: !failures.some((x) => x.includes("contains img")),
  targetGeometry: !failures.some((x) => x.includes("geometry") || x.includes("collision") || x.includes("overflow") || x.includes("centered")),
  targetCardHierarchy: !failures.some((x) => x.includes("footer") || x.includes("hierarchy") || x.includes("columns")),
};
const machineScore = (Object.values(axes).filter(Boolean).length / 5) * 10;
const report = { target: { sha256: targetSha256, dimensions: "1448x1086" }, machineScore, axes, failures, viewports: results, note: "Machine 10/10 is a contract score only. Final visual fidelity requires inspection against the locked TARGET." };
await fs.writeFile(path.join(outDir, "metrics.json"), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(outDir, "report.md"), `# Search Property Type Visuals\n\nMachine contract: **${machineScore.toFixed(1)}/10**\nTARGET: \`${targetSha256}\`\n\n${failures.length ? failures.map((x) => `- FAIL: ${x}`).join("\n") : "- PASS: locked TARGET machine contract satisfied."}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length || machineScore < 10) process.exit(1);
