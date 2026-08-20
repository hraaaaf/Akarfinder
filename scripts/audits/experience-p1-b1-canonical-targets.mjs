import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const outputDir = process.env.AUDIT_OUTPUT_DIR ?? "data/audits/experience-p1-b1-canonical-targets";
const targets = ["home", "search", "map", "quartier", "listing", "mon-projet", "publier", "professionnels"];
const viewports = [["390x844",390,844],["1280x900",1280,900]];
await fs.rm(outputDir,{recursive:true,force:true});
await fs.mkdir(outputDir,{recursive:true});
const browser = await chromium.launch({headless:true});
const rows=[]; const findings=[];
for (const target of targets) {
  for (const [viewport,width,height] of viewports) {
    const page = await browser.newPage({viewport:{width,height}});
    const response = await page.goto(`${baseURL}/demo/canonical-targets?target=${target}`,{waitUntil:"domcontentloaded",timeout:45000});
    await page.waitForFunction(() => document.readyState === "complete", null, {timeout:15000}).catch(()=>{});
    await page.evaluate(() => document.fonts?.ready);
    const metrics = await page.evaluate((expected) => {
      const strip = expected === "search" || expected === "map"
        ? document.querySelector(`[data-canonical-target="${expected}"] > div:first-of-type`)
        : null;
      const stripStyle = strip ? getComputedStyle(strip) : null;
      const mapCanvas = expected === "map"
        ? document.querySelector('[data-canonical-target="map"] [data-mock-map]')
        : null;
      const stepList = expected === "mon-projet"
        ? document.querySelector('[data-canonical-target="mon-projet"] aside > div:last-child')
        : expected === "publier"
          ? document.querySelector('[data-canonical-target="publier"] aside:first-of-type > div:last-child')
          : null;
      const header = document.querySelector('[data-canonical-target] header');
      const generatedLogo = header?.querySelector('[aria-label="AkarFinder"]') ?? null;
      return {
        h1: document.querySelector("h1")?.textContent?.trim() ?? "",
        target: document.querySelector("main")?.getAttribute("data-canonical-target") ?? "",
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyText: document.body.innerText,
        filterStrip: strip ? {
          overflowX: stripStyle?.overflowX ?? "",
          scrollWidth: strip.scrollWidth,
          clientWidth: strip.clientWidth,
        } : null,
        mapCanvasHeight: mapCanvas ? Math.round(mapCanvas.getBoundingClientRect().height) : null,
        stepListDisplay: stepList ? getComputedStyle(stepList).display : null,
        canonicalLogoAsset: header ? getComputedStyle(header, "::before").backgroundImage : "",
        generatedLogoDisplay: generatedLogo ? getComputedStyle(generatedLogo).display : null,
        expected,
      };
    }, target);
    const status=response?.status() ?? 0;
    const screenshot=`${target}-${viewport}.png`;
    await page.screenshot({path:path.join(outputDir,screenshot),fullPage:true});
    if(status>=400||status===0)findings.push({target,viewport,code:"HTTP",detail:status});
    if(!metrics.h1)findings.push({target,viewport,code:"H1_MISSING"});
    if(metrics.target!==target)findings.push({target,viewport,code:"TARGET_MISMATCH",detail:metrics.target});
    if(metrics.scrollWidth>metrics.clientWidth+1)findings.push({target,viewport,code:"HORIZONTAL_OVERFLOW",detail:`${metrics.scrollWidth}>${metrics.clientWidth}`});
    if(metrics.bodyText.includes("bronze"))findings.push({target,viewport,code:"BRONZE_COPY"});
    const expectedLogo = target === "home" || target === "professionnels" ? "logo-header-dark.png" : "logo-header-light.png";
    if(!metrics.canonicalLogoAsset.includes(expectedLogo))findings.push({target,viewport,code:"CANONICAL_LOGO_ASSET_MISMATCH",detail:metrics.canonicalLogoAsset});
    if(metrics.generatedLogoDisplay!=="none")findings.push({target,viewport,code:"GENERATED_LOGO_VISIBLE",detail:metrics.generatedLogoDisplay});
    if(width<=430&&(target==="search"||target==="map")) {
      if(!metrics.filterStrip||!["auto","scroll"].includes(metrics.filterStrip.overflowX))findings.push({target,viewport,code:"FILTER_STRIP_NOT_SCROLLABLE",detail:metrics.filterStrip});
      else if(metrics.filterStrip.scrollWidth<=metrics.filterStrip.clientWidth)findings.push({target,viewport,code:"FILTER_STRIP_NO_SCROLL_RANGE",detail:metrics.filterStrip});
    }
    if(width<=430&&target==="map"&&(!metrics.mapCanvasHeight||metrics.mapCanvasHeight<height-160))findings.push({target,viewport,code:"MAP_MOBILE_TOO_SHORT",detail:metrics.mapCanvasHeight});
    if(width<=430&&(target==="mon-projet"||target==="publier")&&metrics.stepListDisplay!=="none")findings.push({target,viewport,code:"MOBILE_STEPPER_NOT_COMPACT",detail:metrics.stepListDisplay});
    if(width>=1280&&(target==="mon-projet"||target==="publier")&&metrics.stepListDisplay==="none")findings.push({target,viewport,code:"DESKTOP_STEPPER_HIDDEN"});
    rows.push({target,viewport,width,height,status,screenshot,...metrics});
    await page.close();
  }
}
await browser.close();
const result={schema:"EXPERIENCE_P1_B1_CANONICAL_TARGETS_V1",targetCount:targets.length,viewportCount:viewports.length,expectedScreenshotCount:targets.length*viewports.length,screenshotCount:rows.length,findingCount:findings.length,findingTargetCount:new Set(findings.map(f=>f.target)).size,rows,findings};
await fs.writeFile(path.join(outputDir,"metrics.json"),JSON.stringify(result,null,2));
console.log(JSON.stringify({targetCount:result.targetCount,viewportCount:result.viewportCount,screenshotCount:result.screenshotCount,expectedScreenshotCount:result.expectedScreenshotCount,findingCount:result.findingCount},null,2));
if(findings.length)process.exit(1);
