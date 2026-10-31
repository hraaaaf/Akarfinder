#!/usr/bin/env node
// FeenWay N01 public surface inventory. Read-only, no listing detail pages, no API, no DB.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { robotsOK } from './feenway-sitemap-inventory-v1.mjs';

export const BASE='https://www.feenway.com';
export const OTHER=Object.freeze(['recent','pages','cities','prices','markets','quartiers','guides','contrats','feenway']);
export const SIX=Object.freeze(Array.from({length:6},(_,i)=>'listings-'+i));
export const ALL=Object.freeze([...OTHER,...SIX]);
const UA='AkarFinder-FeenWay-Sitemap-Audit/1.0 (+https://akarfinder.ma)';
const MAX=8000000;
const sha=x=>createHash('sha256').update(x).digest('hex');

export function locs(xml){
 if(typeof xml!=='string'||xml.length>MAX)throw Error('invalid_or_large_xml');
 return [...xml.matchAll(/<loc(?:\s[^>]*)?>\s*([^<]{1,1000})\s*<\/loc\s*>/gi)].map(x=>x[1].replaceAll('&amp;','&').trim());
}
export function safeUrl(raw){
 try{
  const u=new URL(raw);
  if(u.origin!==BASE||u.username||u.password||u.search||u.hash||/^\/(api|admin|paiement|samsar)(\/|$)/.test(u.pathname))return null;
  return u.href;
 }catch{return null;}
}
export function classify(xml,kind,listingSet){
 if(!xml.includes('<urlset')||!(xml.includes('</urlset>')||/\/\s*>/.test(xml)))throw Error('invalid_urlset');
 const found=locs(xml);
 if(kind!=='feenway'&&!found.length)throw Error('empty_urlset');
 const local=new Set(),items=[];
 for(const raw of found){
  const url=safeUrl(raw);
  if(!url||local.has(url)) {if(!url)throw Error('invalid_url');continue;}
  local.add(url);items.push({url,sitemap:kind+'.xml'});
 }
 const listing=items.filter(x=>/^https:\/\/www\.feenway\.com\/listings\/[1-9]\d*$/.test(x.url));
 const foundOnListings=listing.filter(x=>listingSet.has(x.url));
 return {items, count:found.length, unique:items.length, duplicated:found.length-items.length, listing_links:listing.length, listing_in_main_six:foundOnListings.length, listing_outside_main_six:listing.length-foundOnListings.length, outside_examples:listing.filter(x=>!listingSet.has(x.url)).slice(0,5).map(x=>x.url)};
}
async function fetchSafe(url){
 if(!([BASE+'/robots.txt',BASE+'/sitemap.xml',...ALL.map(x=>BASE+'/sitemaps/'+x+'.xml')].includes(url)))throw Error('forbidden_endpoint');
 const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(22000),headers:{'user-agent':UA,'accept':'application/xml,text/xml,text/plain'}});
 if(r.status!==200||!r.body)throw Error('http_'+r.status);
 if(Number(r.headers.get('content-length')||0)>MAX)throw Error('response_oversize');
 const b=[];let n=0;
 for await(const part of r.body){n+=part.byteLength;if(n>MAX)throw Error('response_oversize');b.push(Buffer.from(part));}
 const raw=Buffer.concat(b);
 return {text:new TextDecoder('utf-8',{fatal:true}).decode(raw),bytes:raw.byteLength,sha256:sha(raw)};
}
async function main(){
 const output=resolve(process.argv[2]||'.tmp/feenway-n01-surfaces/report.json');
 const manifest=resolve(process.argv[3]||'.tmp/feenway-sitemap-inventory-v1/discovery.jsonl');
 const lines=(await readFile(manifest,'utf8')).trim().split('\n').map(x=>JSON.parse(x));
 const listed=new Set(lines.map(x=>x.url));
 if(listed.size!==lines.length||!listed.size)throw Error('missing_or_duplicate_listing_manifest');
 const report={observed_at:new Date().toISOString(),source:BASE,main_listing_manifest:listed.size,partitions_expected:ALL.length,other_sitemaps:[],other_url_rows:0,other_unique_urls:0,duplicate_other_urls:0,recent_not_in_main_six:0,errors:[],discovery_only:true,db_writes:0,listing_detail_requests:0};
 const rows=[],seen=new Set();
 try{
  const robots=await fetchSafe(BASE+'/robots.txt');
  if(!robotsOK(robots.text))throw Error('robots_fail_closed');
  report.robots_sha256=robots.sha256;
  const index=await fetchSafe(BASE+'/sitemap.xml');
  if(!index.text.includes('<sitemapindex')||!index.text.includes('</sitemapindex>'))throw Error('invalid_sitemap_index');
  const entries=locs(index.text).map(safeUrl);
  if(entries.length!==ALL.length||new Set(entries).size!==ALL.length||!ALL.every(x=>entries.includes(BASE+'/sitemaps/'+x+'.xml')))throw Error('index_partition_mismatch');
  report.index_sha256=index.sha256;
  report.index_count=entries.length;
  for(const kind of OTHER){
   try{
    const fetched=await fetchSafe(BASE+'/sitemaps/'+kind+'.xml');
    const result=classify(fetched.text,kind,listed);
    for(const x of result.items){rows.push(x);seen.add(x.url);}
    report.other_sitemaps.push({name:kind+'.xml',http_status:200,bytes:fetched.bytes,raw_sha256:fetched.sha256,urls:result.count,distinct_in_file:result.unique,duplicates_in_file:result.duplicated,listing_links:result.listing_links,listing_in_main_six:result.listing_in_main_six,listing_outside_main_six:result.listing_outside_main_six,outside_examples:result.outside_examples});
    if(kind==='recent')report.recent_not_in_main_six=result.listing_outside_main_six;
   }catch(e){report.errors.push({sitemap:kind+'.xml',error:String(e?.message||e)});}
   await new Promise(r=>setTimeout(r,300));
  }
 }catch(e){report.errors.push({stage:'index_or_robots',error:String(e?.message||e)});}
 report.other_url_rows=rows.length;
 report.other_unique_urls=seen.size;
 report.duplicate_other_urls=rows.length-seen.size;
 report.complete=report.errors.length===0&&report.other_sitemaps.length===OTHER.length;
 await mkdir(dirname(output),{recursive:true});
 await writeFile(output,JSON.stringify(report,null,2)+'\n');
 await writeFile(output.replace(/\.json$/,'.jsonl'),rows.map(JSON.stringify).join('\n')+'\n');
 console.log(JSON.stringify({complete:report.complete,partitions:report.index_count,nonlisting_sitemap_urls:report.other_url_rows,recent_missing:report.recent_not_in_main_six,errors:report.errors.length,output}));
 if(!report.complete)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('feenway_surfaces_failed:'+e.message);process.exitCode=1;});
