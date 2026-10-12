import { test } from "node:test";
import assert from "node:assert/strict";
import { toV6SourceRecord,reconcileOsmRows,decodePackedN2,assessHistoricalDelta,centerKey } from "../national-v6-osm-lineage.mjs";
function osm(id,name,lng,lat,parent="casablanca") {
  return {id:"osm:node:"+id,name,sourceKinds:["osm_neighborhood_label"],
    normalizedName:name.toLowerCase(),center:{lng,lat},parentCity:parent,parentCityNormalized:parent};
}
test("V6 retains OSM id without inventing a parent relation or neighborhood geometry",()=>{
  const v6=toV6SourceRecord(osm(125,"Maârif",-7.64,33.58));
  assert.equal(v6.sourceIdentity.originalId,"osm:node:125");
  assert.equal(v6.sourceIdentity.osmId,125);
  assert.equal(v6.sourceIdentity.osmTag,null);
  assert.equal(v6.parentProvenance.boundaryRelationId,null);
  assert.equal(v6.parentProvenance.sourceMethod,"unique_containing_candidate_city_polygon_v5");
  assert.equal(v6.review.publicationStatus,"hold_no_publication");
  assert.equal(v6.review.mapEligible,false);
  assert.equal(v6.review.districtListingFilterAllowed,false);
  assert.equal(v6.review.neighborhoodPolygon,null);
});
test("V6 preserves unresolved parent, not a guessed city",()=>{
  const v6=toV6SourceRecord(osm(10,"Unnamed",-7.1,32.5,null));
  assert.equal(v6.parentProvenance.parentName,null);
  assert.equal(v6.parentProvenance.sourceMethod,"no_unique_containing_boundary_v5");
});
test("strict V6 ID validation rejects missing ID and mixed sources",()=>{
  assert.throws(()=>toV6SourceRecord({...osm(10,"One",0,0),id:"osm:node:null"}));
  assert.throws(()=>toV6SourceRecord({...osm(10,"One",0,0),sourceKinds:["osm_neighborhood_label","barid_postal_neighborhood"]}));
  assert.throws(()=>toV6SourceRecord({...osm(10,"One",0,0),parentCityNormalized:null}));
});
test("exact unique tuple reconciles and enumerates actual unmatched IDs only with originals",()=>{
  const original=[osm(10,"Alpha",1,2),osm(11,"Beta",1.5,2.5)];
  const packed=decodePackedN2({casablanca:[["Alpha",1,2,1]]});
  const x=reconcileOsmRows(original,packed);
  assert.deepEqual(x.linked.map(z=>z.sourceId),["osm:node:10"]);
  assert.deepEqual(x.unmatchedV5.map(z=>z.sourceId),["osm:node:11"]);
  assert.equal(x.countEquation.unmatchedV5Rows,1);
});
test("identical point tuples are ambiguous, never auto-matched",()=>{
  const original=[osm(10,"Same",1,2),osm(11,"Same",1,2)];
  const x=reconcileOsmRows(original,decodePackedN2({casablanca:[["Same",1,2,1]]}));
  assert.equal(x.linked.length,0);assert.equal(x.ambiguous.length,1);
  assert.equal(x.countEquation.ambiguousV5Rows,2);
  assert.equal(x.countEquation.ambiguousN2Rows,1);
});
test("parent drift is held without auto-reparenting",()=>{
  const x=reconcileOsmRows([osm(77,"Delta",3,4,"rabat")],
    decodePackedN2({fes:[["Delta",3,4,1]]}));
  assert.equal(x.linked[0].parentMatches,false);
  assert.equal(x.linked[0].decision,"hold_parent_relinked");
  assert.equal(x.uniqueIdentityRecoveredForAllN2,false);
});
test("missing historical artifact yields explicit source-blocker rather than fabricated object list",()=>{
  const x=assessHistoricalDelta(decodePackedN2({casablanca:[["A",1,2,1],["Postal",null,null,2]]}),null);
  assert.equal(x.status,"blocked_missing_historical_v5_neighborhoods_json");
  assert.equal(x.missingOsmObjectIds,null);
  assert.equal(x.exactMissingReason,null);
});
test("postal source identity remains Barid-only",()=>{
  const x=toV6SourceRecord({id:"barid:casablanca:maarif",name:"MAARIF",
    sourceKinds:["barid_postal_neighborhood"],center:null,parentCity:"Casablanca",parentCityNormalized:"casablanca"});
  assert.equal(x.sourceIdentity.osmId,null);
  assert.equal(x.parentProvenance.sourceMethod,"barid_postal_city_label_v5");
});
test("coordinate match key is not an original OSM feature ID",()=>{
  assert.equal(centerKey("Maârif",{lng:-7.64,lat:33.58}),"maarif|-7.6400000|33.5800000");
});

