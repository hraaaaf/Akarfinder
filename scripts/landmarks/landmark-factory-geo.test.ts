import assert from "node:assert/strict";
import test from "node:test";
import { assignCandidatesToBoundary, buildNominatimDistrictSearchUrl, canonicalDistrictDensity, dedupePoiCandidates, normalizeNominatimBoundary, normalizeOsmElement, overpassAreaId, pointInPolygon, rankDistrictsForDiscovery, rankCityDistrictsForDiscovery, shortlistPoiCandidates, buildDistrictDiscoveryResult } from "../landmark-factory-geo";

test("point-in-polygon assigns only actual contained points", () => {
  const square = [[[0,0],[10,0],[10,10],[0,10],[0,0]]] as const;
  assert.equal(pointInPolygon([5,5], square), true);
  assert.equal(pointInPolygon([15,5], square), false);
});

test("normalizes OSM nodes and way centers", () => {
  assert.deepEqual(normalizeOsmElement({ type:"node", id:1, lat:33.5, lon:-7.6, tags:{name:"Repère"} })?.name, "Repère");
  assert.equal(normalizeOsmElement({ type:"way", id:2, center:{lat:33.5,lon:-7.6}, tags:{name:"Stade"} })?.lng, -7.6);
});

test("density includes zero-landmark canonical districts first", () => {
  const density = canonicalDistrictDensity();
  assert.equal(density.length > 0, true);
  assert.equal(density[0].count, 0);
  assert.equal(density.every((x,i) => i === 0 || density[i-1].count <= x.count), true);
});


test("builds Morocco-scoped Nominatim boundary lookup", () => {
  const url = buildNominatimDistrictSearchUrl("Casablanca", "Maârif");
  assert.match(url, /countrycodes=ma/);
  assert.match(url, /polygon_geojson=1/);
  assert.match(url, /Ma%C3%A2rif/);
});

test("normalizes polygon boundary and derives relation area id", () => {
  const boundary = normalizeNominatimBoundary({
    osm_type: "relation", osm_id: 123, display_name: "District, Morocco", importance: 0.5,
    geojson: { type: "Polygon" as const, coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] },
  });
  assert.ok(boundary);
  assert.equal(overpassAreaId(boundary.osmType, boundary.osmId), 3600000123);
});

test("assigns OSM candidates with independent point-in-polygon check", () => {
  const boundary = { type: "Polygon", coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] } as const;
  const candidates = [
    { osmType:"node" as const, osmId:1, name:"Inside", lat:5, lng:5, tags:{} },
    { osmType:"node" as const, osmId:2, name:"Outside", lat:5, lng:15, tags:{} },
  ];
  assert.deepEqual(assignCandidatesToBoundary(candidates, boundary).map(x => x.name), ["Inside"]);
});

test("dedupes same normalized POI only when geographically near", () => {
  const candidates = [
    { osmType:"node" as const, osmId:1, name:"Café Atlas", lat:33.5, lng:-7.6, tags:{} },
    { osmType:"way" as const, osmId:2, name:"Cafe Atlas", lat:33.50005, lng:-7.60005, tags:{} },
    { osmType:"node" as const, osmId:3, name:"Cafe Atlas", lat:33.51, lng:-7.61, tags:{} },
  ];
  assert.equal(dedupePoiCandidates(candidates).length, 2);
});

test("discovery prioritizes least-enriched canonical districts", () => {
  const batch = rankDistrictsForDiscovery(5);
  assert.equal(batch.length, 5);
  assert.equal(batch.every((x,i) => i === 0 || batch[i-1].count <= x.count), true);
});


test("shortlist ranks high-signal POIs and rejects weak noise", () => {
  const candidates = [
    { osmType:"relation" as const, osmId:10, name:"Historic Stadium", lat:33.5, lng:-7.6, tags:{ historic:"yes", leisure:"stadium", wikidata:"Q1", website:"https://example.test" } },
    { osmType:"node" as const, osmId:11, name:"Tiny Shop", lat:33.6, lng:-7.7, tags:{ shop:"convenience" } },
  ];
  const shortlist = shortlistPoiCandidates(candidates, 55);
  assert.deepEqual(shortlist.map(x => x.name), ["Historic Stadium"]);
  assert.equal(shortlist[0].heuristic.total >= 55, true);
});


test("Casablanca batch stays city-scoped and density ordered", () => {
  const batch = rankCityDistrictsForDiscovery("casablanca", 100);
  assert.equal(batch.length > 0, true);
  assert.equal(batch.every((x) => x.city === "casablanca"), true);
  assert.equal(batch.every((x,i) => i === 0 || batch[i-1].count <= x.count), true);
});

test("district discovery normalizes, spatially filters and shortlists in one deterministic pass", () => {
  const district = { districtId:"district_test", city:"casablanca", district:"Test", count:0 };
  const boundary = { type:"Polygon" as const, coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]]] };
  const raw = [
    { type:"relation", id:1, center:{lat:5,lon:5}, tags:{name:"Strong", historic:"yes", leisure:"stadium", wikidata:"Q1", website:"https://example.test"} },
    { type:"node", id:2, lat:5, lon:15, tags:{name:"Outside", historic:"yes", wikidata:"Q2"} },
  ];
  const result = buildDistrictDiscoveryResult(district, boundary, raw, 55);
  assert.deepEqual(result.candidates.map(x => x.name), ["Strong"]);
});


test("all canonical neighborhoods are map eligible for national Landmark Factory coverage", async () => {
  const { GEO_NEIGHBORHOODS } = await import("../../lib/geo/geo-entity-registry");
  assert.ok(GEO_NEIGHBORHOODS.length > 0);
  assert.deepEqual(
    GEO_NEIGHBORHOODS.filter((district) => !district.map_eligible).map((district) => district.id),
    [],
  );
});
