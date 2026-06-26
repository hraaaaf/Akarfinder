import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();

// Mobile viewport — no browser chrome
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3000/map", { waitUntil: "networkidle", timeout: 30000 });

// Wait for map UI to stabilize (filter bar + disclaimer visible)
await page.waitForTimeout(3000);

// Take screenshot of just the viewport (no scrolling — crops to map area)
await page.screenshot({
  path: "./public/images/map-section-mobile.png",
  fullPage: false,
  clip: { x: 0, y: 0, width: 390, height: 844 },
});

await browser.close();
console.log("✓ map-section-mobile.png replaced");
