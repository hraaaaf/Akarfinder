#!/usr/bin/env node
// V6 provenance shadow contract. NEVER changes public runtime, geofilters or boundaries.
// Historical V5 artifact is optional; absent artifact => unresolved object-level delta.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
export const HISTORICAL={runId:32634250993, producerSha:"1aa0f033fefc16bb1fd8981c055f37756b3ba714",
 total:11665, osm:1900, postal:9765, osmUniqueBoundaryParent:1734,
 originalOsmWithoutUniqueBoundary:166};
const CORE_STATUS="hold_no_publication";
function textKey(s) {
  return String(s??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"");
}
function idParts(row) {
  if(typeof row.id!=="string") throw new Error("V5 row missing original identity");
  const m=/^osm:(node|way|relation):([1-9]\d*)$/.exec(row.id);
  if(!m || !Number.isSafeInteger(Number(m[2]))) throw new Error("Invalid stable OSM identity "+row.id);
  return {type:m[1], id:Number(m[2]),key:m[1]+":"+m[2]};
}
export function centerKey(name,center) {
  assert.equal(typeof name,"string");
  assert(center&&Number.isFinite(center.lng)&&Number.isFinite(center.lat),"Center missing");
  // Names and coordinates are hints, NOT identifiers. Never auto-resolve collisions.
  return textKey(name)+"|"+center.lng.toFixed(7)+"|"+center.lat.toFixed(7);
}
function add(map,k,v) {const a=map.get(k)||[];a.push(v);map.set(k,a);}
export function decodePackedN2(packedGroups) {
  const rows=[];
  for(const [parent,items] of Object.entries(packedGroups)){
    assert(Array.isArray(items),"Invalid N2 source parent group");
    for(const item of items) {
      assert(Array.isArray(item)&&item.length===4,"Invalid N2 tuple");
      const [name,lng,lat,flags]=item;
      assert.equal(typeof name,"string");
      assert(Number.isInteger(flags)&&flags>=1&&flags<=3,"Unknown N2 source flag");
      rows.push({parentKey:parent,name,lng,lat,flags,
        sourceKinds:[...(flags&1?["osm_neighborhood_label"]:[]),
                     ...(flags&2?["barid_postal_neighborhood"]:[])]});
    }
  }
  return rows;
}
export function toV6SourceRecord(row) {
  assert(row&&typeof row.name==="string"&&row.name.trim(),"V5 candidate needs name");
  const kinds=row.sourceKinds;
  assert(Array.isArray(kinds)&&kinds.length===1,"V5 source identity must be unambiguous");
  const isOsm=kinds[0]==="osm_neighborhood_label";
  assert(isOsm||kinds[0]==="barid_postal_neighborhood","Unknown V5 source kind");
  const original=isOsm?idParts(row):null;
  if(!isOsm) assert(typeof row.id==="string"&&row.id.startsWith("barid:"));
  if(isOsm) assert(row.center&&Number.isFinite(row.center.lng)&&Number.isFinite(row.center.lat));
  const candidateParent=typeof row.parentCity==="string"&&row.parentCity.trim()?row.parentCity:null;
  const parentNormalized=typeof row.parentCityNormalized==="string"&&row.parentCityNormalized.trim()
    ?row.parentCityNormalized:null;
  if(Boolean(candidateParent)!==Boolean(parentNormalized))
    throw new Error("Parent name/key coherence mismatch on "+row.id);
  return {
    schema:"national-territory-v6-provenance-shadow",
    sourceIdentity:{kind:kinds[0],originalId:row.id,
      osmType:original?.type??null,osmId:original?.id??null,
      osmTag:null,osmTagStatus:isOsm?"not_retained_in_v5_neighborhood_json":"not_applicable",
      sourceSnapshot:"Geofabrik Morocco PBF build 2026-08-23, checksum not embedded in V5 neighborhood row",
      producerRun:HISTORICAL.runId,producerSha:HISTORICAL.producerSha,
      licenseId:isOsm?"ODbL-1.0":"not_verified_from_row"},
    label:{name:row.name,normalizedName:row.normalizedName??null,
      center:row.center??null},
    parentProvenance:{parentName:candidateParent,sourceNormalizedParentKey:parentNormalized,
      sourceMethod:isOsm?(candidateParent?"unique_containing_candidate_city_polygon_v5":"no_unique_containing_boundary_v5"):"barid_postal_city_label_v5",
      boundaryRelationId:null,boundaryRelationStatus:isOsm?"not_retained_by_v5_neighborhood_row":"not_applicable",
      officialNeighborhoodBoundaryClaim:false},
    review:{publicationStatus:CORE_STATUS, mapEligible:false,
      neighborhoodPolygon:null, districtListingFilterAllowed:false,
      sourceFeatureIdentityReviewed:false,sourceSemanticsReviewed:false},
  };
}
export function reconcileOsmRows(v5Rows,n2Rows) {
  // Exact tuple comparison identifies safely matchable points only; the V5 row
  // has OSM ID, compact N2 row does not. Duplicate tuples stay ambiguous.
  const osm=v5Rows.filter(r=>r.sourceKinds?.includes("osm_neighborhood_label"));
  const n2=n2Rows.filter(r=>(r.flags&1)!==0);
  const originals=new Map(), compact=new Map();
  for(const row of osm) add(originals,centerKey(row.name,row.center),row);
  for(const row of n2) {
    if(!Number.isFinite(row.lng)||!Number.isFinite(row.lat))throw new Error("OSM center missing");
    add(compact,centerKey(row.name,{lng:row.lng,lat:row.lat}),row);
  }
  const linked=[],unmatchedV5=[],unmatchedN2=[],ambiguous=[];
  const all=new Set([...originals.keys(),...compact.keys()]);
  for(const key of [...all].sort()) {
    const a=originals.get(key)||[],b=compact.get(key)||[];
    if(a.length>1||b.length>1){
      ambiguous.push({tuple:key,originalIds:a.map(x=>x.id),v5Count:a.length,n2Count:b.length,
        decision:"hold_collision_no_auto_match"});
      continue;
    }
    if(a.length&&b.length){
      const row=a[0],target=b[0];
      const parentMatches=textKey(row.parentCityNormalized??"")===textKey(target.parentKey);
      linked.push({sourceId:row.id,v5Parent:row.parentCityNormalized??null,n2Parent:target.parentKey,
        parentMatches,decision:parentMatches?"tuple_matched_parent_consistent":"hold_parent_relinked"});
    } else if(a.length) {
      unmatchedV5.push({sourceId:a[0].id,sourceName:a[0].name,
        originalParent:a[0].parentCityNormalized??null,
        category:a[0].parentCityNormalized?"not_in_n2_parented_v5":"not_in_n2_unparented_v5",
        reason:"unresolved_without_original_packing_decision_log"});
    } else if(b.length) {
      unmatchedN2.push({tuple:key,parent:b[0].parentKey,name:b[0].name,
        reason:"no_matching_original_v5_tuple"});
    }
  }
  const countEquation={
    originalOsmRows:osm.length,n2OsmRows:n2.length,uniqueTupleLinked:linked.length,
    unmatchedV5Rows:unmatchedV5.length,unmatchedN2Rows:unmatchedN2.length,
    ambiguousV5Rows:ambiguous.reduce((n,a)=>n+a.v5Count,0),
    ambiguousN2Rows:ambiguous.reduce((n,a)=>n+a.n2Count,0)
  };
  assert.equal(osm.length,linked.length+countEquation.unmatchedV5Rows+countEquation.ambiguousV5Rows);
  assert.equal(n2.length,linked.length+countEquation.unmatchedN2Rows+countEquation.ambiguousN2Rows);
  return {countEquation,linked,unmatchedV5,unmatchedN2,ambiguous,
    originalIdsEnumerated:osm.every(row=>Boolean(idParts(row))),
    allV5IdsAccountedFor:true,uniqueIdentityRecoveredForAllN2:
      countEquation.unmatchedN2Rows===0&&countEquation.ambiguousN2Rows===0&&
      linked.every(x=>x.parentMatches)};
}
function readPacked(){
  const parts=Array.from({length:8},(_,i)=>{
    const raw=readFileSync(join(ROOT,"lib/map/national-territory-data/neighborhoods-n2-"+i+".ts"),"utf8");
    const match=raw.match(/const chunk = "([A-Za-z0-9+/=]+)";/);
    assert(match,"Missing packed chunk "+i);
    return match[1];
  });
  return decodePackedN2(JSON.parse(brotliDecompressSync(Buffer.from(parts.join(""),"base64")).toString("utf8")));
}
export function assessHistoricalDelta(n2Rows,sourceRows) {
  const counts={packedTotal:n2Rows.length,packedOsm:n2Rows.filter(r=>r.flags&1).length,
    packedPostal:n2Rows.filter(r=>r.flags&2).length};
  const baseline={
    historicalProducer:HISTORICAL,
    compactN2:counts,
    deltaOsmCount:HISTORICAL.osm-counts.packedOsm,
    deltaPostalCount:HISTORICAL.postal-counts.packedPostal,
    deltaAllRows:HISTORICAL.total-counts.packedTotal,
    knownHistoricalWithoutUniqueBoundary:HISTORICAL.originalOsmWithoutUniqueBoundary,
    historicalParentedMinusPackedOsm:HISTORICAL.osmUniqueBoundaryParent-counts.packedOsm,
    originalArtifactAvailable:Array.isArray(sourceRows),
    historicalArtifactExpiredAtGithub:true,
  };
  if(!sourceRows) return {status:"blocked_missing_historical_v5_neighborhoods_json",
    proofLevel:"aggregate_run_log_and_packed_source_only",
    ...baseline,missingOsmObjectIds:null,exactMissingReason:null,
    next:"Recover exact historical neighborhoods.json; do not claim exact 252 objects identified"};
  const v6=sourceRows.map(toV6SourceRecord);
  const result=reconcileOsmRows(sourceRows,n2Rows);
  return {status:"source_identity_reconciliation_completed_requires_review",
    proofLevel:"tuple_matching_unique_only_not_source_feature_id_in_pack",
    ...baseline,reconciliation:result,stableIdentityRecordCount:v6.length,
    identityDistinctCount:new Set(v6.map(r=>r.sourceIdentity.originalId)).size,v6};
}
function main(){
  const output=join(ROOT,"data/audits/national-neighborhood-coverage");
  const sourceDir=process.env.V5_HISTORICAL_ARTIFACT_DIR;
  const location=sourceDir?resolve(sourceDir,"neighborhoods.json"):null;
  const original=location&&existsSync(location)?JSON.parse(readFileSync(location,"utf8")):null;
  if(sourceDir&&!original)throw new Error("Explicit historical source directory lacks neighborhoods.json: "+location);
  const report=assessHistoricalDelta(readPacked(),original);
  assert.equal(report.compactN2.packedTotal,11413);
  assert.equal(report.compactN2.packedOsm,1648);
  assert.equal(report.compactN2.packedPostal,9765);
  assert.equal(report.deltaOsmCount,252);
  assert.equal(report.deltaPostalCount,0);
  assert.equal(report.deltaAllRows,252);
  assert.equal(report.historicalParentedMinusPackedOsm,86);
  if(original){
    assert.equal(report.reconciliation.countEquation.originalOsmRows,HISTORICAL.osm);
    assert.equal(report.stableIdentityRecordCount,HISTORICAL.total);
    assert.equal(report.identityDistinctCount,HISTORICAL.total,"Original IDs collision; fail closed");
  }
  mkdirSync(output,{recursive:true});
  const manifest={...report};delete manifest.v6;
  writeFileSync(join(output,"v6-source-lineage-audit.json"),JSON.stringify(manifest,null,2)+"\n","utf8");
  if(report.v6)writeFileSync(join(output,"v6-shadow-source-records.json"),JSON.stringify(report.v6,null,2)+"\n","utf8");
  console.log(JSON.stringify({status:report.status,proofLevel:report.proofLevel,
    compactN2:report.compactN2,deltaOsmCount:report.deltaOsmCount,
    deltaPostalCount:report.deltaPostalCount,
    historicalParentedMinusPackedOsm:report.historicalParentedMinusPackedOsm,
    originalArtifactAvailable:report.originalArtifactAvailable,
    originalOsmIdsReconstructed:report.v6?report.v6.filter(x=>x.sourceIdentity.osmId!==null).length:0},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();

