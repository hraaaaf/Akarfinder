import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 5000 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 40000 });
await page.waitForTimeout(3000);
// get villes section position
const box = await page.evaluate(() => {
  const el = document.querySelector("#villes");
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
});
console.log("villes box:", JSON.stringify(box));
await page.screenshot({
  path: "./public/screenshots/verify-final/mobile-villes-clip.png",
  clip: { x: box.x, y: box.y, width: box.w, height: box.h }
});
await browser.close();
console.log("done");
