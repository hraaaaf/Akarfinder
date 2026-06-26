import { chromium } from "playwright";

const browser = await chromium.launch();

// ── map-section-mobile.png : carte Maroc avec pins, sans filtre ─────────────
{
  const page = await browser.newPage();
  // Viewport large pour que le filtre + la carte soient rendus
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.goto("http://localhost:3000/map", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4000);

  // Mesure la hauteur de la filter bar (section deepblue)
  const filterH = await page.evaluate(() => {
    const s = document.querySelector("section.flex-shrink-0");
    return s ? s.getBoundingClientRect().height : 200;
  });
  const headerH = 64;
  const mapStart = headerH + filterH;
  // Capture 780px de hauteur à partir du début de la carte
  const clipH = 780;

  await page.screenshot({
    path: "./public/images/map-section-mobile.png",
    clip: { x: 0, y: mapStart, width: 390, height: clipH },
  });
  console.log(`✓ map-section-mobile.png — clip y=${mapStart} h=${clipH}`);
  await page.close();
}

await browser.close();
