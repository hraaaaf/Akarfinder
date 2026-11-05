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
    source_name: "akarfinder",
    acquisition_channel: "first_party_user",
    source_access_level: "indexed_only",
    image_permission_status: "unknown",
    main_image_url: null,
    display_images: { policy: "no_listing_image", urls: [] },
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    production_allowed: true,
    result_origin: "first_party_user",
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
    const images = [...document.querySelectorAll('img[data-property-visual-family]')];
    return images.length === 10 && images.every((image) => image.complete && image.naturalWidth > 0);
  }, { timeout: 35_000 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(150);
}

async function metrics(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-mobile-compact-card]')];
    const images = [...document.querySelectorAll('img[data-property-visual-family]')];
    const disclosures = [...document.querySelectorAll('[data-property-artwork-disclosure]')];
    const forbiddenAmbience = document.querySelectorAll('[data-neighborhood-photo-id],[data-neighborhood-photo-credit],[data-neighborhood-photo-title]').length;
    const grid = cards[0]?.parentElement;
    const columns = grid ? getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length : 0;
    const clipped = disclosures.filter((node) => node.scrollWidth > node.clientWidth + 1).length;
    return {
      cardCount: cards.length,
      imageCount: images.length,
      imageSources: images.map((node) => node.getAttribute('src')),
      imageLoaded: images.every((node) => node.complete && node.naturalWidth > 0),
      families: images.map((node) => node.getAttribute('data-property-visual-family')),
      disclosures: disclosures.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()),
      forbiddenAmbience,
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

      if (measured.cardCount !== 10 || measured.imageCount !== 10 || !measured.imageLoaded) throw new Error(`${viewport.name}: expected ten canonical property illustrations loaded`);
      if (measured.forbiddenAmbience !== 0) throw new Error(`${viewport.name}: neighborhood photos leaked into property cards`);
      if (measured.disclosures.length !== 10 || measured.disclosures.some((value) => value !== "Visuel illustratif")) throw new Error(`${viewport.name}: property artwork disclosure drift`);
      const expectedFamilies = Array.from({length: 10}, (_, index) => index % 2 === 0 ? "apartment" : "villa");
      if (JSON.stringify(measured.families) !== JSON.stringify(expectedFamilies)) throw new Error(`${viewport.name}: structured property family mapping drift`);
      if (measured.imageSources.some((src, index) => src !== `/visuals/property-types/target/${expectedFamilies[index]}.svg`)) throw new Error(`${viewport.name}: noncanonical property artwork URL`);
      if (viewport.width <= 390 && measured.columns !== 2) throw new Error(`${viewport.name}: mobile grid must have 2 columns, got ${measured.columns}`);
      if (measured.scrollWidth > measured.clientWidth || measured.clipped > 0) throw new Error(`${viewport.name}: overflow or canonical disclosure clipping`);

      const stableIds = measured.imageSources;
      await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
      await hydrate(page);
      const reloaded = await metrics(page);
      if (JSON.stringify(reloaded.imageSources) !== JSON.stringify(stableIds)) throw new Error(`${viewport.name}: canonical property artwork changed after reload`);
      if (viewport.width <= 390 && reloaded.columns !== 2) throw new Error(`${viewport.name}: mobile 2-column layout drift after reload`);

      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      results.push({
        name: viewport.name,
        cards: measured.cardCount,
        canonical_artworks_loaded: measured.imageCount,
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
