#!/usr/bin/env node
// Public sitemap discovery only. No detail crawl, contacts, DB or publication.
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const BASE='https://www.feenway.com';
export const MAPS=Object.freeze(Array.from({length:6},(_,i)=>BASE+'/sitemaps/listings-'+i+'.xml'));
const UA='AkarFinder-FeenWay-Sitemap-Audit/1.0 (+https://akarfinder.ma)';
const MAX=8000000;
export function canon(raw){
 try{
  if(typeof raw!=='string'||raw.length>250)return null;
  const u=new URL(raw.trim()),m=/^\/listings\/([1-9]\d{0,11})\/?$/.exec(u.pathname);
  return u.protocol==='https:'&&u.hostname==='www.feenway.com'&&!u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&m?BASE+'/listings/'+m[1]:null;
 }catch{return null;}
}
export function parseMap(body){
 if(typeof body!=='string'||body.length>MAX)throw Error('sitemap_oversize');
 const xml=[...body.matchAll(/<loc(?:\s[^>]*)?>\s*([^<]{1,250})\s*<\/loc\s*>/gi)].map(m=>m[1].replace(/&amp;/g,'&').trim());
 const urls=xml.length?xml:body.split(/\r?\n/).map(x=>x.trim()).filter(x=>x.startsWith('https://'));
 const valid=urls.map(canon).filter(Boolean);
 if(!valid.length)throw Error('no_public_listings');return valid;
}
export function robotsOK(body){
 if(typeof body!=='string'||body.length>120000)return false;
 let active=false,rootAllowed=false;const rules=[];
 for(let line of body.split(/\r?\n/)){
  line=line.split('#')[0].trim();
  const ua=/^user-agent:\s*(.*)$/i.exec(line);
  if(ua){const agent=ua[1].trim().toLowerCase();if(agent!=='*'&&UA.toLowerCase().includes(agent))return false;active=agent==='*';continue;}
  if(!active)continue;
  const rule=/^(allow|disallow):\s*(.*)$/i.exec(line);
  if(rule){const kind=rule[1].toLowerCase(),prefix=rule[2].trim();rules.push([kind,prefix]);if(kind==='allow'&&prefix==='/')rootAllowed=true;}
 }
 if(!rootAllowed)return false;
 return MAPS.every(url=>{
  const path=new URL(url).pathname;let longest=-1,allowed=false;
  for(const [kind,rule] of rules){
   if(!rule)continue;
   if(rule.includes('*')||rule.includes('$'))return false;
   if(path.startsWith(rule)&&(rule.length>longest||(rule.length===longest&&kind==='allow'))){longest=rule.length;allowed=kind==='allow';}
  }return allowed;
 });
}
export async function request(url,fetcher=fetch){
 if(![BASE+'/robots.txt',...MAPS].includes(url))throw Error('forbidden_endpoint');
 const res=await fetcher(url,{headers:{'User-Agent':UA,'Accept':'application/xml,text/xml,text/plain'},redirect:'manual',signal:AbortSignal.timeout(22000)});
 if(res.status!==200)throw Error('http_'+res.status);
 if(Number(res.headers.get('content-length')||0)>MAX)throw Error('response_oversize');
 let bytes=0;const chunks=[];
 for await(const chunk of res.body){bytes+=chunk.byteLength;if(bytes>MAX)throw Error('response_oversize');chunks.push(chunk);}
 return Buffer.concat(chunks).toString('utf8');
}
export function build(input,observed='offline',sampleLimit=240){
 let entries=0,duplicates=0;const items=new Map(),per=[];
 for(const url of MAPS){
  if(!Object.hasOwn(input,url))throw Error('missing_map');
  const urls=parseMap(input[url]);let added=0;
  for(const link of urls){entries++;if(items.has(link)){duplicates++;continue;}
   items.set(link,{id:Number(link.split('/').at(-1)),url:link,sitemap:url.split('/').at(-1),status:'discovered_unverified',source_verified:false,fields_verified:false,availability_verified:false,physical_unique_verified:false,reuse_rights_verified:false,eligible:false});added++;
  }
  per.push({sitemap:url.split('/').at(-1),extracted:urls.length,distinct_added:added});
 }
 const all=[...items.values()].sort((a,b)=>a.id-b.id),sample=[];let remaining=Math.min(sampleLimit,all.length);
 for(let i=0;i<MAPS.length;i++){
  const group=all.filter(x=>x.sitemap===MAPS[i].split('/').at(-1));
  const count=Math.min(group.length,i===5?remaining:Math.floor(remaining/(6-i)));remaining-=count;
  for(let j=0;j<count;j++)sample.push(group[Math.floor((j+.5)*group.length/count)]);
 }
 return {all,sample,summary:{schema:'AKARFINDER_FEENWAY_SITEMAP_DISCOVERY_V1',observed_at:observed,sitemaps:6,extracted_urls:entries,distinct_urls:all.length,duplicate_entries:duplicates,by_sitemap:per,sample_count:sample.length,detail_pages_checked:0,certified_active:0,certified_unique:0,certified_reusable:0,db_writes:0,deployment:0}};
}
async function main(args){
 const dir=args.find(x=>x.startsWith('--input-dir='))?.slice(12);
 const out=resolve(args.find(x=>x.startsWith('--out='))?.slice(6)||'.tmp/feenway-sitemap-inventory-v1');
 const data={};
 if(dir){for(const url of MAPS)data[url]=await readFile(resolve(dir,url.split('/').at(-1)),'utf8');}
 else{
  if(!robotsOK(await request(BASE+'/robots.txt')))throw Error('robots_fail_closed');
  for(const url of MAPS){data[url]=await request(url);await new Promise(r=>setTimeout(r,800));}
 }
 const {all,sample,summary}=build(data,new Date().toISOString());
 const manifest=all.map(JSON.stringify).join('\n')+'\n',sampleText=sample.map(JSON.stringify).join('\n')+'\n';
 if(!all.length||!sample.length)throw Error('empty_inventory');
 summary.manifest_sha256=createHash('sha256').update(manifest).digest('hex');
 summary.sample_sha256=createHash('sha256').update(sampleText).digest('hex');
 await mkdir(out,{recursive:true});
 await Promise.all([writeFile(resolve(out,'discovery.jsonl'),manifest),writeFile(resolve(out,'sample.jsonl'),sampleText),writeFile(resolve(out,'summary.json'),JSON.stringify(summary,null,2)+'\n')]);
 console.log(JSON.stringify(summary));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(e=>{console.error('feenway_inventory_failed:'+e.message);process.exitCode=1;});
