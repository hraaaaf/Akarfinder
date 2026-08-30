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

    const response = await page.goto(`${BASE_URL}/map?city=Casablanca&layer=price`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!response || response.status() >= 400) findings.push(`${viewport.name}: page HTTP ${response?.status() ?? "none"}`);
    try {
      await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 15_000 });
    } catch {
      findings.push(`${viewport.name}: MapLibre canvas did not become visible`);
    }

    try {
      await page.waitForFunction(() => {
        const legend = document.querySelector('[data-akarfinder-intelligence-legend="price"]');
        const compact = document.querySelector('[data-akarfinder-intelligence-layer="price"]');
        const legendText = legend?.textContent || "";
        const legendSettled = Boolean(legend)
          && !legendText.includes("Calcul des annonces observées")
          && !legendText.includes("temporairement indisponibles");
        return legendSettled || Boolean(compact);
      }, null, { timeout: 15_000 });
    } catch {
      findings.push(`${viewport.name}: price intelligence truth surface did not settle`);
    }

    const api = await context.request.get(`${BASE_URL}/api/geo/market-intelligence?city=casablanca&mode=price&transaction=sale`);
    let apiPayload: any = null;
    if (api.status() !== 200) {
      findings.push(`${viewport.name}: observed market API HTTP ${api.status()}`);
    } else {
      apiPayload = await api.json();
      if (apiPayload?.observedMarketOnly !== true) findings.push(`${viewport.name}: observed-only truth flag missing`);
      if (apiPayload?.mode !== "price" || apiPayload?.city?.slug !== "casablanca") findings.push(`${viewport.name}: observed price payload scope mismatch`);
    }

    const exactMarkers = page.locator('[data-akarfinder-market-marker="exact-price"]');
    const markerCount = await exactMarkers.count();
    const text = await page.locator("body").innerText();
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      canvasCount: document.querySelectorAll(".maplibregl-canvas").length,
      priceMode: document.querySelector('[data-akarfinder-intelligence-legend="price"], [data-akarfinder-intelligence-layer="price"]') != null,
      territorialActive: document.querySelector('[data-akarfinder-territorial-layer="active"]') != null,
    }));

    if (markerCount > 2) findings.push(`${viewport.name}: unexpected extra exact price markers (${markerCount})`);
    if (!text.includes("Aucune interpolation sur les zones") && !text.includes("Aucune interpolation : prix et surfaces absents")) {
      findings.push(`${viewport.name}: non-interpolation disclosure missing`);
    }
    if (metrics.scrollWidth > metrics.clientWidth + 1) findings.push(`${viewport.name}: horizontal overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
    if (metrics.canvasCount < 1) findings.push(`${viewport.name}: MapLibre canvas missing`);
    if (!metrics.priceMode) findings.push(`${viewport.name}: dynamic price intelligence marker missing`);
    if (!metrics.territorialActive) findings.push(`${viewport.name}: Casablanca territorial geometry inactive`);
    if (consoleErrors.length > 0) findings.push(`${viewport.name}: console errors: ${consoleErrors.join(" | ")}`);

    diagnostics.push({
      viewport: viewport.name,
      markerCount,
      metrics,
      consoleErrors,
      apiStatus: api.status(),
      priceAvailableCount: apiPayload?.legend?.availableCount ?? null,
    });
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
