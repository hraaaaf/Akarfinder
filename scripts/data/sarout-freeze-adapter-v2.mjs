import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  parseSaroutRoute,
  inferSaroutTransaction,
  inferSaroutPropertyTypes,
  inferSaroutSurface,
  inferSaroutCity,
  preferredSaroutUrl,
} from './sarout-url-parser-v2.mjs';

const input=process.env.FREEZE_JSONL_GZ||process.argv[2];
const outDir=process.env.OUTPUT_DIR||process.argv[3]||'data/recovery/sarout-v2';
const expectedSha=process.env.FREEZE_SHA256||'e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953';
if(!input) throw new Error('FREEZE_JSONL_GZ or argv[2] required');

const actualSha=crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');
if(actualSha!==expectedSha) throw new Error(`freeze sha mismatch: ${actualSha}`);

const ARABIC_CITY={
  'الدار البيضاء':'Casablanca','الرباط':'Rabat','مراكش':'Marrakech','طنجة':'Tanger','أكادير':'Agadir',
  'تمارة':'Témara','بني ملال':'Béni Mellal','المحمدية':'Mohammedia','الجديدة':'El Jadida','القنيطرة':'Kénitra',
  'وجدة':'Oujda','فاس':'Fès','مكناس':'Meknès','تطوان':'Tétouan','الصويرة':'Essaouira','الناظور':'Nador',
  'أصيلة':'Assilah','سيدي قاسم':'Sidi Kacem','الحسيمة':'Al Hoceïma','بوزنيقة':'Bouznika','تازة':'Taza',
  'خريبكة':'Khouribga','بركان':'Berkane','العيون':'Laâyoune','الداخلة':'Dakhla','المنصورية':'Mansouria'
};

