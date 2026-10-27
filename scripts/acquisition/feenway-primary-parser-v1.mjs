// AkarFinder: primary source detail parser V1. Never infer commercial availability or rights.
// Input is a public page text snapshot; no fetching, no PII and no database access.
const SOURCES = new Set(['mubawab.ma','avito.ma','yakeey.com','agenz.ma','masaken.ma','sarouty.ma']);
const clean = s => String(s || '').replace(/[\u00a0\u202f]/g,' ').replace(/\r/g,'');
const fold = s => clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const lines = s => clean(s).split('\n').map(v=>v.trim()).filter(Boolean);
const numeric = raw => {
  const s=clean(raw).trim();
  if(!/^\d[\d .,\s]*$/.test(s))return null;
  if(/[.,]\d{1,2}$/.test(s))return null;
  const n=Number(s.replace(/[^\d]/g,''));
  return Number.isSafeInteger(n)&&n>0?n:null;
};
const amount = raw => {
  const m=clean(raw).match(/^\s*(\d[\d .,\s]*?)\s*(?:DH|MAD)\s*$/i);
  return m?numeric(m[1]):null;
};
const area = raw => {
  const m=clean(raw).match(/(?:^|[^\d])(\d[\d .,]{0,18})\s*m(?:²|2)(?![\p{L}\d])/iu);
  return m?numeric(m[1]):null;
};
const unique = items => [...new Set(items.filter(x=>x!==null&&x!==undefined))];
const region = (text,start,end,limit=5000) => {
  let s=clean(text);
  const at=s.search(start);
  if(at<0)return '';
  s=s.slice(at);
  const stop=s.search(end);
  if(stop>=0)s=s.slice(0,stop);
  return s.slice(0,limit);
};
const normType = title => {
  const t=fold(title);
  const rent=/\ba louer\b|\ben location\b|\blocation\b/.test(t);
  const sale=/\ba vendre\b|\ben vente\b|\bvente\b/.test(t);
  return rent===sale?null:rent?'rent':'sale';
};
const pickValue=(re,s,fn)=>{const m=s.match(re);return m?fn(m[1]):null;};
function verify(source,identity,original,final) {
  if(!identity||!original||!final||typeof final!=='string'||typeof original!=='string')return {ok:false,alias:false,program:false};
  let u;try{u=new URL(final)}catch{return {ok:false,alias:false,program:false}};
  const h=u.hostname.replace(/^www\./,'').toLowerCase();
  if(u.protocol!=='https:'||h!==source||u.username||u.password)return {ok:false,alias:false,program:false};
  const p=u.pathname, query=u.searchParams;
  // Both original URL and final URL must agree with the source identity.
  let o;try{o=new URL(original)}catch{return {ok:false,alias:false,program:false}}
  if(o.protocol!=='https:'||o.hostname.replace(/^www\./,'').toLowerCase()!==source||o.username||o.password)return {ok:false,alias:false,program:false};
  const numericId=identity.match(/(\d{4,})$/)?.[1];
  if(!numericId)return {ok:false,alias:false,program:false};
  let originalId=null;
  if(source==='mubawab.ma'){
    const m=o.pathname.match(/\/(a|pa)\/(\d+)(?:\/|$)/);
    if(m?.[1]!==identity.match(/^(a|pa):/)?.[1])return {ok:false,alias:false,program:false};
    originalId=m?.[2];
  }else if(source==='avito.ma')originalId=o.pathname.match(/_(\d+)\.htm$/i)?.[1];
  else if(source==='agenz.ma'||source==='masaken.ma')originalId=o.pathname.match(/\/(\d+)\/?$/)?.[1];
  else if(source==='sarouty.ma')originalId=o.searchParams.get('listing_id')||o.pathname.match(/^\/(?:acheter|louer)\/[a-z0-9-]+-(\d+)\/?$/i)?.[1];
  else if(source==='yakeey.com')originalId=o.pathname.match(/[a-z]{2}(\d{6})\/?$/i)?.[1];
  if(originalId!==numericId)return {ok:false,alias:false,program:false};
  if(source==='mubawab.ma'){
    const x=identity.match(/^(a|pa):(\d+)$/),m=p.match(/\/(a|pa)\/(\d+)(?:\/|$)/);
    return {ok:!!(x&&m&&x[1]===m[1]&&x[2]===m[2]),alias:false,program:x?.[1]==='pa'};
  }
  if(source==='avito.ma')return {ok:!!(identity.match(/^avito:(\d+)$/)?.[1]===p.match(/_(\d+)\.htm$/i)?.[1]),alias:false,program:false};
  if(source==='agenz.ma'||source==='masaken.ma'){
    const value=identity.match(/:(\d+)$/)?.[1],found=p.match(/\/(\d+)\/?$/)?.[1];
    return {ok:!!(identity.startsWith(source.split('.')[0]+':')&&value&&value===found),alias:false,program:false};
  }
  if(source==='sarouty.ma'){
    const value=identity.match(/^sarouty:(\d+)$/)?.[1],byQuery=query.get('listing_id');
    const byRoute=p.match(/^\/(?:acheter|louer)\/[a-z0-9-]+-(\d+)\/?$/i)?.[1];
    const found=byQuery||byRoute;
    return {ok:!!(value&&found&&value===found&&(!byQuery||!byRoute||byQuery===byRoute)),alias:!!(!byQuery&&byRoute&&value===byRoute),program:false};
  }
  if(source==='yakeey.com'){
    const expected=identity.match(/([a-z]{2})(\d{6})(?:\/)?$/i),found=p.match(/([a-z]{2})(\d{6})\/?$/i);
    return {ok:!!(expected&&found&&expected[2]===found[2]),alias:!!(expected&&found&&expected[1].toLowerCase()!==found[1].toLowerCase()),program:false};
  }
  return {ok:false,alias:false,program:false};
}
function parseMubawab(text,title){
  // Header spans between first displayed price and contact form; excludes related listings.
  const b=region(text,/^###\s*[\d .,]+\s*(?:DH|MAD)\s*$/im,/^####\s*Contacter l'annonceur/im,3000);
  const v=lines(b),prices=v.filter(x=>/^###\s*[\d .,]+\s*(?:DH|MAD)$/i.test(x)).map(x=>amount(x.replace(/^###\s*/,'')));
  const surfaces=[];
  for(let i=0;i<v.length-1;i++)if(/^###\s*[\d .,]+\s*(?:DH|MAD)$/i.test(v[i]))surfaces.push(area(v[i+1]));
  const where=v.filter(x=>x.startsWith('### ')).map(x=>x.slice(4).trim()).find(x=>x&&!/^\d/.test(x));
  const loc=where?.match(/^(.+?)\s+à\s+(.+)$/i);
  const city=loc?.[2]?.trim()||(/^(?:Dar Bouazza|Casablanca|Rabat|Marrakech|Tanger|Fès|Agadir|Salé|Kénitra|Témara)$/i.test(where||'')?where:null);
  return {price:unique(prices),surfaces:unique(surfaces),city,district:loc?.[1]?.trim()||null,tx:normType(title),period:/\bDH\s*\/\s*mois\b|\bDH\s*par mois/i.test(b)?'month':null,basis:'headline',block:b};
}
function parseAvito(text,title){
  const b=region(text,/^#\s+[^\n]+/m,/^##\s*Description/im,3000);
  const v=lines(b);
  const prices=unique(v.filter(x=>/^\d[\d .,]*\s*(?:DH|MAD)$/i.test(x)).map(amount));
  const a=v.find(x=>/^\d+\s*Surface totale$/i.test(x));
  const loc=b.match(/(?:^|\n)\s*([^\n,]{2,65}),\s*([^\n,]{2,65}?)il y a\s*\d+/i);
  const tx=/Categorie[^\n]{0,100}à louer/i.test(b)?'rent':/Categorie[^\n]{0,100}à vendre/i.test(b)?'sale':normType(title);
  return {price:prices,surfaces:unique([a?numeric(a.match(/^\d+/)[0]):null]),city:loc?.[2]?.trim()||null,district:loc?.[1]?.trim()||null,tx,period:/\b\/\s*mois\b|\bpar mois\b/i.test(b)?'month':null,basis:'total',block:b};
}
function parseYakeey(text,title){
  const b=region(text,/^###\s*[\d .,]+\s*(?:DH|MAD)\s*$/im,/^##\s*Caractéristiques du bien/im,5000);
  const p=pickValue(/^###\s*([\d .,]+\s*(?:DH|MAD))\s*$/im,b,amount);
  const a=pickValue(/Surface totale\s*\n+\s*(\d[\d .,]*\s*m(?:²|2))/i,b,area);
  const city=pickValue(/^###\s*Ville:\s*\n+\s*([^\n]+)/im,text,x=>x.trim());
  const district=pickValue(/^###\s*Quartier:\s*\n+\s*([^\n]+)/im,text,x=>x.trim());
  return {price:unique([p]),surfaces:unique([a]),city,district,tx:normType(title),period:null,basis:'total',block:b};
}
function parseAgenz(text,title,originalUrl=''){
  const b=region(text,/^#\s+[^\n]+\n+\s*\d[\d .,]*\s*(?:DH|MAD)/im,/^Fiche du bien/im,2300);
  const m=b.match(/^#\s*[^\n]+\n+\s*([\d .,]+\s*(?:DH|MAD))\s*\n+\s*([^\n]+)/im);
  const loc=m?.[2]?.split(/\s+[–—-]\s+/);
  const price=m?amount(m[1]):null;
  // Only the area nearest to the primary price/location, not the descriptive body.
  const scope=m?b.slice(0,850):'';
  const a=pickValue(/(?:^|\n)\s*(\d[\d .,]*\s*m(?:²|2))\s*(?:\n|$)/im,scope,area);
  let tx=/Appartement à vendre|Villa à vendre|Maison à vendre/i.test(text.slice(0,1500))?'sale':/Appartement à louer|Villa à louer|Maison à louer/i.test(text.slice(0,1500))?'rent':normType(title);
  if(!tx&&/\/vente-/.test(originalUrl))tx='sale';
  if(!tx&&/\/location-/.test(originalUrl))tx='rent';
  return {price:unique([price]),surfaces:unique([a]),city:loc?.length===2?loc[0].trim():null,district:loc?.length===2?loc[1].trim():null,tx,period:null,basis:'headline',block:b};
}
function parseMasaken(text,title){
  const b=region(text,/^#\s*(?:Location|Vente)/im,/^Options\s*$/im,2700);
  const p=pickValue(/\*\*Prix total\s*:\*\*\s*([\d .,]+\s*(?:DH|MAD))/i,b,amount);
  const a=pickValue(/(?:^|\n)\s*(?:\*\*)?Surf\.\s*habitable(?:\s*:\*\*)?\s*\n?\s*(\d[\d .,]*\s*m(?:²|2))/im,b,area);
  const city=pickValue(/^#\s*(?:Location|Vente)\s+[^\n]+\s+à\s+([^\n]+)/im,b,x=>x.trim());
  return {price:unique([p]),surfaces:unique([a]),city,district:null,tx:/^#\s*Location/im.test(b)?'rent':/^#\s*Vente/im.test(b)?'sale':normType(title),period:/\/\s*mois|par mois/i.test(b)?'month':null,basis:'habitable',block:b};
}
function parseSarouty(text,title){
  const b=region(text,/^#\s+[^\n]+/m,/^##\s*(?:Description|Biens similaires)/im,2600);
  const p=pickValue(/(?:^|\n)\s*([\d .,]+\s*(?:DH|MAD))\s*\/\s*(?:mois|month)/im,b,amount);
  const a=pickValue(/\*\s*Surface\s*:\s*(\d[\d .,]*\s*m(?:²|2))/i,b,area);
  const loc=pickValue(/\*\s*Emplacement\s*:\s*([^\n]+)/i,b,x=>x.trim());
  const parts=loc?.split(',').map(x=>x.trim());
  return {price:unique([p]),surfaces:unique([a]),city:parts?.length>=2?parts.at(-1):null,district:parts?.length>=2?parts.slice(0,-1).join(', '):null,tx:normType(title),period:/\/\s*mois/i.test(b)?'month':null,basis:'listed',block:b};
}
export function parsePrimary(input={}) {
  const o={schema:'AKARFINDER_PRIMARY_PARSER_V1',source:input.source||null,identity:input.identity||null,price_mad:null,surface_m2:null,city:null,district:null,transaction:null,price_period:null,surface_basis:null,identity_verified:false,primary_block_verified:false,fields_5_present:false,issues:[],gate:'quarantine_input',published_metadata:input.published_date||null,availability_verified:false,physically_unique_verified:false,reuse_rights_verified:false,eligible:false};
  const text=input.text,source=input.source;
  if(!SOURCES.has(source)||typeof text!=='string'||text.length>300000||typeof input.final_url!=='string'||typeof input.original_url!=='string'){o.issues.push('invalid_or_unsupported_input');return o;}
  const id=verify(source,input.identity,input.original_url,input.final_url);
  o.identity_verified=id.ok;
  if(!id.ok){o.issues.push('source_identity_not_confirmed');o.gate='quarantine_identity';return o;}
  if(id.program){o.issues.push('program_not_individual');o.gate='review_program';return o;}
  if(id.alias)o.issues.push('route_alias_review');
  const parser={'mubawab.ma':parseMubawab,'avito.ma':parseAvito,'yakeey.com':parseYakeey,'agenz.ma':parseAgenz,'masaken.ma':parseMasaken,'sarouty.ma':parseSarouty}[source];
  const p=parser(text,input.title||'',input.original_url);
  o.primary_block_verified=!!p.block;
  if(!p.block){o.issues.push('primary_block_not_found');o.gate='review_missing_fields';return o;}
  o.surface_basis=p.basis;
  if(p.price.length>1)o.issues.push('conflicting_primary_prices');
  if(p.surfaces.length>1)o.issues.push('conflicting_primary_areas');
  o.price_mad=p.price.length===1?p.price[0]:null;
  o.surface_m2=p.surfaces.length===1?p.surfaces[0]:null;
  o.city=p.city?.trim()||null;o.district=p.district?.trim()||null;o.transaction=p.tx;
  o.price_period=p.tx==='sale'?'total':p.period;
  const short=fold(p.block.slice(0,2600));
  if(/\bpas[- ]de[- ]porte\b|\bsarout\b/.test(short))o.issues.push('pas_de_porte');
  if(/(?:dh|mad)\s*\/\s*m(?:²|2)|prix au m2|prix au m²/.test(short))o.issues.push('price_per_m2');
  if(/\bpar nuit\b|\/\s*nuit|location quotidienne|\/\s*jour\b|\bpar jour\b/.test(short))o.issues.push('daily_or_nightly_rent');
  if(p.tx==='rent'&&o.price_period===null)o.issues.push('rental_period_unconfirmed');
  if(!o.district)o.issues.push('district_unconfirmed');
  if(!o.city)o.issues.push('city_unconfirmed');
  if(!o.transaction)o.issues.push('transaction_unconfirmed');
  if(o.price_mad===null||o.price_mad<200||o.price_mad>1000000000){o.issues.push('price_missing_or_out_of_range');o.price_mad=null;}
  if(o.surface_m2===null||o.surface_m2<5||o.surface_m2>100000){o.issues.push('surface_missing_or_out_of_range');o.surface_m2=null;}
  o.fields_5_present=!!(o.price_mad&&o.surface_m2&&o.city&&o.district&&o.transaction);
  if(o.issues.some(x=>['pas_de_porte','price_per_m2','daily_or_nightly_rent'].includes(x)))o.price_period=null;
  const urgent=['pas_de_porte','price_per_m2','daily_or_nightly_rent','conflicting_primary_prices','conflicting_primary_areas'];
  o.gate=o.issues.some(x=>urgent.includes(x))?'review_economic_or_field_conflict':o.fields_5_present?'review_five_fields':'review_missing_fields';
  if(id.alias&&o.gate==='review_five_fields')o.gate='review_source_route_alias';
  // This is a technical review status only. Do not promote to eligible.
  return o;
}
