import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
const host = process.env.BASE_URL || "http://127.0.0.1:3210";
const out = process.env.AUDIT_OUTPUT_DIR || "C:/Users/lenovo/Desktop/AkarFinder-Vivre-Ici-QA-20261109/admin-preview";
await mkdir(out, {recursive:true});
const widths = [
  {width:390,height:844},
  {width:430,height:932},
  {width:768,height:900},
  {width:1280,height:900},
];
const browser=await chromium.launch({headless:true});
const runs=[];
try {
for (const vp of widths) {
 const context=await browser.newContext({viewport:vp,deviceScaleFactor:1,colorScheme:"light"});
 const page=await context.newPage(); const errors=[];
 page.on("pageerror",e=>errors.push(String(e)));
 const outcome={viewport:vp.width+"x"+vp.height,ok:false,errors};
 try {
  const response=await page.goto(host+"/map?city=casablanca&district=maarif&layer=explore",{waitUntil:"domcontentloaded",timeout:90000});
  if(response?.status()!==200) throw Error("HTTP "+response?.status());
  const root=page.locator('[data-l3-maarif-pilot="true"]');
  await root.waitFor({state:"visible",timeout:30000});
  await page.waitForFunction(()=>document.querySelector('[data-l3-maarif-pilot]')?.getAttribute("data-maplibre-ready")==="true",null,{timeout:45000});
  const source=await root.getAttribute("data-l3-admin-preview-source");
  if(source!=="osm-relation-2801474" || await root.getAttribute("data-l3-admin-boundary")!=="osm-indicative-preview")throw Error("preview guard not enabled "+source);
  if(await root.getAttribute("data-l3-maarif-view")!=="quartier" || await page.locator("[data-l3-admin-preview]").count()) throw Error("initial source leaked");
  await page.screenshot({path:join(out,"quartier-"+outcome.viewport+".png"),animations:"disabled"});
  const b=page.locator("[data-l3-go-admin]");const bb=await b.boundingBox();
  if(!bb || bb.height<44 || bb.width<44)throw Error("small button");
  await b.click();
  await page.locator("[data-l3-admin-preview='true']").waitFor({state:"visible",timeout:10000});
  if(await root.getAttribute("data-l3-maarif-view")!=="limites" ||await b.getAttribute("aria-pressed")!=="true") throw Error("admin mode not active");
  const copy=await page.locator("[data-l3-admin-preview]").innerText();
  if(!copy.includes("Arrondissement")||!copy.includes("indicatif")||!copy.includes("non certifié")||!copy.includes("quartier central")||!copy.includes("OpenStreetMap"))throw Error("disclaimer incomplete");
  await page.waitForFunction(()=> {
    const e=document.querySelector("[data-l3-maarif-pilot]");return Number(e?.getAttribute("data-l3-camera-zoom"))<14.1;
  },null,{timeout:17000});
  const panelRect = await page.locator("[data-l3-admin-preview]").boundingBox();
  const returnRect = await page.locator("[data-l3-admin-return]").boundingBox();
  const attributionRect = await page.locator(".maplibregl-ctrl-attrib").first().boundingBox();
  const sheetRect = await page.locator("[data-p4-map-decision-rail]").boundingBox();
  if (!panelRect || !returnRect || returnRect.height < 44) throw Error("preview disclosure / return target missing");
  const intersects = (a,b) => a && b && a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
  if (vp.width <= 430 && panelRect.height > 195) throw Error("mobile disclosure too tall: " + panelRect.height);
  if (intersects(panelRect, attributionRect)) throw Error("admin disclosure overlaps map attribution");
  if (intersects(panelRect, sheetRect)) throw Error("admin disclosure overlaps mobile sheet");
  Object.assign(outcome, {panelHeightPx: Math.round(panelRect.height), returnHeightPx: Math.round(returnRect.height), attributionOverlap: false, sheetOverlap: false});
  await page.screenshot({path:join(out,"limites-"+outcome.viewport+".png"),animations:"disabled"});
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
  if(overflow)throw Error("overflow "+overflow);
  await page.locator("[data-l3-admin-return]").click();
  if(await root.getAttribute("data-l3-maarif-view")!=="quartier"||await page.locator("[data-l3-admin-preview]").count())throw Error("preview not hidden on return");
  await page.waitForFunction(()=>Number(document.querySelector("[data-l3-maarif-pilot]")?.getAttribute("data-l3-camera-zoom"))>=14.2,null,{timeout:12000});
  await page.locator("[data-l3-go-street]").click();
  await page.waitForFunction(()=>Number(document.querySelector("[data-l3-maarif-pilot]")?.getAttribute("data-l3-camera-zoom"))>=16.5,null,{timeout:15000});
  const href=await page.locator("[data-p4-map-decision-rail] a[href^='/search']").first().getAttribute("href");
  if(href!=="/search?city=Casablanca&district=Ma%C3%A2rif")throw Error("search route changed");
  Object.assign(outcome,{ok:true,zoomBack:true,previewText:copy.slice(0,235),searchHref:href,overflow});
 }catch(e){outcome.failure=String(e);}
 runs.push(outcome);
 await context.close();
}
}finally{await browser.close();}
await writeFile(join(out,"report.json"),JSON.stringify({ok:runs.every(x=>x.ok),cases:runs},null,2));
console.log(JSON.stringify({ok:runs.every(x=>x.ok),cases:runs}));
if(!runs.every(x=>x.ok))process.exitCode=1;
