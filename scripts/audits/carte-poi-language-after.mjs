import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3212";
const outDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/carte-poi-language-after";
const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 900 },
  { name: "desktop", width: 1280, height: 900 },
];

await mkdir(outDir,{recursive:true});
const report={ok:false,phase:"AFTER",generatedAt:new Date().toISOString(),cases:[]};
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

    const poiLanguage=await shell.getAttribute("data-maplibre-poi-language");
    if(poiLanguage!=="akarfinder-flat-v02") throw new Error(`${viewport.name}: POI language contract mismatch ${poiLanguage}`);
    const rawCategories=await page.locator(".maplibre-spike-filters button").allTextContents();
    const poiCount=await page.locator(".maplibre-spike-poi-label").count();
    const landmarkCount=await page.locator(".maplibre-spike-target-landmark-label").count();
    const families=await page.locator(".maplibre-spike-poi-label").evaluateAll(nodes=>Array.from(new Set(nodes.map(node=>node.getAttribute("data-poi-family")).filter(Boolean))));
    if(families.length>8) throw new Error(`${viewport.name}: too many POI visual families ${families.length}`);
    const glyphCount=await page.locator(".maplibre-spike-poi-glyph svg").count();
    if(glyphCount!==poiCount) throw new Error(`${viewport.name}: POI glyph coverage mismatch ${glyphCount}/${poiCount}`);
    const zoomTier=await shell.getAttribute("data-maplibre-zoom-tier");
    if(!["overview","quarter","street"].includes(zoomTier)) throw new Error(`${viewport.name}: missing progressive zoom tier (${zoomTier})`);
    if(zoomTier==="quarter" && poiCount>8) throw new Error(`${viewport.name}: POI density excessive at quartier scale (${poiCount})`);
    const landmarkGlyphCount=await page.locator(".maplibre-spike-target-landmark-label i svg").count();
    if(landmarkGlyphCount!==landmarkCount) throw new Error(`${viewport.name}: landmark glyph coverage mismatch ${landmarkGlyphCount}/${landmarkCount}`);
    const visiblePoiLabels=await page.locator('.maplibre-spike-poi-label[data-label-collapsed="false"] span').allTextContents();

    // Exact DOM geometry: label and icon must remain within the real map canvas,
    // rather than being merely present in the document while visibly clipped.
    const clippedLabels=await page.locator('.maplibre-spike-poi-label[data-label-collapsed="false"], .maplibre-spike-target-landmark-label').evaluateAll(nodes=>{
      const canvas=document.querySelector(".maplibre-spike-canvas");
      if(!canvas) return [{label:"missing-canvas"}];
      const map=canvas.getBoundingClientRect();
      return nodes.flatMap(node=>{
        const rect=node.getBoundingClientRect();
        if(rect.left>=map.left-1 && rect.right<=map.right+1 && rect.top>=map.top-1 && rect.bottom<=map.bottom+1) return [];
        return [{label:node.textContent?.trim().slice(0,90),left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,mapLeft:map.left,mapRight:map.right}];
      });
    });
    if(clippedLabels.length) throw new Error(`${viewport.name}: real POI/landmark clipping ${JSON.stringify(clippedLabels)}`);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    if(overflow>1) throw new Error(`${viewport.name}: horizontal overflow ${overflow}`);
    if(pageErrors.length) throw new Error(`${viewport.name}: page errors ${JSON.stringify(pageErrors)}`);

    await page.screenshot({path:`${outDir}/poi-after-${viewport.width}x${viewport.height}.png`,fullPage:false});

    // V0.3 — use the existing Repères control to show all sourced places.
    // This is a real map.fitBounds interaction, not a synthetic screenshot camera.
    const allRepereButton=page.locator(".maplibre-spike-filters button").first();
    const repereAccessibility=await allRepereButton.getAttribute("aria-label");
    const declaredAnchorCount=Number(await shell.getAttribute("data-maplibre-anchor-count") ?? 0);
    if(declaredAnchorCount>0 && !repereAccessibility?.includes(String(declaredAnchorCount))){
      throw new Error(`${viewport.name}: Repères control does not disclose sourced anchor count ${declaredAnchorCount}`);
    }
    await allRepereButton.click();
    await page.waitForTimeout(1100);
    const reframedPoiCount=await page.locator(".maplibre-spike-poi-label").count();
    const reframedVisibleNames=await page.locator(".maplibre-spike-poi-label[data-label-collapsed='false'] > span").allTextContents();
    if(viewport.width<=430 && declaredAnchorCount>=3 && reframedPoiCount<3){
      throw new Error(`${viewport.name}: Repères reframing did not reveal 3 real POIs (${reframedPoiCount}/${declaredAnchorCount})`);
    }
    if(reframedPoiCount>declaredAnchorCount) throw new Error(`${viewport.name}: invented POI markers in all-context focus`);
    const reframedClipping=await page.locator('.maplibre-spike-poi-label[data-label-collapsed="false"], .maplibre-spike-target-landmark-label').evaluateAll(nodes=>{
      const map=document.querySelector(".maplibre-spike-canvas")?.getBoundingClientRect();
      if(!map) return ["missing-map"];
      return nodes.filter(node=>{
        const b=node.getBoundingClientRect();
        return b.left<map.left-1 || b.right>map.right+1 || b.top<map.top-1 || b.bottom>map.bottom+1;
      }).map(node=>node.textContent?.trim().slice(0,90)||"unnamed");
    });
    if(reframedClipping.length) throw new Error(`${viewport.name}: reframed POI labels are clipped ${JSON.stringify(reframedClipping)}`);
    await page.screenshot({path:`${outDir}/poi-after-all-${viewport.width}x${viewport.height}.png`,fullPage:false});

    // Capture one filtered state using a real available category when present.
    const education=page.locator(".maplibre-spike-filters button",{hasText:"Écoles"});
    if(await education.count() && await education.first().isVisible()){
      await education.first().click();
      await page.waitForTimeout(400);
      await page.screenshot({path:`${outDir}/poi-after-education-${viewport.width}x${viewport.height}.png`,fullPage:false});
    }

    report.cases.push({viewport:viewport.name,poiLanguage,rawCategories:rawCategories.map(v=>v.trim()),families,poiCount,glyphCount,landmarkCount,landmarkGlyphCount,visiblePoiLabels,clippedLabels,declaredAnchorCount,repereAccessibility,reframedPoiCount,reframedVisibleNames,reframedClipping,overflow});
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
