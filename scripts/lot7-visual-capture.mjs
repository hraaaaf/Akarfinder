import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

// Real-browser proof only: no mocked page, no production deployment.
const baseUrl = process.env.LOT7_VISUAL_BASE_URL || "http://127.0.0.1:3000";
const outDir = process.env.LOT7_VISUAL_OUTPUT || "artifacts/lot7-visual";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const url = `${baseUrl}/search?city=Casablanca&property_type=Villa&transaction_type=buy`;

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  await desktop.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await desktop.getByText("Villa contemporaine à Casablanca").waitFor({ state: "visible", timeout: 30000 });
  await desktop.screenshot({ path: `${outDir}/lot7-search-desktop-1440.png`, fullPage: true });
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await mobile.getByText("Villa contemporaine à Casablanca").waitFor({ state: "visible", timeout: 30000 });
  await mobile.screenshot({ path: `${outDir}/lot7-search-mobile-390.png`, fullPage: true });
  await mobile.close();

  console.log(JSON.stringify({ url, desktop: "lot7-search-desktop-1440.png", mobile: "lot7-search-mobile-390.png" }));
} finally {
  await browser.close();
}
