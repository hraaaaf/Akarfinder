import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = join(process.cwd(), "artifacts", "p1a6-map-responsive");

const routes = [
  { path: "/map", slug: "map" },
  { path: "/map?city=Rabat", slug: "map-rabat" },
  { path: "/map?city=Rabat&district=Agdal", slug: "map-rabat-agdal" },
] as const;

const viewports = [
  { width: 390, height: 844, label: "390" },
  { width: 430, height: 932, label: "430" },
  { width: 768, height: 1024, label: "768" },
  { width: 1280, height: 900, label: "1280" },
] as const;

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type Finding = { route: string; viewport: string; check: string; detail: string };

function overlaps(a: Rect, b: Rect, tolerance = 2) {
  return !(
    a.right <= b.left + tolerance ||
    b.right <= a.left + tolerance ||
    a.bottom <= b.top + tolerance ||
    b.bottom <= a.top + tolerance
  );
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const findings: Finding[] = [];
  const browser = await chromium.launch({ headless: true });

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: "reduce",
        colorScheme: "light",
      });

      for (const route of routes) {
        const page = await context.newPage();
        const response = await page.goto(`${baseUrl}${route.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        await page.waitForTimeout(900);

        if (!response || response.status() >= 500) {
          findings.push({
            route: route.path,
            viewport: viewport.label,
            check: "http-status",
            detail: `Unexpected status ${response?.status() ?? "none"}`,
          });
        }

        const geometry = await page.evaluate(() => {
          const rect = (selector: string) => {
            const element = document.querySelector(selector) as HTMLElement | null;
            if (!element) return null;
            const r = element.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
          };
          const explorer = document.querySelector('[aria-label="Exploration territoriale"]');
          const explorerButtons = explorer
            ? Array.from(explorer.querySelectorAll("button")).map((button) => {
                const r = button.getBoundingClientRect();
                return { width: r.width, height: r.height, text: button.textContent?.trim() ?? "" };
              })
            : [];

          return {
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            cockpit: rect('[aria-label="Contrôles de la carte immobilière"]'),
            explorer: rect('[aria-label="Exploration territoriale"]'),
            panel: rect('[aria-label^="Fiche repère quartier"]'),
            explorerButtons,
          };
        });

        if (geometry.documentWidth > geometry.viewportWidth + 2) {
          findings.push({
            route: route.path,
            viewport: viewport.label,
            check: "horizontal-overflow",
            detail: `${geometry.documentWidth}px document for ${geometry.viewportWidth}px viewport`,
          });
        }
        if (!geometry.cockpit || !geometry.explorer) {
          findings.push({
            route: route.path,
            viewport: viewport.label,
            check: "map-controls",
            detail: "Cockpit or territorial explorer missing",
          });
        } else if (overlaps(geometry.cockpit, geometry.explorer)) {
          findings.push({
            route: route.path,
            viewport: viewport.label,
            check: "cockpit-explorer-overlap",
            detail: JSON.stringify({ cockpit: geometry.cockpit, explorer: geometry.explorer }),
          });
        }

        if (geometry.panel && geometry.explorer && overlaps(geometry.panel, geometry.explorer, 6)) {
          findings.push({
            route: route.path,
            viewport: viewport.label,
            check: "explorer-panel-overlap",
            detail: JSON.stringify({ explorer: geometry.explorer, panel: geometry.panel }),
          });
        }

        for (const target of geometry.explorerButtons) {
          if (target.height < 31 || target.width < 31) {
            findings.push({
              route: route.path,
              viewport: viewport.label,
              check: "territorial-touch-target",
              detail: `${target.text || "unnamed"}: ${target.width.toFixed(1)}×${target.height.toFixed(1)}px`,
            });
          }
        }

        // Screenshot the natural, untouched viewport. Keyboard-focus checks belong to the
        // global accessibility audit and must not contaminate visual certification images.
        await page.screenshot({
          path: join(outputDir, `${route.slug}-${viewport.label}.png`),
          fullPage: false,
        });
        await page.close();
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const summary = {
    routes: routes.length,
    viewports: viewports.map((viewport) => viewport.label),
    screenshots: routes.length * viewports.length,
    findings,
  };
  writeFileSync(join(outputDir, "report.json"), JSON.stringify(summary, null, 2));
  writeFileSync(
    join(outputDir, "report.md"),
    [
      "# P1A.6 Map Responsive Audit",
      "",
      `Routes: ${summary.routes}`,
      `Viewports: ${summary.viewports.join(", ")}`,
      `Screenshots: ${summary.screenshots}`,
      `Findings: ${summary.findings.length}`,
      "",
      ...summary.findings.map((finding) => `- [${finding.viewport}] ${finding.route} — ${finding.check}: ${finding.detail}`),
      "",
    ].join("\n"),
  );

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
