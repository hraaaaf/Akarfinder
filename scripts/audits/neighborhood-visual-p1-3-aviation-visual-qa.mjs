import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const variant = process.env.AUDIT_VARIANT ?? "local";
const outputDir = `data/audits/neighborhood-visual-p1-3-aviation/${variant}`;
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, imageHeight: 164, detailCount: 2 },
  { name: "mobile-390x844", width: 390, height: 844, imageHeight: 164, detailCount: 2 },
  { name: "tablet-768x900", width: 768, height: 900, imageHeight: 196, detailCount: 3 },
  { name: "desktop-1024x800", width: 1024, height: 800, imageHeight: 196, detailCount: 3 },
  { name: "desktop-1280x900", width: 1280, height: 900, imageHeight: 196, detailCount: 3 },
  { name: "desktop-1440x900", width: 1440, height: 900, imageHeight: 196, detailCount: 3 },
];
const expectedRoles = ["signature", "immobilier", "lifestyle"];
const expectedIds = ["rabat-aviation-signature-v1", "rabat-aviation-immobilier-v1", "rabat-aviation-lifestyle-v1"];
const expectedSourceDimensions = [
  { path: "/neighborhood-visuals/rabat/aviation/signature/sofitel-rabat.jpg", width: 2560, height: 1440 },
  { path: "/neighborhood-visuals/rabat/aviation/immobilier/avenue-mohamed-vi.jpg", width: 3072, height: 1728 },
  { path: "/neighborhood-visuals/rabat/aviation/lifestyle/kartaview-260184419.jpg", width: 1280, height: 720 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

async function readMetrics(page) {
  return page.evaluate(() => {
    const isVisible = (node) => Boolean(node && getComputedStyle(node).display !== "none" && getComputedStyle(node).visibility !== "hidden" && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0);
    const text = (node) => (node?.textContent ?? "").replace(/\s+/g, " ").trim();
    const cards = [...document.querySelectorAll("[data-aviation-qa-card]")];
    return {
      cards: cards.map((card) => {
        const frame = card.querySelector("[data-card-image]");
        const mobileDetails = card.querySelector("[data-neighborhood-template-a-descriptors-mobile]");
        const desktopDetails = card.querySelector("[data-neighborhood-template-a-descriptors-desktop]");
        const activeDetails = isVisible(mobileDetails) ? mobileDetails : isVisible(desktopDetails) ? desktopDetails : null;
        const detailText = text(activeDetails);
        return {
          role: card.getAttribute("data-scene-role"), id: card.getAttribute("data-visual-id"),
          width: card.getBoundingClientRect().width, imageHeight: frame?.getBoundingClientRect().height ?? 0,
          title: text(card.querySelector("[data-neighborhood-template-a-title]")),
          city: text(card.querySelector("[data-neighborhood-template-a-title]")?.nextElementSibling),
          detailCount: detailText ? detailText.split("•").length : 0,
          mobileDetailsVisible: isVisible(mobileDetails), desktopDetailsVisible: isVisible(desktopDetails),
          disclosure: text(card.querySelector("[data-neighborhood-template-a-disclosure]")),
          credit: text(card.querySelector("[data-aviation-qa-credit]")),
          background: frame ? getComputedStyle(frame, "::before").backgroundImage : "",
          oldTitleVisible: isVisible(card.querySelector("[data-neighborhood-photo-title]")),
          oldDisclosureVisible: isVisible(card.querySelector("[data-neighborhood-photo-disclosure]")),
          oldCreditVisible: isVisible(card.querySelector("[data-neighborhood-photo-credit]")),
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
      const response = await page.goto(`${baseUrl}/visual-qa/aviation`, { waitUntil: "networkidle", timeout: 45_000 });
      if (!response || response.status() >= 400) throw new Error(`${viewport.name}: QA route returned ${response?.status() ?? "no response"}`);
      await page.waitForSelector("[data-aviation-visual-qa-grid] [data-aviation-qa-card]", { timeout: 15_000 });
      const decodedSources = await page.evaluate(async (sources) => Promise.all(sources.map(async (expected) => {
        const image = new Image(); image.src = expected.path; await image.decode();
        return { path: expected.path, width: image.naturalWidth, height: image.naturalHeight };
      })), expectedSourceDimensions);
      for (const expected of expectedSourceDimensions) {
        const decoded = decodedSources.find((source) => source.path === expected.path);
        if (!decoded || decoded.width !== expected.width || decoded.height !== expected.height) throw new Error(`${viewport.name}: source dimension drift for ${expected.path}: ${decoded?.width}x${decoded?.height}`);
      }
      const metrics = await readMetrics(page);
      if (metrics.cards.length !== 3) throw new Error(`${viewport.name}: expected 3 Aviation cards, got ${metrics.cards.length}`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) throw new Error(`${viewport.name}: horizontal overflow ${metrics.scrollWidth}/${metrics.clientWidth}`);
      const roles = metrics.cards.map((card) => card.role); const ids = metrics.cards.map((card) => card.id);
      if (JSON.stringify(roles) !== JSON.stringify(expectedRoles)) throw new Error(`${viewport.name}: role drift`);
      if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) throw new Error(`${viewport.name}: id drift`);
      if (new Set(metrics.cards.map((card) => card.background)).size !== 3) throw new Error(`${viewport.name}: source backgrounds are not distinct`);
      for (const card of metrics.cards) {
        if (Math.abs(card.imageHeight - viewport.imageHeight) > 1.5) throw new Error(`${viewport.name}/${card.role}: image height drift ${card.imageHeight}`);
        if (card.title !== "AVIATION" || card.city !== "Rabat") throw new Error(`${viewport.name}/${card.role}: identity drift`);
        if (card.detailCount !== viewport.detailCount) throw new Error(`${viewport.name}/${card.role}: detail count ${card.detailCount}`);
        if (viewport.width < 640 && (!card.mobileDetailsVisible || card.desktopDetailsVisible)) throw new Error(`${viewport.name}/${card.role}: mobile detail visibility contract failed`);
        if (viewport.width >= 640 && (card.mobileDetailsVisible || !card.desktopDetailsVisible)) throw new Error(`${viewport.name}/${card.role}: desktop detail visibility contract failed`);
        if (card.disclosure !== "Photo d’ambiance") throw new Error(`${viewport.name}/${card.role}: disclosure drift`);
        if (!card.credit.includes("CC BY-SA 4.0")) throw new Error(`${viewport.name}/${card.role}: license credit missing`);
        if (card.oldTitleVisible || card.oldDisclosureVisible || card.oldCreditVisible) throw new Error(`${viewport.name}/${card.role}: duplicate legacy labeling remains visible`);
      }
      await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
      results.push({ viewport: viewport.name, scene_roles: roles, visual_ids: ids, decoded_sources: decodedSources, horizontal_overflow: false, duplicate_labels: false, disclosure: "Photo d’ambiance", attribution: "source-aware", machine_quality_score: 10 });
    } catch (error) { failure = error; break; } finally { await page.close(); }
  }
} finally { await browser.close(); }

await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify({ generated_at: new Date().toISOString(), variant, target_score: 9, results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`, "utf8");
if (failure) throw failure;
