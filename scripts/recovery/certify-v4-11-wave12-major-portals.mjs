#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const args=process.argv.slice(2); const v={}; for(let i=0;i<args.length;i+=2)v[args[i]]=args[i+1];
const mub=v['--mubawab'], ag=v['--agenz'], outDir=v['--out-dir'];
if(!mub||!ag||!outDir) throw new Error('missing args');
fs.mkdirSync(outDir,{recursive:true});
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const dec=s=>{try{return decodeURIComponent(s)}catch{return s}};
const norm=s=>dec(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
const title=s=>dec(s).replace(/\.(html?|php)$/i,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().replace(/^./,c=>c.toUpperCase());
const cityDefs=[
['Casablanca',/\b(casablanca|casa)\b/],['Rabat',/\brabat\b/],['Marrakech',/\b(marrakech|marrakesh)\b/],['Tanger',/\b(tanger|tangier)\b/],['Fès',/\b(fes|fez)\b/],['Agadir',/\bagadir\b/],['Meknès',/\bmeknes\b/],['Kénitra',/\bkenitra\b/],['Mohammedia',/\bmohammedia\b/],['Oujda',/\boujda\b/],['Tétouan',/\btetouan\b/],['Témara',/\btemara\b/],['Essaouira',/\bessaouira\b/],['Bouskoura',/\bbouskoura\b/],['Bouznika',/\bbouznika\b/],['El Jadida',/\bel jadida\b/],['Dar Bouazza',/\bdar bouazza\b/],['Safi',/\bsafi\b/],['Nador',/\bnador\b/],['Dakhla',/\bdakhla\b/],['Laâyoune',/\blaayoune\b/],['Berrechid',/\bberrechid\b/],['Martil',/\bmartil\b/],['Ifrane',/\bifrane\b/],['Skhirat',/\bskhirat\b/],['Salé',/\bsale\b/],['Khouribga',/\bkhouribga\b/],['Béni Mellal',/\bbeni mellal\b/],['Settat',/\bsettat\b/],['Larache',/\blarache\b/],['Chefchaouen',/\bchefchaouen\b/],['El Mansouria',/\bel mansouria\b/],["M'diq",/\bm['’]?diq\b/],['Azemmour',/\bazemmour\b/],['Asilah',/\basilah\b/],['Fnideq',/\bfnideq\b/],['Ksar El Kebir',/\bksar el kebir\b/],['Al Hoceima',/\bal hoceima\b/]
];
const typeDefs=[
['apartment',/\b(appartements?|appartement|apartment|apartments|appart|appt|flat|duplex)\b/],['studio',/\bstudios?\b/],['villa',/\bvillas?\b/],['house',/\b(maisons?|houses?|maison)\b/],['land',/\b(terrains?|land|plot|parcelle|ferme|farm)\b/],['office',/\b(bureaux?|office|offices)\b/],['commercial',/\b(local commercial|locaux|local|commercial|commerce|magasin|shop)\b/],['riad',/\briads?\b/]
];
const pick=(txt,defs)=>{const a=[...new Set(defs.filter(([,r])=>r.test(txt)).map(([x])=>x))];return a.length===1?a[0]:null};
const tx=txt=>{const r=/(?:^|\b)(a louer|louer|location|rent|rental|for rent)(?:\b|$)/.test(txt);const s=/(?:^|\b)(a vendre|vendre|vente|achat|acheter|sale|for sale|buy)(?:\b|$)/.test(txt);return r!==s?(r?'rent':'sale'):null};
const read=p=>fs.readFileSync(p,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const safe=[], rejected=[];
function emit(r){ if(!r.source_offer_key||!r.city||!r.property_type||!r.transaction_type||!r.title_text||r.title_text.length<5){rejected.push({...r,reason:'core_incomplete'});return} const fp=sha('representation|'+r.listing_url); safe.push({canonical_fingerprint:fp,title:r.title_text,price_mad:null,city:r.city,district:r.district??null,property_type:r.property_type,transaction_type:r.transaction_type,surface_m2:null,rooms_count:null,bedrooms_count:null,bathrooms_count:null,description_snippet:null,images_count:null,seller_name:null,data_completeness_score:80,field_confidence:{certification:'v4.11_wave12_major_portal_route',title:{source:'route_explicit'},city:{source:'route_explicit'},property_type:{source:'route_explicit'},transaction_type:{source:'route_explicit'},rule:r.rule,cross_source_merge_performed:false},source_name:r.source_name,listing_url:r.listing_url,source_url:'https://'+r.source_name,first_seen_at:null,last_seen_at:null,source_offer_key:r.source_offer_key,origin_type:'legacy_import',compliance_status:'recovery_verified_v4_11_wave12_major_portal_route',content_fingerprint:fp,ingestion_run_id:'clean-corpus-v4.11-wave12-major-portals',displayed_price:null,price_currency:null,price_period:null,price_status:'not_disclosed',approved_for_import:false}); }

for(const raw of read(ag)){
 try{const u=new URL(raw),p=u.pathname.split('/').filter(Boolean).map(dec);if(p.length!==6||!['fr','en'].includes(p[0])||p[1]!=='annonces'||!p[2].startsWith('immo-')||!/^[0-9]+$/.test(p[5])){rejected.push({source_name:'agenz.ma',listing_url:raw,reason:'route_contract'});continue}
 const citySlug=norm(p[2].slice(5)), spec=norm(p[3]); const tr=spec.startsWith('vente ')?'sale':spec.startsWith('location ')?'rent':null; const typeSlug=spec.replace(/^(vente|location)\s+/,'');
 const typeMap={'appartements':'apartment','villas':'villa','bureaux':'office','terrains':'land','maisons':'house','riads':'riad','locaux magasins':'commercial','locaux industriels':'commercial'}; const pt=typeMap[typeSlug]||null;
 emit({source_name:'agenz.ma',listing_url:raw,source_offer_key:p[5],city:title(citySlug),district:title(p[4]),property_type:pt,transaction_type:tr,title_text:title(typeSlug+' '+(tr==='sale'?'à vendre':'à louer')+' '+p[4]+' '+citySlug),rule:'agenz_structured_route'});
 }catch{rejected.push({source_name:'agenz.ma',listing_url:raw,reason:'bad_url'})}
}
for(const raw of read(mub)){
 try{const u=new URL(raw),p=u.pathname.split('/').filter(Boolean).map(dec);if(p.length<4||!['fr','en'].includes(p[0])||p[1]!=='a'||!/^[0-9]+$/.test(p[2])){rejected.push({source_name:'mubawab.ma',listing_url:raw,reason:'non_detail_or_route_contract'});continue}
 const slug=norm(p.slice(3).join(' ')), city=pick(slug,cityDefs), pt=pick(slug,typeDefs), tr=tx(slug);
 emit({source_name:'mubawab.ma',listing_url:raw,source_offer_key:p[2],city,property_type:pt,transaction_type:tr,title_text:title(p.slice(3).join(' ')),rule:'mubawab_detail_slug_explicit'});
 }catch{rejected.push({source_name:'mubawab.ma',listing_url:raw,reason:'bad_url'})}
}

const byId=new Map(), conflictKeys=new Set(), conflicts=[];
for(const r of safe){const k=r.source_name+'|'+r.source_offer_key;if(conflictKeys.has(k))continue;const prev=byId.get(k);if(!prev){byId.set(k,r);continue}const a=JSON.stringify([prev.city,prev.property_type,prev.transaction_type]),b=JSON.stringify([r.city,r.property_type,r.transaction_type]);if(a!==b){conflicts.push({identity:k,a:prev.listing_url,b:r.listing_url});byId.delete(k);conflictKeys.add(k);continue}if(r.listing_url.localeCompare(prev.listing_url)<0)byId.set(k,r)}
const out=[...byId.values()].sort((a,b)=>(a.source_name+'|'+a.source_offer_key).localeCompare(b.source_name+'|'+b.source_offer_key));
if(new Set(out.map(r=>r.listing_url)).size!==out.length)throw new Error('url dup');if(new Set(out.map(r=>r.canonical_fingerprint)).size!==out.length)throw new Error('fp dup');if(new Set(out.map(r=>r.source_name+'|'+r.source_offer_key)).size!==out.length)throw new Error('id dup');
const body=out.map(JSON.stringify).join('\n')+(out.length?'\n':''); fs.writeFileSync(outDir+'/db-ready-wave12-major-portals.jsonl',body); fs.writeFileSync(outDir+'/rejected-wave12-major-portals.jsonl',rejected.concat(conflicts.map(x=>({reason:'identity_conflict',...x}))).map(JSON.stringify).join('\n')+'\n');
const by={};for(const r of out)by[r.source_name]=(by[r.source_name]||0)+1;
const summary={schema_version:'akarfinder-v4.11-wave12-major-portals-20260928',input_rows:{mubawab:read(mub).length,agenz:read(ag).length},pre_identity_rows:safe.length,identity_conflicts:conflicts.length,db_ready_rows:out.length,by_domain:by,rejected_rows:rejected.length+conflicts.length,output_sha256:sha(body),database_access:0,database_writes:0,production_neon_writes:0,approved_for_import_rows:0,vercel_deployment:false};fs.writeFileSync(outDir+'/summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
