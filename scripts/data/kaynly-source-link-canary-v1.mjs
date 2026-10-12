import fs from 'node:fs/promises';
import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {robotsAllowed} from './mubawab-result-cards-v1.mjs';

const UA='AkarFinder-Kaynly-SourceLink-CanaryV1/1.0 (+https://akarfinder.ma)';
const TARGETS=['https://kaynly.com/vente/casablanca','https://kaynly.com/location/casablanca'];
const KNOWN=new Set(['www.avito.ma','avito.ma','www.mubawab.ma','mubawab.ma','sarouty.ma','www.sarouty.ma','yakeey.com','www.yakeey.com','nouraimmobilier.ma','www.nouraimmobilier.ma']);
export function extractKaynlySourceLinks(html,pageUrl){
 const $=load(html),found=new Map();let rejected=0;
 for(const anchor of $('a[href]').toArray()){
  const label=$(anchor).text().replace(/\s+/g,' ').trim();
  if(!/voir l.annonce sur/i.test(label))continue;
  let u;try{u=new URL($(anchor).attr('href'),pageUrl);}catch{rejected++;continue;}
  if(u.protocol!=='https:'||!KNOWN.has(u.hostname.toLowerCase())||u.username||u.password){rejected++;continue;}
  u.hash='';
  // Keep query parameters in the digest; do not assume source canonical equivalence.
  const url=u.href;
  if(!found.has(url)){
   found.set(url,{identity:'source-url-sha256:'+createHash('sha256').update(url).digest('hex'),
    original_source_url:url,domain:u.hostname.toLowerCase(),observed_at_index:pageUrl,
    source_listing_id_verified:false,source_detail_verified:false,has_five_fields:false,
    commercially_available_verified:false,cross_source_deduplicated:false});
  }
 }
 return {links:[...found.values()],rejected_untrusted_source_links:rejected};
}
export async function runKaynlySourceLinkCanary({fetchImpl=globalThis.fetch,robotsText=null,sleep=ms=>new Promise(r=>setTimeout(r,ms)),paceMs=2000}={}){
 let robots=robotsText,halted=null,requests=0,valid=0;
 if(robots===null)try{
  const r=await fetchImpl('https://kaynly.com/robots.txt',{headers:{'user-agent':UA},signal:AbortSignal.timeout(12000)});
  if(r.status!==200)throw Error('robots status');
  robots=await r.text();if(!robots||robots.length>100000)throw Error('robots invalid');
 }catch{halted='robots_unavailable_fail_closed';}
 const pages=[],links=new Map();
 for(const url of TARGETS){
  if(halted)break;
  if(!robotsAllowed(robots,url,UA)){pages.push({url,state:'robots_disallowed'});continue;}
  if(requests&&paceMs)await sleep(paceMs);
  requests++;
  let r;try{r=await fetchImpl(url,{redirect:'follow',headers:{'user-agent':UA,accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(20000)});}
  catch{pages.push({url,state:'network_error'});continue;}
  if([403,429].includes(r.status)){halted='http_'+r.status;pages.push({url,state:halted});break;}
  if(r.status!==200||r.url!==url){pages.push({url,state:'non_200_or_redirect',status:r.status});continue;}
  if(!/html/i.test(r.headers?.get?.('content-type')||'')){pages.push({url,state:'non_html'});continue;}
  let html;try{html=await r.text();}catch{pages.push({url,state:'read_error'});continue;}
  if(Buffer.byteLength(html,'utf8')>3000000){pages.push({url,state:'oversized'});continue;}
  valid++;const out=extractKaynlySourceLinks(html,url);
  for(const row of out.links)links.set(row.original_source_url,row);
  pages.push({url,state:'observed',source_links:out.links.length,rejected:out.rejected_untrusted_source_links});
 }
 const rows=[...links.values()].sort((a,b)=>a.identity.localeCompare(b.identity));
 const perDomain=Object.fromEntries([...new Set(rows.map(x=>x.domain))].sort().map(s=>[s,rows.filter(x=>x.domain===s).length]));
 return {report:{schema_version:'AKARFINDER_KAYNLY_SOURCE_LINK_CANARY_V1',semantics:'aggregator_source_urls_only_not_independent_fresh_listings',
    category_requests:requests,observed_index_pages:valid,unique_source_urls_in_sample:rows.length,
    per_domain:perDomain,robots_checked:!!robots,halted_reason:halted,
    third_party_detail_requests:0,db_reads:0,db_writes:0,production_publications:0,
    note:'Index cards are potentially duplicate source URLs. No net new physical listings or active property status certified.',pages},rows};
}
async function main(){
 const {report,rows}=await runKaynlySourceLinkCanary();
 await fs.writeFile('kaynly-source-links-v1.json',JSON.stringify(report,null,2)+'\n');
 await fs.writeFile('kaynly-source-links-v1.jsonl',rows.map(JSON.stringify).join('\n')+(rows.length?'\n':''));
 console.log(JSON.stringify(report,null,2));
 if(report.halted_reason||!report.observed_index_pages)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e);process.exitCode=1;});
