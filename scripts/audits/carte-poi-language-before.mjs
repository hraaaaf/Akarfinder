import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3212";
const outDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/carte-poi-language-before";
const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 900 },
  { name: "desktop", width: 1280, height: 900 },
];

await mkdir(outDir,{recursive:true});
const report={ok:false,phase:"BEFORE",generatedAt:new Date().toISOString(),cases:[]};
const browser=await chromium.launch({headless:true});
try {
  for (const viewport of viewports) {
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
    const pageErrors=[];
    page.on("pageerror",e=>pageErrors.push(String(e)));
    await page.goto(`${baseUrl}/map?city=casablanca&district=maarif&layer=explore`,{waitUntil:"domcontentloaded",timeout:30000});
    const shell=page.locator('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
    await shell.waitFor({state:"visible",timeout:20000});
    await page.waitForFunction(()=>document.querySelector('[data-maplibre-spike]')?.getAttribute("data-maplibre-render-state")==="ready",null,{timeout:20000});
    await page.waitForTimeout(900);

    const rawCategories=await page.locator(".maplibre-spike-filters button").allTextContents();
    const poiCount=await page.locator(".maplibre-spike-poi-label").count();
    const landmarkCount=await page.locator(".maplibre-spike-target-landmark-label").count();
    const visiblePoiLabels=await page.locator('.maplibre-spike-poi-label[data-label-collapsed="false"] span').allTextContents();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    if(overflow>1) throw new Error(`${viewport.name}: horizontal overflow ${overflow}`);
    if(pageErrors.length) throw new Error(`${viewport.name}: page errors ${JSON.stringify(pageErrors)}`);

    await page.screenshot({path:`${outDir}/poi-before-${viewport.width}x${viewport.height}.png`,fullPage:false});

    // Capture one filtered state using a real available category when present.
    const education=page.locator(".maplibre-spike-filters button",{hasText:"Écoles"});
    if(await education.count() && await education.first().isVisible()){
      await education.first().click();
      await page.waitForTimeout(400);
      await page.screenshot({path:`${outDir}/poi-before-education-${viewport.width}x${viewport.height}.png`,fullPage:false});
    }

    report.cases.push({viewport:viewport.name,rawCategories:rawCategories.map(v=>v.trim()),poiCount,landmarkCount,visiblePoiLabels,overflow});
    await page.close();
  }
  report.ok=true;
} catch(error) {
  report.error=error instanceof Error ? error.stack||error.message : String(error);
  throw error;
} finally {
  await writeFile(`${outDir}/report.json`,JSON.stringify(report,null,2));
  await browser.close();
}
