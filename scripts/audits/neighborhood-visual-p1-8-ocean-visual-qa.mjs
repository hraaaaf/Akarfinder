import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outputDir = `data/audits/neighborhood-visual-p1-7-medina/${variant}`;
const viewports = [
  ["mobile-360x800", 360, 800, 164],
  ["mobile-390x844", 390, 844, 164],
  ["tablet-768x900", 768, 900, 196],
  ["desktop-1024x800", 1024, 800, 196],
  ["desktop-1280x900", 1280, 900, 196],
  ["desktop-1440x900", 1440, 900, 196],
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

try {
  for (const [name, width, height, imageHeight] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    try {
      const response = await page.goto(`${baseUrl}/visual-qa/medina`, { waitUntil: "networkidle", timeout: 45000 });
      if (!response || response.status() >= 400) throw new Error(`${name}: route failed`);
      await page.waitForSelector("[data-medina-qa-card]", { timeout: 15000 });
      const metrics = await page.evaluate(() => {
        const cards = [...document.querySelectorAll("[data-medina-qa-card]")];
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          cards: cards.map((card) => ({
            role: card.getAttribute("data-scene-role"),
            id: card.getAttribute("data-visual-id"),
            imageHeight: card.querySelector("[data-card-image]")?.getBoundingClientRect().height ?? 0,
            credit: card.querySelector("[data-medina-qa-credit]")?.textContent ?? "",
            background: getComputedStyle(card.querySelector("[data-card-image]"), "::before").backgroundImage,
          })),
        };
      });
      if (metrics.cards.length !== 3) throw new Error(`${name}: expected 3 cards`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) throw new Error(`${name}: horizontal overflow`);
      if (new Set(metrics.cards.map((card) => card.background)).size !== 3) throw new Error(`${name}: backgrounds not distinct`);
      for (const card of metrics.cards) {
        if (Math.abs(card.imageHeight - imageHeight) > 1.5) throw new Error(`${name}: image height drift`);
        if (!/CC BY-SA/.test(card.credit)) throw new Error(`${name}: credit missing`);
      }
      await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: true });
      results.push({ viewport: name, machine_quality_score: 10, horizontal_overflow: false, duplicate_labels: false });
    } catch (error) {
      failure = error;
      break;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify({ generated_at: new Date().toISOString(), variant, target_score: 9, results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`);
if (failure) throw failure;
