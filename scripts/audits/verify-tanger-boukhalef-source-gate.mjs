#!/usr/bin/env node
// National V5 source identity evidence gate. Read-only; no city/quarter promotion.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const evidence=JSON.parse(readFileSync(join(root,"data/geo/pilot-tanger-boukhalef-evidence.json"),"utf8"));
const packed=Array.from({length:8},(_,i)=>{
  const s=readFileSync(join(root,"lib/map/national-territory-data/neighborhoods-n2-"+i+".ts"),"utf8");
  const m=s.match(/const chunk = "([A-Za-z0-9+/=]+)";/);
  if(!m)throw new Error("Missing N2 chunk "+i);
  return m[1];
}).join("");
const groups=JSON.parse(brotliDecompressSync(Buffer.from(packed,"base64")).toString("utf8"));
const normalize=(v)=>String(v).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const matches=Object.entries(groups)
 .filter(([parent])=>normalize(parent)===normalize(evidence.sourceRow.parent))
 .flatMap(([,rows])=>rows.filter(([name])=>normalize(name)===normalize(evidence.sourceRow.name)));
assert.equal(matches.length,1,"Boukhalef V5 point must be exactly one row under Tanger");
const [name,lng,lat,flag]=matches[0];
assert.equal(evidence.citySlug,"tanger");
assert.equal(evidence.canonicalName,"Boukhalef");
assert.equal(flag,1);
assert.equal(name,evidence.sourceRow.name);
assert.equal(lng,evidence.sourceRow.longitude);
assert.equal(lat,evidence.sourceRow.latitude);
const identified=evidence.mappedIdentity;
assert.equal(identified.osmType,"node");
assert.equal(identified.osmId,1999241428);
assert.equal(identified.osmTag,"place=suburb");
assert.equal(identified.geonamesId,6546251);
assert.equal(identified.wikidataId,"Q12199841");
assert.equal(identified.directOsmApiVerified,false,"This fixture must distinguish Mapcarta from direct OSM evidence");
assert(Math.abs(lng-identified.longitudeRounded)<=identified.coordinateRoundTripToleranceDegrees);
assert(Math.abs(lat-identified.latitudeRounded)<=identified.coordinateRoundTripToleranceDegrees);
assert(identified.sourceUrl.startsWith("https://mapcarta.com/"));
const alt=evidence.sameNameAlternate;
assert.equal(alt.geonamesId,2572146);
assert.notEqual(alt.geonamesId,identified.geonamesId,"Distinct GeoNames entities must not be silently collapsed");
assert.equal(alt.autoMergeAllowed,false);
assert.equal(alt.autoSplitAllowed,false);
const radians=Math.PI/180;
const dLat=(alt.latitudeRounded-lat)*radians, dLng=(alt.longitudeRounded-lng)*radians;
const h=Math.sin(dLat/2)**2+Math.cos(lat*radians)*Math.cos(alt.latitudeRounded*radians)*Math.sin(dLng/2)**2;
const distanceMeters=6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
assert(Math.abs(distanceMeters-alt.straightLineDistanceMetersApprox)<=5,
  "Distance between distinct GeoNames/OSM label centers has drifted");
assert(distanceMeters>1000 && distanceMeters<2000);
assert.equal(evidence.contextEvidence.length,3);
assert(evidence.contextEvidence.some(x=>x.publisher.includes("Haut Commissariat")));
assert(evidence.contextEvidence.some(x=>x.publisher.includes("Commune de Tanger")));
assert(evidence.qualification.historicalAdminNameCollision);
assert(evidence.qualification.secondGazetteerCenterRequiresReconciliation);
assert.equal(evidence.qualification.currentOfficialQuarterBoundaryVerified,false);
assert.equal(evidence.qualification.officialCurrentQuarterClassificationVerified,false);
assert.equal(evidence.qualification.decision,"hold_noncanonical_source_point");
for(const [prop,expected] of Object.entries({
  publicationStatus:"hold",allowAutoPromote:false,mayDeclareCertifiedNeighborhood:false,
  mayRenderBoundary:false,mayFilterListingsByNeighborhood:false
}))assert.equal(evidence.restrictions[prop],expected,prop);
const registry=readFileSync(join(root,"lib/geo/geo-entity-registry.ts"),"utf8");
assert(!registry.includes('id: "district_tanger_boukhalef"'),"No auto-inclusion in canonical registry");
const report={
  ok:true,candidateId:evidence.candidateId,citySlug:evidence.citySlug,name,
  originalV5OsmFeatureIdStored:false,
  externallyReferencedOsmNodeId:identified.osmId,originalSourceCenter:{lng,lat,flag},
  alternateGeoNamesId:alt.geonamesId,referenceGeoNamesId:identified.geonamesId,
  alternateCenterSeparationMeters:Math.round(distanceMeters),
  sameNameMayRepresentOverlappingPlaces:true,legalQuarterStatus:"unverified",
  boundaryStatus:"not_claimed",publicationStatus:"hold",mapEligibleAdded:false,
  allowedFutureDisplay:"indicative-source-point-only-after-browser-review",
  conditionsNotMet:["official_neighbor_classification","reviewed_quarter_geometry","geoNames_entity_equivalence","browser_ui_canary","public_release"]
};
const output=join(root,"data/audits/national-neighborhood-coverage");
mkdirSync(output,{recursive:true});
writeFileSync(join(output,"tanger-boukhalef-source-gate.json"),JSON.stringify(report,null,2)+"\n","utf8");
console.log(JSON.stringify(report,null,2));
