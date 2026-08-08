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
    await context.addCookies([
      {
        name: "akar_geometry_canary",
        value: key,
        url: BASE_URL,
        sameSite: "Lax",
      },
    ]);

    const api = await context.request.get(`${BASE_URL}/api/geo/casablanca-arrondissements`);
    const apiText = await api.text();
    diagnostics.push({
      viewport: viewport.name,
      apiStatus: api.status(),
      apiCanary: api.headers()["x-akarfinder-geometry-canary"] ?? null,
      apiBucket: api.headers()["x-akarfinder-geometry-bucket"] ?? null,
      apiGeometryStatus: api.headers()["x-akarfinder-geometry-status"] ?? null,
      apiBodyPrefix: apiText.slice(0, 180),
    });
    if (api.status() !== 200) {
      findings.push(`${viewport.name}: canary API HTTP ${api.status()} (${api.headers()["x-akarfinder-geometry-canary"] ?? "no-reason"})`);
    }

    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") consoleErrors.push(`${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));

    const response = await page.goto(`${BASE_URL}/map?city=Casablanca`, { waitUntil: "networkidle" });
    if (!response || response.status() >= 400) findings.push(`${viewport.name}: page HTTP ${response?.status() ?? "none"}`);

    const layer = page.locator('[data-akarfinder-territorial-layer="active"]');
    try {
      await layer.waitFor({ state: "visible", timeout: 15_000 });
    } catch {
      findings.push(`${viewport.name}: AkarFinder territorial layer did not become active`);
    }

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      canvasCount: document.querySelectorAll(".maplibregl-canvas").length,
      active: document.querySelector('[data-akarfinder-territorial-layer="active"]') != null,
    }));
    diagnostics.push({ viewport: viewport.name, metrics, consoleErrors });
    if (metrics.scrollWidth > metrics.clientWidth + 1) findings.push(`${viewport.name}: horizontal overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
    if (metrics.canvasCount < 1) findings.push(`${viewport.name}: MapLibre canvas missing`);
    if (!metrics.active) findings.push(`${viewport.name}: territorial active marker missing`);

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
