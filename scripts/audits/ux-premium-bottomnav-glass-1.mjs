import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3205";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-premium-bottomnav-glass-1", variant);
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, visible: true },
  { name: "mobile-390x844", width: 390, height: 844, visible: true },
  { name: "tablet-768x900", width: 768, height: 900, visible: false },
  { name: "desktop-1440x900", width: 1440, height: 900, visible: false },
];
const expectedDestinations = [
  ["/search", "Explorer"],
  ["/favorites", "Favoris"],
  ["/map", "Carte"],
  ["/alerts", "Alertes"],
  ["/mon-projet", "Compte"],
];
const hrefMatches = (actual, expected) => actual === expected || (expected === "/map" && actual?.startsWith("/map?"));

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const v of viewports) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  await page.goto(`${BASE_URL}/search`, { waitUntil: "networkidle" });
  const nav = page.locator('[data-premium-bottomnav="ux-premium-bottomnav-glass-1"]');
  const visible = await nav.isVisible();
  if (visible !== v.visible) failures.push(`${v.name}: visible ${visible}`);
  let metrics = null;
  if (visible) {
    metrics = await nav.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const items = [...el.querySelectorAll('[data-mobile-bottom-nav-item]')];
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        radius: style.borderRadius,
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter || "none",
        items: items.map((item) => ({
          href: item.getAttribute('href'),
          label: item.textContent?.trim() ?? "",
          current: item.getAttribute('aria-current'),
        })),
        active: items.filter((item) => item.getAttribute('data-mobile-bottom-nav-active') === 'true').length,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    if (Math.abs(metrics.x - 10) > 1) failures.push(`${v.name}: x ${metrics.x}`);
    if (Math.abs(metrics.width - (v.width - 20)) > 2) failures.push(`${v.name}: width ${metrics.width}`);
    if (metrics.height < 64 || metrics.height > 68) failures.push(`${v.name}: height ${metrics.height}`);
    if (Number.parseFloat(metrics.radius) < 22) failures.push(`${v.name}: radius ${metrics.radius}`);
    if (metrics.backdropFilter === "none") failures.push(`${v.name}: backdrop filter missing`);
    if (metrics.items.length !== 5) failures.push(`${v.name}: item count ${metrics.items.length}`);
    for (const [href, label] of expectedDestinations) {
      const item = metrics.items.find((candidate) => hrefMatches(candidate.href, href));
      if (!item) failures.push(`${v.name}: missing ${href}`);
      else if (item.label !== label) failures.push(`${v.name}: ${href} label ${item.label}`);
    }
    for (const forbidden of ["/vendre", "/contact"]) {
      if (metrics.items.some((item) => item.href === forbidden)) failures.push(`${v.name}: obsolete ${forbidden}`);
    }
    const activeItem = metrics.items.find((item) => item.current === "page");
    if (metrics.active !== 1 || activeItem?.href !== "/search") failures.push(`${v.name}: active ${metrics.active}:${activeItem?.href ?? "none"}`);
    if (metrics.overflowX) failures.push(`${v.name}: overflowX ${metrics.overflowX}`);
  }
  await page.screenshot({ path: path.join(outDir, `${v.name}.png`), fullPage: false });
  results.push({ viewport: v.name, visible, ...metrics });
  await page.close();
}

await browser.close();
const report = { lot: "UX-PREMIUM-BOTTOMNAV-GLASS-1", target: "canonical-mockup", variant, score: failures.length === 0 ? 10 : Math.max(0, 10 - failures.length), pass: failures.length === 0, failures, results };
await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
