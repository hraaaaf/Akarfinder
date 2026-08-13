import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3207";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-premium-card-density-1", variant);
const fixtures = Array.from({ length: 6 }, (_, i) => ({
  id: `density-${i + 1}`,
  title: `Appartement ${i + 1}`,
  city: "Rabat",
  neighborhood: "Agdal",
  price: 1850000 + i * 10000,
  currency: "DH",
  surface_m2: 118,
  price_per_m2: 15678,
  property_type: "Appartement",
  transaction_type: i % 2 ? "rent" : "buy",
  bedrooms: 3,
  bathrooms: 2,
  freshness_label: "Aujourd’hui",
  source_type: "Agence",
  reliability_label: "Informations complètes",
  reliability_score: 88,
  reliability_available: true,
  is_mre_friendly: true,
  description: "Fixture",
  image_url: "",
  reliability_explanation: "Fixture",
  source_name: "AkarFinder QA",
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  image_permission_status: "unknown",
  source_access_level: "indexed_only",
  main_image_url: null,
  display_images: { policy: "no_listing_image", urls: [] },
  duplicate_score: 0,
}));

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const viewport of [
  { name: "mobile-360x800", width: 360, height: 800, mobile: true },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true },
  { name: "tablet-768x900", width: 768, height: 900, mobile: false, predecessorImageHeight: 190 },
  { name: "desktop-1440x900", width: 1440, height: 900, mobile: false, predecessorImageHeight: 172 },
]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await page.route("**/api/search?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ listings: fixtures, total: fixtures.length, limit: 100, offset: 0, source: "density", generated_at: new Date(0).toISOString() }),
  }));
  await page.goto(`${BASE_URL}/search`, { waitUntil: "networkidle" });
  const cards = page.locator('[data-search-listing-card]');
  await cards.first().waitFor({ timeout: 15_000 });
  const metrics = await cards.evaluateAll((nodes) => nodes.slice(0, 4).map((card) => {
    const rect = card.getBoundingClientRect();
    const image = card.querySelector('[data-card-image]')?.getBoundingClientRect();
    const provenance = card.querySelector('[data-card-provenance]');
    const attribution = card.querySelector('[data-public-attribution]');
    const credit = card.querySelector('[data-neighborhood-photo-credit]');
    const visible = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.height > 0 && r.width > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      imageHeight: image?.height ?? 0,
      provenanceVisible: visible(provenance),
      attributionVisible: visible(attribution),
      creditVisible: visible(credit),
    };
  }));
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const navTop = viewport.mobile
    ? await page.locator('[data-premium-bottomnav="ux-premium-bottomnav-glass-1"]').evaluate((el) => el.getBoundingClientRect().top)
    : null;

  if (viewport.mobile) {
    for (const [index, card] of metrics.entries()) {
      if (Math.abs(card.imageHeight - 108) > 1) failures.push(`${viewport.name}: card ${index + 1} image ${card.imageHeight}`);
      if (card.height < 185 || card.height > 230) failures.push(`${viewport.name}: card ${index + 1} height ${card.height}`);
      if (!card.provenanceVisible || !card.attributionVisible) failures.push(`${viewport.name}: card ${index + 1} provenance hidden`);
      if (card.creditVisible === false) failures.push(`${viewport.name}: card ${index + 1} neighborhood credit hidden`);
    }
    if (viewport.width === 390 && navTop != null && Math.max(...metrics.map((card) => card.bottom)) > navTop + 4) {
      failures.push(`${viewport.name}: first four cards extend under nav`);
    }
  } else {
    for (const [index, card] of metrics.entries()) {
      if (Math.abs(card.imageHeight - viewport.predecessorImageHeight) > 1) failures.push(`${viewport.name}: card ${index + 1} predecessor image baseline ${card.imageHeight}`);
      if (!card.provenanceVisible || !card.attributionVisible) failures.push(`${viewport.name}: card ${index + 1} provenance hidden`);
    }
  }
  if (overflowX !== 0) failures.push(`${viewport.name}: overflowX ${overflowX}`);
  await page.screenshot({ path: path.join(outDir, `${viewport.name}.png`), fullPage: false });
  results.push({ viewport: viewport.name, navTop, overflowX, cards: metrics });
  await page.close();
}

await browser.close();
const report = {
  lot: "UX-PREMIUM-CARD-DENSITY-1",
  target: "canonical-mockup-mobile-density",
  variant,
  pass: failures.length === 0,
  score: failures.length === 0 ? 10 : Math.max(0, 10 - failures.length),
  failures,
  results,
};
await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
