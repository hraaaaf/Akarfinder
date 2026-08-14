import { chromium } from "playwright";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/ui-polish-p5";
const appDir = join(process.cwd(), "app");
const populatedCompareIds = [
  "casablanca-finance-city-terrasse",
  "casablanca-maarif-studio-renove",
];

const dynamicFixtures = new Map([
  ["/listings/[id]", "/listings/casablanca-finance-city-terrasse"],
  ["/projets/[slug]", "/projets/residence-demo-akarfinder?preview=demo"],
  ["/promoteurs/[slug]", "/promoteurs/promoteur-demo-akarfinder?preview=demo"],
  ["/quartiers/[citySlug]/[neighborhoodSlug]", "/quartiers/rabat/agdal"],
]);

const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
];

async function collectPageFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (relative(appDir, full).split(sep)[0] === "api") continue;
      files.push(...await collectPageFiles(full));
    } else if (entry.isFile() && entry.name === "page.tsx") {
      files.push(full);
    }
  }
  return files;
}

function templateFromPageFile(file) {
  const rel = relative(appDir, file).split(sep).join("/").replace(/\/page\.tsx$/, "");
  if (!rel) return "/";
  const route = rel
    .split("/")
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .join("/");
  return `/${route}`;
}

function isDynamicTemplate(route) {
  return route.includes("[");
}

function routeRegex(template) {
  const escaped = template
    .split("/")
    .map((segment) => {
      if (!segment) return "";
      if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) return "(?:.+)?";
      if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return ".+";
      if (/^\[[^\]]+\]$/.test(segment)) return "[^/]+";
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${escaped}/?$`);
}

async function fetchSitemapPaths() {
  const response = await fetch(`${baseUrl}/sitemap.xml`);
  if (!response.ok) throw new Error(`sitemap.xml HTTP ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => {
      try { return new URL(match[1]).pathname; } catch { return null; }
    })
    .filter(Boolean);
}

const pageFiles = (await collectPageFiles(appDir)).sort();
const templates = [...new Set(pageFiles.map(templateFromPageFile))].sort();
const sitemapPaths = await fetchSitemapPaths();
const unresolvedDynamicTemplates = [];

const discoveredRoutes = templates.map((template) => {
  if (!isDynamicTemplate(template)) return { template, route: template, source: "static" };
  const regex = routeRegex(template);
  const sitemapRoute = sitemapPaths.find((pathname) => regex.test(pathname));
  if (sitemapRoute) return { template, route: sitemapRoute, source: "sitemap" };
  const fixtureRoute = dynamicFixtures.get(template);
  if (fixtureRoute) return { template, route: fixtureRoute, source: "fixture" };
  unresolvedDynamicTemplates.push(template);
  return { template, route: null, source: "unresolved-dynamic" };
});

const scenarios = discoveredRoutes
  .filter((item) => item.route)
  .map((item) => ({ key: item.template === "/" ? "home" : item.template.slice(1).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, ""), ...item }));

scenarios.push({
  key: "compare-populated",
  template: "/compare",
  route: "/compare",
  source: "fixture",
  options: { compareIds: populatedCompareIds },
});

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = unresolvedDynamicTemplates.map((template) => `${template}: no concrete audit fixture found`);

try {
  for (const scenario of scenarios) {
    const { key: scenarioKey, route, template, source, options = {} } = scenario;
    for (const [viewportKey, width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: "light" });
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      try {
        if (options.compareIds) {
          await page.addInitScript((ids) => {
            window.localStorage.setItem("akarfinder:compare:listings", JSON.stringify(ids));
          }, options.compareIds);
        }

        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        const status = response?.status() ?? 0;
        await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
        await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
        await page.waitForTimeout(route.startsWith("/map") ? 2200 : 650);

        const metrics = await page.evaluate(() => {
          const root = document.documentElement;
          const bottomNav = document.querySelector("[data-mobile-bottom-nav]");
          const bottomNavVisible = bottomNav instanceof HTMLElement
            && getComputedStyle(bottomNav).display !== "none"
            && bottomNav.getClientRects().length > 0;
          return {
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            scrollHeight: root.scrollHeight,
            heading: document.querySelector("h1")?.textContent?.trim() ?? null,
            bottomNavPresent: Boolean(bottomNav),
            bottomNavVisible,
            finalPathname: window.location.pathname,
            documentTitle: document.title,
          };
        });

        const horizontalOverflow = metrics.scrollWidth > metrics.clientWidth + 1;
        if (!response || status >= 400) failures.push(`${scenarioKey} @ ${viewportKey}: HTTP ${status || "no response"}`);
        if (horizontalOverflow) failures.push(`${scenarioKey} @ ${viewportKey}: overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
        if (!metrics.heading) failures.push(`${scenarioKey} @ ${viewportKey}: missing H1`);
        if (width >= 768 && metrics.bottomNavVisible) failures.push(`${scenarioKey} @ ${viewportKey}: mobile nav visible at md+`);

        const screenshot = `${scenarioKey}-${viewportKey}.png`;
        await page.screenshot({ path: `${outputDir}/${screenshot}`, fullPage: true });
        results.push({
          scenarioKey,
          template,
          route,
          source,
          viewport: viewportKey,
          width,
          height,
          status,
          screenshot,
          horizontalOverflow,
          consoleErrors: consoleErrors.slice(0, 10),
          consoleErrorCount: consoleErrors.length,
          ...metrics,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${scenarioKey} @ ${viewportKey}: ${message}`);
        results.push({ scenarioKey, template, route, source, viewport: viewportKey, width, height, error: message });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "UI_POLISH_ALL_PAGES_AUDIT_V1",
  generatedAt: new Date().toISOString(),
  baseUrl,
  pageFileCount: pageFiles.length,
  routeTemplateCount: templates.length,
  auditedScenarioCount: scenarios.length,
  unresolvedDynamicTemplates,
  sitemapPathCount: sitemapPaths.length,
  templates,
  scenarios: scenarios.map(({ key, template, route, source }) => ({ key, template, route, source })),
  viewports: viewports.map(([name, width, height]) => ({ name, width, height })),
  screenshotCount: results.filter((item) => item.screenshot).length,
  failures,
  results,
};

await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) throw new Error(`All-pages visual audit completed with ${failures.length} finding(s)`);
