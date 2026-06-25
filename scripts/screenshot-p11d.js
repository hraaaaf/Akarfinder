// P11D screenshots: onboarding submit flow + /pro page inbox CTA + /pro/leads access gate
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3100";
const OUT = "public/screenshots";
mkdirSync(OUT, { recursive: true });

async function save(page, name) {
  const buf = await page.screenshot({ fullPage: true });
  const outPath = join(OUT, name);
  writeFileSync(outPath, buf);
  console.log("✓", name);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const deskPage = await ctx.newPage();
await deskPage.setViewportSize({ width: 1280, height: 800 });

// ── Screenshot 1: Onboarding summary state (drive through form quickly)
await deskPage.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
await deskPage.waitForTimeout(600);

// Step 1 — pick Acheter
await deskPage.getByRole("button", { name: /^Acheter/ }).click();
await deskPage.getByRole("button", { name: /Continuer/ }).click();
await deskPage.waitForTimeout(400);

// Step 2 — enter city
await deskPage.fill("#ob-city", "Casablanca");
await deskPage.getByRole("button", { name: /Continuer/ }).click();
await deskPage.waitForTimeout(400);

// Step 3 — budget
await deskPage.fill("#ob-budget", "1200000");
await deskPage.getByRole("button", { name: /Continuer/ }).click();
await deskPage.waitForTimeout(400);

// Step 4 — skip
await deskPage.getByRole("button", { name: /Continuer/ }).click();
await deskPage.waitForTimeout(400);

// Step 5 — timing: Urgent
await deskPage.getByRole("button", { name: /^Urgent/ }).click();
await deskPage.getByRole("button", { name: /Continuer/ }).click();
await deskPage.waitForTimeout(400);

// Step 6 — phone + consent
await deskPage.fill("#ob-phone", "+212600000000");
const checkboxes = await deskPage.locator('input[type="checkbox"]').all();
for (const cb of checkboxes) { await cb.check(); }
await deskPage.waitForTimeout(300);
// Submit
await deskPage.getByRole("button", { name: /Créer mon dossier/ }).click();
// Wait for API call + render
await deskPage.waitForTimeout(4000);
await save(deskPage, "p11d-onboarding-submit-success.png");

// ── Screenshot 2: /pro page (desktop) — shows inbox CTA
await deskPage.goto(`${BASE}/pro`, { waitUntil: "networkidle" });
await deskPage.waitForTimeout(800);
// Scroll to show InboxCTA section
await deskPage.evaluate(() => {
  const el = document.querySelector('[href="/pro/leads"]');
  if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
});
await deskPage.waitForTimeout(400);
await save(deskPage, "p11d-lead-inbox-cta.png");

// ── Screenshot 3: /pro/leads — access denied (no token)
await deskPage.goto(`${BASE}/pro/leads`, { waitUntil: "networkidle" });
await deskPage.waitForTimeout(600);
await save(deskPage, "p11d-lead-inbox-desktop.png");

// ── Screenshot 4: mobile — onboarding submit result
const mobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobPage = await mobCtx.newPage();
await mobPage.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
await mobPage.waitForTimeout(500);
// Quickly drive through to summary (using same steps)
await mobPage.getByRole("button", { name: /^Acheter/ }).click();
await mobPage.getByRole("button", { name: /Continuer/ }).click();
await mobPage.waitForTimeout(300);
await mobPage.fill("#ob-city", "Marrakech");
await mobPage.getByRole("button", { name: /Continuer/ }).click();
await mobPage.waitForTimeout(300);
await mobPage.fill("#ob-budget", "800000");
await mobPage.getByRole("button", { name: /Continuer/ }).click();
await mobPage.waitForTimeout(300);
await mobPage.getByRole("button", { name: /Continuer/ }).click();
await mobPage.waitForTimeout(300);
await mobPage.getByRole("button", { name: /^1 à 3 mois/ }).click();
await mobPage.getByRole("button", { name: /Continuer/ }).click();
await mobPage.waitForTimeout(300);
await mobPage.fill("#ob-phone", "+212601234567");
const cbs = await mobPage.locator('input[type="checkbox"]').all();
for (const cb of cbs) { await cb.check(); }
await mobPage.waitForTimeout(300);
await mobPage.getByRole("button", { name: /Créer mon dossier/ }).click();
await mobPage.waitForTimeout(4000);
await save(mobPage, "p11d-lead-inbox-mobile.png");

await browser.close();
console.log("\nDone. Screenshots saved to public/screenshots/");
