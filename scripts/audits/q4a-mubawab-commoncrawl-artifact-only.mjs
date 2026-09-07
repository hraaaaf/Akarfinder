import fs from 'node:fs'
import zlib from 'node:zlib'

const ROOT=process.env.Q4A_CC_INPUT_ROOT||'.tmp/q4a-cc-artifact'
const OUT=process.env.Q4A_CC_OUT||'.tmp/q4a-cc-artifact-out'
const LIMIT=Number(process.env.Q4A_CC_LIMIT||250)
fs.mkdirSync(OUT,{recursive:true})

const readJsonl=p=>fs.readFileSync(p,'utf8').split('\n').filter(Boolean).map(JSON.parse)
const norm=u=>String(u||'').trim().toLowerCase().replace(/^https?:\/\/www\./,'https://').replace(/^http:\/\//,'https://')
const good=v=>Number.isFinite(Number(v))&&Number(v)>0
const num=s=>Number(String(s||'').replace(/[^0-9.,]/g,'').replace(/ /g,'').replace(',','.'))
const uniq=a=>[...new Set(a.filter(x=>Number.isFinite(x)&&x>0))]
function stripHtml(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&sup2;|&#178;/gi,'²').replace(/\s+/g,' ')}
function walk(v,acc){if(Array.isArray(v)){for(const x of v)walk(x,acc);return}if(!v||typeof v!=='object')return;for(const[k,val]of Object.entries(v)){const lk=k.toLowerCase();if(['price','lowprice','highprice'].includes(lk)&&(typeof val==='string'||typeof val==='number')){const n=num(val);if(n>0&&n<=1e9)acc.prices.push(n)}if(['floorsize','area','surface','size'].includes(lk)){if(typeof val==='string'||typeof val==='number'){const n=num(val);if(n>=5&&n<=1e8)acc.surfaces.push(n)}else if(val&&typeof val==='object'){const n=num(val.value),unit=String(val.unitCode||val.unitText||'').toLowerCase();if(n>=5&&n<=1e8)acc.surfaces.push(unit.includes('ha')?n*10000:n)}}walk(val,acc)}}
function extract(html){const acc={prices:[],surfaces:[]};for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(m[1]),acc)}catch{}}let prices=uniq(acc.prices),surfaces=uniq(acc.surfaces);const txt=stripHtml(html);if(!prices.length){const p=[];for(const m of txt.matchAll(/(^|[^0-9])([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{2,9})\s*(?:dh|dhs|mad)(?:\b|[^a-z])/gi)){const n=num(m[2]);if(n>0&&n<=1e9)p.push(n)}prices=uniq(p)}if(!surfaces.length){const s=[];for(const m of txt.matchAll(/(^|[^0-9])([0-9]{1,8}(?:[ .][0-9]{3})*(?:[.,][0-9]{1,2})?)\s*(?:m2|m²|mètres? carrés?|metres? carres?)/gi)){const n=num(m[2]);if(n>=5&&n<=1e8)s.push(n)}for(const m of txt.matchAll(/(^|[^0-9])([0-9]{1,5}(?:[.,][0-9]{1,3})?)\s*(?:hectares?|ha)(?:\b|[^a-z])/gi)){const n=num(m[2])*10000;if(n>=5&&n<=1e8)s.push(n)}surfaces=uniq(s)}return{price:prices.length===1?prices[0]:null,surface:surfaces.length===1?surfaces[0]:null,priceCandidates:prices.length,surfaceCandidates:surfaces.length}}

const q1d=readJsonl(`${ROOT}/q1d/manifest-q1d.jsonl`)
const pub=new Map(readJsonl(`${ROOT}/public/public-dataset-features.jsonl`).filter(r=>r.url).map(r=>[r.identity_key,r.url]))
const dbrec=new Map(readJsonl(`${ROOT}/dbrec/recovered-search-ready.jsonl`).map(r=>[r.representation_key,r.url]))
const repair=new Map(readJsonl(`${ROOT}/repair/new-search-ready.jsonl`).map(r=>[r.row_index,r]))
const dbfield=new Map(readJsonl(`${ROOT}/dbfield/db-url-field-evidence.jsonl`).map(r=>[norm(r.url),r]))
const verified=new Map(readJsonl(`${ROOT}/verified/verified-repairs.jsonl`).map(r=>[norm(r.url),r]))

