import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3175";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-bottom-nav-10of10-1", variant);
fs.mkdirSync(outDir, { recursive: true });

const expected = [
  ["/search", "Explorer"],
  ["/favorites", "Favoris"],
  ["/map", "Carte"],
  ["/alerts", "Alertes"],
  ["/mon-projet", "Compte"],
];
const hrefMatches = (actual, wanted) => actual === wanted || (wanted === "/map" && actual?.startsWith("/map?"));
const failures = [];
const results = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: "mobile-360x800", width: 360, height: 800 },
    { name: "mobile-390x844", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.route("**/api/search?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ listings: [], total: 0, limit: 100, offset: 0, source: "ux-bottom-nav-ci", generated_at: new Date(0).toISOString() }) }));
    await page.route("**/api/search/gateway?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }) }));

    const response = await page.goto(`${baseUrl}/search?city=Rabat`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (!response || response.status() >= 400) failures.push(`${viewport.name}: /search returned ${response?.status() ?? "no response"}`);
    const nav = page.locator('[data-premium-bottomnav="ux-premium-bottomnav-glass-1"]');
    await nav.waitFor({ state: "visible", timeout: 15_000 });

    const metrics = await nav.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const items = [...el.querySelectorAll('[data-mobile-bottom-nav-item]')];
      return {
        x: rect.x,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        radius: Number.parseFloat(style.borderRadius),
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter || "none",
        items: items.map((item) => ({ href: item.getAttribute("href"), label: item.textContent?.trim() ?? "", current: item.getAttribute("aria-current") })),
        activeCount: items.filter((item) => item.getAttribute("data-mobile-bottom-nav-active") === "true").length,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    const local = [];
    if (Math.abs(metrics.x - 10) > 1) local.push(`x=${metrics.x}`);
    if (Math.abs(metrics.width - (viewport.width - 20)) > 2) local.push(`width=${metrics.width}`);
    if (metrics.height < 64 || metrics.height > 68) local.push(`height=${metrics.height}`);
    if (Math.abs(metrics.bottom - (viewport.height - 8)) > 1) local.push(`bottom=${metrics.bottom}`);
    if (metrics.radius < 22) local.push(`radius=${metrics.radius}`);
    if (metrics.backdropFilter === "none") local.push("backdrop filter missing");
    if (metrics.items.length !== 5) local.push(`item count=${metrics.items.length}`);
    for (const [href, label] of expected) {
      const item = metrics.items.find((candidate) => hrefMatches(candidate.href, href));
      if (!item) local.push(`missing ${href}`);
      else if (item.label !== label) local.push(`${href} label=${item.label}`);
    }
    if (metrics.items.some((item) => item.href === "/vendre" || item.href === "/contact")) local.push("obsolete destination present");
    const active = metrics.items.find((item) => item.current === "page");
    if (metrics.activeCount !== 1 || active?.href !== "/search") local.push(`search active=${metrics.activeCount}:${active?.href ?? "none"}`);
    if (metrics.overflowX > 1) local.push(`overflowX=${metrics.overflowX}`);

    for (const [route, expectedHref] of [["/favorites", "/favorites"], ["/map", "/map"], ["/alerts", "/alerts"], ["/mon-projet", "/mon-projet"], ["/acheter", "/search"]]) {
      const routeResponse = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      if (!routeResponse || routeResponse.status() >= 400) { local.push(`${route} returned ${routeResponse?.status() ?? "no response"}`); continue; }
      const routeNav = page.locator('[data-premium-bottomnav="ux-premium-bottomnav-glass-1"]');
      await routeNav.waitFor({ state: "visible", timeout: 10_000 });
      const activeItems = routeNav.locator('[data-mobile-bottom-nav-active="true"]');
      const count = await activeItems.count();
      const href = count === 1 ? await activeItems.first().getAttribute("href") : null;
      const current = count === 1 ? await activeItems.first().getAttribute("aria-current") : null;
      if (count !== 1 || !hrefMatches(href, expectedHref) || current !== "page") local.push(`${route}: expected ${expectedHref}, got ${count}:${href}:${current}`);
    }

    await page.goto(`${baseUrl}/search?city=Rabat`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator('[data-premium-bottomnav="ux-premium-bottomnav-glass-1"]').waitFor({ state: "visible", timeout: 10_000 });
    await page.screenshot({ path: path.join(outDir, `${viewport.name}.png`), fullPage: false });
    results.push({ viewport, metrics, failures: local });
    for (const failure of local) failures.push(`${viewport.name}: ${failure}`);
    await context.close();
  }

  for (const viewport of [{ name: "tablet-768x900", width: 768, height: 900 }, { name: "desktop-1440x900", width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/search`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const nav = page.locator('[data-premium-bottomnav="ux-premium-bottomnav-glass-1"]');
    const visible = await nav.isVisible();
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const local = [];
    if (visible) local.push("mobile bottom nav visible at md+");
    if (overflowX > 1) local.push(`overflowX=${overflowX}`);
    results.push({ viewport, visible, overflowX, failures: local });
    for (const failure of local) failures.push(`${viewport.name}: ${failure}`);
    await context.close();
  }
} finally {
  await browser.close();
}

const report = { lot: "UX-BOTTOM-NAV-10OF10-1", target: "canonical-mockup-premium-glass", variant, baseUrl, generatedAt: new Date().toISOString(), score: failures.length === 0 ? 10 : Math.max(0, 10 - Math.min(10, failures.length)), failures, results };
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
console.log("UX-BOTTOM-NAV-10OF10-1 canonical premium glass certification passed at 10/10.");

await import("./ui-polish-p1-mobile-audit.mjs");
