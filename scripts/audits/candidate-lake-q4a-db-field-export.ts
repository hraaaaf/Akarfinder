import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const OUT=process.env.Q4A_DB_FIELD_OUT || '.tmp/q4a-db-field-export'
function cleanUrl(v:any){ return typeof v==='string' && v.trim() ? v.trim().toLowerCase() : null }
function pos(v:any){ const n=Number(v); return Number.isFinite(n) && n>0 ? n : null }
function text(v:any){ return typeof v==='string' && v.trim() ? v.trim() : null }
function add(setMap:Map<string,Set<string>>, k:string, v:any){ if(v===null||v===undefined||v==='')return; if(!setMap.has(k))setMap.set(k,new Set()); setMap.get(k)!.add(String(v).trim()) }

async function main(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)throw new Error('Supabase credentials required')
 const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 async function all(table:string,select:string,order:string){const out:any[]=[];const size=1000;for(let from=0;;from+=size){const {data,error}=await sb.from(table).select(select).order(order,{ascending:true}).range(from,from+size-1);if(error)throw new Error(`${table}: ${error.message}`);const b=data||[];out.push(...b);if(b.length<size)break}return out}
 const thin=await all('thin_index_search_documents','seed_id,canonical_url,city,recovered_city,normalized_city,price_mad,normalized_price_mad,surface_m2,normalized_surface_m2','seed_id')
 const props=await all('property_listings','id,city,price_mad,surface_m2','id')
 const sources=await all('listing_sources','id,property_listing_id,listing_url,source_url,displayed_price,price_currency','id')
 const pmap=new Map(props.map((p:any)=>[String(p.id),p]))
 const city=new Map<string,Set<string>>(), price=new Map<string,Set<string>>(), surface=new Map<string,Set<string>>(), evidence=new Map<string,Set<string>>()
 for(const r of thin){const u=cleanUrl(r.canonical_url);if(!u)continue;add(city,u,text(r.normalized_city)||text(r.recovered_city)||text(r.city));add(price,u,pos(r.normalized_price_mad)||pos(r.price_mad));add(surface,u,pos(r.normalized_surface_m2)||pos(r.surface_m2));add(evidence,u,'thin_index_search_documents')}
 for(const s of sources){const raw=s.listing_url||s.source_url,u=cleanUrl(raw);if(!u)continue;const p:any=pmap.get(String(s.property_listing_id));if(!p)continue;add(city,u,text(p.city));const displayed=String(s.price_currency||'MAD').toUpperCase()==='MAD'?pos(s.displayed_price):null;add(price,u,displayed||pos(p.price_mad));add(surface,u,pos(p.surface_m2));add(evidence,u,'listing_sources+property_listings')}
 const urls=new Set([...city.keys(),...price.keys(),...surface.keys(),...evidence.keys()])
 const rows:any[]=[];let ambCity=0,ambPrice=0,ambSurface=0
 for(const u of [...urls].sort()){
  const cs=city.get(u)||new Set(),ps=price.get(u)||new Set(),ss=surface.get(u)||new Set();
  if(cs.size>1)ambCity++;if(ps.size>1)ambPrice++;if(ss.size>1)ambSurface++;
  rows.push({url:u,city:cs.size===1?[...cs][0]:null,price_mad:ps.size===1?Number([...ps][0]):null,surface_m2:ss.size===1?Number([...ss][0]):null,evidence:[...(evidence.get(u)||new Set())].sort(),ambiguous:{city:cs.size>1,price:ps.size>1,surface:ss.size>1}})
 }
 await mkdir(OUT,{recursive:true});const body=rows.map(r=>JSON.stringify(r)).join('\n')+(rows.length?'\n':'');await writeFile(path.join(OUT,'db-url-field-evidence.jsonl'),body)
 const h=createHash('sha256').update(body).digest('hex')
 const summary={schemaVersion:'q4a-db-field-export-v1',thinRows:thin.length,propertyRows:props.length,listingSourceRows:sources.length,uniqueUrls:rows.length,urlsWithCity:rows.filter(r=>r.city).length,urlsWithPrice:rows.filter(r=>r.price_mad).length,urlsWithSurface:rows.filter(r=>r.surface_m2).length,ambiguousCityUrls:ambCity,ambiguousPriceUrls:ambPrice,ambiguousSurfaceUrls:ambSurface,databaseReadsOnly:true,databaseWrites:0,productionWrites:0,sourceSiteFetches:0,vercelDeployments:0,sha256:h}
 await writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2))
}
main().catch(e=>{console.error(e);process.exitCode=1})
