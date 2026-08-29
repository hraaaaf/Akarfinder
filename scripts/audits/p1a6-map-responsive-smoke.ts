import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = join(process.cwd(), "artifacts", "p1a6-map-responsive");

const routes = [
  { path: "/map", slug: "map", experience: "national" },
  { path: "/map?city=Rabat", slug: "map-rabat", experience: "intelligence" },
  { path: "/map?city=Rabat&district=Agdal", slug: "map-rabat-agdal", experience: "intelligence" },
] as const;

const viewports = [
  { width: 390, height: 844, label: "390" },
  { width: 430, height: 932, label: "430" },
  { width: 768, height: 1024, label: "768" },
  { width: 1280, height: 900, label: "1280" },
] as const;

type Finding = { route: string; viewport: string; check: string; detail: string };

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const findings: Finding[] = [];
  const browser = await chromium.launch({ headless: true });

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce", colorScheme: "light" });

      for (const route of routes) {
        const page = await context.newPage();
        const pageErrors: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(String(error)));

        let nationalResponseStatus: number | null = null;
        page.on("response", (response) => {
          const url = new URL(response.url());
          if (url.pathname === "/api/geo/national-territories") nationalResponseStatus = response.status();
        });

        const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        if (!response || response.status() >= 500) {
          findings.push({ route: route.path, viewport: viewport.label, check: "http-status", detail: `Unexpected status ${response?.status() ?? "none"}` });
        }

        try {
          await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 20_000 });
        } catch {
          findings.push({ route: route.path, viewport: viewport.label, check: "map-canvas", detail: "MapLibre canvas missing" });
        }

        const documentWidth = await page.locator("html").evaluate((element) => element.scrollWidth);
        if (documentWidth > viewport.width + 2) {
          findings.push({ route: route.path, viewport: viewport.label, check: "horizontal-overflow", detail: `${documentWidth}px document for ${viewport.width}px viewport` });
        }

        if (route.experience === "national") {
          try {
            await page.waitForFunction(() => Boolean((window as typeof window & { __AKARFINDER_NATIONAL_MAP__?: unknown }).__AKARFINDER_NATIONAL_MAP__), null, { timeout: 15_000 });
          } catch {
            findings.push({ route: route.path, viewport: viewport.label, check: "national-map", detail: "National map runtime marker missing" });
          }
          if (nationalResponseStatus !== 200) {
            findings.push({ route: route.path, viewport: viewport.label, check: "national-territories", detail: `National territories response ${nationalResponseStatus ?? "missing"}` });
          }
        } else {
          const intelligenceMap = page.locator('[data-akarfinder-market-intelligence-map]');
          try {
            await intelligenceMap.waitFor({ state: "visible", timeout: 15_000 });
          } catch {
            findings.push({ route: route.path, viewport: viewport.label, check: "market-intelligence-map", detail: "Rabat intelligence map container missing" });
          }
        }

        if (pageErrors.length > 0) {
          findings.push({ route: route.path, viewport: viewport.label, check: "page-errors", detail: pageErrors.join(" | ") });
        }

        await page.screenshot({ path: join(outputDir, `${route.slug}-${viewport.label}.png`), fullPage: false });
        await page.close();
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const summary = { routes: routes.length, viewports: viewports.map((viewport) => viewport.label), screenshots: routes.length * viewports.length, findings };
  writeFileSync(join(outputDir, "report.json"), JSON.stringify(summary, null, 2));
  writeFileSync(join(outputDir, "report.md"), [
    "# P1A.6 Map Responsive Audit",
    "",
    `Routes: ${summary.routes}`,
    `Viewports: ${summary.viewports.join(", ")}`,
    `Screenshots: ${summary.screenshots}`,
    `Findings: ${summary.findings.length}`,
    "",
    ...summary.findings.map((finding) => `- [${finding.viewport}] ${finding.route} — ${finding.check}: ${finding.detail}`),
    "",
  ].join("\n"));

  if (findings.length > 0) {
    console.error(`P1A.6 responsive audit failed with ${findings.length} finding(s)`);
    process.exitCode = 1;
  } else {
    console.log(`P1A.6 responsive audit passed: ${summary.screenshots} screenshots, 0 findings`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
