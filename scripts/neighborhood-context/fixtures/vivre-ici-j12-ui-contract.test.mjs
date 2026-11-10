import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../../../",import.meta.url);
const load=(path)=>readFileSync(new URL(path,root),"utf8");
const map=load("components/map/MapLibreNeighborhood3D.tsx");
const page=load("app/map/page.tsx");
const touch=load("app/map/vivre-ici-j12-touch-targets.css");
const keyboard=load("app/map/vivre-ici-j12-keyboard-poi.css");
const attribution=load("app/map/l2d-attribution.css");

test("J12 touch overrides scoped to the Vivre Ici map, not other pages",()=>{
  assert.match(page,/import "\.\/vivre-ici-j12-touch-targets\.css"/);
  assert.match(touch,/@media \(max-width: 1023px\)/);
  assert.match(touch,/\[data-vivre-ici-page\] \[data-p4-map-canvas\] \.maplibre-spike-filters button/);
  assert.match(touch,/\.maplibre-spike-controls button/);
  assert.match(touch,/\.vivre-ici-territory-back/);
  assert.equal((touch.match(/44px/g)||[]).length>=6,true);
});

test("J12 OSM provider attribution stays legible within the desktop map",()=>{
  assert.match(attribution,/@media \(min-width: 1024px\)/);
  assert.match(attribution,/\.maplibregl-ctrl-bottom-right \{/);
  assert.match(attribution,/right: 64px/);
  assert.match(attribution,/max-width: min\(320px, calc\(100% - 84px\)\)/);
  assert.match(attribution,/white-space: normal/);
  assert.match(attribution,/overflow-wrap: anywhere/);
});

test("J12 category buttons expose selection to assistive technology",()=>{
  assert.match(map,/className="maplibre-spike-filters" role="group"/);
  assert.match(map,/aria-pressed=\{activeCategory === "all"\}/);
  assert.match(map,/aria-pressed=\{activeCategory === category\}/);
  assert.match(map,/type="button" key=\{category\}/);
});

test("J12 MapLibre keyboard focus is visible and map canvas label is localized",()=>{
  assert.match(map,/map\.getCanvas\(\)\.setAttribute\("aria-label", `Carte interactive de \$\{districtLabel\}, \$\{cityLabel\}`\)/);
  assert.match(map,/canvas:focus-visible\{outline:3px solid #0B63CE!important/);
});

test("J12-B keyboard selection exposes every loaded OSM candidate, QA only",()=>{
  assert.match(page,/import "\.\/vivre-ici-j12-keyboard-poi\.css"/);
  assert.match(map,/QA_OSM_ENABLED && qaState === "ready" && qaShownCount > 0/);
  assert.match(map,/data-j12-qa-poi-select/);
  assert.match(map,/setQaSelectFeatures\(value\.features\)/);
  assert.match(map,/setQaSelectFeatures\(\[\]\)/);
  assert.match(map,/qaSelectFeatures[\s\S]+\.slice\(0, 180\)/);
  assert.match(map,/setQaSelected\(\{ name: p\.name\.slice\(0, 200\), osmId: p\.osmId/);
  assert.match(map,/data-j11c-selected-osm role="group" aria-label="Repère indicatif" aria-live="polite"/);
  assert.match(keyboard,/\.maplibre-qa-osm-keyboard-list:focus-within/);
  assert.match(keyboard,/clip-path: inset\(50%\)/);
  assert.match(keyboard,/min-height: 44px/);
});
