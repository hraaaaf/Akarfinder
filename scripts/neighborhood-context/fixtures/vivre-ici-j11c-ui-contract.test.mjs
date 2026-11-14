import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root=new URL("../../../",import.meta.url);
const map=readFileSync(new URL("components/map/MapLibreNeighborhood3D.tsx",root),"utf8");
const rail=readFileSync(new URL("components/map/P4MapDecisionRail.tsx",root),"utf8");
const route=readFileSync(new URL("app/api/geo/qa-national-landmarks/route.ts",root),"utf8");

test("J11-C2 QA visual is development-only with an explicit opt-in flag",()=>{
  for(const source of [map,rail]){
    assert.match(source,/process\.env\.NODE_ENV === "development"\s*&&\s*process\.env\.NEXT_PUBLIC_VIVRE_ICI_QA_NATIONAL_POI === "true"/);
  }
  assert.match(route,/process\.env\.NODE_ENV !== "development"/);
  assert.match(route,/process\.env\.AKAR_VIVRE_ICI_LOCAL_POI_PREVIEW !== "true"/);
  assert.match(route,/isPrivateQaLoopbackRequest/);
});
test("J11-C2 candidate markers stay viewport-limited with OSM attribution",()=>{
  assert.match(map,/\/api\/geo\/qa-national-landmarks\?/);
  assert.match(map,/limit: "180"/);
  assert.match(map,/value\.businessOperatingStatusCertified !== false/);
  assert.match(map,/value\.officialNeighborhoodMembershipCertified !== false/);
  assert.match(map,/© OpenStreetMap contributors · ODbL/);
  assert.match(map,/Repères à proximité/);
});
test("J11-C2 category filter updates map's actual GeoJSON source",()=>{
  assert.match(map,/qaFeaturesRef\.current\.filter/);
  assert.match(map,/source\.setData\(\{ type: "FeatureCollection", features: visible \}\)/);
  assert.match(map,/setQaShownCount\(visible\.length\)/);
});
test("J11-C2 cluster interaction is not a fake count or an official boundary",()=>{
  assert.match(map,/cluster: true/);
  assert.match(map,/clusterRadius: 46/);
  assert.match(map,/map\.on\("click", QA_OSM_CLUSTER_ID, onClusterClick\)/);
  assert.match(map,/map\.easeTo\(\{ center: event\.lngLat, zoom:/);
  assert.match(map,/data-l3-admin-boundary/);
});
test("J11-C2 sidebar distinguishes enriched evidence from indicative OSM",()=>{
  assert.match(rail,/data-j11c-qa-rail/);
  assert.match(rail,/Carte : repères OSM indicatifs si chargés/);
  assert.match(rail,/La fiche ne dispose pas de repères enrichis/);
  assert.match(rail,/les repères OSM de la carte sont indicatifs/i);
  assert.match(rail,/localContext\?\.anchors/);
});
