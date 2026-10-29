#!/usr/bin/env node
// N01 FeenWay public sitemap audit: read-only, bounded, no listing-page requests.
import { createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
const origin='https://www.feenway.com';
const paths=Array.from({length:6},(_,i)=>'/sitemaps/listings-'+i+'.xml');
const timeoutMs=20000;
const sha=x=>createHash('sha256').update(x).digest('hex');
const report={audited_at:new Date().toISOString(),source:origin,files:[],unique_listing_urls:0,duplicate_urls:0,errors:[]};
const all=new Set();
for(const path of paths){
 try{
  const response=await fetch(origin+path,{signal:AbortSignal.timeout(timeoutMs),headers:{'user-agent':'AkarFinderPublicSitemapAudit/1.0 (+read-only; no listing fetch)'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  const type=response.headers.get('content-type')||'';
  const xml=await response.text();
  if(!xml.includes('<urlset')&&!xml.includes(':urlset'))throw Error('not a URL sitemap');
  const urls=[...xml.matchAll(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/g)].map(m=>m[1].trim().replaceAll('&amp;','&'));
  const listings=urls.filter(u=>/^https:\/\/www\.feenway\.com\/listings\/\d+$/.test(u));
  const local=new Set(listings);
  let crossDuplicates=0;
  for(const url of local){if(all.has(url))crossDuplicates++;else all.add(url);}
  report.files.push({path,http_status:response.status,content_type:type,bytes:Buffer.byteLength(xml),sha256:sha(xml),url_elements:urls.length,listing_urls:listings.length,unique_in_file:local.size,duplicate_in_file:listings.length-local.size,duplicates_across_files:crossDuplicates});
 }catch(e){report.errors.push({path,error:String(e?.message||e)});}
}
report.unique_listing_urls=all.size;
report.duplicate_urls=report.files.reduce((s,x)=>s+x.duplicate_in_file+x.duplicates_across_files,0);
report.complete=report.errors.length===0&&report.files.length===paths.length;
const output=process.argv[2]||'artifacts/feenway-n01-sitemap-audit.json';
await mkdir(new URL('.', 'file://'+process.cwd()+'/'+output),{recursive:true}).catch(()=>{});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({complete:report.complete,unique:report.unique_listing_urls,duplicates:report.duplicate_urls,errors:report.errors.length,output}));
if(!report.complete)process.exitCode=1;
