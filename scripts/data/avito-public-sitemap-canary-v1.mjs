import fs from "node:fs/promises";
import {enumerateAvitoSitemap,avitoListingId} from "../acquisition/avito-sitemap-enumerator.mjs";

const PREFIX=process.env.OUTPUT_PREFIX||"avito-sitemap-canary";
const MAX_DOCS=4,MAX_URLS=2000;
const userAgent="AkarFinderCardAcquisitionV1/1.0 (+https://akarfinder.ma)";
let requests=0;
const pacedFetch=async(url,options)=>{
 if(requests>0)await new Promise(resolve=>setTimeout(resolve,1250));
 requests++;
 return fetch(url,options);
};
try{
 const result=await enumerateAvitoSitemap({
  maxSitemapDocs:MAX_DOCS,maxUrls:MAX_URLS,fetchImpl:pacedFetch,userAgent
 });
 const urls=result.listingUrls||[];
 const rows=urls.map(url=>({source:"avito.ma",identity:"avito:"+avitoListingId(url),url,
  state:"discovered_url_not_live_detail_or_five_field_certified",freshness_certified:false}));
 const report={
  schema_version:"AKARFINDER_AVITO_PUBLIC_SITEMAP_CANARY_V1",
  semantics:"public_sitemap_listing_discovery_only",
  fetched_document_count:result.sitemapDocCount||0,
  network_requests:requests,listing_url_count:rows.length,
  stopped_early:result.stoppedEarly,
  queue_remaining:result.queueRemaining||0,
  capped_by_docs:result.cappedByDocs===true,capped_by_urls:result.cappedByUrls===true,
  sitemap_docs:(result.sitemapDocs||[]).map(d=>({status:d.status,loc_count:d.locCount,listing_count:d.listingCount})),
  database_access:0,database_writes:0,
  note:"Public sitemap URLs only. Each listing still requires source data/availability/five-field verification. No private API, captcha or anti-bot bypass."
 };
 await fs.writeFile(PREFIX+".json",JSON.stringify(report,null,2)+"\n");
 await fs.writeFile(PREFIX+".jsonl",rows.map(x=>JSON.stringify(x)).join("\n")+(rows.length?"\n":""));
 console.log(JSON.stringify(report,null,2));
 if(result.stoppedEarly||!result.sitemapDocCount)process.exitCode=2;
}catch(error){
 const report={schema_version:"AKARFINDER_AVITO_PUBLIC_SITEMAP_CANARY_V1",
  status:"blocked_or_failed",error_class:String(error?.name||"Error").slice(0,40),
  database_access:0,database_writes:0,listing_url_count:0};
 await fs.writeFile(PREFIX+".json",JSON.stringify(report,null,2)+"\n");
 await fs.writeFile(PREFIX+".jsonl","");
 console.log(JSON.stringify(report,null,2));
 process.exitCode=2;
}
