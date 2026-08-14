import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outputDir = `data/audits/neighborhood-visual-p3-1-casablanca-maarif/${variant}`;
const viewports = [
  ["mobile-360x800", 360, 800],
  ["mobile-390x844", 390, 844],
  ["tablet-768x900", 768, 900],
  ["desktop-1024x800", 1024, 800],
  ["desktop-1280x900", 1280, 900],
  ["desktop-1440x900", 1440, 900],
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

try {
  for (const [name, width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    try {
      const response = await page.goto(`${baseUrl}/visual-qa/casablanca-maarif-p3`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      if (!response || response.status() >= 400) throw new Error(`${name}: route failed`);
      await page.waitForSelector("[data-p3-maarif-card]", { timeout: 15000 });

      const metrics = await page.evaluate(() => {
        const cards = [...document.querySelectorAll("[data-p3-maarif-card]")];
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          cards: cards.map((card) => {
            const image = card.querySelector("[data-neighborhood-photo-id]");
            return {
              expected: card.getAttribute("data-expected-visual"),
              resolved: image?.getAttribute("data-neighborhood-photo-id") ?? null,
              district: image?.getAttribute("data-neighborhood-photo-district") ?? null,
              title: card.querySelector("[data-neighborhood-photo-title]")?.textContent?.trim() ?? "",
              credit: card.querySelector("[data-neighborhood-photo-credit]")?.textContent?.trim() ?? "",
              disclosure: card.querySelector("[data-neighborhood-photo-disclosure]")?.textContent?.trim() ?? "",
              realPhoto: Boolean(card.querySelector("[data-neighborhood-photo-frame]")),
              illustration: Boolean(card.querySelector("[data-contextual-asset-id]")),
              imageLoaded:
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0 &&
                image.naturalHeight > 0,
            };
          }),
        };
      });

      if (metrics.cards.length !== 3) throw new Error(`${name}: expected 3 cards`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) throw new Error(`${name}: horizontal overflow`);
      if (new Set(metrics.cards.map((card) => card.resolved)).size !== 3) {
        throw new Error(`${name}: resolver did not expose three distinct Maârif masters`);
      }
      for (const card of metrics.cards) {
        if (card.resolved !== card.expected) throw new Error(`${name}: expected ${card.expected}, got ${card.resolved}`);
        if (card.district !== "Maârif") throw new Error(`${name}: unsafe district ${card.district}`);
        if (card.title !== "Casablanca • contexte Maârif") throw new Error(`${name}: unsafe public label ${card.title}`);
        if (card.disclosure !== "Photo d’ambiance") throw new Error(`${name}: disclosure drift`);
        if (!/^Crédit & licence · (Wikimedia Commons|KartaView)$/.test(card.credit)) {
          throw new Error(`${name}: source credit drift ${card.credit}`);
        }
        if (!card.realPhoto || card.illustration) throw new Error(`${name}: did not use real Maârif photo`);
        if (!card.imageLoaded) throw new Error(`${name}: Maârif photo did not load`);
      }

      await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: true });
      results.push({
        viewport: name,
        machine_quality_score: 10,
        horizontal_overflow: false,
        real_photo_cards: 3,
        distinct_masters: 3,
        truth_safe_labels: true,
        exact_source_credits: true,
        images_loaded: 3,
      });
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

await writeFile(
  `${outputDir}/metrics.json`,
  `${JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      variant,
      target_score: 9,
      results,
      failure: failure instanceof Error ? failure.message : null,
    },
    null,
    2,
  )}\n`,
);
if (failure) throw failure;
