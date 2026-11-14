/** Indicative OSM landmarks for any Morocco map viewport; not a business registry. */
export const SCHEMA="AKARFINDER_OSM_INDICATIVE_LANDMARKS_V1";
export const CATEGORIES=Object.freeze(["education","green_sport","groceries","health","shopping","transport"]);
const validPoint=p=>Number.isFinite(p?.latitude)&&Number.isFinite(p?.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180;
export function projectIndicativeLandmarks(snapshot,{bbox,limit=180}={}){
  const errors=[];
  if(snapshot?.source?.dataset!=="Geofabrik Morocco OpenStreetMap PBF" ||
     snapshot?.source?.md5_verified!==true || !/^[a-f0-9]{32}$/i.test(snapshot?.source?.md5??"") ||
     snapshot?.source?.license!=="ODbL-1.0" ||
     !Array.isArray(snapshot?.candidates) || snapshot.candidates_count!==snapshot?.candidates?.length)
     errors.push("invalid_source_integrity");
  if(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite)||
     bbox[0]<-180||bbox[2]>180||bbox[1]<-90||bbox[3]>90||bbox[0]>=bbox[2]||bbox[1]>=bbox[3])
     errors.push("invalid_viewport_bbox");
  if(!Number.isInteger(limit)||limit<1||limit>1000)errors.push("invalid_limit");
  const result={schema:SCHEMA,ok:errors.length===0,errors,
    label:"Repères à proximité",source:"OpenStreetMap via Geofabrik",
    attribution:"© OpenStreetMap contributors",license:"ODbL-1.0",
    licenseUrl:"https://www.openstreetmap.org/copyright",
    officialNeighborhoodMembershipCertified:false,businessOperatingStatusCertified:false,
    entrancePrecisionCertified:false,
    state:"PRIVATE_CANDIDATE_NO_DB_OR_UI_WRITE",features:[],rejections:{}};
  if(errors.length)return result;
  const groups=new Map(CATEGORIES.map(c=>[c,[]])),seen=new Set();
  const reject=c=>result.rejections[c]=(result.rejections[c]??0)+1;
  for(const r of snapshot.candidates){
    if(!/^(node|way|relation)\/[1-9]\d*$/.test(r?.source_id??"")||
       r.source_url!=="https://www.openstreetmap.org/"+r.source_id){reject("identity");continue;}
    if(seen.has(r.source_id)){reject("duplicate");continue;}
    seen.add(r.source_id);
    if(typeof r.name_osm!=="string"||!r.name_osm.trim()||r.name_osm.length>200){reject("name");continue;}
    if(!groups.has(r.category)){reject("category");continue;}
    if(!validPoint(r)){reject("coordinates");continue;}
    if(r.longitude<bbox[0]||r.longitude>bbox[2]||r.latitude<bbox[1]||r.latitude>bbox[3])continue;
    groups.get(r.category).push({type:"Feature",geometry:{type:"Point",coordinates:[r.longitude,r.latitude]},
      properties:{osmId:r.source_id,name:r.name_osm.trim(),category:r.category,sourceUrl:r.source_url,
        positionType:r.location_method==="osm_node"?"osm-node":"indicative-area-point",
        currentlyOpen:null,officialQuarterMembership:null}});
  }
  for(const rows of groups.values())rows.sort((a,b)=>a.properties.osmId.localeCompare(b.properties.osmId,"en"));
  // Category round-robin keeps bus stops and supermarkets from masking all parks or schools.
  let advancing=true;
  while(advancing&&result.features.length<limit){
    advancing=false;
    for(const category of CATEGORIES){
      const feature=groups.get(category).shift();
      if(feature){advancing=true;result.features.push(feature);}
      if(result.features.length>=limit)break;
    }
  }
  return result;
}
