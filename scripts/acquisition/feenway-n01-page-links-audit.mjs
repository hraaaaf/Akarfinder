#!/usr/bin/env node
// N01 bounded off-sitemap discovery: public HTML landing pages only. No detail pages, API, DB, or publication.
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { robotsOK, BASE } from './feenway-sitemap-inventory-v1.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const UA='AkarFinder-FeenWay-Sitemap-Audit/1.0 (+https://akarfinder.ma)';
const MAX=2500000;
export const FIXED=Object.freeze([
 BASE+'/immobilier/casablanca',
 BASE+'/appartement-a-vendre/casablanca',
 BASE+'/appartement-a-vendre/casablanca/racine'
]);
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
 const selected=[...FIXED,...groups.cities.slice(0,3),...groups.markets.slice(0,3),...groups.quartiers.slice(0,4)];
 return [...new Set(selected)].slice(0,13);
}
export function citySeeds(rows){
 const chosen=[];
 for(const r of rows){
  if(r.sitemap!=='cities.xml'||typeof r.url!=='string')continue;
  const u=new URL(r.url);
  if(u.origin===BASE&&/^\/immobilier\/[a-z0-9-]+$/.test(u.pathname)&&!u.search&&!u.hash)chosen.push(u.href);
 }
 return [...new Set(chosen)].slice(0,100);
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
async function get(url,accept='text/html'){
 const u=new URL(url);
 if(u.origin!==BASE||/^(\/api\/|\/admin\/|\/paiement\/|\/samsar\/)/.test(u.pathname))throw Error('forbidden_endpoint');
 const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(22000),headers:{'User-Agent':UA,'Accept':accept}});
 if(r.status!==200||!r.body)throw Error('http_'+r.status);
 if(Number(r.headers.get('content-length')||0)>MAX)throw Error('response_oversize');
 const chunks=[];let n=0;
 for await(const p of r.body){n+=p.byteLength;if(n>MAX)throw Error('response_oversize');chunks.push(Buffer.from(p));}
 const b=Buffer.concat(chunks);return {html:new TextDecoder('utf-8',{fatal:true}).decode(b),sha256:sha(b),bytes:b.length};
}
async function main(){
 const out=resolve(process.argv[2]||'.tmp/feenway-n01-page-links/report.json');
 const listings=resolve(process.argv[3]||'.tmp/feenway-sitemap-inventory-v1/discovery.jsonl');
 const nonlisting=resolve(process.argv[4]||'.tmp/feenway-n01-surfaces/report.jsonl');
 const allListing=new Set((await readFile(listings,'utf8')).trim().split('\n').map(x=>JSON.parse(x).url));
 const pages=(await readFile(nonlisting,'utf8')).trim().split('\n').map(x=>JSON.parse(x));
 if(allListing.size<1||pages.length<1)throw Error('missing_anchors');
 const mode=process.argv[5]==='cities'?'cities':'sample';
 const selected=mode==='cities'?citySeeds(pages):seeds(pages);
 const report={observed_at:new Date().toISOString(),source:BASE,scope:mode==='cities'?'all French-language city landing pages listed by cities.xml; excludes categories/quartiers and pagination':'bounded public landing-page sample only; NOT exhaustive site crawl',mode,planned_pages:selected.length,sample_pages:[],pages_attempted:0,pages_ok:0,unique_sample_listing_links:0,not_in_six_count:0,not_in_six_examples:[],errors:[],listing_detail_requests:0,db_writes:0,discovery_only:true};
 const observed=new Set();
 try{
  const rob=await get(BASE+'/robots.txt','text/plain');
  if(!robotsOK(rob.html))throw Error('robots_fail_closed');
  for(const url of selected){
   report.pages_attempted++;
   try{
    const page=await get(url);
    const links=extractListingLinks(page.html,url);
    const outside=links.filter(x=>!allListing.has(x));
    links.forEach(x=>observed.add(x));
    report.sample_pages.push({url,http_status:200,bytes:page.bytes,raw_sha256:page.sha256,listing_links:links.length,outside_main_six:outside.length,outside_examples:outside.slice(0,12)});
   }catch(e){const msg=String(e?.message||e);report.errors.push({url,error:msg});if(/^http_(403|429)$/.test(msg))break;}
   await new Promise(r=>setTimeout(r,mode==='cities'?1000:500));
  }
 }catch(e){report.errors.push({stage:'robots',error:String(e?.message||e)});}
 const missing=[...observed].filter(x=>!allListing.has(x));
 report.pages_ok=report.sample_pages.length;
 report.unique_sample_listing_links=observed.size;
 report.not_in_six_count=missing.length;
 report.not_in_six_examples=missing.slice(0,60);
 report.complete=report.errors.length===0&&report.pages_ok===report.pages_attempted&&report.pages_attempted===selected.length&&report.pages_attempted>=8;
 await mkdir(dirname(out),{recursive:true});
 await writeFile(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({complete:report.complete,pages:report.pages_ok,links:report.unique_sample_listing_links,off_sitemap:report.not_in_six_count,errors:report.errors.length}));
 if(!report.complete)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('feenway_links_failed:'+e.message);process.exitCode=1;});
