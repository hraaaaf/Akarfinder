import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3209";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-premium-quickfilters-fit-1", variant);
const expected = [
  ["all", "Tous"],
  ["buy", "À vendre"],
  ["rent", "À louer"],
  ["price", "Prix"],
  ["filters", "Filtres"],
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const viewport of [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await page.goto(`${BASE_URL}/search`, { waitUntil: "networkidle" });
  const row = page.locator('[data-premium-quickfilters-row]');
  await row.waitFor({ state: "visible", timeout: 15_000 });
  const metrics = await row.evaluate((el) => {
    const rowBox = el.getBoundingClientRect();
    const items = [...el.querySelectorAll('[data-quickfilter]')].map((item) => {
      const box = item.getBoundingClientRect();
      return {
        key: item.getAttribute('data-quickfilter'),
        text: item.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        left: box.left,
        right: box.right,
        width: box.width,
        height: box.height,
      };
    });
    return {
      left: rowBox.left,
      right: rowBox.right,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      items,
    };
  });

  if (metrics.items.length !== 5) failures.push(`${viewport.name}: item count ${metrics.items.length}`);
  if (metrics.scrollWidth > metrics.clientWidth + 1) failures.push(`${viewport.name}: row scroll ${metrics.scrollWidth}/${metrics.clientWidth}`);
  if (metrics.overflowX !== 0) failures.push(`${viewport.name}: page overflow ${metrics.overflowX}`);

  for (const [key, label] of expected) {
    const item = metrics.items.find((candidate) => candidate.key === key);
    if (!item) {
      failures.push(`${viewport.name}: missing ${key}`);
      continue;
    }
    if (!item.text.includes(label)) failures.push(`${viewport.name}: ${key} label ${item.text}`);
    if (item.left < metrics.left - 1 || item.right > metrics.right + 1) failures.push(`${viewport.name}: ${key} clipped ${item.left}/${item.right}`);
    if (item.height < 39) failures.push(`${viewport.name}: ${key} height ${item.height}`);
  }

  await page.screenshot({ path: path.join(outDir, `${viewport.name}.png`), fullPage: false });
  results.push({ viewport: viewport.name, ...metrics });
  await page.close();
}

await browser.close();
const report = {
  lot: "UX-PREMIUM-QUICKFILTERS-FIT-1",
  target: "canonical-mockup-five-chips-visible",
  variant,
  pass: failures.length === 0,
  score: failures.length === 0 ? 10 : Math.max(0, 10 - failures.length),
  failures,
  results,
};
await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
