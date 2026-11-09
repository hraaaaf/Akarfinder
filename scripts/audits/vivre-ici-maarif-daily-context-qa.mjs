import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3211";
const outDir = process.env.AUDIT_OUTPUT_DIR || "artifacts/vivre-ici-maarif-daily-qa";
const expectCategories = process.env.VIVRE_ICI_DAILY_QA_AFTER === "true";
const viewports = [
  {width:390,height:844}, {width:430,height:932},
  {width:768,height:900}, {width:1280,height:900},
];
await mkdir(outDir, {recursive:true});
const browser = await chromium.launch({headless:true});
const cases = [];
try {
  for(const viewport of viewports) {
    const context = await browser.newContext({viewport, colorScheme:"light", deviceScaleFactor:1});
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror",e=>errors.push(String(e)));
    const label = `${viewport.width}x${viewport.height}`;
    const result = {viewport:label, ok:false, errors};
    try {
      const response = await page.goto(baseUrl+"/map?city=casablanca&district=maarif&layer=explore",
        {waitUntil:"domcontentloaded",timeout:90000});
      if(response?.status()!==200)throw Error("HTTP "+response?.status());
      await page.locator('[data-p4-map-decision-rail]').waitFor({state:"visible",timeout:30000});
      await page.waitForFunction(()=> document.querySelector('[data-l3-maarif-pilot]')?.getAttribute("data-maplibre-ready")==="true",
        null,{timeout:45000});
      if(viewport.width<1024) {
        const toggle=page.locator('[data-p4-map-decision-rail] [aria-controls="vivre-ici-sheet-extra"]');
        if (await toggle.getAttribute("aria-expanded")!=="true") await toggle.click();
        await page.waitForFunction(()=>document.querySelector('[data-p4-map-decision-rail]')?.getAttribute('data-sheet-expanded')==='true',
          null,{timeout:8000});
      }
      const daily=page.locator('[data-l2b-daily-context]');
      await daily.waitFor({state:"visible",timeout:12000});
      const info=await daily.innerText();
      if (expectCategories) {
        const details = page.locator("[data-vivre-ici-daily-details]");
        await details.waitFor({state:"visible",timeout:12000});
        if (await details.getAttribute("open") !== null) throw Error("Daily disclosure must start collapsed");
        const initialHeight = (await daily.boundingBox())?.height ?? 0;
        if (initialHeight > 195) throw Error("Default daily card pushes CTA down: " + initialHeight);
        await page.screenshot({path:join(outDir,"daily-compact-"+label+".png"),animations:"disabled"});
        const summary = details.locator("summary");
        if ((await summary.boundingBox())?.height < 44) throw Error("Daily disclosure target under 44px");
        await summary.click();
        if (await details.getAttribute("open") === null) throw Error("Category details cannot open");
      }
      const cards=page.locator('[data-vivre-ici-daily-grid] [data-daily-category]');
      const count=await cards.count();
      const categories=await cards.evaluateAll(nodes=>nodes.map(n=>({
        category:n.getAttribute("data-daily-category"),
        state:n.getAttribute("data-daily-state"),
        label:n.textContent?.replace(/\s+/g,' ').trim()
      })));
      if(expectCategories) {
        if(count!==6)throw Error("Expected 6 visible, data-backed category statuses, saw "+count);
        const expected=["education","groceries","health","transport","green_sport","shopping"];
        if(JSON.stringify(categories.map(v=>v.category).sort())!==JSON.stringify(expected.sort()))throw Error("Wrong categories");
        if(categories.some(v=>v.state!=="unavailable" && v.state!=="sourced")) throw Error("Unknown category state");
        if(categories.some(v=>v.state==="sourced" && !/repère/.test(v.label)))throw Error("Unsupported documented claim");
        const dates=await daily.locator('[data-daily-evidence-disclaimer]').innerText();
        if(!dates.includes("absence de lieux") || !dates.includes("quartier"))throw Error("Missing transparent non-membership disclaimer");
      } else if(count!==0) {
        throw Error("BEFORE unexpectedly has new grid");
      }
      if (expectCategories && viewport.width < 1024) {
        const last = cards.last();
        await last.scrollIntoViewIfNeeded();
        const lastRect = await last.boundingBox();
        const scrollRect = await page.locator("[data-l2c-extra]").boundingBox();
        if (!lastRect || !scrollRect || lastRect.y < scrollRect.y - 2 ||
            lastRect.y + lastRect.height > scrollRect.y + scrollRect.height + 2) {
          throw Error("Last daily category is unreachable within the scrollable sheet");
        }
        await page.screenshot({path:join(outDir,"daily-scrolled-"+label+".png"),animations:"disabled"});
      }
      const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-window.innerWidth));
      if(overflow || errors.length)throw Error("overflow="+overflow+" errors="+errors.length);
      const cta=page.locator('[data-p4-map-decision-rail] a[href^="/search"]').first();
      const href=await cta.getAttribute("href");
      if(href!=="/search?city=Casablanca&district=Ma%C3%A2rif")throw Error("Search link changed");
      if (expectCategories && viewport.width >= 1024) {
        await page.locator("[data-vivre-ici-daily-details] summary").click();
        const buttonRect = await cta.boundingBox();
        if (!buttonRect || buttonRect.y+buttonRect.height > viewport.height - 10) {
          throw Error("Primary search CTA not visible in desktop compact state");
        }
        await page.locator("[data-vivre-ici-daily-details] summary").click();
      }
      await page.screenshot({path:join(outDir,"daily-"+label+".png"),animations:"disabled"});
      Object.assign(result,{ok:true,cards:count,categories,dailyInfo:info.slice(0,650),overflow,searchHref:href});
    }catch(error) {result.failure=String(error);}
    cases.push(result);
    await context.close();
  }
}finally {await browser.close();}
const summary={ok:cases.every(x=>x.ok), mode:expectCategories?"after":"before", cases};
await writeFile(join(outDir,"report.json"),JSON.stringify(summary,null,2)+"\n","utf8");
console.log(JSON.stringify(summary));
if(!summary.ok)process.exitCode=1;
