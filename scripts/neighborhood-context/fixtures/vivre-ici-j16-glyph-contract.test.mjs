import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const base=new URL("../../../",import.meta.url);
const map=readFileSync(new URL("components/map/MapLibreNeighborhood3D.tsx",base),"utf8");
const config=readFileSync(new URL("lib/map/carto-basemap-style.ts",base),"utf8");

test("J16 OSM cluster labels select the live glyph stack of their basemap",()=>{
  assert.match(config,/provider: "openfreemap"/);
  assert.match(config,/provider: "carto"/);
  assert.match(map,/"text-font": \[basemap\.provider === "openfreemap" \? "Noto Sans Regular" : "Open Sans Regular"\]/);
  assert.match(map,/QA_OSM_COUNT_ID, type: "symbol"/);
});
