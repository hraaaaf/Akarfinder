import fs from 'node:fs'
import zlib from 'node:zlib'
import { createClient } from '@supabase/supabase-js'

const OUT=process.env.Q4A_CC_OUT||'.tmp/q4a-cc-mubawab'
const LIMIT=Number(process.env.Q4A_CC_LIMIT||1000)
const PUBLISH=process.env.Q4A_CC_PUBLISH==='1'
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
fs.mkdirSync(OUT,{recursive:true})

const norm=u=>String(u||'').trim().toLowerCase().replace(/^https?:\/\/www\./,'https://').replace(/^http:\/\//,'https://')
const num=s=>Number(String(s||'').replace(/[^0-9.,]/g,'').replace(/ /g,'').replace(',','.'))
function uniq(a){return [...new Set(a.filter(x=>Number.isFinite(x)&&x>0))]}
function stripHtml(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&sup2;|&#178;/gi,'²').replace(/\s+/g,' ')}
function walk(v,acc){
 if(Array.isArray(v)){for(const x of v) walk(x,acc);return}
 if(!v||typeof v!=='object') return
 for(const [k,val] of Object.entries(v)){
  const lk=k.toLowerCase()
  if((lk==='price'||lk==='lowprice'||lk==='highprice')&&(typeof val==='string'||typeof val==='number')){const n=num(val);if(n>0&&n<=1e9) acc.prices.push(n)}
  if(['floorsize','area','surface','size'].includes(lk)){
   if(typeof val==='number'||typeof val==='string'){const n=num(val);if(n>=5&&n<=1e8) acc.surfaces.push(n)}
   else if(val&&typeof val==='object'){
    const n=num(val.value); const unit=String(val.unitCode||val.unitText||'').toLowerCase()
    if(n>=5&&n<=1e8){ if(unit.includes('ha')) acc.surfaces.push(n*10000); else acc.surfaces.push(n) }
   }
  }
  walk(val,acc)
 }
}
function extract(html){
 const acc={prices:[],surfaces:[]}
 for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{walk(JSON.parse(m[1]),acc)}catch{}
 }
 let prices=uniq(acc.prices), surfaces=uniq(acc.surfaces)
 const txt=stripHtml(html)
 if(prices.length===0){
  const p=[]; for(const m of txt.matchAll(/(^|[^0-9])([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{2,9})\s*(?:dh|dhs|mad)(?:\b|[^a-z])/gi)){const n=num(m[2]);if(n>0&&n<=1e9)p.push(n)}
  prices=uniq(p)
 }
 if(surfaces.length===0){
  const s=[]
  for(const m of txt.matchAll(/(^|[^0-9])([0-9]{1,8}(?:[ .][0-9]{3})*(?:[.,][0-9]{1,2})?)\s*(?:m2|m²|mètres? carrés?|metres? carres?)/gi)){const n=num(m[2]);if(n>=5&&n<=1e8)s.push(n)}
  for(const m of txt.matchAll(/(^|[^0-9])([0-9]{1,5}(?:[.,][0-9]{1,3})?)\s*(?:hectares?|ha)(?:\b|[^a-z])/gi)){const n=num(m[2])*10000;if(n>=5&&n<=1e8)s.push(n)}
  surfaces=uniq(s)
 }
 return {price:prices.length===1?prices[0]:null,surface:surfaces.length===1?surfaces[0]:null,priceCandidates:prices.length,surfaceCandidates:surfaces.length}
}
async function getAll(table,cols,filters=[]){
 let out=[]; for(let from=0;;from+=1000){let q=sb.from(table).select(cols).range(from,from+999); for(const f of filters) q=f(q); const {data,error}=await q;if(error)throw error;out.push(...(data||[]));if((data||[]).length<1000)break} return out
}
async function main(){
 const live=await getAll('minimal_live_search_documents_v1','canonical_url,source_domain',[q=>q.eq('source_domain','mubawab.ma')])
 const liveSet=new Set(live.map(x=>norm(x.canonical_url)))
 const thin=await getAll('thin_index_search_documents','seed_id,canonical_url,source_domain,document_kind,normalized_city,normalized_price_mad,normalized_surface_m2',[q=>q.eq('source_domain','mubawab.ma'),q=>q.eq('document_kind','LISTING')])
 const targets=thin.filter(x=>!liveSet.has(norm(x.canonical_url))&&x.normalized_city&&(!x.normalized_price_mad||!x.normalized_surface_m2)).slice(0,LIMIT)
 const targetMap=new Map(targets.map(x=>[norm(x.canonical_url),x]))
 const col=await (await fetch('https://index.commoncrawl.org/collinfo.json')).json()
 const indexes=col.slice(0,4).map(x=>x.id)
 const records=new Map()
 for(const idx of indexes){
  for(const host of ['mubawab.ma/fr/a/*','www.mubawab.ma/fr/a/*']){
   const u=`https://index.commoncrawl.org/${idx}-index?url=${encodeURIComponent(host)}&output=json&matchType=prefix&filter=status:200&filter=mime:text/html`
   const r=await fetch(u); if(!r.ok) continue; const text=await r.text()
   for(const line of text.split('\n')){if(!line.trim())continue;try{const rec=JSON.parse(line);const k=norm(rec.url);if(targetMap.has(k)&&!records.has(k))records.set(k,rec)}catch{}}
  }
  if(records.size>=targets.length) break
 }
 const recovered=[]; let fetched=0,warcErrors=0
 for(const [k,rec] of records){
  try{
   const start=Number(rec.offset),len=Number(rec.length); const rr=await fetch(`https://data.commoncrawl.org/${rec.filename}`,{headers:{Range:`bytes=${start}-${start+len-1}`}}); if(!rr.ok)throw new Error(String(rr.status))
   const buf=Buffer.from(await rr.arrayBuffer()); const dec=zlib.gunzipSync(buf).toString('utf8'); const pos=dec.indexOf('\r\n\r\n'); const rest=pos>=0?dec.slice(pos+4):dec; const pos2=rest.indexOf('\r\n\r\n'); const html=pos2>=0?rest.slice(pos2+4):rest
   const e=extract(html); const t=targetMap.get(k); const price=Number(t.normalized_price_mad)||e.price; const surface=Number(t.normalized_surface_m2)||e.surface
   fetched++
   recovered.push({canonical_url:t.canonical_url,source_domain:'mubawab.ma',city:t.normalized_city,existing_price:t.normalized_price_mad,existing_surface:t.normalized_surface_m2,recovered_price:e.price,recovered_surface:e.surface,priceCandidates:e.priceCandidates,surfaceCandidates:e.surfaceCandidates,final_price:price,final_surface:surface,complete:Boolean(price>0&&surface>0),cc_index:rec.timestamp,cc_filename:rec.filename})
  }catch(e){warcErrors++}
 }
 if(PUBLISH){
  const rows=recovered.filter(x=>x.complete).map(x=>({canonical_url:x.canonical_url,source_domain:'mubawab.ma',city:x.city,price_mad:x.final_price,surface_m2:x.final_surface,title:null,provenance:'commoncrawl_archived_snapshot',updated_at:new Date().toISOString()}))
  for(let i=0;i<rows.length;i+=200){const {error}=await sb.from('minimal_live_search_documents_v1').upsert(rows.slice(i,i+200),{onConflict:'canonical_url',ignoreDuplicates:true});if(error)throw error}
 }
 const {count}=await sb.from('minimal_live_search_documents_v1').select('*',{count:'exact',head:true})
 const summary={schemaVersion:'q4a-mubawab-commoncrawl-recovery-v1',targets:targets.length,indexMatches:records.size,warcFetched:fetched,warcErrors,recoveredPrice:recovered.filter(x=>x.recovered_price).length,recoveredSurface:recovered.filter(x=>x.recovered_surface).length,newlyComplete:recovered.filter(x=>x.complete).length,publish:PUBLISH,liveCountAfter:count}
 fs.writeFileSync(`${OUT}/summary.json`,JSON.stringify(summary,null,2)+'\n');fs.writeFileSync(`${OUT}/recoveries.jsonl`,recovered.map(x=>JSON.stringify(x)).join('\n')+'\n');console.log(summary)
}
main().catch(e=>{console.error(e);process.exit(1)})
