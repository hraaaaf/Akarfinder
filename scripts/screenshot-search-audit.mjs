import { chromium } from "playwright";
import fs from "fs";
const OUT = "public/screenshots";
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";
const shots = [
  { name: "search-desktop.png", url: "/search", w: 1440, h: 1200 },
  { name: "search-mobile.png", url: "/search", w: 390, h: 1300 },
  { name: "search-buy-desktop.png", url: "/search?transaction_type=buy", w: 1440, h: 1100 },
  { name: "search-rent-desktop.png", url: "/search?transaction_type=rent", w: 1440, h: 1100 },
  { name: "search-buy-apartment-desktop.png", url: "/search?transaction_type=buy&property_type=apartment", w: 1440, h: 1100 },
];
const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.goto(BASE + s.url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${s.name}`, fullPage: false });
  console.log("saved", s.name);
  await ctx.close();
}
await browser.close();
console.log("done");
