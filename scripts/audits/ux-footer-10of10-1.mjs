import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3175";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outDir = path.join("data", "audits", "ux-footer-10of10-1", variant);
fs.mkdirSync(outDir, { recursive: true });

const failures = [];
const results = [];
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, maxHeight: 365 },
  { name: "mobile-390x844", width: 390, height: 844, maxHeight: 365 },
  { name: "tablet-768x900", width: 768, height: 900, maxHeight: 430 },
  { name: "desktop-1440x900", width: 1440, height: 900, maxHeight: 310 },
];

function rgb(value) {
  const match = String(value).match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/i);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

function isAkarDark(value) {
  const c = rgb(value);
  return Boolean(c && Math.abs(c.r - 4) <= 2 && Math.abs(c.g - 20) <= 2 && Math.abs(c.b - 38) <= 2);
}

function isOrangeOrBronze(value) {
  const c = rgb(value);
  if (!c) return false;
  return c.r >= 180 && c.r > c.g + 25 && c.g > c.b + 15;
}

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.route("**/api/search?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          listings: [],
          total: 0,
          limit: 100,
          offset: 0,
          source: "ux-footer-ci",
          generated_at: new Date().toISOString(),
        }),
      });
    });
    await page.route("**/api/search/gateway?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }),
      });
    });

    const response = await page.goto(`${baseUrl}/search?city=Rabat`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const local = [];
    if (!response || response.status() >= 400) local.push(`/search returned ${response?.status() ?? "no response"}`);

    const footer = page.locator('[data-search-footer="compact"]');
    await footer.waitFor({ state: "attached", timeout: 15_000 });

    if (viewport.width < 640) {
      const visible = await footer.isVisible();
      if (visible) local.push("mobile Search footer must not compete with the primary viewport");
      const style = await footer.evaluate((node) => getComputedStyle(node).display);
      if (style !== "none") local.push(`mobile Search footer must be display:none, got ${style}`);

      results.push({
        viewport,
        metrics: { visible, display: style },
        failures: local,
      });
      for (const failure of local) failures.push(`${viewport.name}: ${failure}`);
      await page.screenshot({ path: path.join(outDir, `${viewport.name}.png`), fullPage: false });
      await context.close();
      continue;
    }

    await footer.waitFor({ state: "visible", timeout: 15_000 });
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const metrics = await page.evaluate(() => {
      const footer = document.querySelector('[data-search-footer="compact"]');
      if (!footer) return null;
      const rect = footer.getBoundingClientRect();
      const style = getComputedStyle(footer);
      const logo = footer.querySelector('img[alt="AkarFinder"]');
      const logoRect = logo?.getBoundingClientRect();
      const mobileGroups = [...footer.querySelectorAll("[data-footer-mobile-group]")];
      const visibleMobileGroups = mobileGroups.filter((group) => {
        const r = group.getBoundingClientRect();
        const s = getComputedStyle(group);
        return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
      });
      const desktopLinks = [...footer.querySelectorAll("[data-footer-link]")]
        .filter((link) => !link.closest("[data-footer-mobile-group]"))
        .filter((link) => {
          const r = link.getBoundingClientRect();
          const s = getComputedStyle(link);
          return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
        });
      const trust = footer.querySelector("[data-footer-trust-line]");
      const trustRect = trust?.getBoundingClientRect();
      const renderedColors = [footer, ...footer.querySelectorAll("*")].flatMap((element) => {
        const s = getComputedStyle(element);
        return [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor];
      });
      return {
        height: rect.height,
        width: rect.width,
        background: style.backgroundColor,
        logoHeight: logoRect?.height ?? 0,
        mobileGroupCount: visibleMobileGroups.length,
        visibleDesktopLinkCount: desktopLinks.length,
        trustVisible: Boolean(trustRect && trustRect.width > 0 && trustRect.height > 0),
        trustText: trust?.textContent ?? "",
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        renderedColors,
      };
    });

    if (!metrics) {
      local.push("compact Search footer not measurable");
    } else {
      if (metrics.height > viewport.maxHeight + 0.5) local.push(`footer too tall: ${metrics.height}px > ${viewport.maxHeight}px`);
      if (metrics.width < viewport.width - 0.5) local.push(`footer must span viewport width, got ${metrics.width}px`);
      if (!isAkarDark(metrics.background)) local.push(`footer background must be #041426, got ${metrics.background}`);
      if (metrics.overflowX > 1) local.push(`horizontal overflow ${metrics.overflowX}px`);
      if (!metrics.trustVisible) local.push("trust line is not visible");
      if (!metrics.trustText.includes("AkarFinder.ma") || !metrics.trustText.includes("sources")) local.push("trust/legal disclosure incomplete");
      const badColors = [...new Set(metrics.renderedColors.filter(isOrangeOrBronze))];
      if (badColors.length > 0) local.push(`orange/bronze rendered inside footer: ${badColors.join(", ")}`);
      if (metrics.mobileGroupCount !== 0) local.push("mobile accordion groups must be hidden at sm and above");
      if (metrics.visibleDesktopLinkCount !== 15) local.push(`expected 15 visible desktop/tablet links, got ${metrics.visibleDesktopLinkCount}`);
      if (Math.abs(metrics.logoHeight - 36) > 0.5) local.push(`tablet/desktop logo must be 36px high, got ${metrics.logoHeight}px`);
    }

    const compactMetrics = metrics
      ? {
          height: metrics.height,
          width: metrics.width,
          background: metrics.background,
          logoHeight: metrics.logoHeight,
          mobileGroupCount: metrics.mobileGroupCount,
          visibleDesktopLinkCount: metrics.visibleDesktopLinkCount,
          trustVisible: metrics.trustVisible,
          overflowX: metrics.overflowX,
        }
      : null;

    await footer.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(outDir, `${viewport.name}.png`), fullPage: false });

    results.push({ viewport, metrics: compactMetrics, failures: local });
    for (const failure of local) failures.push(`${viewport.name}: ${failure}`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const homeResponse = await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!homeResponse || homeResponse.status() >= 400) failures.push(`landing isolation: / returned ${homeResponse?.status() ?? "no response"}`);
  const landingCompactCount = await page.locator('[data-search-footer="compact"]').count();
  if (landingCompactCount !== 0) failures.push("landing isolation: home page must keep the default footer, not Search compact variant");
  await context.close();
} finally {
  await browser.close();
}

const report = {
  lot: "UX-FOOTER-10OF10-1",
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
console.log("UX-FOOTER-10OF10-1 exact Search footer certification passed at 10/10.");
