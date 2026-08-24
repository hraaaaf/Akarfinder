import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outputDir = path.resolve(process.env.NCI_L1_OUTPUT_DIR ?? "artifacts/neighborhood-context-l1");
const htmlPath = path.join(outputDir, "report.html");
const pngPath = path.join(outputDir, "l1-pilot-registry-proof.png");

if (!fs.existsSync(htmlPath)) {
  throw new Error(`Missing L1 report HTML: ${htmlPath}`);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.setContent(fs.readFileSync(htmlPath, "utf8"), { waitUntil: "load" });
  await page.screenshot({ path: pngPath, fullPage: true });
  console.log(`Saved ${pngPath}`);
} finally {
  await browser.close();
}
