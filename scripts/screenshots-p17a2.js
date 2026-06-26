const { chromium } = require("playwright");
const path = require("path");
const outDir = "C:/Users/lenovo/Documents/AkarFinder/public/screenshots/p17a2";

(async () => {
  const b = await chromium.launch();

  async function shot(url, file, viewport) {
    const p = await b.newPage();
    await p.setViewportSize(viewport);
    await p.goto(url, { waitUntil: "load", timeout: 30000 });
    await p.waitForTimeout(1000);
    await p.screenshot({ path: `${outDir}/${file}`, fullPage: true });
    await p.close();
    console.log("done:", file);
  }

  const DESKTOP = { width: 1280, height: 900 };
  const MOBILE = { width: 390, height: 844 };

  // 404 propre sans preview
  await shot("http://localhost:3000/promoteurs/promoteur-demo-akarfinder", "404-promoteur-sans-preview-desktop.png", DESKTOP);
  await shot("http://localhost:3000/projets/residence-demo-akarfinder", "404-projet-sans-preview-desktop.png", DESKTOP);

  // Pages demo
  await shot("http://localhost:3000/promoteurs/promoteur-demo-akarfinder?preview=demo", "promoteur-demo-desktop.png", DESKTOP);
  await shot("http://localhost:3000/promoteurs/promoteur-demo-akarfinder?preview=demo", "promoteur-demo-mobile.png", MOBILE);
  await shot("http://localhost:3000/projets/residence-demo-akarfinder?preview=demo", "projet-demo-desktop.png", DESKTOP);
  await shot("http://localhost:3000/projets/residence-demo-akarfinder?preview=demo", "projet-demo-mobile.png", MOBILE);

  await b.close();
  console.log("all done");
})();
