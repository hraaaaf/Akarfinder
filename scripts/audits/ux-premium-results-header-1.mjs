import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL=process.env.BASE_URL??"http://127.0.0.1:3197";
const variant=process.env.AUDIT_VARIANT??"local";
const outDir=path.join("data","audits","ux-premium-results-header-1",variant);
const viewports=[
  {name:"mobile-360x800",width:360,height:800,minToolbar:50,maxToolbar:56,minTitle:14,maxTitle:16,sortHeight:44},
  {name:"mobile-390x844",width:390,height:844,minToolbar:50,maxToolbar:56,minTitle:14,maxTitle:16,sortHeight:44},
  {name:"tablet-768x900",width:768,height:900,minToolbar:52,maxToolbar:58,minTitle:15,maxTitle:17,sortHeight:44},
  {name:"desktop-1440x900",width:1440,height:900,minToolbar:54,maxToolbar:60,minTitle:16,maxTitle:18,sortHeight:42},
];
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const failures=[];const results=[];
for(const v of viewports){
  const page=await browser.newPage({viewport:{width:v.width,height:v.height}});
  await page.goto(`${BASE_URL}/search`,{waitUntil:"networkidle"});
  await page.locator('[data-search-results-toolbar]').waitFor();
  const metrics=await page.evaluate(()=>{
    const toolbar=document.querySelector('[data-search-results-toolbar]');
    const title=toolbar?.querySelector('h1');
    const sort=document.querySelector('[data-search-sort-select]');
    const section=document.querySelector('[data-search-results-section]');
    if(!toolbar||!title||!sort||!section)return null;
    const tb=toolbar.getBoundingClientRect(),tt=title.getBoundingClientRect(),sb=sort.getBoundingClientRect(),ss=section.getBoundingClientRect();
    const ts=getComputedStyle(title),sortStyle=getComputedStyle(sort);
    return{toolbar:{x:tb.x,y:tb.y,width:tb.width,height:tb.height},title:{x:tt.x,y:tt.y,width:tt.width,height:tt.height,fontSize:Number.parseFloat(ts.fontSize),fontWeight:ts.fontWeight,text:title.textContent},sort:{x:sb.x,y:sb.y,width:sb.width,height:sb.height,radius:sortStyle.borderRadius,value:sort.value},section:{x:ss.x,width:ss.width},overflowX:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  });
  if(!metrics)failures.push(`${v.name}: results header nodes missing`);
  else{
    if(metrics.toolbar.height<v.minToolbar||metrics.toolbar.height>v.maxToolbar)failures.push(`${v.name}: toolbar height ${metrics.toolbar.height}`);
    if(metrics.title.fontSize<v.minTitle||metrics.title.fontSize>v.maxTitle)failures.push(`${v.name}: title font ${metrics.title.fontSize}`);
    if(Math.abs(metrics.sort.height-v.sortHeight)>1.5)failures.push(`${v.name}: sort height ${metrics.sort.height}`);
    if(Number.parseFloat(metrics.sort.radius)<20)failures.push(`${v.name}: sort radius ${metrics.sort.radius}`);
    if(metrics.overflowX!==0)failures.push(`${v.name}: overflowX ${metrics.overflowX}`);
    if(metrics.toolbar.x<15)failures.push(`${v.name}: left inset ${metrics.toolbar.x}`);
  }
  await page.screenshot({path:path.join(outDir,`${v.name}.png`),fullPage:false});
  results.push({viewport:v.name,...metrics});
  await page.close();
}
await browser.close();
const report={lot:"UX-PREMIUM-RESULTS-HEADER-1",variant,score:failures.length===0?10:Math.max(0,10-failures.length),pass:failures.length===0,failures,results};
await fs.writeFile(path.join(outDir,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
