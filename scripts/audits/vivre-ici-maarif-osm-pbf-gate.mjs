import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA = "AKARFINDER_MAARIF_OSM_PBF_QA_V1";
export const EXPECTED = Object.freeze(["education","green_sport","groceries","health","shopping","transport"]);
const REFERENCE = [33.5898,-7.644];
function distance(lat,lon){
  const r=Math.PI/180;
  const dlat=(lat-REFERENCE[0])*r, dlon=(lon-REFERENCE[1])*r;
  const a=Math.sin(dlat/2)**2+Math.cos(lat*r)*Math.cos(REFERENCE[0]*r)*Math.sin(dlon/2)**2;
  return 12742000*Math.asin(Math.min(1,Math.sqrt(a)));
}
/** This is a structural QA audit, NEVER an eligibility check for public POI pins. */
export function checkPbfPrivateQa(data){
  const errors=[],warnings=[];
  if(data?.schema!==SCHEMA)errors.push("schema_mismatch");
  if(data?.status!=="QA_CANDIDATES_NOT_PUBLISHABLE")errors.push("status_not_private");
  if(data?.source?.md5_verified!==true || !/^[a-f0-9]{32}$/i.test(data?.source?.md5??""))errors.push("checksum_not_confirmed");
  if(data?.source?.license!=="ODbL-1.0")errors.push("license_missing");
  if(data?.publication_guard?.eligible!==false || data?.publication_guard?.db_write!==false ||
    data?.publication_guard?.no_ui_publication!==true)errors.push("publishing_guard");
  if(data?.publication_guard?.all_individual_operations_unverified!==true ||
    data?.publication_guard?.all_individual_coords_unverified!==true ||
    data?.publication_guard?.boundary_unreviewed!==true)errors.push("false_certification");
  if(data?.geographic_scope?.claim!=="radius_context_only_no_quarter_membership" ||
     data?.geographic_scope?.radius_m!==1800)errors.push("geographic_scope");
  const items=Array.isArray(data?.candidates)?data.candidates:[];
  if(!Array.isArray(data?.candidates))errors.push("missing_candidates");
  if(data?.candidates_count!==items.length)errors.push("candidate_count");
  const seen=new Set(),counts=Object.fromEntries(EXPECTED.map(c=>[c,0]));
  const types={node:0,way:0,relation:0};
  let distanceMismatch=0;
  for(const [i,q] of items.entries()){
    const id=q?.source_id;
    if(typeof id!=="string"||!/^(node|way|relation)\/[1-9]\d*$/.test(id)){
      errors.push("bad_identity:"+i);continue;
    }
    if(seen.has(id))errors.push("duplicate_identity:"+id);
    seen.add(id);
    if(typeof q.name_osm!=="string"||!q.name_osm.trim())errors.push("missing_name:"+id);
    if(!Object.hasOwn(counts,q.category))errors.push("unknown_category:"+id);
    else counts[q.category]++;
    const type=id.split("/")[0];types[type]++;
    if(q.source_url!=="https://www.openstreetmap.org/"+id)errors.push("bad_source_url:"+id);
    if(!Number.isFinite(q.latitude)||!Number.isFinite(q.longitude)||
       q.latitude<-90||q.latitude>90||q.longitude<-180||q.longitude>180){
      errors.push("bad_coordinates:"+id);continue;
    }
    const d=distance(q.latitude,q.longitude);
    if(d>1800.5)errors.push("outside_reference_radius:"+id);
    if(!Number.isFinite(q.distance_from_center_m)||Math.abs(d-q.distance_from_center_m)>2)distanceMismatch++;
    if(q.current_operation_verified!==false||
       q.position_precision_independently_verified!==false||
       q.central_quarter_membership_certified!==false)errors.push("false_poi_certification:"+id);
    if(q.source_license!=="ODbL-1.0")errors.push("bad_poi_license:"+id);
    if(!["osm_node","osm_polygon_representative_point"].includes(q.location_method))errors.push("unknown_position_method:"+id);
  }
  if(distanceMismatch)errors.push("distance_mismatches:"+distanceMismatch);
  for(const name of EXPECTED){
    if(counts[name]!==data?.counts?.[name])errors.push("category_count:"+name);
    if(counts[name]===0)warnings.push("no_candidates:"+name);
  }
  for(const name of Object.keys(types)){
    if(types[name]!==Number(data?.object_types?.[name]??0))errors.push("object_type_count:"+name);
  }
  if(data?.rejections?.area_geometry_error)warnings.push("area_geometry_error_requires_review:"+data.rejections.area_geometry_error);
  if(data?.rejections?.missing_name)warnings.push("unnamed_rejections:"+data.rejections.missing_name);
  warnings.push("snapshot_freshness_not_business_operating_status");
  warnings.push("radius_not_certified_quarter_membership");
  warnings.push("spatial_duplicates_require_manual_review");
  return {ok:errors.length===0,publishable:false,certification:"STRUCTURAL_QA_ONLY",
    errors,warnings,counts,types,sourceVerifiedMd5:!!data?.source?.md5_verified,
    reviewedOperationalStatusCount:0,reviewedIndependentCoordsCount:0,certifiedCentralQuarterCount:0};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  const a=args.indexOf("--input"),b=args.indexOf("--output");
  if(a<0||b<0||!args[a+1]||!args[b+1]){console.error("Usage: node ... --input private.json --output private-summary.json");process.exitCode=2;}
  else try{
    const data=JSON.parse(await readFile(resolve(args[a+1]),"utf8"));
    const result=checkPbfPrivateQa(data);
    const out=resolve(args[b+1]);await mkdir(dirname(out),{recursive:true});
    await writeFile(out,JSON.stringify({...result,head:"QA only - raw POIs omitted; no database write"},null,2)+"\n","utf8");
    console.log(JSON.stringify({...result,output:out}));
    if(!result.ok)process.exitCode=1;
  }catch(e){console.error(String(e));process.exitCode=1;}
}
