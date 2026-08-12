import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3175";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-bottom-nav-10of10-1", variant);
fs.mkdirSync(outDir, { recursive: true });

const failures = [];
const results = [];

function rgb(value) {
  const match = String(value).match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/i);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

function isWhite(value) {
  const c = rgb(value);
  return Boolean(c && c.r >= 250 && c.g >= 250 && c.b >= 250);
}

function isBlue(value) {
  const c = rgb(value);
  return Boolean(c && c.b >= c.r + 45 && c.b >= c.g + 20);
}

function isOrangeOrBronze(value) {
  const c = rgb(value);
  if (!c) return false;
  return c.r >= 180 && c.r > c.g + 25 && c.g > c.b + 15;
}

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: "mobile-360x800", width: 360, height: 800 },
    { name: "mobile-390x844", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();

    await page.route("**/api/search?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ listings: [], total: 0, limit: 100, offset: 0, source: "ux-bottom-nav-ci", generated_at: new Date().toISOString() }),
      });
    });
    await page.route("**/api/search/gateway?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }),
      });
    });

    const response = await page.goto(`${baseUrl}/search?city=Rabat`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (!response || response.status() >= 400) failures.push(`${viewport.name}: /search returned ${response?.status() ?? "no response"}`);

    const nav = page.locator("[data-mobile-bottom-nav]");
    await nav.waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForTimeout(250);

    const metrics = await page.evaluate(() => {
      const nav = document.querySelector("[data-mobile-bottom-nav]");
      if (!nav) return null;
      const navRect = nav.getBoundingClientRect();
      const navStyle = getComputedStyle(nav);
      const items = [...nav.querySelectorAll("[data-mobile-bottom-nav-item]")];
      const active = items.filter((item) => item.getAttribute("data-mobile-bottom-nav-active") === "true");
      const primary = nav.querySelector('[data-mobile-bottom-nav-primary="true"]');
      const primaryIcon = nav.querySelector("[data-mobile-bottom-nav-primary-icon]");
      const main = document.querySelector("#main-content");
      const mainStyle = main ? getComputedStyle(main) : null;
      const colors = [...nav.querySelectorAll("*")].flatMap((element) => {
        const style = getComputedStyle(element);
        return [style.color, style.backgroundColor, style.borderTopColor, style.borderBottomColor];
      });
      return {
        nav: {
          top: navRect.top,
          bottom: navRect.bottom,
          width: navRect.width,
          height: navRect.height,
          background: navStyle.backgroundColor,
          position: navStyle.position,
          zIndex: navStyle.zIndex,
        },
        itemCount: items.length,
        itemRects: items.map((item) => {
          const rect = item.getBoundingClientRect();
          return { href: item.getAttribute("href"), width: rect.width, height: rect.height, current: item.getAttribute("aria-current") };
        }),
        activeCount: active.length,
        activeHref: active[0]?.getAttribute("href") ?? null,
        activeColor: active[0] ? getComputedStyle(active[0]).color : null,
        primaryRect: primary ? (() => { const rect = primary.getBoundingClientRect(); return { width: rect.width, height: rect.height }; })() : null,
        primaryIcon: primaryIcon ? (() => { const rect = primaryIcon.getBoundingClientRect(); return { width: rect.width, height: rect.height, background: getComputedStyle(primaryIcon).backgroundColor }; })() : null,
        mainPaddingBottom: mainStyle ? parseFloat(mainStyle.paddingBottom) : 0,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        colors,
      };
    });

    const local = [];
    if (!metrics) {
      local.push("mobile bottom nav not measurable");
    } else {
      if (metrics.itemCount !== 5) local.push(`expected 5 items, got ${metrics.itemCount}`);
      if (metrics.nav.position !== "fixed") local.push(`nav position must be fixed, got ${metrics.nav.position}`);
      if (!isWhite(metrics.nav.background)) local.push(`nav background must be pure white, got ${metrics.nav.background}`);
      if (Math.abs(metrics.nav.height - 64) > 1) local.push(`nav height must be 64px without safe inset, got ${metrics.nav.height}px`);
      if (Math.abs(metrics.nav.bottom - viewport.height) > 1) local.push(`nav must sit at viewport bottom, got bottom=${metrics.nav.bottom}`);
      if (metrics.nav.width < viewport.width - 1) local.push(`nav must span viewport width, got ${metrics.nav.width}px`);
      if (metrics.itemRects.some((item) => item.height < 44)) local.push(`touch target below 44px: ${JSON.stringify(metrics.itemRects)}`);
      if (metrics.activeCount !== 1 || metrics.activeHref !== "/search") local.push(`expected /search as sole active item, got ${metrics.activeCount}:${metrics.activeHref}`);
      if (metrics.itemRects.find((item) => item.href === "/search")?.current !== "page") local.push("active /search item is missing aria-current=page");
      if (!metrics.activeColor || !isBlue(metrics.activeColor)) local.push(`active item must be blue-led, got ${metrics.activeColor}`);
      if (!metrics.primaryRect || metrics.primaryRect.height < 44) local.push("Publier touch target below 44px");
      if (!metrics.primaryIcon || Math.abs(metrics.primaryIcon.width - 36) > 1 || Math.abs(metrics.primaryIcon.height - 36) > 1) local.push(`Publier icon button must be 36x36, got ${JSON.stringify(metrics.primaryIcon)}`);
      if (metrics.primaryIcon && !isBlue(metrics.primaryIcon.background)) local.push(`Publier primary icon must be blue-led, got ${metrics.primaryIcon.background}`);
      if (metrics.mainPaddingBottom < 63.5) local.push(`main content bottom padding must reserve nav space, got ${metrics.mainPaddingBottom}px`);
      if (metrics.overflowX > 1) local.push(`horizontal overflow ${metrics.overflowX}px`);
      const badColors = metrics.colors.filter(isOrangeOrBronze);
      if (badColors.length > 0) local.push(`orange/bronze rendered inside nav: ${[...new Set(badColors)].join(", ")}`);
    }

    const routeContracts = [
      ["/favorites", "/favorites"],
      ["/vendre", "/vendre"],
      ["/contact", "/contact"],
      ["/mon-projet", "/mon-projet"],
      ["/acheter", "/search"],
    ];
    for (const [route, expectedHref] of routeContracts) {
      const routeResponse = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      if (!routeResponse || routeResponse.status() >= 400) {
        local.push(`${route} returned ${routeResponse?.status() ?? "no response"}`);
        continue;
      }
      await page.locator("[data-mobile-bottom-nav]").waitFor({ state: "visible", timeout: 10_000 });
      const active = page.locator('[data-mobile-bottom-nav-active="true"]');
      const count = await active.count();
      const href = count === 1 ? await active.first().getAttribute("href") : null;
      const current = count === 1 ? await active.first().getAttribute("aria-current") : null;
      if (count !== 1 || href !== expectedHref || current !== "page") {
        local.push(`${route}: expected sole active ${expectedHref}, got count=${count} href=${href} aria-current=${current}`);
      }
    }

    await page.goto(`${baseUrl}/search?city=Rabat`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator("[data-mobile-bottom-nav]").waitFor({ state: "visible", timeout: 10_000 });
    await page.screenshot({ path: path.join(outDir, `${viewport.name}.png`), fullPage: false });

    results.push({ viewport, metrics, failures: local });
    for (const failure of local) failures.push(`${viewport.name}: ${failure}`);
    await context.close();
  }

  for (const viewport of [
    { name: "tablet-768x900", width: 768, height: 900 },
    { name: "desktop-1440x900", width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/search`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (!response || response.status() >= 400) failures.push(`${viewport.name}: /search returned ${response?.status() ?? "no response"}`);
    const metrics = await page.evaluate(() => {
      const nav = document.querySelector("[data-mobile-bottom-nav]");
      const rect = nav?.getBoundingClientRect();
      const style = nav ? getComputedStyle(nav) : null;
      const main = document.querySelector("#main-content");
      const mainStyle = main ? getComputedStyle(main) : null;
      return {
        navVisible: Boolean(rect && rect.width > 0 && rect.height > 0 && style?.display !== "none" && style?.visibility !== "hidden"),
        navDisplay: style?.display ?? null,
        mainPaddingBottom: mainStyle ? parseFloat(mainStyle.paddingBottom) : 0,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    const local = [];
    if (metrics.navVisible) local.push("mobile bottom nav must be hidden at md and above");
    if (metrics.mainPaddingBottom > 1) local.push(`desktop/tablet must not reserve mobile nav space, got ${metrics.mainPaddingBottom}px`);
    if (metrics.overflowX > 1) local.push(`horizontal overflow ${metrics.overflowX}px`);
    results.push({ viewport, metrics, failures: local });
    for (const failure of local) failures.push(`${viewport.name}: ${failure}`);
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  lot: "UX-BOTTOM-NAV-10OF10-1",
  variant,
  baseUrl,
  generatedAt: new Date().toISOString(),
  score: failures.length === 0 ? 10 : Math.max(0, 10 - Math.min(10, failures.length)),
  failures,
  results,
};

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) process.exit(1);
console.log("UX-BOTTOM-NAV-10OF10-1 exact mobile navigation certification passed at 10/10.");
