import { chromium } from "playwright";
import fs from "fs";

const OUT = "public/screenshots";
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3007";

const shots = [
  { name: "hero-casablanca-desktop.png", url: "/", w: 1440, h: 900 },
  { name: "hero-casablanca-mobile.png", url: "/", w: 390, h: 844 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + s.url, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/${s.name}`, fullPage: false });
  console.log("saved", s.name);
  await ctx.close();
}
await browser.close();
console.log("done");
