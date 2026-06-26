import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

const BASE = "http://localhost:3000";

const browser = await chromium.launch();

async function shot(page, url, outPath, name) {
  await mkdir(outPath, { recursive: true });
  await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 30000 });
  const file = join(outPath, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log("✓", name);
}

// HOTFIX-NAV-INTENT: header mobile chips
const mob = await browser.newPage();
await mob.setViewportSize({ width: 390, height: 844 });
const navOut = join(process.cwd(), "public/screenshots/hotfix-nav-intent");
await shot(mob, "/", navOut, "homepage-mobile-chips.png");
await shot(mob, "/acheter", navOut, "acheter-mobile-chips.png");
await shot(mob, "/map", navOut, "map-mobile-chips.png");

// HOTFIX-NAV-INTENT: desktop header contrast
const desk = await browser.newPage();
await desk.setViewportSize({ width: 1280, height: 800 });
await shot(desk, "/", navOut, "homepage-desktop-contrast.png");
await shot(desk, "/acheter", navOut, "acheter-desktop-contrast.png");

// HOTFIX-MAP-UX: carte
const mapOut = join(process.cwd(), "public/screenshots/hotfix-map-ux");
await shot(desk, "/map", mapOut, "map-desktop.png");
await shot(mob, "/map", mapOut, "map-mobile.png");

await browser.close();
console.log("Hotfix screenshots done");
