import { chromium } from "playwright";
import fs from "fs";

const OUT = "public/screenshots";
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3007";
const DETAIL = "/listings/casablanca-finance-city-terrasse";

const shots = [
  { name: "level-2c2-search-desktop.png", url: "/search", w: 1440, h: 900 },
  { name: "level-2c2-search-mobile.png", url: "/search", w: 390, h: 844 },
  { name: "level-2c2-detail-desktop.png", url: DETAIL, w: 1440, h: 900 },
  { name: "level-2c2-detail-mobile.png", url: DETAIL, w: 390, h: 844 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(BASE + s.url, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${s.name}`, fullPage: true });
  console.log("saved", s.name);
  await ctx.close();
}
await browser.close();
console.log("done");
