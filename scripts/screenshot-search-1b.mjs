import { chromium } from "playwright";
import fs from "fs";
const OUT = "public/screenshots/1b";
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch();

async function shot(name, url, w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dsf ?? 1.5 });
  const page = await ctx.newPage();
  await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2600);
  if (opts.clickCarte) {
    try { await page.getByRole("button", { name: "Carte" }).first().click(); await page.waitForTimeout(1200); } catch {}
  }
  await page.screenshot({ path: `${OUT}/${name}`, fullPage: false, clip: opts.clip });
  console.log("saved", name);
  await ctx.close();
}

await shot("01-desktop.png", "/search", 1440, 1150);
await shot("02-mobile-liste.png", "/search", 390, 1300, { dsf: 2 });
await shot("03-mobile-carte.png", "/search", 390, 1100, { dsf: 2, clickCarte: true });
await shot("04-desktop-mapzoom.png", "/search", 1440, 1150, { clip: { x: 880, y: 240, width: 560, height: 720 } });
await shot("05-casablanca.png", "/search?city=Casablanca", 1440, 1150);
await shot("06-marrakech.png", "/search?city=Marrakech", 1440, 1150);
await shot("07-tanger.png", "/search?city=Tanger", 1440, 1150);

await browser.close();
console.log("done");