const targets=[]
for(let i=0;i<q1d.length;i++){
 const r=q1d[i];if(r.normalized_source_domain!=='mubawab.ma')continue
 const f=r.features||{};let url=(r.identity_kind==='url'&&String(r.source_identity||'').startsWith('http'))?r.source_identity:(pub.get(r.representation_key)||dbrec.get(r.representation_key));let city=f.city,price=f.price_mad,surface=f.surface_m2
 if(repair.has(i)){const x=repair.get(i);url=x.url;city=x.city;price=x.price_mad;surface=x.surface_m2}
 const d=url?dbfield.get(norm(url)):null;if(d){city=city||d.city;if(!good(price))price=d.price_mad;if(!good(surface))surface=d.surface_m2}
 const v=url?verified.get(norm(url)):null;if(v){city=v.city||city;if(good(v.price_mad))price=v.price_mad;if(good(v.surface_m2))surface=v.surface_m2}
 if(url&&city&&(!good(price)||!good(surface)))targets.push({row_index:i,representation_key:r.representation_key,canonical_url:url,city,price_mad:good(price)?Number(price):null,surface_m2:good(surface)?Number(surface):null})
 if(targets.length>=LIMIT)break
}
fs.writeFileSync(`${OUT}/targets.jsonl`,targets.map(x=>JSON.stringify(x)).join('\n')+'\n')

async function latestIndexes(){return ['CC-MAIN-2026-17','CC-MAIN-2025-51','CC-MAIN-2025-30','CC-MAIN-2025-26','CC-MAIN-2025-13','CC-MAIN-2025-08','CC-MAIN-2025-05','CC-MAIN-2024-51','CC-MAIN-2024-30','CC-MAIN-2024-10','CC-MAIN-2023-50','CC-MAIN-2023-23','CC-MAIN-2022-49','CC-MAIN-2022-21','CC-MAIN-2021-31','CC-MAIN-2021-04','CC-MAIN-2020-29','CC-MAIN-2020-05','CC-MAIN-2019-30','CC-MAIN-2019-13','CC-MAIN-2018-51','CC-MAIN-2018-26','CC-MAIN-2017-51']}
function idPrefixes(raw){const m=String(raw||'').match(/\/fr\/a\/(\d+)/i);if(!m)return[raw];const p=`/fr/a/${m[1]}/`;return[`https://mubawab.ma${p}`,`https://www.mubawab.ma${p}`,`http://mubawab.ma${p}`,`http://www.mubawab.ma${p}`]}
async function findRecord(url,indexes){for(const prefix of idPrefixes(url)){for(const idx of indexes){try{const q=`https://index.commoncrawl.org/${idx}-index?url=${encodeURIComponent(prefix)}&matchType=prefix&output=json&filter=status:200&filter=mime:text/html&collapse=urlkey`;const r=await fetch(q,{signal:AbortSignal.timeout(4500)});if(!r.ok)continue;const text=await r.text();const lines=text.split('\n').filter(Boolean);if(lines.length){try{return JSON.parse(lines[0])}catch{}}}catch{}}}return null}
async function fetchHtml(rec){const start=Number(rec.offset),len=Number(rec.length);const r=await fetch(`https://data.commoncrawl.org/${rec.filename}`,{headers:{Range:`bytes=${start}-${start+len-1}`},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error(`warc ${r.status}`);const buf=Buffer.from(await r.arrayBuffer());const dec=zlib.gunzipSync(buf).toString('utf8');const p=dec.indexOf('\r\n\r\n');const rest=p>=0?dec.slice(p+4):dec;const p2=rest.indexOf('\r\n\r\n');return p2>=0?rest.slice(p2+4):rest}

const indexes=await latestIndexes();const recovered=[];let indexMatches=0,warcFetched=0,errors=0
for(let i=0;i<targets.length;i+=20){const batch=targets.slice(i,i+20);const rows=await Promise.all(batch.map(async t=>{try{const rec=await findRecord(t.canonical_url,indexes);if(!rec)return{...t,index_match:false};indexMatches++;const html=await fetchHtml(rec);warcFetched++;const e=extract(html);const price=t.price_mad||e.price;const surface=t.surface_m2||e.surface;return{...t,index_match:true,recovered_price:e.price,recovered_surface:e.surface,priceCandidates:e.priceCandidates,surfaceCandidates:e.surfaceCandidates,final_price:price,final_surface:surface,complete:Boolean(price>0&&surface>0),cc_timestamp:rec.timestamp,cc_filename:rec.filename,cc_url:rec.url}}catch(err){errors++;return{...t,error:String(err?.message||err)}}}));recovered.push(...rows)}
fs.writeFileSync(`${OUT}/recoveries.jsonl`,recovered.map(x=>JSON.stringify(x)).join('\n')+'\n')
const complete=recovered.filter(x=>x.complete);fs.writeFileSync(`${OUT}/complete.jsonl`,complete.map(x=>JSON.stringify(x)).join('\n')+(complete.length?'\n':''))
const summary={schemaVersion:'q4a-mubawab-commoncrawl-artifact-only-v5-id-prefix',targets:targets.length,indexes,indexMatches,warcFetched,errors,recoveredPrice:recovered.filter(x=>x.recovered_price).length,recoveredSurface:recovered.filter(x=>x.recovered_surface).length,newlyComplete:complete.length,supabaseReads:0,supabaseWrites:0,directMubawabFetches:0,commonCrawlOnly:true}
fs.writeFileSync(`${OUT}/summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2))