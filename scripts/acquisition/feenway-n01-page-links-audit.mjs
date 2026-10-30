#!/usr/bin/env node
// N01 bounded off-sitemap discovery: public HTML landing pages only. No detail pages, API, DB, or publication.
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { robotsOK, BASE } from './feenway-sitemap-inventory-v1.mjs';
import { buildQueue } from './feenway-n01-surface-queue.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const UA='AkarFinder-FeenWay-Sitemap-Audit/1.0 (+https://akarfinder.ma)';
const MAX=2500000;
export const FIXED=Object.freeze([
 BASE+'/immobilier/casablanca',
 BASE+'/appartement-a-vendre/casablanca',
 BASE+'/appartement-a-vendre/casablanca/racine'
]);
export function evenSample(items,count){
 const unique=[...new Set(items)].sort();
 if(unique.length<=count)return unique;
 return Array.from({length:count},(_,i)=>unique[Math.floor((i+0.5)*unique.length/count)]);
}
export function seeds(rows){
 const groups={cities:[],markets:[],quartiers:[]};
 for(const row of rows){
  const group=row.sitemap.replace('.xml','');
  if(!groups[group]||typeof row.url!=='string')continue;
  const u=new URL(row.url);
  if(u.origin!==BASE||u.search||u.hash||u.pathname.startsWith('/ar/')||u.pathname.startsWith('/en/'))continue;
  if(group==='cities'&&!u.pathname.startsWith('/immobilier/'))continue;
  groups[group].push(u.href);
 }
 const selected=[...FIXED,...evenSample(groups.cities,8),...evenSample(groups.markets,12),...evenSample(groups.quartiers,17)];
 return [...new Set(selected)].slice(0,40);
}
export function citySeeds(rows){
 const urls=[];
 for(const row of rows){
  if(row.sitemap!=='cities.xml'||typeof row.url!=='string')continue;
  try{
   const u=new URL(row.url);
   if(u.origin===BASE&&!u.search&&!u.hash&&u.pathname.startsWith('/immobilier/')&&/^[a-z0-9-]+$/.test(u.pathname.slice('/immobilier/'.length)))urls.push(u.href);
  }catch{}
 }
 return [...new Set(urls)].sort();
}

export function extractListingLinks(html,from){
 const found=new Set();
 for(const m of html.matchAll(/href\s*=\s*["']([^"'<>]{1,750})["']/gi)){
  try{
   const u=new URL(m[1].replaceAll('&amp;','&'),from);
   if(u.origin===BASE&&!u.search&&!u.hash&&/^\/listings\/[1-9]\d{0,11}\/?$/.test(u.pathname))found.add(BASE+'/listings/'+u.pathname.split('/')[2]);
  }catch{}
 }
 return [...found];
}
export function isRestrictedPath(path){
 return ['/api','/admin','/paiement','/samsar','/listings'].some(root=>path===root||path.startsWith(root+'/'));
}
export function safeRedirectTarget(from,location){
 if(!location||typeof location!=='string')throw Error('redirect_missing_location');
 const initial=new URL(from),target=new URL(location,from);
 if(target.origin!==BASE||target.protocol!=='https:'||target.username||target.password||target.search||target.hash)throw Error('redirect_unsafe_target');
 if(isRestrictedPath(target.pathname))throw Error('redirect_forbidden_path');
 const root=(p)=>p.split('/').slice(0,3).join('/');
 if(root(initial.pathname)!==root(target.pathname)||initial.pathname===target.pathname)throw Error('redirect_cross_section_or_loop');
 return target.href;
}
export async function get(url,accept='text/html'){
 const u=new URL(url);
 if(u.origin!==BASE||isRestrictedPath(u.pathname))throw Error('forbidden_endpoint');
 const opts={redirect:'manual',signal:AbortSignal.timeout(22000),headers:{'User-Agent':UA,'Accept':accept}};
 let finalUrl=url,redirectTo=null;
 let r=await fetch(url,opts);
 if([301,302,307,308].includes(r.status)){
  if(accept!=='text/html')throw Error('redirect_not_allowed_for_robots');
  redirectTo=safeRedirectTarget(url,r.headers.get('location'));
  finalUrl=redirectTo;
  r=await fetch(finalUrl,opts);
 }
 if(r.status!==200||!r.body)throw Error('http_'+r.status);
 if(Number(r.headers.get('content-length')||0)>MAX)throw Error('response_oversize');
 const chunks=[];let n=0;
 for await(const p of r.body){n+=p.byteLength;if(n>MAX)throw Error('response_oversize');chunks.push(Buffer.from(p));}
 const b=Buffer.concat(chunks);return {html:new TextDecoder('utf-8',{fatal:true}).decode(b),sha256:sha(b),bytes:b.length,finalUrl,redirectTo};
}
async function main(){
 const out=resolve(process.argv[2]||'.tmp/feenway-n01-page-links/report.json');
 const listings=resolve(process.argv[3]||'.tmp/feenway-sitemap-inventory-v1/discovery.jsonl');
 const nonlisting=resolve(process.argv[4]||'.tmp/feenway-n01-surfaces/report.jsonl');
 const allListing=new Set((await readFile(listings,'utf8')).trim().split('\n').map(x=>JSON.parse(x).url));
 const pages=(await readFile(nonlisting,'utf8')).trim().split('\n').map(x=>JSON.parse(x));
 if(allListing.size<1||pages.length<1)throw Error('missing_anchors');
 const batchMatch=/^batch:([1-9]\d*)$/.exec(process.argv[5]||'');
 const mode=batchMatch?'batch':process.argv[5]==='cities'?'cities':'sample';
 const batchNumber=batchMatch?Number(batchMatch[1]):null;
 const selected=mode==='cities'?citySeeds(pages):mode==='batch'?buildQueue(pages,50).rows.filter(x=>x.batch===batchNumber).map(x=>x.url):seeds(pages);
 if(!selected.length)throw Error('empty_source_selection');
 const report={observed_at:new Date().toISOString(),source:BASE,scope:mode==='cities'?'all French-language city landing pages listed by cities.xml; excludes categories/quartiers and pagination':mode==='batch'?'single bounded set of 50 French market/quartier landing pages; not exhaustive':'bounded public landing-page sample only; NOT exhaustive site crawl',mode,batch_number:batchNumber,planned_pages:selected.length,listing_manifest_size:allListing.size,sample_pages:[],pages_attempted:0,pages_ok:0,unique_sample_listing_links:0,not_in_six_count:0,not_in_six_examples:[],errors:[],listing_detail_requests:0,db_writes:0,discovery_only:true};
 const observed=new Set(),missingSources=new Map();
 try{
  const rob=await get(BASE+'/robots.txt','text/plain');
  if(!robotsOK(rob.html))throw Error('robots_fail_closed');
  for(const url of selected){
   report.pages_attempted++;
   try{
    const page=await get(url);
    const links=extractListingLinks(page.html,page.finalUrl);
    const outside=links.filter(x=>!allListing.has(x));
    links.forEach(x=>observed.add(x));
    outside.forEach(x=>{if(!missingSources.has(x))missingSources.set(x,[]);missingSources.get(x).push(url);});
    report.sample_pages.push({url,final_url:page.finalUrl,redirect_to:page.redirectTo,http_status:200,bytes:page.bytes,raw_sha256:page.sha256,listing_links:links.length,outside_main_six:outside.length,outside_examples:outside.slice(0,12)});
   }catch(e){const msg=String(e?.message||e);report.errors.push({url,error:msg});if(/^http_(403|429)$/.test(msg))break;}
   await new Promise(r=>setTimeout(r,mode==='cities'||mode==='batch'?1000:500));
  }
 }catch(e){report.errors.push({stage:'robots',error:String(e?.message||e)});}
 const missing=[...observed].filter(x=>!allListing.has(x));
 report.pages_ok=report.sample_pages.length;
 report.unique_sample_listing_links=observed.size;
 report.not_in_six_count=missing.length;
 report.not_in_six_examples=missing.slice(0,60);
 report.not_in_six_urls=[...missing].sort();
 report.observed_listing_urls=[...observed].sort();
 report.observed_sha256=sha(report.observed_listing_urls.join('\n')+'\n');
 report.sample_design=mode==='cities'?'all public French-language city landing pages from cities.xml, without pagination':mode==='batch'?'single 50-page maximum public FR quartiers/markets batch, stable batch numbering and 1-second spacing':'up to 40 deterministic stratified landing pages: fixed 3, 8 cities, 12 markets, 17 quartiers; NOT an exhaustive site crawl';
 const outsideRows=missing.map(url=>({url,discovered_on:missingSources.get(url)||[],status:'unverified_listing_link'}));
 const outsideText=outsideRows.map(JSON.stringify).join('\n')+'\n';
 report.outside_manifest_sha256=sha(outsideText);
 report.complete=report.errors.length===0&&report.pages_ok===report.pages_attempted&&report.pages_attempted===selected.length&&report.pages_attempted>=8;
 await mkdir(dirname(out),{recursive:true});
 await writeFile(out,JSON.stringify(report,null,2)+'\n');
 await writeFile(out.replace(/\.json$/,'.jsonl'),outsideText);
 console.log(JSON.stringify({complete:report.complete,pages:report.pages_ok,links:report.unique_sample_listing_links,off_sitemap:report.not_in_six_count,errors:report.errors.length}));
 if(!report.complete)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('feenway_links_failed:'+e.message);process.exitCode=1;});
