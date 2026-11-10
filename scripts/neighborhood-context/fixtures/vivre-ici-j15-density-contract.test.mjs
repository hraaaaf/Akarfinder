import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../../../",import.meta.url);
const load=p=>readFileSync(new URL(p,root),"utf8");
const css=load("app/map/vivre-ici-j15-mobile-density.css");
const page=load("app/map/page.tsx");
const map=load("components/map/MapLibreNeighborhood3D.tsx");

test("J15 mobile density scope is Maârif + loaded OSM + mobile only",()=>{
 assert.match(css,/@media \(max-width: 1023px\)/);
 assert.match(css,/data-l3-maarif-pilot="true"\]\[data-j11c-qa-state="ready"\]/);
 assert.match(css,/\.maplibre-qa-osm-status/);
 assert.match(css,/clip-path: inset\(50%\)/);
 assert.match(css,/width: 1px/);
 assert.match(css,/height: 1px/);
 assert.doesNotMatch(css,/display:\s*none|visibility:\s*hidden/);
 assert.match(page,/import "\.\/vivre-ici-j15-mobile-density\.css"/);
});

test("J15 preserves source/OdbL attribution and aria-live QA status",()=>{
 assert.match(map,/data-j11c-qa-attribution role="status" aria-live="polite"/);
 assert.match(map,/© OpenStreetMap contributors · ODbL/);
 assert.match(css,/l3-maarif-view-controls/);
 assert.match(css,/top: 174px/);
});
