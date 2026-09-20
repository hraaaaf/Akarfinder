import assert from "node:assert/strict";
import test from "node:test";
import { canonicalDistrictDensity, normalizeOsmElement, pointInPolygon } from "../landmark-factory-geo";

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
