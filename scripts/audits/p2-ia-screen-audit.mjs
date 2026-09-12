import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3220";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/p2-ia-screens";

const routes = [
  { key: "home", path: "/" },
  { key: "acheter", path: "/acheter" },
  { key: "louer", path: "/louer" },
  { key: "neuf", path: "/neuf" },
  { key: "search", path: "/search" },
  { key: "map", path: "/map?city=rabat&layer=explore" },
  { key: "vendre", path: "/vendre" },
  { key: "pro", path: "/pro" },
  { key: "mon-projet", path: "/mon-projet" },
  { key: "promoteurs", path: "/promoteurs" },
  { key: "immobilier-casablanca-maarif", path: "/immobilier/casablanca/maarif" },
  { key: "quartiers-casablanca-maarif", path: "/quartiers/casablanca/maarif" },
  { key: "compagnon", path: "/compagnon" },
  { key: "profil-recherche", path: "/profil-recherche" },
  { key: "onboarding", path: "/onboarding" },
];

const viewports = [
  ["390x844", 390, 844],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];

const menuAuditRoutes = new Set(["home", "search", "map", "mon-projet", "pro"]);

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const rows = [];
const findings = [];

try {
  for (const route of routes) {
    for (const [viewport, width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: "light", reducedMotion: "reduce" });
      const consoleErrors = [];
      const failedResponses = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("response", (response) => {
        if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
      });

      let response = null;
      try {
        response = await page.goto(`${baseURL}${route.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForFunction(() => document.readyState === "complete", null, { timeout: 15_000 }).catch(() => {});
        await page.evaluate(() => document.fonts?.ready);
        await page.waitForTimeout(route.key === "map" ? 1500 : 400);

        const metrics = await page.evaluate(() => {
          const navs = [...document.querySelectorAll("nav")].map((nav) => ({
            ariaLabel: nav.getAttribute("aria-label") ?? "",
            links: [...nav.querySelectorAll("a")].map((anchor) => ({
              text: (anchor.textContent ?? "").replace(/\s+/g, " ").trim(),
              href: anchor.getAttribute("href") ?? "",
              current: anchor.getAttribute("aria-current") ?? "",
            })),
          }));
          return {
            title: document.title,
            h1: document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            navs,
            headerMode: document.querySelector("header")?.getAttribute("data-search-global-header") ?? null,
          };
        });

        const finalUrl = new URL(page.url());
        const screenshot = `${route.key}-${viewport}.png`;
        await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });

        if ((response?.status() ?? 0) >= 400 || (response?.status() ?? 0) === 0) {
          findings.push({ route: route.key, viewport, code: "HTTP", detail: response?.status() ?? 0 });
        }
        if (metrics.scrollWidth > metrics.clientWidth + 1) {
          findings.push({ route: route.key, viewport, code: "HORIZONTAL_OVERFLOW", detail: `${metrics.scrollWidth}>${metrics.clientWidth}` });
        }

        let mobileMenu = null;
        if (width === 390 && menuAuditRoutes.has(route.key)) {
          const menuButton = page.getByRole("button", { name: /ouvrir le menu/i }).first();
          if (await menuButton.isVisible().catch(() => false)) {
            await menuButton.click();
            await page.waitForTimeout(120);
            mobileMenu = await page.evaluate(() => {
              const nav = document.querySelector('nav[aria-label="Navigation mobile principale"]');
              if (!nav) return null;
              return [...nav.querySelectorAll("a")].map((anchor) => ({
                text: (anchor.textContent ?? "").replace(/\s+/g, " ").trim(),
                href: anchor.getAttribute("href") ?? "",
                current: anchor.getAttribute("aria-current") ?? "",
              }));
            });
            await page.screenshot({ path: path.join(outputDir, `${route.key}-390x844-menu-open.png`), fullPage: true });
          }
        }

        rows.push({
          route: route.key,
          requestedPath: route.path,
          finalPath: `${finalUrl.pathname}${finalUrl.search}`,
          viewport,
          width,
          height,
          status: response?.status() ?? 0,
          screenshot,
          menuScreenshot: mobileMenu ? `${route.key}-390x844-menu-open.png` : null,
          mobileMenu,
          consoleErrors,
          failedResponses,
          ...metrics,
        });
      } catch (error) {
        findings.push({ route: route.key, viewport, code: "AUDIT_ERROR", detail: error instanceof Error ? error.message : String(error) });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "P2_IA_SCREEN_AUDIT_V1",
  generatedAt: new Date().toISOString(),
  baseURL,
  routeCount: routes.length,
  viewportCount: viewports.length,
  expectedScreenshotCount: routes.length * viewports.length + menuAuditRoutes.size,
  screenshotCount: rows.length + rows.filter((row) => row.menuScreenshot).length,
  findingCount: findings.length,
  findings,
  rows,
};

await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  routeCount: report.routeCount,
  viewportCount: report.viewportCount,
  screenshotCount: report.screenshotCount,
  expectedScreenshotCount: report.expectedScreenshotCount,
  findingCount: report.findingCount,
}, null, 2));

if (findings.length > 0) process.exit(1);
