import test from "node:test";
import assert from "node:assert/strict";
import {compareMunicipalToOsm,distinctiveName,normalizedLevenshteinSimilarity}
 from "../../neighborhood-context/maarif-casamaps-name-proximity-qa.mjs";

const url="https://maarif.casablancacity.ma/fr/casa-maps";
function pair(osmName,municipalName,osmPoint={lat:33.58910,lon:-7.64289},
  municipalPoint={lat:33.589194133,lon:-7.642893708}){
  return compareMunicipalToOsm({osmId:"way/521347872",osmName,osmPoint,
    municipalName,municipalPoint,municipalSourceUrl:url});
}
test("French accent and generic business category words cannot substitute identity",()=>{
 assert.equal(distinctiveName("Lycée Wallada"),"wallada");
 assert.equal(distinctiveName("Lycée Oualada"),"walada");
 assert.equal(distinctiveName("Pharmacie du Phare"),"phare");
 assert.equal(distinctiveName("Pharmacie Aristote"),"aristote");
 assert.equal(distinctiveName("Pharmacie"),"");
});
test("Lycée Wallada/Oualada near 11m becomes an inspection candidate, never certified",()=>{
 const r=pair("Lycée Wallada","Lycée Oualada");
 assert.equal(r.outcome,"POTENTIAL_CORRESPONDENCE_REVIEW_REQUIRED");
 assert.ok(r.distanceMeters>8 && r.distanceMeters<15);
 assert.equal(r.lineageIndependentFromOsmVerified,false);
 assert.equal(r.exactEntranceGpsCertified,false);
 assert.equal(r.publicationAllowed,false);
});
test("Pharmacie Al Alia identical names close by give only possible correspondence",()=>{
 const r=pair("Pharmacie Al Alia","Pharmacie Al Alia");
 assert.equal(r.outcome,"POTENTIAL_CORRESPONDENCE_REVIEW_REQUIRED");
 assert.equal(r.currentOperationVerified,false);
 assert.equal(r.centralMaarifTerritoryCertified,false);
});
test("Moulay Idriss school must NOT be matched with Wallada on generic Lycée",()=>{
 const r=pair("Lycée Moulay Idriss 1er","Lycée Oualada");
 assert.equal(r.outcome,"NO_RELIABLE_MATCH");
});
test("Pharmacie du Phare must NOT be matched with Pharmacie Aristote on generic pharmacy",()=>{
 const r=pair("Pharmacie du Phare","Pharmacie Aristote");
 assert.equal(r.outcome,"NO_RELIABLE_MATCH");
});
test("same name with different 500m point is rejected, even if source is municipal",()=>{
 const r=pair("Pharmacie Al Alia","Pharmacie Al Alia",{lat:33.5939,lon:-7.64289});
 assert.equal(r.outcome,"NO_RELIABLE_MATCH");
});
test("invalid municipal source URL or OSM ID cannot qualify",()=>{
 const valid=pair("Lycée Wallada","Lycée Oualada");
 assert.equal(valid.outcome,"POTENTIAL_CORRESPONDENCE_REVIEW_REQUIRED");
 const badUrl=compareMunicipalToOsm({osmId:"way/521347872",osmName:"Lycée Wallada",
   osmPoint:{lat:33.58910,lon:-7.64289},municipalName:"Lycée Oualada",
   municipalPoint:{lat:33.58919,lon:-7.64289},municipalSourceUrl:"https://maarif.casablancacity.ma.evil.test/fr/casa-maps"});
 assert.equal(badUrl.outcome,"NO_RELIABLE_MATCH");
 const badId=compareMunicipalToOsm({osmId:"fake/1",osmName:"Lycée Wallada",
   osmPoint:{lat:33.58910,lon:-7.64289},municipalName:"Lycée Oualada",
   municipalPoint:{lat:33.58919,lon:-7.64289},municipalSourceUrl:url});
 assert.equal(badId.outcome,"NO_RELIABLE_MATCH");
});
test("even exact point coincidence with same name never certifies current operation",()=>{
 const r=pair("Pharmacie Al Alia","Pharmacie Al Alia",{lat:33.58717,lon:-7.64079},{lat:33.58717,lon:-7.64079});
 assert.equal(r.outcome,"POTENTIAL_CORRESPONDENCE_REVIEW_REQUIRED");
 assert.equal(r.distanceMeters,0);
 assert.equal(r.publicationAllowed,false);
 assert.equal(r.currentOperationVerified,false);
});
