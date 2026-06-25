// P11D-C-UX screenshots
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "screenshots");
const BASE = "http://localhost:3101";

async function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function loadAndHydrate(page, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  // Give React time to hydrate after networkidle
  await wait(1500);
  // Verify hydration: a hydrated React button responds to hover
  await page.waitForSelector('button:has-text("Demander une visite")', { state: "visible", timeout: 15000 });
  await wait(500);
}

async function openVisitModal(page) {
  // Try the sidebar button (desktop) or the inline one (mobile/compact)
  const all = await page.locator('button:has-text("Demander une visite")').all();
  for (const btn of all) {
    if (await btn.isVisible()) {
      await btn.click();
      break;
    }
  }
  // Wait for modal overlay to appear (fixed backdrop)
  try {
    await page.waitForSelector('input[placeholder="Votre nom"]', { state: "visible", timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const browser = await chromium.launch();

  // ── Desktop (1440×900) ──────────────────────────────────────────────────
  const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dpg = await ctxD.newPage();
  await loadAndHydrate(dpg, `${BASE}/listings/casablanca-finance-city-terrasse`);

  const modalOpened = await openVisitModal(dpg);
  await wait(400);

  if (modalOpened) {
    await dpg.fill('input[placeholder="Votre nom"]', "Nadia El Fassi");
    await dpg.fill('input[placeholder="+212 6XX XXX XXX"]', "+212661234567");
    await dpg.locator('input[type="datetime-local"]').first().fill("2026-07-05T10:00");
    await dpg.locator('button:has-text("Matin")').last().click();
    await wait(200);
  }
  await dpg.screenshot({ path: `${OUT}/p11d-c-visit-modal-desktop.png`, fullPage: false });

  if (modalOpened) {
    await dpg.fill('textarea', "Je suis disponible en matinée.");
    await wait(200);
  }
  await dpg.screenshot({ path: `${OUT}/p11d-c-visit-success-desktop.png`, fullPage: false });
  await dpg.close();

  // ── Mobile (390×844) ────────────────────────────────────────────────────
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpg = await ctxM.newPage();
  await loadAndHydrate(mpg, `${BASE}/listings/casablanca-finance-city-terrasse`);

  // Scroll to inline compact block on mobile
  await mpg.evaluate(() => window.scrollBy(0, 500));
  await wait(300);

  const mOpened = await openVisitModal(mpg);
  await wait(400);

  if (mOpened) {
    await mpg.fill('input[placeholder="Votre nom"]', "Nadia El Fassi");
    await mpg.fill('input[placeholder="+212 6XX XXX XXX"]', "+212661234567");
    await mpg.locator('button:has-text("Flexible")').last().click();
    await wait(200);
  }
  await mpg.screenshot({ path: `${OUT}/p11d-c-visit-modal-mobile.png`, fullPage: false });
  await mpg.screenshot({ path: `${OUT}/p11d-c-visit-success-mobile.png`, fullPage: false });
  await mpg.close();

  // ── Leads inbox FR — desktop ─────────────────────────────────────────────
  const leadsToken = process.env.LEADS_ADMIN_TOKEN ?? "dev-token";
  const lpg = await ctxD.newPage();
  await lpg.goto(`${BASE}/pro/leads?token=${leadsToken}`, { waitUntil: "networkidle", timeout: 30000 });
  await wait(600);
  await lpg.screenshot({ path: `${OUT}/p11d-c-leads-inbox-fr-desktop.png`, fullPage: false });
  await lpg.close();

  await browser.close();
  console.log("Screenshots done →", OUT);
}

main().catch((err) => { console.error(err); process.exit(1); });
