import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3199";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-premium-cards-media-1", variant);
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, expectedMediaHeight: 160, view: null },
  { name: "mobile-390x844", width: 390, height: 844, expectedMediaHeight: 160, view: null },
  { name: "tablet-768x900", width: 768, height: 900, expectedMediaHeight: 190, view: null },
  { name: "desktop-1440x900", width: 1440, height: 900, expectedMediaHeight: 188, view: "split" },
];

const fixture = {
  id: "ux-premium-cards-media-fixture",
  title: "Appartement lumineux à Rabat",
  city: "Rabat",
  neighborhood: "Agdal",
  price: 1850000,
  currency: "DH",
  surface_m2: 118,
  price_per_m2: 15678,
  property_type: "Appartement",
  transaction_type: "buy",
  bedrooms: 3,
  bathrooms: 2,
  freshness_label: "Aujourd’hui",
  source_type: "Agence",
  reliability_label: "Informations complètes",
  reliability_score: 88,
  reliability_available: true,
  is_mre_friendly: true,
  description: "Fixture visuelle déterministe pour certification média.",
  image_url: "",
  reliability_explanation: "Fixture de certification.",
  source_name: "AkarFinder QA",
  listing_url: "https://example.com/listing",
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  image_permission_status: "unknown",
  source_access_level: "indexed_only",
  main_image_url: null,
  display_images: { policy: "no_listing_image", urls: [] },
  allowed_ctas: ["view_original"],
  duplicate_score: 0,
};

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const v of viewports) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  await page.route("**/api/search?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ listings: [fixture], total: 1, limit: 100, offset: 0, source: "ux-premium-cards-media-1", generated_at: new Date(0).toISOString() }),
    });
  });
  await page.goto(`${BASE_URL}/search`, { waitUntil: "networkidle" });
  if (v.view === "split") {
    const split = page.locator('[data-search-view-mode-button="split"]');
    if (await split.isVisible()) {
      await split.click();
      await page.locator('[data-search-view-layout="split"]').waitFor();
    }
  }
  const card = page.locator('[data-mobile-compact-card]').first();
  await card.waitFor({ timeout: 15000 });
  const metrics = await page.evaluate(() => {
    const card = document.querySelector('[data-mobile-compact-card]');
    const media = card?.querySelector('[data-card-image]');
    const favorite = card?.querySelector('[data-card-favorite] button');
    if (!card || !media) return null;
    const cb = card.getBoundingClientRect();
    const mb = media.getBoundingClientRect();
    const fb = favorite?.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    const mediaStyle = getComputedStyle(media);
    const favoriteStyle = favorite ? getComputedStyle(favorite) : null;
    return {
      view: document.querySelector('[data-search-view-layout]')?.getAttribute('data-search-view-layout') ?? null,
      card: { x: cb.x, y: cb.y, width: cb.width, height: cb.height, radius: cardStyle.borderRadius },
      media: { x: mb.x, y: mb.y, width: mb.width, height: mb.height, background: mediaStyle.backgroundColor },
      favorite: fb && favoriteStyle ? { width: fb.width, height: fb.height, radius: favoriteStyle.borderRadius } : null,
      visualClass: media.querySelector('[data-visual-inventory-class]')?.getAttribute('data-visual-inventory-class') ?? null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  if (!metrics) {
    failures.push(`${v.name}: card/media missing`);
  } else {
    if (v.view && metrics.view !== v.view) failures.push(`${v.name}: view ${metrics.view}`);
    if (Math.abs(metrics.media.height - v.expectedMediaHeight) > 1.5) failures.push(`${v.name}: media height ${metrics.media.height}`);
    if (Number.parseFloat(metrics.card.radius) < 18) failures.push(`${v.name}: card radius ${metrics.card.radius}`);
    if (metrics.card.width < 140) failures.push(`${v.name}: card width ${metrics.card.width}`);
    if (metrics.overflowX !== 0) failures.push(`${v.name}: overflowX ${metrics.overflowX}`);
    if (!metrics.visualClass) failures.push(`${v.name}: visual inventory class missing`);
    if (metrics.favorite) {
      if (metrics.favorite.width < 38 || metrics.favorite.height < 38) failures.push(`${v.name}: favorite target ${metrics.favorite.width}x${metrics.favorite.height}`);
      if (Number.parseFloat(metrics.favorite.radius) < 18) failures.push(`${v.name}: favorite radius ${metrics.favorite.radius}`);
    }
  }

  await page.screenshot({ path: path.join(outDir, `${v.name}.png`), fullPage: false });
  results.push({ viewport: v.name, ...metrics });
  await page.close();
}

await browser.close();
const report = {
  lot: "UX-PREMIUM-CARDS-MEDIA-1",
  variant,
  score: failures.length === 0 ? 10 : Math.max(0, 10 - failures.length),
  pass: failures.length === 0,
  failures,
  results,
};
await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
