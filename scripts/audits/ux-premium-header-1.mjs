import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3191";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const auditLot = process.env.AUDIT_LOT ?? "ux-premium-header-1";
const outDir = path.join("data", "audits", auditLot, variant);
const cases = [
  { name: "mobile-360x800", width: 360, height: 800, mobileHeader: true },
  { name: "mobile-390x844", width: 390, height: 844, mobileHeader: true },
  { name: "tablet-768x900", width: 768, height: 900, mobileHeader: true },
  { name: "desktop-1440x900", width: 1440, height: 900, mobileHeader: false },
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    colorScheme: "light",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const response = await page.goto(`${baseUrl}/search?city=Rabat&view=list`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  if (!response || response.status() >= 400) {
    failures.push(`${testCase.name}: route status ${response?.status() ?? "none"}`);
  }

  await page.waitForSelector('[data-premium-search-header="ux-premium-header-1"]', { timeout: 20_000 });
  await page.waitForTimeout(250);

  const metrics = await page.evaluate(({ mobileHeader }) => {
    const header = document.querySelector('[data-premium-search-header="ux-premium-header-1"]');
    if (!header) return null;
    const visible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const rect = header.getBoundingClientRect();
    const style = getComputedStyle(header);
    const logoLink = Array.from(header.querySelectorAll('a[aria-label="AkarFinder - accueil"]')).find(visible);
    const logo = logoLink?.querySelector("img") ?? null;
    const logoRect = logo?.getBoundingClientRect() ?? null;
    const searchPrimary = document.querySelector('[data-search-primary-search]');
    const searchRect = searchPrimary?.getBoundingClientRect() ?? null;
    const menu = Array.from(header.querySelectorAll("button")).find((el) => (el.getAttribute("aria-label") ?? "").includes("menu") && visible(el));
    const account = Array.from(header.querySelectorAll('a[aria-label="Mon compte"]')).find(visible);
    const menuRect = menu?.getBoundingClientRect() ?? null;
    const accountRect = account?.getBoundingClientRect() ?? null;
    const navLinks = Array.from(header.querySelectorAll('nav[aria-label="Navigation principale"] a'))
      .filter(visible)
      .map((el) => (el.textContent ?? "").trim());
    const visibleLinks = Array.from(header.querySelectorAll("a"))
      .filter(visible)
      .map((el) => (el.textContent ?? "").trim())
      .filter(Boolean);
    return {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      position: style.position,
      backgroundColor: style.backgroundColor,
      borderBottomWidth: style.borderBottomWidth,
      boxShadow: style.boxShadow,
      logoSrc: logo?.getAttribute("src") ?? "",
      logoHeight: logoRect?.height ?? null,
      logoX: logoRect?.left ?? null,
      searchX: searchRect?.left ?? null,
      desktopSearchAxisDelta: logoRect && searchRect ? Math.abs(logoRect.left - searchRect.left) : null,
      logoCenterDelta: logoRect ? Math.abs((logoRect.left + logoRect.width / 2) - window.innerWidth / 2) : null,
      menuWidth: menuRect?.width ?? null,
      menuHeight: menuRect?.height ?? null,
      accountWidth: accountRect?.width ?? null,
      accountHeight: accountRect?.height ?? null,
      leftInset: menuRect?.left ?? null,
      rightInset: accountRect ? window.innerWidth - accountRect.right : null,
      navLinks,
      visibleLinks,
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      mobileHeader,
    };
  }, { mobileHeader: testCase.mobileHeader });

  if (!metrics) {
    failures.push(`${testCase.name}: premium header missing`);
  } else {
    const expectedHeight = testCase.mobileHeader ? 68 : 64;
    const expectedLogoHeight = testCase.mobileHeader ? 29 : 31;
    if (Math.abs(metrics.width - testCase.width) > 0.5) failures.push(`${testCase.name}: width ${metrics.width} != ${testCase.width}`);
    if (Math.abs(metrics.height - expectedHeight) > 0.5) failures.push(`${testCase.name}: height ${metrics.height} != ${expectedHeight}`);
    if (Math.abs(metrics.left) > 0.5 || Math.abs(metrics.top) > 0.5) failures.push(`${testCase.name}: header not pinned to viewport origin`);
    if (metrics.position !== "sticky") failures.push(`${testCase.name}: position ${metrics.position} != sticky`);
    if (metrics.backgroundColor !== "rgb(255, 255, 255)") failures.push(`${testCase.name}: background ${metrics.backgroundColor} is not pure white`);
    if (metrics.borderBottomWidth !== "1px") failures.push(`${testCase.name}: bottom hairline ${metrics.borderBottomWidth} != 1px`);
    if (!metrics.boxShadow || metrics.boxShadow === "none") failures.push(`${testCase.name}: premium depth shadow missing`);
    if (!metrics.logoSrc.includes("logo-header-light.png")) failures.push(`${testCase.name}: light AkarFinder logo missing (${metrics.logoSrc})`);
    if (metrics.logoHeight == null || Math.abs(metrics.logoHeight - expectedLogoHeight) > 0.5) failures.push(`${testCase.name}: logo height ${metrics.logoHeight} != ${expectedLogoHeight}`);
    if (metrics.overflowX > 1) failures.push(`${testCase.name}: horizontal overflow ${metrics.overflowX}px`);

    if (testCase.mobileHeader) {
      if (metrics.logoCenterDelta == null || metrics.logoCenterDelta > 1) failures.push(`${testCase.name}: logo center delta ${metrics.logoCenterDelta}px > 1px`);
      if (metrics.menuWidth !== 44 || metrics.menuHeight !== 44) failures.push(`${testCase.name}: menu target ${metrics.menuWidth}x${metrics.menuHeight} != 44x44`);
      if (metrics.accountWidth !== 44 || metrics.accountHeight !== 44) failures.push(`${testCase.name}: account target ${metrics.accountWidth}x${metrics.accountHeight} != 44x44`);
      if (metrics.leftInset == null || metrics.leftInset < 16) failures.push(`${testCase.name}: left inset ${metrics.leftInset}px < 16px`);
      if (metrics.rightInset == null || metrics.rightInset < 16) failures.push(`${testCase.name}: right inset ${metrics.rightInset}px < 16px`);
      if (metrics.leftInset != null && metrics.rightInset != null && Math.abs(metrics.leftInset - metrics.rightInset) > 1) failures.push(`${testCase.name}: asymmetric side insets ${metrics.leftInset}px / ${metrics.rightInset}px`);
      const forbidden = ["Favoris", "Publier", "Acheter", "Louer", "Neuf", "Agences", "Conseils", "Mon projet"];
      for (const text of forbidden) if (metrics.visibleLinks.includes(text)) failures.push(`${testCase.name}: unexpected visible header item ${text}`);
    } else {
      if (metrics.desktopSearchAxisDelta == null || metrics.desktopSearchAxisDelta > 3) failures.push(`${testCase.name}: header/Search left-axis delta ${metrics.desktopSearchAxisDelta}px > 3px`);
      const expectedNav = ["Acheter", "Louer", "Neuf", "Agences", "Conseils"];
      if (JSON.stringify(metrics.navLinks) !== JSON.stringify(expectedNav)) failures.push(`${testCase.name}: nav ${JSON.stringify(metrics.navLinks)} != ${JSON.stringify(expectedNav)}`);
      if (!metrics.visibleLinks.includes("Favoris")) failures.push(`${testCase.name}: Favoris missing`);
      if (!metrics.visibleLinks.includes("Publier")) failures.push(`${testCase.name}: Publier missing`);
    }
  }

  const screenshot = path.join(outDir, `${testCase.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  results.push({ ...testCase, metrics, screenshot });
  await context.close();
}

await browser.close();
const report = {
  lot: "UX-PREMIUM-HEADER-1",
  auditLot,
  variant,
  score: failures.length === 0 ? 10 : 0,
  pass: failures.length === 0,
  target: {
    mobileTabletHeightPx: 68,
    desktopHeightPx: 64,
    mobileLogoHeightPx: 29,
    desktopLogoHeightPx: 31,
    sideTouchTargetPx: 44,
    geometricMobileCenterTolerancePx: 1,
    desktopSearchAxisTolerancePx: 3,
    minimumSideInsetPx: 16,
    surface: "pure-white-with-hairline-and-subtle-depth",
    noOrange: true,
  },
  failures,
  results,
};
await fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