function present(v){return v!==null&&v!==undefined&&v!=='';}
function normalize(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function titleTransaction(title){
  const t=String(title??'');
  const sale=t.includes('للبيع')||t.includes(' بيع ');
  const rent=t.includes('للإيجار')||t.includes('للايجار')||t.includes('إيجار')||t.includes('ايجار');
  if(sale&&!rent) return 'sale';
  if(rent&&!sale) return 'rent';
  if(sale&&rent) return 'conflict';
  return null;
}

const groups=new Map();
let rawRows=0,scopeEligibleRows=0,keepRows=0,deep200Rows=0;
const locales={ar:0,fr:0};
const deepCoverage={title:0,description:0,published_at:0,city:0,district:0,price_mad:0,surface_m2:0};
const rl=readline.createInterface({input:fs.createReadStream(input).pipe(zlib.createGunzip()),crlfDelay:Infinity});

for await(const line of rl){
  if(!line.trim()) continue;
  const row=JSON.parse(line);
  if(row.source_domain!=='sarout.ma') continue;
  rawRows++;
  if(row.scope_eligible) scopeEligibleRows++;
  if(row.classification==='KEEP') keepRows++;
  const route=parseSaroutRoute(row.canonical_url);
  if(!route) throw new Error(`unexpected Sarout route: ${row.canonical_url}`);
  locales[route.locale]=(locales[route.locale]||0)+1;
  if(!groups.has(route.identity)) groups.set(route.identity,{id:route.id,slug:route.slug,urls:[],rows:[],scope_eligible:false});
  const group=groups.get(route.identity);
  group.urls.push(row.canonical_url);
  group.rows.push(row);
  group.scope_eligible ||= !!row.scope_eligible;

  if((row.deep_http_statuses||[]).includes(200)){
    deep200Rows++;
    for(const f of Object.keys(deepCoverage)) if(present(row[f])) deepCoverage[f]++;
  }
}

let bilingualExactPairs=0,slugPairConflicts=0;
const urlEvidence={transaction:{sale:0,rent:0,conflict:0,unresolved:0},property_type:{recoverable:0,conflict:0,unresolved:0},surface:{recoverable:0,conflict:0,unresolved:0},city:{recoverable:0,conflict:0,unresolved:0}};
const validation={
  transaction:{comparable:0,match:0,mismatch:0},
  surface:{comparable:0,match:0,mismatch:0},
  city:{comparable:0,match:0,mismatch:0},
};
const passports=[],fetchPlan=[],conflicts=[];

for(const [identity,group] of groups){
  const routes=group.urls.map(parseSaroutRoute);
  const slugs=[...new Set(routes.map(x=>x.slug))];
  if(group.urls.length===2&&new Set(routes.map(x=>x.locale)).size===2&&slugs.length===1) bilingualExactPairs++;
  if(slugs.length>1) slugPairConflicts++;

  const slug=group.slug;
  const tx=inferSaroutTransaction(slug);
  if(tx==='sale'||tx==='rent') urlEvidence.transaction[tx]++;
  else if(tx==='conflict') urlEvidence.transaction.conflict++;
  else urlEvidence.transaction.unresolved++;

  const types=inferSaroutPropertyTypes(slug);
  const propertyType=types.length===1
    ? {state:'recoverable_from_url',value:types[0],confidence:'high'}
    : types.length>1
      ? {state:'conflict',values:types}
      : {state:'unresolved'};
  urlEvidence.property_type[propertyType.state==='recoverable_from_url'?'recoverable':propertyType.state]++;

  const surface=inferSaroutSurface(slug);
  urlEvidence.surface[surface.state==='recoverable_from_url'?'recoverable':surface.state]++;

  const city=inferSaroutCity(slug);
  urlEvidence.city[city.state==='recoverable_from_url'?'recoverable':city.state]++;

  const deep=group.rows.find(r=>(r.deep_http_statuses||[]).includes(200));
  if(deep){
    const pageTx=titleTransaction(deep.title);
    if((tx==='sale'||tx==='rent')&&(pageTx==='sale'||pageTx==='rent')){
      validation.transaction.comparable++;
      if(tx===pageTx) validation.transaction.match++;
      else {validation.transaction.mismatch++;conflicts.push({identity,field:'transaction_type',url_value:tx,page_value:pageTx,url:deep.canonical_url});}
    }

    if(surface.state==='recoverable_from_url'&&present(deep.surface_m2)){
      validation.surface.comparable++;
      if(Number(surface.value)===Number(deep.surface_m2)) validation.surface.match++;
      else {validation.surface.mismatch++;conflicts.push({identity,field:'surface_m2',url_value:surface.value,page_value:deep.surface_m2,url:deep.canonical_url});}
    }

    const pageCity=ARABIC_CITY[deep.city];
    if(city.state==='recoverable_from_url'&&pageCity){
      validation.city.comparable++;
      if(normalize(city.value)===normalize(pageCity)) validation.city.match++;
      else {validation.city.mismatch++;conflicts.push({identity,field:'city',url_value:city.value,page_value:pageCity,url:deep.canonical_url});}
    }
  }

  const canonical=preferredSaroutUrl(group.urls);
  passports.push({
    source:'sarout.ma',identity,source_id:group.id,canonical_fetch_url:canonical,
    locale_urls:group.urls.sort(),scope_eligible:group.scope_eligible,
    transaction_type: tx==='sale'||tx==='rent'?{state:'recoverable_from_url',value:tx,confidence:'high'}:tx==='conflict'?{state:'conflict'}:{state:'unresolved'},
    property_type:propertyType,surface_m2:surface,city, district:{state:'unresolved_live_required'},
    price_mad:{state:'unresolved_live_required'}, freshness:{state:'unknown'}
  });
  if(group.scope_eligible) fetchPlan.push({source:'sarout.ma',identity,url:canonical,reason:'freshness_price_district_and_crosscheck'});
}

passports.sort((a,b)=>a.identity.localeCompare(b.identity));
fetchPlan.sort((a,b)=>a.identity.localeCompare(b.identity));

const summary={
  schema_version:'AKARFINDER_SAROUT_ADAPTER_V2_FREEZE',
  freeze_sha256:actualSha,database_access:0,database_writes:0,
  raw_url_rows:rawRows,scope_eligible_url_rows:scopeEligibleRows,keep_url_rows:keepRows,
  locale_rows:locales,unique_identities:groups.size,
  raw_url_overcount_vs_unique_identities:rawRows-groups.size,
  raw_url_overcount_pct:+(((rawRows-groups.size)/rawRows)*100).toFixed(3),
  bilingual_exact_pairs:bilingualExactPairs,slug_pair_conflicts:slugPairConflicts,
  deep_http_200_rows:deep200Rows,deep_field_coverage:deepCoverage,
  url_evidence:urlEvidence,deep_validation:validation,
  validation_conflicts:conflicts.length,live_fetch_plan_rows:fetchPlan.length,
  note:'FR/AR URLs are locale duplicates of the same source listing id. URL evidence is retained with page-evidence conflict checks; district and freshness require detail-source verification.'
};

fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'sarout-freeze-summary.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'sarout-freeze-passports.jsonl'),passports.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(path.join(outDir,'sarout-live-fetch-plan.jsonl'),fetchPlan.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(path.join(outDir,'sarout-validation-conflicts.jsonl'),conflicts.map(x=>JSON.stringify(x)).join('\n')+(conflicts.length?'\n':''));
console.log(JSON.stringify(summary,null,2));

if(
  rawRows!==44130 || groups.size!==22065 || locales.ar!==22065 || locales.fr!==22065 ||
  bilingualExactPairs!==22065 || slugPairConflicts!==0 || deep200Rows!==493 ||
  deepCoverage.city!==460 || deepCoverage.district!==0 || deepCoverage.price_mad!==427 || deepCoverage.surface_m2!==364 ||
  validation.transaction.comparable!==485 || validation.transaction.match!==484 || validation.transaction.mismatch!==1 ||
  validation.surface.comparable!==331 || validation.surface.match!==329 || validation.surface.mismatch!==2 ||
  validation.city.comparable!==396 || validation.city.match!==395 || validation.city.mismatch!==1
) process.exitCode=2;
