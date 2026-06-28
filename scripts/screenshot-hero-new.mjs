// HERO-IMAGE-REPLACE-1 — capture du nouveau hero (desktop + mobile).
import { chromium } from "playwright";
import fs from "fs";

const OUT = "public/screenshots";
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3010";

const shots = [
  { name: "hero-new-desktop.png", url: "/", w: 1440, h: 900 },
  { name: "hero-new-mobile.png", url: "/", w: 390, h: 844 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + s.url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${s.name}`, fullPage: false });
  console.log("saved", s.name);
  await ctx.close();
}
await browser.close();
console.log("done");
