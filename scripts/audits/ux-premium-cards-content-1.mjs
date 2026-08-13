import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3201";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-premium-cards-content-1", variant);
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, price: 18, title: 12.75 },
  { name: "mobile-390x844", width: 390, height: 844, price: 18, title: 12.75 },
  { name: "tablet-768x900", width: 768, height: 900, price: 22, title: 14.5 },
  { name: "desktop-1440x900", width: 1440, height: 900, price: 22, title: 14.5 },
];

const fixture = {
  id: "ux-premium-cards-content-fixture",
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
  description: "Fixture visuelle déterministe pour certification contenu.",
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
      body: JSON.stringify({ listings: [fixture], total: 1, limit: 100, offset: 0, source: "ux-premium-cards-content-1", generated_at: new Date(0).toISOString() }),
    });
  });
  await page.goto(`${BASE_URL}/search`, { waitUntil: "networkidle" });
  const card = page.locator('[data-mobile-compact-card]').first();
  await card.waitFor({ timeout: 15000 });
  const metrics = await page.evaluate(() => {
    const card = document.querySelector('[data-mobile-compact-card]');
    const price = card?.querySelector('[data-card-price]');
    const title = card?.querySelector('[data-card-title]');
    const location = card?.querySelector('[data-card-location]');
    const facts = card?.querySelector('[data-card-facts]');
    const provenance = card?.querySelector('[data-card-provenance]');
    if (!card || !price || !title || !location || !facts || !provenance) return null;
    const style = (el) => getComputedStyle(el);
    return {
      price: { text: price.textContent?.trim() ?? "", fontSize: Number.parseFloat(style(price).fontSize), color: style(price).color },
      title: { text: title.textContent?.trim() ?? "", fontSize: Number.parseFloat(style(title).fontSize), lineHeight: style(title).lineHeight },
      location: { text: location.textContent?.trim() ?? "", fontSize: Number.parseFloat(style(location).fontSize) },
      facts: { count: facts.children.length, fontSize: Number.parseFloat(style(facts).fontSize), text: facts.textContent?.trim() ?? "" },
      provenance: { text: provenance.textContent?.trim() ?? "", fontSize: Number.parseFloat(style(provenance).fontSize) },
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  if (!metrics) failures.push(`${v.name}: content nodes missing`);
  else {
    if (Math.abs(metrics.price.fontSize - v.price) > 0.6) failures.push(`${v.name}: price font ${metrics.price.fontSize}`);
    if (Math.abs(metrics.title.fontSize - v.title) > 0.6) failures.push(`${v.name}: title font ${metrics.title.fontSize}`);
    if (!metrics.price.text.includes("1") || !metrics.price.text.includes("DH")) failures.push(`${v.name}: price text missing`);
    if (!metrics.title.text) failures.push(`${v.name}: title empty`);
    if (!metrics.location.text.includes("Agdal") && !metrics.location.text.includes("Rabat")) failures.push(`${v.name}: location truth missing`);
    if (metrics.facts.count < 2) failures.push(`${v.name}: facts count ${metrics.facts.count}`);
    if (!metrics.provenance.text) failures.push(`${v.name}: provenance empty`);
    if (metrics.overflowX !== 0) failures.push(`${v.name}: overflowX ${metrics.overflowX}`);
  }

  await page.screenshot({ path: path.join(outDir, `${v.name}.png`), fullPage: false });
  results.push({ viewport: v.name, ...metrics });
  await page.close();
}

await browser.close();
const report = {
  lot: "UX-PREMIUM-CARDS-CONTENT-1",
  variant,
  score: failures.length === 0 ? 10 : Math.max(0, 10 - failures.length),
  pass: failures.length === 0,
  failures,
  results,
};
await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
