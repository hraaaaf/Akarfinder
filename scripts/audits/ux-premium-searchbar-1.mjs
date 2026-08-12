import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3193";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-premium-searchbar-1", variant);
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, expectedHeight: 56 },
  { name: "mobile-390x844", width: 390, height: 844, expectedHeight: 56 },
  { name: "tablet-768x900", width: 768, height: 900, expectedHeight: 56 },
  { name: "desktop-1440x900", width: 1440, height: 900, expectedHeight: 52 },
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await page.goto(`${BASE_URL}/search`, { waitUntil: "networkidle" });
  await page.locator('[data-premium-searchbar="ux-premium-searchbar-1"]').waitFor();

  const metrics = await page.evaluate(() => {
    const marker = document.querySelector('[data-premium-searchbar="ux-premium-searchbar-1"]');
    const input = document.querySelector('.premium-search-input');
    const trigger = document.querySelector('.premium-filter-trigger');
    const row = document.querySelector('[data-search-primary-filter-row]');
    if (!marker || !input || !trigger || !row) return null;
    const a = input.getBoundingClientRect();
    const b = trigger.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const inputStyle = getComputedStyle(input);
    const triggerStyle = getComputedStyle(trigger);
    return {
      input: { x: a.x, y: a.y, width: a.width, height: a.height, radius: inputStyle.borderRadius },
      trigger: { x: b.x, y: b.y, width: b.width, height: b.height, radius: triggerStyle.borderRadius },
      row: { x: r.x, width: r.width },
      gap: b.x - (a.x + a.width),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      marker: marker.getAttribute('data-premium-searchbar'),
    };
  });

  if (!metrics) failures.push(`${viewport.name}: premium searchbar nodes missing`);
  else {
    const tol = 1.5;
    if (Math.abs(metrics.input.height - viewport.expectedHeight) > tol) failures.push(`${viewport.name}: input height ${metrics.input.height}`);
    if (Math.abs(metrics.trigger.height - viewport.expectedHeight) > tol) failures.push(`${viewport.name}: trigger height ${metrics.trigger.height}`);
    if (metrics.input.width < (viewport.width < 640 ? 240 : 320)) failures.push(`${viewport.name}: input too narrow ${metrics.input.width}`);
    if (metrics.trigger.width < 44) failures.push(`${viewport.name}: filter trigger too narrow ${metrics.trigger.width}`);
    if (metrics.gap < 8 || metrics.gap > 14) failures.push(`${viewport.name}: gap ${metrics.gap}`);
    if (metrics.overflowX !== 0) failures.push(`${viewport.name}: overflowX ${metrics.overflowX}`);
    if (!metrics.input.radius.includes("9999") && Number.parseFloat(metrics.input.radius) < 24) failures.push(`${viewport.name}: input radius ${metrics.input.radius}`);
    if (!metrics.trigger.radius.includes("9999") && Number.parseFloat(metrics.trigger.radius) < 24) failures.push(`${viewport.name}: trigger radius ${metrics.trigger.radius}`);
  }

  await page.screenshot({ path: path.join(outDir, `${viewport.name}.png`), fullPage: false });
  results.push({ viewport: viewport.name, ...metrics });
  await page.close();
}

await browser.close();
const report = {
  lot: "UX-PREMIUM-SEARCHBAR-1",
  variant,
  score: failures.length === 0 ? 10 : Math.max(0, 10 - failures.length),
  pass: failures.length === 0,
  failures,
  results,
};
await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
