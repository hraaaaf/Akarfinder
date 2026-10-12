const normalize=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function fullCard(r,source){
 if(!r||typeof r!=="object")return false;
 if(source==="mubawab"&&r.five_field_observed!==true)return false;
 if(source==="domio"&&r.five_field_present!==true)return false;
 return r.city&&r.district&&Number.isFinite(r.price_mad)&&r.price_mad>0&&Number.isFinite(r.surface_m2)&&r.surface_m2>=5;
}
export function cardSignature(row){
 if(!row?.city||!row?.district||!Number.isFinite(row.price_mad)||!Number.isFinite(row.surface_m2))return null;
 return [normalize(row.city),normalize(row.district),row.price_mad,row.surface_m2].join("|");
}
export function compareCrossPortalCards(mubawab,domio){
 const bySignature=new Map();
 const mubawabCards=mubawab.filter(r=>fullCard(r,"mubawab"));
 const domioCards=domio.filter(r=>fullCard(r,"domio"));
 for(const row of mubawabCards){
  const key=cardSignature(row);
  if(!bySignature.has(key))bySignature.set(key,[]);
  bySignature.get(key).push(row.identity);
 }
 const candidates=[];
 for(const row of domioCards){
  const matches=bySignature.get(cardSignature(row))||[];
  for(const match of matches)candidates.push({mubawab_id:match,domio_id:row.identity,
   match_type:"same_city_district_price_surface",verified_duplicate:false,merge_allowed:false});
 }
 candidates.sort((a,b)=>a.mubawab_id.localeCompare(b.mubawab_id)||a.domio_id.localeCompare(b.domio_id));
 return {schema_version:"AKARFINDER_CROSS_SOURCE_DEDUP_CANDIDATES_V1",
  semantics:"exact_card_signature_match_is_not_physical_property_identity",
  mubawab_complete_cards:mubawabCards.length,domio_complete_cards:domioCards.length,
  candidate_pairs:candidates.length,verified_duplicates:0,
  candidates,database_access:0,database_writes:0,
  note:"Identical geographic area, price and surface are not sufficient to merge listings. Photos/address/agency source provenance require separate independent checks."
 };
}
