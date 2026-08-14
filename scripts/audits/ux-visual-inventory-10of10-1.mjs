import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3171";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-visual-inventory-10of10-1", variant);
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "mobile-390x844", width: 390, height: 844, expectedColumns: 2 },
  { name: "tablet-768x900", width: 768, height: 900, expectedColumns: 2 },
  { name: "desktop-1440x900", width: 1440, height: 900, expectedColumns: 4 },
];

const neighborhoods = [
  "Agdal",
  "Hay Riad",
  "Souissi",
  "Hassan",
  "Océan",
  "Aviation",
  "Akkari",
  "Yacoub El Mansour",
  "Agdal",
  "Hay Riad",
  "Souissi",
  "Hassan",
];
const supportedDistricts = new Set([
  "Agdal",
  "Akkari",
  "Aviation",
  "Hay Riad",
  "Souissi",
  "Océan",
  "Hassan",
  "Les Orangers",
  "Médina",
  "Yacoub El Mansour",
]);
const propertyTypes = ["Appartement", "Villa", "Maison", "Studio", "Terrain", "Bureau", "Riad", "Appartement", "Villa", "Maison", "Studio", "Bureau"];

const listings = neighborhoods.map((neighborhood, index) => ({
  id: `ux-visual-inventory-${index + 1}`,
  title: index % 2 === 0
    ? `Bien lumineux avec terrasse à ${neighborhood}`
    : `Bien familial rénové à ${neighborhood}`,
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
  description: "Fixture déterministe UX-VISUAL-INVENTORY-10OF10-1.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 92,
  source_name: index % 3 === 0 ? "AkarFinder" : "Source partenaire",
  duplicate_score: 0.1,
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

const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];
let canonicalSignature = null;

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Deliberately DO NOT intercept certified real-photo requests. This gate exists
    // to prove the actual photographic inventory rather than the synthetic SVG
    // used by the broad UX-SEARCH-7 stability gate.
    await page.route("**/api/search?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          listings,
          total: listings.length,
          limit: 100,
          offset: 0,
          source: "ux-visual-inventory-real-photo-fixture",
          generated_at: new Date().toISOString(),
        }),
      });
    });
    await page.route("**/api/search/gateway?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }),
      });
    });

    const response = await page.goto(`${baseUrl}/search?city=Rabat&view=list`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    if (!response || response.status() >= 400) {
      failures.push(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
    }

    await page.waitForFunction(
      () => document.querySelectorAll("[data-search-listing-card]").length >= 12,
      null,
      { timeout: 30_000 },
    );

    await page.waitForFunction(
      () => {
        const cards = [...document.querySelectorAll("[data-search-listing-card]")].slice(0, 12);
        return cards.length === 12 && cards.every((card) => {
          const image = card.querySelector("[data-neighborhood-photo-frame] img");
          return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
        });
      },
      null,
      { timeout: 30_000 },
    ).catch(() => {});
    await page.waitForTimeout(800);

    const metrics = await page.evaluate(({ neighborhoods, supportedDistricts }) => {
      const cards = [...document.querySelectorAll("[data-search-listing-card]")].slice(0, 12);
      const firstTop = cards[0]?.getBoundingClientRect().top ?? null;
      const firstRow = firstTop == null
        ? []
        : cards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstTop) <= 3);

      const records = cards.map((card, index) => {
        const photo = card.querySelector("[data-neighborhood-photo-frame] img");
        const contextual = card.querySelector('[data-visual-inventory-class="contextual_illustration"]');
        const generic = card.querySelector('[data-visual-inventory-class="generic_illustration"]');
        const title = card.querySelector("[data-neighborhood-photo-title]")?.textContent?.trim() ?? "";
        const disclosure = card.querySelector("[data-neighborhood-photo-disclosure]")?.textContent?.trim() ?? "";
        const credit = card.querySelector("[data-neighborhood-photo-credit]");
        const image = photo instanceof HTMLImageElement ? photo : null;
        const expectedDistrict = neighborhoods[index];
        const exactExpected = supportedDistricts.includes(expectedDistrict);
        return {
          expectedDistrict,
          exactExpected,
          photoId: photo?.getAttribute("data-neighborhood-photo-id") ?? null,
          photoDistrict: photo?.getAttribute("data-neighborhood-photo-district") ?? null,
          src: image?.currentSrc || image?.src || "",
          complete: Boolean(image?.complete),
          naturalWidth: image?.naturalWidth ?? 0,
          title,
          disclosure,
          hasCredit: Boolean(credit),
          contextual: Boolean(contextual),
          generic: Boolean(generic),
        };
      });

      return {
        cardCount: cards.length,
        columns: firstRow.length,
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        records,
        distinctPhotoIds: new Set(records.map((record) => record.photoId).filter(Boolean)).size,
        distinctSourceUrls: new Set(records.map((record) => record.src).filter(Boolean)).size,
        realPhotoCount: records.filter((record) => record.photoId).length,
        brokenImages: records.filter((record) => !record.complete || record.naturalWidth <= 0).length,
        contextualCount: records.filter((record) => record.contextual).length,
        genericCount: records.filter((record) => record.generic).length,
        disclosureCount: records.filter((record) => record.disclosure.includes("Photo d’ambiance")).length,
        creditCount: records.filter((record) => record.hasCredit).length,
      };
    }, { neighborhoods, supportedDistricts: [...supportedDistricts] });

    const localFailures = [];
    if (metrics.cardCount !== 12) localFailures.push(`expected 12 cards, got ${metrics.cardCount}`);
    if (metrics.columns !== viewport.expectedColumns) localFailures.push(`expected ${viewport.expectedColumns} columns, got ${metrics.columns}`);
    if (metrics.overflow > 1) localFailures.push(`horizontal overflow ${metrics.overflow}px`);
    if (metrics.realPhotoCount !== 12) localFailures.push(`real-photo coverage ${metrics.realPhotoCount}/12`);
    if (metrics.brokenImages !== 0) localFailures.push(`broken real photos ${metrics.brokenImages}`);
    if (metrics.contextualCount !== 0) localFailures.push(`contextual illustrations still visible ${metrics.contextualCount}`);
    if (metrics.genericCount !== 0) localFailures.push(`generic illustrations still visible ${metrics.genericCount}`);
    if (metrics.distinctPhotoIds < 10) localFailures.push(`only ${metrics.distinctPhotoIds}/12 distinct photo IDs`);
    if (metrics.distinctSourceUrls < 10) localFailures.push(`only ${metrics.distinctSourceUrls}/12 distinct real source URLs`);
    if (metrics.disclosureCount !== 12) localFailures.push(`photo ambience disclosure ${metrics.disclosureCount}/12`);
    if (metrics.creditCount !== 12) localFailures.push(`photo credit/license links ${metrics.creditCount}/12`);

    for (const record of metrics.records) {
      const isCommons = record.src.startsWith("https://commons.wikimedia.org/");
      const isCertifiedLocal = record.src.startsWith(`${baseUrl}/neighborhood-visuals/`);
      if (!isCommons && !isCertifiedLocal) {
        localFailures.push(`${record.expectedDistrict}: unsupported real-photo source ${record.src || "missing"}`);
      }
      if (record.exactExpected) {
        if (!record.title.includes(record.expectedDistrict)) {
          localFailures.push(`${record.expectedDistrict}: exact district photo title lost truth context (${record.title})`);
        }
      } else if (record.title !== "Rabat") {
        localFailures.push(`${record.expectedDistrict}: city fallback must disclose only Rabat, got ${record.title}`);
      }
    }

    const signature = metrics.records.map((record) => record.photoId).join("|");
    if (canonicalSignature == null) canonicalSignature = signature;
    else if (signature !== canonicalSignature) localFailures.push("deterministic photo signature drifted across viewports");

    await page.screenshot({
      path: path.join(outDir, `${viewport.name}.png`),
      fullPage: false,
    });

    results.push({ viewport, metrics, failures: localFailures });
    for (const failure of localFailures) failures.push(`${viewport.name}: ${failure}`);
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  lot: "UX-VISUAL-INVENTORY-10OF10-1",
  variant,
  baseUrl,
  generatedAt: new Date().toISOString(),
  score: failures.length === 0 ? 10 : Math.max(0, Number((10 - failures.length * 0.5).toFixed(1))),
  failures,
  results,
};

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(
  path.join(outDir, "summary.txt"),
  failures.length === 0
    ? `UX-VISUAL-INVENTORY-10OF10-1 ${variant}: PASS 10/10\n`
    : `UX-VISUAL-INVENTORY-10OF10-1 ${variant}: FAIL\n${failures.join("\n")}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
console.log("UX-VISUAL-INVENTORY-10OF10-1 real-photo certification passed at 10/10.");
