import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outputDir = `data/audits/neighborhood-visual-p0-6/${variant}`;
const viewports = [
  { name: "mobile-390x844", width: 390, height: 844, imageHeight: 164, detailCount: 2 },
  { name: "desktop-1440x900", width: 1440, height: 900, imageHeight: 196, detailCount: 3 },
];
const expectedRoles = ["signature", "immobilier", "lifestyle"];
const expectedIds = [
  "rabat-souissi-signature-v1",
  "rabat-souissi-immobilier-v1",
  "rabat-souissi-lifestyle-v1",
];
const expectedSourceDimensions = [
  { path: "/__qa/souissi-signature.jpg", width: 3072, height: 1728 },
  { path: "/__qa/souissi-immobilier.jpg", width: 1440, height: 964 },
  { path: "/__qa/souissi-lifestyle.jpg", width: 4032, height: 3024 },
];
const localSources = expectedSourceDimensions.map((source) => source.path);

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

async function readMetrics(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll("[data-souissi-qa-card]")];
    const text = (node) => (node?.textContent ?? "").replace(/\s+/g, " ").trim();
    const visible = (node) => Boolean(
      node &&
      getComputedStyle(node).display !== "none" &&
      getComputedStyle(node).visibility !== "hidden" &&
      node.getBoundingClientRect().width > 0 &&
      node.getBoundingClientRect().height > 0
    );
    return {
      cards: cards.map((card) => {
        const frame = card.querySelector("[data-card-image]");
        const identityLayer = card.querySelector("[data-souissi-template-a-layer]");
        const mobileDetails = card.querySelector("[data-neighborhood-template-a-descriptors-mobile]");
        const desktopDetails = card.querySelector("[data-neighborhood-template-a-descriptors-desktop]");
        const background = frame ? getComputedStyle(frame, "::before").backgroundImage : "";
        const activeDetails = visible(mobileDetails) ? mobileDetails : visible(desktopDetails) ? desktopDetails : null;
        const detailText = text(activeDetails);
        return {
          role: card.getAttribute("data-scene-role"),
          id: card.getAttribute("data-visual-id"),
          license: card.getAttribute("data-source-license"),
          width: card.getBoundingClientRect().width,
          imageHeight: frame?.getBoundingClientRect().height ?? 0,
          identityHeight: identityLayer?.getBoundingClientRect().height ?? 0,
          title: text(card.querySelector("[data-neighborhood-template-a-title]")),
          city: text(card.querySelector("[data-neighborhood-template-a-title]")?.nextElementSibling),
          detailText,
          detailCount: detailText ? detailText.split("•").length : 0,
          mobileDetailsVisible: visible(mobileDetails),
          desktopDetailsVisible: visible(desktopDetails),
          disclosure: text(card.querySelector("[data-neighborhood-template-a-disclosure]")),
          credit: text(card.querySelector("[data-souissi-qa-credit]")),
          background,
          oldTitleVisible: Boolean(card.querySelector("[data-neighborhood-photo-title]") && visible(card.querySelector("[data-neighborhood-photo-title]"))),
          oldDisclosureVisible: Boolean(card.querySelector("[data-neighborhood-photo-disclosure]") && visible(card.querySelector("[data-neighborhood-photo-disclosure]"))),
          oldCreditVisible: Boolean(card.querySelector("[data-neighborhood-photo-credit]") && visible(card.querySelector("[data-neighborhood-photo-credit]"))),
        };
      }),
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    try {
      const response = await page.goto(`${baseUrl}/visual-qa/souissi`, { waitUntil: "networkidle", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: QA route returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector("[data-souissi-visual-qa-grid] [data-souissi-qa-card]", { timeout: 15_000 });

      const decodedSources = await page.evaluate(async (paths) => Promise.all(paths.map(async (path) => {
        const image = new Image();
        image.src = path;
        await image.decode();
        return { path, width: image.naturalWidth, height: image.naturalHeight };
      })), localSources);

      for (const expected of expectedSourceDimensions) {
        const decoded = decodedSources.find((source) => source.path === expected.path);
        if (!decoded) throw new Error(`${viewport.name}: source ${expected.path} was not decoded`);
        if (decoded.width !== expected.width || decoded.height !== expected.height) {
          throw new Error(`${viewport.name}: ${expected.path} decoded ${decoded.width}x${decoded.height}, expected ${expected.width}x${expected.height}`);
        }
      }
      if (decodedSources[0].width <= decodedSources[0].height) {
        throw new Error(`${viewport.name}: Signature source is not landscape`);
      }

      const metrics = await readMetrics(page);
      if (metrics.cards.length !== 3) throw new Error(`${viewport.name}: expected 3 Souissi cards, got ${metrics.cards.length}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) throw new Error(`${viewport.name}: horizontal overflow ${metrics.scrollWidth}/${metrics.clientWidth}`);

      const roles = metrics.cards.map((card) => card.role);
      const ids = metrics.cards.map((card) => card.id);
      if (JSON.stringify(roles) !== JSON.stringify(expectedRoles)) throw new Error(`${viewport.name}: scene-role drift ${JSON.stringify(roles)}`);
      if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) throw new Error(`${viewport.name}: visual-id drift ${JSON.stringify(ids)}`);
      if (new Set(metrics.cards.map((card) => card.background)).size !== 3) throw new Error(`${viewport.name}: source backgrounds are not distinct`);

      for (const card of metrics.cards) {
        if (Math.abs(card.imageHeight - viewport.imageHeight) > 1.5) throw new Error(`${viewport.name}/${card.role}: image height ${card.imageHeight}, expected ${viewport.imageHeight}`);
        if (card.title !== "SOUISSI") throw new Error(`${viewport.name}/${card.role}: title drift ${card.title}`);
        if (card.city !== "Rabat") throw new Error(`${viewport.name}/${card.role}: city drift ${card.city}`);
        if (card.detailCount !== viewport.detailCount) throw new Error(`${viewport.name}/${card.role}: visible detail count ${card.detailCount}, expected ${viewport.detailCount}`);
        if (viewport.width < 640 && (!card.mobileDetailsVisible || card.desktopDetailsVisible)) throw new Error(`${viewport.name}/${card.role}: mobile detail visibility contract failed`);
        if (viewport.width >= 640 && (card.mobileDetailsVisible || !card.desktopDetailsVisible)) throw new Error(`${viewport.name}/${card.role}: desktop detail visibility contract failed`);
        if (card.disclosure !== "Photo d’ambiance") throw new Error(`${viewport.name}/${card.role}: disclosure drift ${card.disclosure}`);
        if (!card.credit.includes("Wikimedia Commons") || !card.credit.includes("CC BY-SA")) throw new Error(`${viewport.name}/${card.role}: attribution/license missing`);
        if (card.oldTitleVisible || card.oldDisclosureVisible || card.oldCreditVisible) throw new Error(`${viewport.name}/${card.role}: duplicate legacy neighborhood labeling remains visible`);
      }

      const widths = metrics.cards.map((card) => card.width);
      if (viewport.width === 390 && widths.some((width) => width < 165 || width > 185)) throw new Error(`${viewport.name}: mobile card width drift ${JSON.stringify(widths)}`);
      if (viewport.width === 1440 && widths.some((width) => width < 330 || width > 355)) throw new Error(`${viewport.name}: desktop card width drift ${JSON.stringify(widths)}`);

      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      results.push({
        viewport: viewport.name,
        scene_roles: roles,
        visual_ids: ids,
        decoded_sources: decodedSources,
        card_widths: widths,
        image_height: viewport.imageHeight,
        visible_details_per_card: viewport.detailCount,
        horizontal_overflow: false,
        duplicate_labels: false,
        disclosure: "Photo d’ambiance",
        attribution: "present",
        machine_quality_score: 10,
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
  `${JSON.stringify({ generated_at: new Date().toISOString(), variant, target_score: 9, results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(results, null, 2));
if (failure) throw failure;
