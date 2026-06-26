const { chromium } = require("playwright");
const fs = require("fs");

const svg = fs.readFileSync("public/maps/morocco-official.svg", "utf8");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const html = "<!DOCTYPE html><html><body style='margin:0'>" + svg + "</body></html>";
  await page.setContent(html);
  const bbox = await page.evaluate(() => {
    const el = document.querySelector("path");
    const r = el.getBBox();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      x2: Math.round(r.x + r.width),
      y2: Math.round(r.y + r.height),
    };
  });
  console.log(JSON.stringify(bbox, null, 2));
  await browser.close();
})();
