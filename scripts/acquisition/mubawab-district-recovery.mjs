import fs from 'node:fs/promises';
import path from 'node:path';

const PATCHES = [
  { id: 334, expectedCity: 'Skhirat', district: 'Plage rose marée', evidence: 'current_card' },
  { id: 340, expectedCity: 'Benslimane', district: 'Golf de Benslimane', evidence: 'current_card' },
  { id: 22, expectedCity: 'Marrakech', district: 'Majorelle', evidence: 'current_card' },
  { id: 327, expectedCity: 'Taroudant', district: 'Assarag', evidence: 'current_card' },
  { id: 826, expectedCity: 'El Jadida', district: 'Derb Ghalef', evidence: 'current_card' },
  { id: 1491, expectedCity: 'Skhirat', district: 'Plage rose marée', evidence: 'current_card' },
  { id: 333, expectedCity: 'Marrakech', district: "Route de l'Ourika", evidence: 'current_card' },
  { id: 308, expectedCity: 'Mohammedia', district: 'Quartier du Parc', evidence: 'current_card' },
  { id: 1746, expectedCity: 'Ifrane', district: 'La prairie', evidence: 'current_card' },
  { id: 841, expectedCity: 'Nador', district: 'Selouane', evidence: 'current_card' },
  { id: 2995, expectedCity: 'El Jadida', district: 'Centre ville', evidence: 'current_card' },
  { id: 3669, expectedCity: 'Mohammedia', district: 'Route de Rabat', evidence: 'current_card' },
  { id: 3771, expectedCity: 'Mohammedia', district: 'Centre Ville', evidence: 'current_card' },
  { id: 4490, expectedCity: 'Salé', district: 'Hay Rahma', evidence: 'current_card' },
  { id: 6871, expectedCity: 'Rabat', district: 'Riyad', evidence: 'current_card' },
  { id: 6351, expectedCity: 'Tanger', district: 'Azib Haj Kaddour', evidence: 'current_card' },
  { id: 328, expectedCity: 'Casablanca', district: 'Californie', evidence: 'single_same_city_shard' },
  { id: 309, expectedCity: 'Salé', district: 'Mkinssia', evidence: 'single_same_city_shard' },
  { id: 6293, expectedCity: 'Rabat', district: 'Hay Al Amal', evidence: 'single_same_city_shard' },
  { id: 3091, expectedCity: 'Meknès', district: 'Marjane', evidence: 'current_card' },
  { id: 3197, expectedCity: 'Khouribga', city: 'Oujda', district: 'Centre-ville', evidence: 'current_card_plus_all_shards' },
];

function headers(key) { return { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }; }
async function readOne(base,key,id){
  const r=await fetch(`${base}/rest/v1/property_listings?select=id,city,district&id=eq.${id}`,{headers:headers(key)});
  if(!r.ok) throw new Error(`read ${id} failed ${r.status}: ${await r.text()}`);
  const rows=await r.json(); if(rows.length!==1) throw new Error(`expected one property row for ${id}, got ${rows.length}`); return rows[0];
}
async function patchOne(base,key,id,payload){
  const r=await fetch(`${base}/rest/v1/property_listings?id=eq.${id}`,{method:'PATCH',headers:{...headers(key),prefer:'return=representation'},body:JSON.stringify(payload)});
  if(!r.ok) throw new Error(`patch ${id} failed ${r.status}: ${await r.text()}`);
  return r.json();
}

async function main(){
  const supabaseUrl=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!supabaseUrl||!key) throw new Error('Supabase credentials are required');
  const base=supabaseUrl.replace(/\/$/,'');
  const applied=[],skipped=[];
  for(const item of PATCHES){
    const before=await readOne(base,key,item.id);
    if(before.city!==item.expectedCity){skipped.push({...item,reason:'city_precondition_failed',before});continue;}
    if(before.district&&String(before.district).trim()){skipped.push({...item,reason:'district_already_present',before});continue;}
    const now=new Date().toISOString();
    const payload={district:item.district,updated_at:now}; if(item.city) payload.city=item.city;
    const rows=await patchOne(base,key,item.id,payload);
    if(rows.length!==1) throw new Error(`patch ${item.id} affected ${rows.length} rows`);
    const after=rows[0];
    if(after.district!==item.district || (item.city&&after.city!==item.city)) throw new Error(`verification failed for ${item.id}`);
    applied.push({...item,before,after});
  }
  const report={success:true,targetCount:PATCHES.length,appliedCount:applied.length,skippedCount:skipped.length,applied,skipped};
  const dir='artifacts/mubawab-district-recovery'; await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));
  await fs.writeFile(path.join(dir,'report.md'),[`# Mubawab district recovery`,'',`- Targets: **${PATCHES.length}**`,`- Applied: **${applied.length}**`,`- Skipped: **${skipped.length}**`,'- Evidence gate: **current card or unique same-city shard only**'].join('\n'));
  console.log(JSON.stringify({...report,applied:undefined,skipped:undefined},null,2));
}
await main();
