import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3191";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const auditLot = process.env.AUDIT_LOT ?? "ux-premium-header-1";
const outDir = path.join("data", "audits", auditLot, variant);
const cases = [
  { name: "mobile-360x800", width: 360, height: 800, mobile: true, headerHeight: 63, logoHeight: 31 },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true, headerHeight: 63, logoHeight: 31 },
  { name: "tablet-768x900", width: 768, height: 900, mobile: true, headerHeight: 68, logoHeight: 29 },
  { name: "desktop-1440x900", width: 1440, height: 900, mobile: false, headerHeight: 64, logoHeight: 31 },
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const c of cases) {
  const context = await browser.newContext({ viewport: { width: c.width, height: c.height }, colorScheme: "light" });
  const page = await context.newPage();
  const response = await page.goto(`${baseUrl}/search?city=Rabat&view=list`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 400) failures.push(`${c.name}: route status ${response?.status() ?? "none"}`);
  await page.waitForSelector('[data-premium-search-header="ux-premium-header-1"]', { timeout: 20_000 });
  const metrics = await page.evaluate(() => {
    const header = document.querySelector('[data-premium-search-header="ux-premium-header-1"]');
    const visible = (el) => !!el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden";
    if (!header) return null;
    const rect = header.getBoundingClientRect();
    const style = getComputedStyle(header);
    const logo = Array.from(header.querySelectorAll('a[aria-label="AkarFinder - accueil"]')).find(visible)?.querySelector("img") ?? null;
    const logoRect = logo?.getBoundingClientRect() ?? null;
    const searchRect = document.querySelector('[data-search-primary-search]')?.getBoundingClientRect() ?? null;
    const menuRect = Array.from(header.querySelectorAll("button")).find((el) => (el.getAttribute("aria-label") ?? "").includes("menu") && visible(el))?.getBoundingClientRect() ?? null;
    return {
      width: rect.width, height: rect.height, left: rect.left, top: rect.top, position: style.position,
      background: style.backgroundColor, hairline: style.borderBottomWidth, shadow: style.boxShadow,
      logoSrc: logo?.getAttribute("src") ?? "", logoHeight: logoRect?.height ?? null,
      logoCenterDelta: logoRect ? Math.abs(logoRect.left + logoRect.width / 2 - innerWidth / 2) : null,
      searchAxisDelta: logoRect && searchRect ? Math.abs(logoRect.left - searchRect.left) : null,
      menuWidth: menuRect?.width ?? null, menuHeight: menuRect?.height ?? null, leftInset: menuRect?.left ?? null,
      nav: Array.from(header.querySelectorAll('nav[aria-label="Navigation principale"] a')).filter(visible).map((el) => (el.textContent ?? "").trim()),
      visibleLinks: Array.from(header.querySelectorAll("a")).filter(visible).map((el) => (el.textContent ?? "").trim()).filter(Boolean),
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    };
  });
  if (!metrics) failures.push(`${c.name}: premium header missing`);
  else {
    if (Math.abs(metrics.width - c.width) > .5) failures.push(`${c.name}: width drift`);
    if (Math.abs(metrics.height - c.headerHeight) > .5) failures.push(`${c.name}: height ${metrics.height} != ${c.headerHeight}`);
    if (Math.abs(metrics.left) > .5 || Math.abs(metrics.top) > .5 || metrics.position !== "sticky") failures.push(`${c.name}: header positioning drift`);
    if (metrics.background !== "rgb(255, 255, 255)" || metrics.hairline !== "1px" || !metrics.shadow || metrics.shadow === "none") failures.push(`${c.name}: premium surface drift`);
    if (!metrics.logoSrc.includes("logo-header-light.png") || metrics.logoHeight == null || Math.abs(metrics.logoHeight - c.logoHeight) > .5) failures.push(`${c.name}: logo drift`);
    if (metrics.overflow > 1) failures.push(`${c.name}: horizontal overflow ${metrics.overflow}px`);
    if (c.mobile) {
      if (metrics.logoCenterDelta == null || metrics.logoCenterDelta > 1) failures.push(`${c.name}: logo center drift`);
      if (metrics.menuWidth !== 44 || metrics.menuHeight !== 44 || metrics.leftInset == null || metrics.leftInset < 16) failures.push(`${c.name}: mobile menu geometry drift`);
      for (const text of ["Favoris", "Publier", "Acheter", "Louer", "Neuf", "Agences", "Conseils", "Mon Projet"]) if (metrics.visibleLinks.includes(text)) failures.push(`${c.name}: unexpected visible ${text}`);
    } else {
      if (metrics.searchAxisDelta == null || metrics.searchAxisDelta > 3) failures.push(`${c.name}: Search axis drift`);
      const expectedNav = ["Acheter", "Louer", "Neuf", "Agences", "Mon Projet"];
      if (JSON.stringify(metrics.nav) !== JSON.stringify(expectedNav)) failures.push(`${c.name}: nav ${JSON.stringify(metrics.nav)} != ${JSON.stringify(expectedNav)}`);
      if (!metrics.visibleLinks.includes("Favoris") || !metrics.visibleLinks.includes("Publier")) failures.push(`${c.name}: desktop actions missing`);
    }
  }
  const screenshot = path.join(outDir, `${c.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  results.push({ ...c, metrics, screenshot });
  await context.close();
}

await browser.close();
const report = { lot: "UX-PREMIUM-HEADER-1", auditLot, variant, score: failures.length ? 0 : 10, pass: failures.length === 0, target: { mobileHeightsPx: { 360: 63, 390: 63, 768: 68 }, desktopHeightPx: 64, logoHeightsPx: { 360: 31, 390: 31, 768: 29, 1440: 31 }, mobileMenuTouchTargetPx: 44, mobileAccountAction: "intentionally-absent", desktopNavigation: ["Acheter", "Louer", "Neuf", "Agences", "Mon Projet"] }, failures, results };
await fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
