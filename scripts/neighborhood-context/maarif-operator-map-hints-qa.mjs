import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * An operator's Google Maps /maps/search URL with /@lat,lon,zoom is a
 * CAMERA CENTER, not a verified shop entrance or independent GPS point.
 * Comparison with OSM is a data-quality hint only; NEVER a release decision.
 */
export const OPERATOR_MAP_QA_SCHEMA="AKARFINDER_MAARIF_OPERATOR_MAP_HINTS_V1";
export const OPERATOR_MAP_RESULT_SCHEMA="AKARFINDER_MAARIF_OPERATOR_MAP_QA_REPORT_V1";

export function googleSearchCameraCenter(url) {
  if(typeof url!=="string" || url.length>2048)return null;
  let parsed;
  try {parsed=new URL(url);} catch{return null;}
  const host=parsed.hostname.toLowerCase().replace(/^www\./,"");
  if(parsed.protocol!=="https:" || !["google.com","google.fr","google.ma"].includes(host))return null;
  const pathname=decodeURIComponent(parsed.pathname);
  if(!pathname.startsWith("/maps/search/"))return null;
  const matched=/\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z(?:\/|$)/u.exec(pathname);
  if(!matched)return null;
  const [lat,lon,zoom]=matched.slice(1).map(Number);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180||zoom<1||zoom>24)return null;
  return {latitude:lat,longitude:lon,zoom,coordinate_semantics:"camera_center_NOT_business_pin"};
}

export function metersBetween(a,b){
  const toRadians=Math.PI/180;
  const lat1=a.latitude*toRadians,lat2=b.latitude*toRadians;
  const dlat=(b.latitude-a.latitude)*toRadians,dlon=(b.longitude-a.longitude)*toRadians;
  const h=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
  return 12742017.6*Math.asin(Math.min(1,Math.sqrt(h)));
}

export function evaluateOperatorMapHints(input,now=new Date()){
  const result={
    schema:OPERATOR_MAP_RESULT_SCHEMA,
    status:"PRIVATE_QA_NO_INDEPENDENT_GPS_CERTIFICATION",
    structurally_valid:false,
    candidates_checked:0,
    map_camera_centers_detected:0,
    spatial_discrepancies_over_100_m:0,
    observations:[],
    hard_errors:[],
    independent_gps_certified:0,
    current_activity_certified:0,
    current_central_maârif_membership_certified:0,
    publication_eligible:0,
    publication_allowed:false,
    no_database_write:true,
  };
  if(!input || input.schema!==OPERATOR_MAP_QA_SCHEMA ||
     input.status!=="PRIVATE_QA_UNVERIFIED" ||
     !Array.isArray(input.candidates) || !input.candidates.length){
    result.hard_errors.push("invalid_qa_ledger_schema");
    return result;
  }
  const ids=new Set();
  for(const c of input.candidates){
    if(!c || !/^(node|way|relation)\/[1-9]\d*$/u.test(c.osm_id||"") || ids.has(c.osm_id) ||
       !Number.isFinite(c.osm_lat)||!Number.isFinite(c.osm_lon) ||
       Math.abs(c.osm_lat)>90||Math.abs(c.osm_lon)>180 ||
       typeof c.operator_page_url!=="string"||!c.operator_page_url.startsWith("https://") ||
       typeof c.operator_map_url!=="string" || typeof c.source_checked_at!=="string" ||
       !Number.isFinite(Date.parse(c.source_checked_at)) ||
       Date.parse(c.source_checked_at)>now.getTime() ||
       c.independent_gps_verified===true || c.current_activity_verified===true) {
      result.hard_errors.push("invalid_candidate_or_unjustified_approval");
      return result;
    }
    ids.add(c.osm_id);
  }
  result.structurally_valid=true;
  result.candidates_checked=input.candidates.length;
  for(const c of input.candidates){
    const center=googleSearchCameraCenter(c.operator_map_url);
    if(center)result.map_camera_centers_detected++;
    const distance=center?Math.round(metersBetween(
      {latitude:c.osm_lat,longitude:c.osm_lon},center)*10)/10:null;
    const needsReview=distance!=null && distance>100;
    if(needsReview)result.spatial_discrepancies_over_100_m++;
    result.observations.push({
      osm_id:c.osm_id,
      operator_page_url:c.operator_page_url,
      map_url:c.operator_map_url,
      extracted_map_center:center,
      distance_camera_center_to_osm_m:distance,
      assessment:!center?"UNRECOGNIZED_MAP_LINK_MANUAL_REVIEW":
        needsReview?"VIEWPORT_VS_OSM_POSITION_DIFFERENCE_REQUIRES_REVIEW":
        "VIEWPORT_NEARBY_STILL_NOT_A_GPS_PIN",
      coordinate_independently_certified:false,
      actual_entrance_location_established:false,
      current_operation_verified:false,
      publication_allowed:false,
    });
  }
  return result;
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  const get=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null;};
  const input=get("--input"),output=get("--output");
  if(!input||!output){console.error("Usage: node maarif-operator-map-hints-qa.mjs --input PRIVATE.json --output PRIVATE.json");process.exitCode=2;}
  else try{
    const data=JSON.parse(await readFile(resolve(input),"utf8"));
    const report=evaluateOperatorMapHints(data);
    await mkdir(dirname(resolve(output)),{recursive:true});
    await writeFile(resolve(output),JSON.stringify(report,null,2)+"\n","utf8");
    console.log(JSON.stringify({structurally_valid:report.structurally_valid,
      candidates:report.candidates_checked,viewport_centers:report.map_camera_centers_detected,
      large_discrepancies:report.spatial_discrepancies_over_100_m,
      independently_certified:report.independent_gps_certified,
      publication_eligible:report.publication_eligible}));
    if(report.hard_errors.length)process.exitCode=1;
  }catch(e){console.error(String(e));process.exitCode=1;}
}
