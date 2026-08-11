import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3141";
const variant = process.env.AUDIT_VARIANT ?? "product-design";
const outDir = path.join("data", "audits", "ux-header-10of10-1", variant);
const cases = [
  { name: "desktop-1440x900", width: 1440, height: 900, desktop: true },
  { name: "mobile-390x844", width: 390, height: 844, desktop: false },
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    colorScheme: "dark",
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
  await page.waitForSelector('[data-search-global-header="exact-white"]', { timeout: 20_000 });
  await page.waitForTimeout(250);

  const metrics = await page.evaluate(({ desktop }) => {
    const header = document.querySelector('[data-search-global-header="exact-white"]');
    if (!header) return null;
    const rect = header.getBoundingClientRect();
    const style = getComputedStyle(header);
    const logo = header.querySelector('a[aria-label="AkarFinder - accueil"] img');
    const logoRect = logo?.getBoundingClientRect() ?? null;
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
    };
    const visibleLinks = Array.from(header.querySelectorAll("a")).filter(visible).map((el) => (el.textContent ?? "").trim()).filter(Boolean);
    const visibleAria = Array.from(header.querySelectorAll("a,button")).filter(visible).map((el) => el.getAttribute("aria-label")).filter(Boolean);
    const navLinks = Array.from(header.querySelectorAll('nav[aria-label="Navigation principale"] a')).filter(visible).map((el) => (el.textContent ?? "").trim());
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    return {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      backgroundColor: style.backgroundColor,
      color: style.color,
      logoSrc: logo?.getAttribute("src") ?? "",
      logoCenterX: logoRect ? logoRect.left + logoRect.width / 2 : null,
      viewportCenterX: window.innerWidth / 2,
      visibleLinks,
      visibleAria,
      navLinks,
      bodyBg,
      desktop,
    };
  }, { desktop: testCase.desktop });

  if (!metrics) {
    failures.push(`${testCase.name}: header missing`);
  } else {
    if (Math.abs(metrics.width - testCase.width) > 0.5) failures.push(`${testCase.name}: header width ${metrics.width} != ${testCase.width}`);
    if (Math.abs(metrics.height - 54) > 0.5) failures.push(`${testCase.name}: header height ${metrics.height} != 54`);
    if (Math.abs(metrics.left) > 0.5 || Math.abs(metrics.top) > 0.5) failures.push(`${testCase.name}: header not pinned to viewport origin`);
    if (metrics.backgroundColor !== "rgb(255, 255, 255)") failures.push(`${testCase.name}: header background ${metrics.backgroundColor} is not pure white`);
    if (!metrics.logoSrc.includes("logo-header-light.png")) failures.push(`${testCase.name}: blue/light logo not used (${metrics.logoSrc})`);

    if (testCase.desktop) {
      const expectedNav = ["Acheter", "Louer", "Neuf", "Agences", "Conseils"];
      if (JSON.stringify(metrics.navLinks) !== JSON.stringify(expectedNav)) failures.push(`${testCase.name}: nav ${JSON.stringify(metrics.navLinks)} != ${JSON.stringify(expectedNav)}`);
      if (!metrics.visibleLinks.includes("Favoris")) failures.push(`${testCase.name}: Favoris missing`);
      if (!metrics.visibleLinks.includes("Publier")) failures.push(`${testCase.name}: Publier missing`);
      if (!metrics.visibleAria.includes("Mon compte")) failures.push(`${testCase.name}: account control missing`);
      if (metrics.visibleLinks.includes("Mon projet")) failures.push(`${testCase.name}: Mon projet must not dominate Search header`);
    } else {
      if (!metrics.visibleAria.includes("Ouvrir le menu")) failures.push(`${testCase.name}: menu control missing`);
      if (!metrics.visibleAria.includes("Mon compte")) failures.push(`${testCase.name}: account control missing`);
      if (metrics.logoCenterX == null || Math.abs(metrics.logoCenterX - metrics.viewportCenterX) > 1) failures.push(`${testCase.name}: logo is not geometrically centered (${metrics.logoCenterX} vs ${metrics.viewportCenterX})`);
      const forbidden = ["Favoris", "Publier", "Acheter", "Louer", "Neuf", "Agences", "Conseils", "Mon projet"];
      for (const text of forbidden) if (metrics.visibleLinks.includes(text)) failures.push(`${testCase.name}: unexpected visible header item ${text}`);
    }
  }

  const screenshot = path.join(outDir, `${testCase.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  results.push({ ...testCase, metrics, screenshot });
  await context.close();
}

await browser.close();
const report = {
  lot: "UX-HEADER-10OF10-1",
  variant,
  score: failures.length === 0 ? 10 : 0,
  pass: failures.length === 0,
  contract: {
    pureWhiteSurface: true,
    blueLightLogo: true,
    desktopNav: ["Acheter", "Louer", "Neuf", "Agences", "Conseils"],
    desktopActions: ["Favoris", "Publier", "Mon compte"],
    mobileLayout: ["Ouvrir le menu", "AkarFinder centered", "Mon compte"],
    headerHeightPx: 54,
    noOrange: true,
  },
  failures,
  results,
};
await fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
