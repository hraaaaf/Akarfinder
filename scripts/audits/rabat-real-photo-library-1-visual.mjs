import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.RABAT_REAL_PHOTO_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/rabat-real-photo-library-1";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-768x900", width: 768, height: 900 },
  { name: "desktop-1280x900", width: 1280, height: 900 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const districts = ["Agdal", "Hay Riad", "Souissi", "Océan", "Hassan"];

function makeListing(district, index) {
  return {
    id: `rabat-${district.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    title: `Appartement témoin ${district} ${index}`,
    city: "Rabat",
    neighborhood: district,
    price: 1_600_000 + index * 125_000,
    currency: "DH",
    surface_m2: 92 + index * 8,
    price_per_m2: 17_500,
    property_type: index % 2 === 0 ? "Appartement" : "Villa",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 1,
    freshness_label: "Récent",
    source_type: "Source analysée",
    reliability_label: "Infos limitées",
    reliability_score: 62,
    reliability_available: true,
    is_mre_friendly: false,
    description: "Fixture visuelle Rabat real-photo library.",
    image_url: "",
    reliability_explanation: "Fixture CI",
    listing_url: `https://example.com/rabat/${encodeURIComponent(district)}/${index}`,
    source_name: "Fixture public source",
    source_access_level: "indexed_only",
    image_permission_status: "unknown",
    main_image_url: null,
    display_images: { policy: "no_listing_image", urls: [] },
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    production_allowed: true,
    result_origin: "public_sitemap",
    search_result_display_mode: "indexed_result",
    source_badge: "public_indexed",
    original_source_required: true,
    allowed_ctas: ["view_original"],
  };
}

const listings = districts.flatMap((district) => [makeListing(district, 0), makeListing(district, 1)]);

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

async function hydrate(page) {
  const cards = page.locator('[data-mobile-compact-card]');
  await page.waitForFunction(() => document.querySelectorAll('[data-mobile-compact-card]').length === 10, { timeout: 20_000 });
  for (let index = 0; index < 10; index += 1) {
    await cards.nth(index).scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
  }
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('img[data-neighborhood-photo-id]')];
    return images.length === 10 && images.every((image) => image.complete && image.naturalWidth > 0);
  }, { timeout: 35_000 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(150);
}

async function metrics(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-mobile-compact-card]')];
    const photos = [...document.querySelectorAll('img[data-neighborhood-photo-id]')];
    const titles = [...document.querySelectorAll('[data-neighborhood-photo-title]')];
    const disclosures = [...document.querySelectorAll('[data-neighborhood-photo-disclosure]')];
    const credits = [...document.querySelectorAll('[data-neighborhood-photo-credit]')];
    const grid = cards[0]?.parentElement;
    const columns = grid ? getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length : 0;
    const clipped = [...titles, ...disclosures].filter((node) => node.scrollWidth > node.clientWidth + 1).length;
    return {
      cardCount: cards.length,
      photoCount: photos.length,
      titles: titles.map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim()),
      disclosures: disclosures.map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim()),
      districts: photos.map((node) => node.getAttribute('data-neighborhood-photo-district')),
      ids: photos.map((node) => node.getAttribute('data-neighborhood-photo-id')),
      credits: credits.length,
      columns,
      clipped,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.route("**/api/search?**", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ listings, total: listings.length, limit: 100, offset: 0, source: "rabat-real-photo-ci", generated_at: new Date().toISOString() }),
    }));
    await page.route("**/api/search/gateway?**", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, degraded: false, results_count: 0, total_count: 0, results: [], sources_queried: [] }),
    }));

    try {
      const response = await page.goto(`${baseUrl}/search?city=Rabat`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: search returned ${response?.status() ?? "no response"}`);
      await hydrate(page);
      const measured = await metrics(page);

      if (measured.cardCount !== 10 || measured.photoCount !== 10 || measured.credits !== 10) throw new Error(`${viewport.name}: expected 10 photo cards with credits`);
      if (measured.disclosures.some((value) => value !== "Photo d’ambiance")) throw new Error(`${viewport.name}: disclosure drift`);
      if (measured.titles.some((value) => !value.startsWith("Rabat • "))) throw new Error(`${viewport.name}: district title drift`);
      for (const district of districts) {
        if (measured.districts.filter((value) => value === district).length !== 2) throw new Error(`${viewport.name}: ${district} district mapping drift`);
      }
      if (viewport.width <= 390 && measured.columns !== 2) throw new Error(`${viewport.name}: mobile grid must have 2 columns, got ${measured.columns}`);
      if (measured.scrollWidth > measured.clientWidth || measured.clipped > 0) throw new Error(`${viewport.name}: overflow or neighborhood-photo text clipping`);

      const stableIds = measured.ids;
      await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
      await hydrate(page);
      const reloaded = await metrics(page);
      if (JSON.stringify(reloaded.ids) !== JSON.stringify(stableIds)) throw new Error(`${viewport.name}: photo assignment changed after reload`);
      if (viewport.width <= 390 && reloaded.columns !== 2) throw new Error(`${viewport.name}: mobile 2-column layout drift after reload`);

      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      results.push({
        name: viewport.name,
        cards: measured.cardCount,
        photos_loaded: measured.photoCount,
        mobile_columns: viewport.width <= 390 ? measured.columns : null,
        stable_after_reload: true,
        clipped_labels: 0,
        horizontal_overflow: false,
      });
    } catch (error) {
      failure = error;
      break;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(`${outputDir}/visual-metrics.json`, `${JSON.stringify({ generated_at: new Date().toISOString(), results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`, "utf8");
console.log(JSON.stringify(results, null, 2));
if (failure) throw failure;
