import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3203";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-premium-grid-1", variant);
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, columns: 2, colGap: 10, rowGap: 14, view: null },
  { name: "mobile-390x844", width: 390, height: 844, columns: 2, colGap: 10, rowGap: 14, view: null },
  { name: "tablet-768x900", width: 768, height: 900, columns: 2, colGap: 14, rowGap: 18, view: null },
  { name: "desktop-1440x900", width: 1440, height: 900, columns: 4, colGap: 16, rowGap: 16, view: "list" },
];

const baseFixture = {
  city: "Rabat", neighborhood: "Agdal", price: 1850000, currency: "DH", surface_m2: 118,
  price_per_m2: 15678, property_type: "Appartement", transaction_type: "buy", bedrooms: 3, bathrooms: 2,
  freshness_label: "Aujourd’hui", source_type: "Agence", reliability_label: "Informations complètes",
  reliability_score: 88, reliability_available: true, is_mre_friendly: true, description: "Fixture grille.",
  image_url: "", reliability_explanation: "Fixture grille.", source_name: "AkarFinder QA", can_show_result: true,
  production_allowed: true, can_show_thumbnail: false, image_permission_status: "unknown", source_access_level: "indexed_only",
  main_image_url: null, display_images: { policy: "no_listing_image", urls: [] }, duplicate_score: 0,
};
const fixtures = Array.from({ length: 4 }, (_, i) => ({ ...baseFixture, id: `ux-grid-${i+1}`, title: `Appartement test ${i+1}` }));

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const v of viewports) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  await page.route("**/api/search?**", async (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ listings: fixtures, total: 4, limit: 100, offset: 0, source: "ux-premium-grid-1", generated_at: new Date(0).toISOString() }),
  }));
  await page.goto(`${BASE_URL}/search`, { waitUntil: "networkidle" });
  if (v.view === "list") {
    const list = page.locator('[data-search-view-mode-button="list"]');
    if (await list.isVisible()) await list.click();
    await page.locator('[data-search-view-layout="list"]').waitFor();
  }
  const grid = page.locator('[data-search-continuous-flow] > div.grid').first();
  await grid.waitFor({ timeout: 15000 });
  const metrics = await grid.evaluate((el) => {
    const style = getComputedStyle(el);
    const cards = [...el.children].map((child) => child.getBoundingClientRect());
    const gridBox = el.getBoundingClientRect();
    return {
      template: style.gridTemplateColumns,
      columnGap: Number.parseFloat(style.columnGap),
      rowGap: Number.parseFloat(style.rowGap),
      width: gridBox.width,
      cardWidths: cards.map((b) => b.width),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  const columns = metrics.template.split(" ").filter(Boolean).length;
  if (columns !== v.columns) failures.push(`${v.name}: columns ${columns}`);
  if (Math.abs(metrics.columnGap - v.colGap) > 0.6) failures.push(`${v.name}: col gap ${metrics.columnGap}`);
  if (Math.abs(metrics.rowGap - v.rowGap) > 0.6) failures.push(`${v.name}: row gap ${metrics.rowGap}`);
  if (metrics.overflowX !== 0) failures.push(`${v.name}: overflowX ${metrics.overflowX}`);
  if (metrics.cardWidths.length >= 2 && Math.max(...metrics.cardWidths) - Math.min(...metrics.cardWidths) > 1) failures.push(`${v.name}: unequal card widths`);
  await page.screenshot({ path: path.join(outDir, `${v.name}.png`), fullPage: false });
  results.push({ viewport: v.name, ...metrics, columns });
  await page.close();
}

await browser.close();
const report = { lot: "UX-PREMIUM-GRID-1", variant, score: failures.length === 0 ? 10 : Math.max(0, 10 - failures.length), pass: failures.length === 0, failures, results };
await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
