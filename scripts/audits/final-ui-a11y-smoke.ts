import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = join(process.cwd(), "artifacts", "ui-audit");

const routes = [
  { path: "/", slug: "home" },
  { path: "/search", slug: "search" },
  { path: "/acheter", slug: "acheter" },
  { path: "/louer", slug: "louer" },
  { path: "/vendre", slug: "vendre" },
  { path: "/immobilier", slug: "immobilier" },
  { path: "/map", slug: "map" },
  { path: "/pro", slug: "pro" },
  { path: "/pro/agences", slug: "agences" },
  { path: "/promoteurs", slug: "promoteurs" },
] as const;

const viewports = [
  { width: 390, height: 844, label: "390" },
  { width: 768, height: 1024, label: "768" },
  { width: 1280, height: 900, label: "1280" },
] as const;

type Finding = {
  route: string;
  viewport: string;
  check: string;
  detail: string;
};

type AuditRow = {
  route: string;
  viewport: string;
  status: number | null;
  scrollWidth: number;
  innerWidth: number;
  h1Count: number;
  mainCount: number;
  duplicateIds: string[];
  unnamedInteractive: string[];
  imagesWithoutAlt: string[];
  skipLinkPresent: boolean;
  focusTarget: string;
};

mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const findings: Finding[] = [];
const rows: AuditRow[] = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
      colorScheme: "light",
    });

    for (const route of routes) {
      const page = await context.newPage();
      let responseStatus: number | null = null;

      try {
        const response = await page.goto(`${baseUrl}${route.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        responseStatus = response?.status() ?? null;

        await page.waitForTimeout(500);

        if (responseStatus == null || responseStatus >= 500) {
          findings.push({
            route: route.path,
            viewport: viewport.label,
            check: "http-status",
            detail: `Unexpected status ${responseStatus ?? "none"}`,
          });
        }

        const dom = await page.evaluate(() => {
          const isVisible = (element: Element) => {
            const html = element as HTMLElement;
            const style = window.getComputedStyle(html);
            const rect = html.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          };

          const labelledByText = (element: Element) => {
            const ids = element.getAttribute("aria-labelledby")?.split(/\s+/).filter(Boolean) ?? [];
            return ids.map((id) => document.getElementById(id)?.textContent?.trim() ?? "").filter(Boolean).join(" ");
          };

          const accessibleName = (element: Element) => {
            const ariaLabel = element.getAttribute("aria-label")?.trim();
            if (ariaLabel) return ariaLabel;

            const labelledBy = labelledByText(element);
            if (labelledBy) return labelledBy;

            const html = element as HTMLElement;
            if (html.id) {
              const explicitLabel = document.querySelector(`label[for="${CSS.escape(html.id)}"]`)?.textContent?.trim();
              if (explicitLabel) return explicitLabel;
            }

            const wrappingLabel = element.closest("label")?.textContent?.trim();
            if (wrappingLabel) return wrappingLabel;

            if (element instanceof HTMLInputElement) {
              if (element.type === "hidden") return "hidden";
              if (element.placeholder?.trim()) return element.placeholder.trim();
              if (element.value?.trim()) return element.value.trim();
            }

            if (element instanceof HTMLImageElement && element.alt.trim()) return element.alt.trim();

            const text = element.textContent?.replace(/\s+/g, " ").trim();
            if (text) return text;

            return element.getAttribute("title")?.trim() ?? "";
          };

          const interactive = Array.from(
            document.querySelectorAll("a[href], button, input:not([type='hidden']), select, textarea, [role='button']"),
          ).filter(isVisible);

          const unnamedInteractive = interactive
            .filter((element) => !accessibleName(element))
            .slice(0, 20)
            .map((element) => {
              const html = element as HTMLElement;
              return `${element.tagName.toLowerCase()}${html.id ? `#${html.id}` : ""}.${html.className?.toString().split(/\s+/).slice(0, 3).join(".") ?? ""}`;
            });

          const imagesWithoutAlt = Array.from(document.querySelectorAll("img:not([alt])"))
            .filter(isVisible)
            .slice(0, 20)
            .map((image) => (image as HTMLImageElement).src);

          const seen = new Set<string>();
          const duplicates = new Set<string>();
          for (const element of Array.from(document.querySelectorAll("[id]"))) {
            const id = (element as HTMLElement).id;
            if (!id) continue;
            if (seen.has(id)) duplicates.add(id);
            seen.add(id);
          }

          return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            h1Count: document.querySelectorAll("h1").length,
            mainCount: document.querySelectorAll("main").length,
            duplicateIds: [...duplicates],
            unnamedInteractive,
            imagesWithoutAlt,
            skipLinkPresent: Boolean(document.querySelector('a[href="#main-content"]')),
          };
        });

        if (dom.scrollWidth > dom.innerWidth + 2) {
          findings.push({
            route: route.path,
            viewport: viewport.label,
            check: "horizontal-overflow",
            detail: `${dom.scrollWidth}px document width for ${dom.innerWidth}px viewport`,
          });
        }
        if (dom.mainCount < 1) {
          findings.push({ route: route.path, viewport: viewport.label, check: "main-landmark", detail: "No <main> landmark" });
        }
        if (dom.h1Count < 1) {
          findings.push({ route: route.path, viewport: viewport.label, check: "h1", detail: "No H1 found" });
        }
        if (!dom.skipLinkPresent) {
          findings.push({ route: route.path, viewport: viewport.label, check: "skip-link", detail: "Global skip link missing" });
        }
        if (dom.duplicateIds.length > 0) {
          findings.push({ route: route.path, viewport: viewport.label, check: "duplicate-id", detail: dom.duplicateIds.join(", ") });
        }
        if (dom.unnamedInteractive.length > 0) {
          findings.push({ route: route.path, viewport: viewport.label, check: "accessible-name", detail: dom.unnamedInteractive.join(" | ") });
        }
        if (dom.imagesWithoutAlt.length > 0) {
          findings.push({ route: route.path, viewport: viewport.label, check: "image-alt", detail: dom.imagesWithoutAlt.join(" | ") });
        }

        await page.keyboard.press("Tab");
        const focusTarget = await page.evaluate(() => {
          const active = document.activeElement as HTMLElement | null;
          if (!active) return "none";
          const label = active.getAttribute("aria-label") || active.textContent?.replace(/\s+/g, " ").trim() || active.id || active.tagName;
          return `${active.tagName.toLowerCase()}:${label}`;
        });
        if (focusTarget === "body:BODY" || focusTarget === "html:HTML" || focusTarget === "none") {
          findings.push({ route: route.path, viewport: viewport.label, check: "keyboard-focus", detail: `First Tab focus target: ${focusTarget}` });
        }

        rows.push({
          route: route.path,
          viewport: viewport.label,
          status: responseStatus,
          ...dom,
          focusTarget,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        findings.push({
          route: route.path,
          viewport: viewport.label,
          check: "navigation-error",
          detail: detail.slice(0, 500),
        });
        rows.push({
          route: route.path,
          viewport: viewport.label,
          status: responseStatus,
          scrollWidth: 0,
          innerWidth: viewport.width,
          h1Count: 0,
          mainCount: 0,
          duplicateIds: [],
          unnamedInteractive: [],
          imagesWithoutAlt: [],
          skipLinkPresent: false,
          focusTarget: "audit-error",
        });
      }

      try {
        await page.screenshot({
          path: join(outputDir, `${route.slug}-${viewport.label}.png`),
          fullPage: true,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        findings.push({
          route: route.path,
          viewport: viewport.label,
          check: "screenshot-error",
          detail: detail.slice(0, 500),
        });
      }

      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

writeFileSync(join(outputDir, "report.json"), JSON.stringify({ findings, rows }, null, 2));

const summary = [
  "# AkarFinder Final UI / Accessibility Smoke",
  "",
  `Routes: ${routes.length}`,
  `Viewports: ${viewports.map((viewport) => viewport.label).join(", ")}`,
  `Screenshots: ${routes.length * viewports.length}`,
  `Findings: ${findings.length}`,
  "",
  ...findings.map((finding) => `- [${finding.viewport}] ${finding.route} — ${finding.check}: ${finding.detail}`),
  "",
].join("\n");
writeFileSync(join(outputDir, "report.md"), summary);

if (findings.length > 0) {
  console.error(summary);
  process.exitCode = 1;
} else {
  console.log(summary);
}