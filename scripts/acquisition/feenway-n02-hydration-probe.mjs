#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const BASE='https://www.feenway.com';
const UA='AkarFinder-FeenWay-Sitemap-Audit/1.0 (+https://akarfinder.ma)';
const PAGES=['/immobilier/casablanca','/appartement-a-vendre/casablanca','/appartement-a-vendre/casablanca/racine'];
export function robotsPermit(text,path){
 if(typeof text!=='string'||text.length>120000||!path.startsWith('/'))return false;
 let active=false,root=false,best=-1,allow=false;
 for(let l of text.split(/\r?\n/)){
  l=l.split('#')[0].trim();const ua=/^user-agent:\s*(.*)$/i.exec(l);
  if(ua){const v=ua[1].trim().toLowerCase();if(v!=='*'&&UA.toLowerCase().includes(v))return false;active=v==='*';continue;}
  if(!active)continue;const m=/^(allow|disallow):\s*(.*)$/i.exec(l);if(!m||!m[2])continue;
  const p=m[2].trim();if(p.includes('*')||p.includes('$'))return false;
  if(m[1].toLowerCase()==='allow'&&p==='/')root=true;
  if(path.startsWith(p)&&(p.length>best||(p.length===best&&m[1].toLowerCase()==='allow'))){best=p.length;allow=m[1].toLowerCase()==='allow';}
 }
 return root&&best>=0&&allow;
}
export function gate(url,method,type,landing){
 let u;try{u=new URL(url);}catch{return 'bad_url';}
 if(u.protocol!=='https:'||u.origin!==BASE)return 'wrong_origin';
 if(method!=='GET')return 'non_get';
 if(['/api','/admin','/paiement','/samsar','/listings'].some(p=>u.pathname===p||u.pathname.startsWith(p+'/')))return 'blocked_route';
 if(['xhr','fetch','websocket','eventsource'].includes(type))return 'dynamic_blocked';
 if(['image','font','media'].includes(type))return 'asset_blocked';
 if(type==='document')return u.href===landing&&!u.search&&!u.hash?null:'wrong_document';
 if(['script','stylesheet','other'].includes(type)&&u.pathname.startsWith('/_next/static/'))return null;
 return 'unknown_resource';
}
export function blockedRequestBucket(url,reason){
 if(reason!=='dynamic_blocked'&&reason!=='blocked_route')return null;
 let path;try{path=new URL(url).pathname;}catch{return 'invalid_url';}
 if(reason==='blocked_route'){
  for(const prefix of ['/api','/admin','/paiement','/samsar','/listings']){
   if(path===prefix||path.startsWith(prefix+'/'))return 'blocked'+prefix.replaceAll('/','_');
  }
  return 'blocked_other';
 }
 if(path.startsWith('/_next/data/'))return 'dynamic_next_data';
 if(path.startsWith('/_next/'))return 'dynamic_next_other';
 if(path.startsWith('/immobilier/'))return 'dynamic_city';
 if(path.startsWith('/appartement-')||path.startsWith('/terrain-')||path.startsWith('/villa-'))return 'dynamic_market';
 return 'dynamic_other';
}
export function bumpBucketByStage(record,stage,bucket){
 if(!bucket)return;
 if(!['load','idle_1','idle_2','idle_3','scroll_1','scroll_2','scroll_3'].includes(stage))throw Error('invalid_stage');
 record[stage]??={};
 record[stage][bucket]=(record[stage][bucket]||0)+1;
}
// In-memory SHA-256 fingerprints; never serialize route IDs, URLs or hashes.
export function navigationFingerprint(href){
 let u;try{u=new URL(href,BASE);}catch{return null;}
 if(u.protocol!=='https:'||u.origin!==BASE)return null;
 const path=u.pathname.replace(/\\/+$/,'')||'/';
 return createHash('sha256').update(path).digest('hex');
}
export function classifyNavigationLinkage(events,initial,idle,scrolled){
 const counts={};
 for(const e of events){
  if(!e.key)continue;
  const category=initial.has(e.key)?'linked_initial':idle.has(e.key)?'linked_during_idle':scrolled.has(e.key)?'linked_during_scroll':'not_observed_as_anchor';
  counts[e.bucket]??={};counts[e.bucket][category]=(counts[e.bucket][category]||0)+1;
 }
 return counts;
}
export function ids(hrefs){
 const out=new Set();for(const h of hrefs){try{const u=new URL(h,BASE);if(u.origin===BASE&&!u.search&&!u.hash&&/^\/listings\/[1-9]\d{0,11}\/?$/.test(u.pathname))out.add(u.pathname.split('/')[2]);}catch{}}
 return [...out].sort((a,b)=>Number(a)-Number(b));
}
async function main(){
 const out=resolve(process.argv[2]||'.tmp/feenway-n02/browser-probe.json');
 const report={schema:'FEENWAY_N02_PUBLIC_READONLY_BROWSER_V3',observed_at:new Date().toISOString(),pages:[],errors:[],db_writes:0,listing_detail_requests:0,site_exhaustiveness_certified:false};
 let browser;
 try{
  const rr=await fetch(BASE+'/robots.txt',{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'User-Agent':UA,Accept:'text/plain'}});
  if(rr.status!==200||Number(rr.headers.get('content-length')||0)>120000)throw Error('robots_http_or_oversize');
  const robots=await rr.text();if(!PAGES.every(p=>robotsPermit(robots,p)))throw Error('robots_fail_closed');
  const {chromium}=await import('playwright');browser=await chromium.launch({headless:true});
  const context=await browser.newContext({userAgent:UA,serviceWorkers:'block',acceptDownloads:false});
  for(const path of PAGES){
   const url=BASE+path,page=await context.newPage(),denied={},blockedRequestBuckets={},blockedByStage={},blockedStatuses=[],blockedTargets=[],initialAnchors=new Set(),idleAnchors=new Set(),scrolledAnchors=new Set();
   let stage='load',blockedTargetsTruncated=false;
   try{
    await page.route('**/*',route=>{const r=route.request(),reason=gate(r.url(),r.method(),r.resourceType(),url);if(reason){denied[reason]=(denied[reason]||0)+1;const bucket=blockedRequestBucket(r.url(),reason);if(bucket){blockedRequestBuckets[bucket]=(blockedRequestBuckets[bucket]||0)+1;bumpBucketByStage(blockedByStage,stage,bucket);const key=navigationFingerprint(r.url());if(key){if(blockedTargets.length<2000)blockedTargets.push({bucket,key});else blockedTargetsTruncated=true;}}return route.abort('blockedbyclient');}return route.continue();});
    page.on('response',r=>{if([403,429].includes(r.status()))blockedStatuses.push(r.status());});
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
    if(!response||response.status()!==200)throw Error('http_'+(response?.status()||'no_response'));
    const counts=[],idleCounts=[],scrollSeen=new Set(),idleSeen=new Set();let first=[];
    // Control: three equal 600ms observation windows with no scrolling.
    // Request gate stays unchanged and forbids API, details and dynamic fetch.
    await page.waitForTimeout(600);
    let hrefs=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
    first=ids(hrefs);for(const h of hrefs){const k=navigationFingerprint(h);if(k)initialAnchors.add(k);}counts.push({scroll:0,listing_count:first.length});
    for(let i=1;i<=3;i++){
     stage='idle_'+i;
     await page.waitForTimeout(600);
     hrefs=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
     const observed=ids(hrefs);observed.forEach(id=>idleSeen.add(id));for(const h of hrefs){const k=navigationFingerprint(h);if(k)idleAnchors.add(k);}
     idleCounts.push({idle:i,listing_count:observed.length});
    }
    for(let i=1;i<=3;i++){
     stage='scroll_'+i;
     await page.evaluate(()=>window.scrollBy(0,Math.max(window.innerHeight,1150)));
     await page.waitForTimeout(600);
     hrefs=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
     const observed=ids(hrefs);observed.forEach(id=>scrollSeen.add(id));for(const h of hrefs){const k=navigationFingerprint(h);if(k)scrolledAnchors.add(k);}
     counts.push({scroll:i,listing_count:observed.length});
    }
    if(blockedStatuses.length)throw Error('http_403_or_429');
    const newlyIdle=[...idleSeen].filter(x=>!first.includes(x)).sort((a,b)=>Number(a)-Number(b));
    const newlyScroll=[...scrollSeen].filter(x=>!first.includes(x)&&!idleSeen.has(x)).sort((a,b)=>Number(a)-Number(b));
    report.pages.push({url,http_status:200,counts,idle_counts:idleCounts,new_ids_after_idle:newlyIdle,new_ids_after_scroll:newlyScroll,denied,blocked_request_buckets:blockedRequestBuckets,blocked_by_stage:blockedByStage,blocked_target_linkage:classifyNavigationLinkage(blockedTargets,initialAnchors,idleAnchors,scrolledAnchors),blocked_target_linkage_complete:!blockedTargetsTruncated,conclusion:denied.dynamic_blocked?'INCONCLUSIVE_BLOCKED_DYNAMIC_REQUESTS':newlyIdle.length||newlyScroll.length?'NEW_PUBLIC_LINKS_DURING_OBSERVATION':'NO_NEW_LINKS_IN_OBSERVATION'});
   }catch(e){report.errors.push({url,error:String(e?.message||e)});break;}
   finally{await page.close();}
   await new Promise(r=>setTimeout(r,1000));
  }
 }catch(e){report.errors.push({stage:'setup',error:String(e?.message||e)});}
 finally{if(browser)await browser.close();}
 report.complete=report.pages.length===PAGES.length&&report.errors.length===0;
 await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({complete:report.complete,pages:report.pages.length,errors:report.errors.length}));
 if(!report.complete)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exitCode=1;});
