import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

const BASE = "http://localhost:3000";
const OUT = join(process.cwd(), "public/screenshots/p17a2");

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(page, url, file) {
  await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: join(OUT, file), fullPage: true });
  console.log("✓", file);
}

// Desktop
const desk = await browser.newPage();
await desk.setViewportSize({ width: 1280, height: 800 });
await shot(desk, "/promoteurs/exemple-promoteur?preview=demo", "promoteur-demo-desktop.png");
await shot(desk, "/projets/exemple-programme?preview=demo", "projet-demo-desktop.png");
await shot(desk, "/promoteurs/exemple-promoteur", "promoteur-404-desktop.png");

// Mobile
const mob = await browser.newPage();
await mob.setViewportSize({ width: 390, height: 844 });
await shot(mob, "/promoteurs/exemple-promoteur?preview=demo", "promoteur-demo-mobile.png");
await shot(mob, "/projets/exemple-programme?preview=demo", "projet-demo-mobile.png");

await browser.close();
console.log("Screenshots P17A-2 done →", OUT);
