import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.P1B1_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "artifacts/p1b1-akarfinder-map-visual";
const viewports = [
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
] as const;

function bucket(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 10_000;
}

function eligibleCanaryKey(): string {
  for (let i = 0; i < 100_000; i += 1) {
    const value = `p1b1-visual-audit-${i}`;
    if (bucket(value) < 100) return value;
  }
  throw new Error("Unable to derive a deterministic 1% canary key");
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const findings: string[] = [];
  const diagnostics: Array<Record<string, unknown>> = [];
  const key = eligibleCanaryKey();

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    await context.addCookies([{
      name: "akar_geometry_canary",
      value: key,
      url: BASE_URL,
      sameSite: "Lax",
    }]);

    const legacyApi = await context.request.get(`${BASE_URL}/api/geo/casablanca-arrondissements`);
    if (legacyApi.status() !== 200) findings.push(`${viewport.name}: legacy canary API HTTP ${legacyApi.status()}`);

    const page = await context.newPage();
    const pageErrors: string[] = [];
    const territoryResponses: Array<{ status: number; url: string; view?: string; slug?: string | null }> = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("response", async (response) => {
      const url = new URL(response.url());
      if (url.pathname !== "/api/geo/national-territories") return;
      let view: string | undefined;
      let slug: string | null | undefined;
      if (response.ok()) {
        try {
          const body = await response.json() as { view?: string; place?: { slug?: string } };
          view = body.view;
          slug = body.place?.slug ?? null;
        } catch {}
      }
      territoryResponses.push({ status: response.status(), url: response.url(), view, slug });
    });

    const response = await page.goto(`${BASE_URL}/map?city=Casablanca`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!response || response.status() >= 400) findings.push(`${viewport.name}: page HTTP ${response?.status() ?? "none"}`);
    try {
      await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForFunction(() => Boolean((window as typeof window & { __AKARFINDER_NATIONAL_MAP__?: unknown }).__AKARFINDER_NATIONAL_MAP__), null, { timeout: 15_000 });
      await page.waitForFunction(() => performance.getEntriesByType("resource").some((entry) => entry.name.includes("/api/geo/national-territories?city=casablanca")), null, { timeout: 15_000 });
    } catch {
      findings.push(`${viewport.name}: national territorial runtime did not settle`);
    }

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      canvasCount: document.querySelectorAll(".maplibregl-canvas").length,
      nationalMapReady: Boolean((window as typeof window & { __AKARFINDER_NATIONAL_MAP__?: unknown }).__AKARFINDER_NATIONAL_MAP__),
    }));

    const currentTransport = territoryResponses.find((item) => item.status === 200 && item.view === "city" && item.slug === "casablanca");
    if (!currentTransport) findings.push(`${viewport.name}: current national territory response for Casablanca missing`);
    if (metrics.scrollWidth > metrics.clientWidth + 1) findings.push(`${viewport.name}: horizontal overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
    if (metrics.canvasCount < 1 || !metrics.nationalMapReady) findings.push(`${viewport.name}: national MapLibre runtime missing`);
    if (pageErrors.length > 0) findings.push(`${viewport.name}: page errors: ${pageErrors.join(" | ")}`);

    diagnostics.push({
      viewport: viewport.name,
      legacyApiStatus: legacyApi.status(),
      legacyCanary: legacyApi.headers()["x-akarfinder-geometry-canary"] ?? null,
      legacyGeometryStatus: legacyApi.headers()["x-akarfinder-geometry-status"] ?? null,
      territoryResponses,
      metrics,
      pageErrors,
    });
    await page.screenshot({ path: `${OUT}/casablanca-${viewport.name}.png`, fullPage: false });
    await context.close();
  }

  await browser.close();
  const report = {
    route: "/map?city=Casablanca",
    canaryBucket: bucket(key),
    screenshots: viewports.length,
    findings,
    diagnostics,
  };
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  await writeFile(`${OUT}/report.md`, `# P1B.1 AkarFinder Map Visual Audit\n\nScreenshots: ${viewports.length}\nFindings: ${findings.length}\nCanary bucket: ${report.canaryBucket}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (findings.length > 0) process.exit(1);
}

void main();
