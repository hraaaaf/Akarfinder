import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.P1B2_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "artifacts/p1b2-territorial-intelligence";
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
    const value = `p1b2-intelligence-audit-${i}`;
    if (bucket(value) < 100) return value;
  }
  throw new Error("Unable to derive deterministic geometry canary key");
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const key = eligibleCanaryKey();
  const findings: string[] = [];
  const diagnostics: Array<Record<string, unknown>> = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    await context.addCookies([{
      name: "akar_geometry_canary",
      value: key,
      url: BASE_URL,
      sameSite: "Lax",
    }]);
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    const response = await page.goto(`${BASE_URL}/map?city=Casablanca&layer=price`, { waitUntil: "networkidle" });
    if (!response || response.status() >= 400) findings.push(`${viewport.name}: page HTTP ${response?.status() ?? "none"}`);

    const intelligence = page.locator('[data-akarfinder-intelligence-layer="price"]');
    try {
      await intelligence.waitFor({ state: "visible", timeout: 15_000 });
    } catch {
      findings.push(`${viewport.name}: price intelligence legend did not become visible`);
    }

    const exactMarkers = page.locator('[data-akarfinder-market-marker="exact-price"]');
    const markerCount = await exactMarkers.count();
    const text = await page.locator("body").innerText();
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      canvasCount: document.querySelectorAll(".maplibregl-canvas").length,
      priceMode: document.querySelector('[data-akarfinder-intelligence-layer="price"]') != null,
      territorialActive: document.querySelector('[data-akarfinder-territorial-layer="active"]') != null,
    }));

    if (markerCount !== 2) findings.push(`${viewport.name}: expected 2 exact Casablanca apartment price markers, got ${markerCount}`);
    if (!text.includes("15 000 DH/m²") && !text.includes("15 000 DH/m²")) findings.push(`${viewport.name}: Finance City 15,000 benchmark not visible`);
    if (!text.includes("14 000 DH/m²") && !text.includes("14 000 DH/m²")) findings.push(`${viewport.name}: Maârif 14,000 benchmark not visible`);
    if (!text.includes("Aucune interpolation sur les zones")) findings.push(`${viewport.name}: non-interpolation disclosure missing`);
    if (text.includes("Bouskoura") && markerCount > 2) findings.push(`${viewport.name}: non-exact Bouskoura price leaked into price layer`);
    if (metrics.scrollWidth > metrics.clientWidth + 1) findings.push(`${viewport.name}: horizontal overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
    if (metrics.canvasCount < 1) findings.push(`${viewport.name}: MapLibre canvas missing`);
    if (!metrics.priceMode) findings.push(`${viewport.name}: price mode marker missing`);
    if (!metrics.territorialActive) findings.push(`${viewport.name}: Casablanca territorial geometry inactive`);
    if (consoleErrors.length > 0) findings.push(`${viewport.name}: console errors: ${consoleErrors.join(" | ")}`);

    diagnostics.push({ viewport: viewport.name, markerCount, metrics, consoleErrors });
    await page.screenshot({ path: `${OUT}/casablanca-price-${viewport.name}.png`, fullPage: false });
    await context.close();
  }

  await browser.close();
  const report = {
    route: "/map?city=Casablanca&layer=price",
    canaryBucket: bucket(key),
    screenshots: viewports.length,
    findings,
    diagnostics,
  };
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  await writeFile(`${OUT}/report.md`, `# P1B.2 Territorial Intelligence Audit\n\nRoute: ${report.route}\nScreenshots: ${viewports.length}\nFindings: ${findings.length}\nCanary bucket: ${report.canaryBucket}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (findings.length > 0) process.exit(1);
}

void main();
