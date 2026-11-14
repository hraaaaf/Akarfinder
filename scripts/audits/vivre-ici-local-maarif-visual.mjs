import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
const base=process.env.BASE_URL || "http://127.0.0.1:3210";
const prefix=process.argv[2] ?? "before";
const dir=path.resolve("artifacts/vivre-ici-local-maarif",prefix);
await fs.mkdir(dir,{recursive:true});
const vps=[{width:390,height:844},{width:430,height:932},{width:768,height:900},{width:1280,height:900}];
const browser=await chromium.launch({headless:true});
const output=[];
try{
  for(const vp of vps){
    const context=await browser.newContext({viewport:vp,deviceScaleFactor:1,colorScheme:"light"});
    const page=await context.newPage();
    const errors=[];
    page.on("pageerror",e=>errors.push(String(e)));
    let http=0;
    try{
      const rsp=await page.goto(base+"/map?city=casablanca&district=maarif&layer=explore",{waitUntil:"domcontentloaded",timeout:60000});
      http=rsp?.status()||0;
      await page.locator('[data-p4-map-decision-rail]').waitFor({state:"visible",timeout:30000});
      try{await page.locator("[data-maplibre-spike]").waitFor({state:"visible",timeout:22000});}catch{}
      try{await page.waitForFunction(()=>document.querySelector('[data-maplibre-spike]')?.getAttribute('data-maplibre-ready')==="true",null,{timeout:16000});}catch{}
      await page.screenshot({path:path.join(dir,'maarif-'+vp.width+'x'+vp.height+'.png'),animations:"disabled"});
      const state=await page.evaluate(()=>{
        const g=(s)=>{const el=document.querySelector(s);if(!el)return null;const b=el.getBoundingClientRect();return {visible:!!(b.width&&b.height),x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height),text:el.innerText?.slice(0,100)}};
        const root=document.querySelector("[data-maplibre-spike]");
        return {viewport:{w:innerWidth,h:innerHeight,scrollWidth:document.documentElement.scrollWidth},mapReady:root?.getAttribute("data-maplibre-ready"),mapMode:root?.getAttribute("data-maplibre-mode"),mapView:root?.getAttribute("data-l3-maarif-view"),mapSource:root?.getAttribute("data-maplibre-source"),admin:root?.getAttribute("data-l3-admin-boundary"),map:g("[data-maplibre-spike]"),modes:g("[data-l3-map-modes]"),rail:g("[data-p4-map-decision-rail]"),searchLink:document.querySelector("[data-p4-map-decision-rail] a[href^='/search']")?.getAttribute("href")||null,buttons:[...document.querySelectorAll("[data-l3-map-modes] button")].map(el=>({text:el.innerText,aria:el.getAttribute("aria-pressed")}))};
      });
      output.push({...vp,http,...state,errors});
    }catch(e){output.push({...vp,http,error:String(e),errors});}
    await context.close();
  }
}finally{await browser.close();}
await fs.writeFile(path.join(dir,"report.json"),JSON.stringify(output,null,2));
console.log(JSON.stringify({dir,report:output}));
