import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const base=new URL("../../../",import.meta.url);
const file=(name)=>readFileSync(new URL(name,base),"utf8");
const page=file("app/map/page.tsx");
const rail=file("components/map/P4MapDecisionRail.tsx");
const map=file("components/map/MapLibreNeighborhood3D.tsx");
const css=file("app/map/vivre-ici-j17-a11y.css");
const layout=file("app/layout.tsx");
const selectors=[
 "clinical-final.css","l2c-sheet.css","premium-lot4.css",
 "premium-lot5.css","premium-lot6.css","premium-lot7.css",
 "premium-lot8.css","target-alignment.css","ux-convergence-l9.css"
];

test("J17 map has one semantic main and a visible primary heading, preserving skip link",()=>{
 assert.match(page,/<main className="flex-1" data-p4-map-layout>/);
 assert.match(page,/<P4MapDecisionRail \/>[\s\S]*?<\/main>/);
 assert.match(rail,/<h1>\{title\}<\/h1>/);
 assert.doesNotMatch(rail,/<h2>\{title\}<\/h2>/);
 for(const id of ["vivre-ici-quotidien","vivre-ici-cadre","vivre-ici-biens"]){
   assert.match(rail,new RegExp(`<h2 id="${id}"`));
 }
 assert.match(layout,/href="#main-content"/);
 assert.match(layout,/id="main-content"/);
 assert.doesNotMatch(page,/id="main-content"/);
});
test("J17 aria-controls references only the mounted admin panel and exposes its state",()=>{
 assert.match(map,/aria-controls=\{pilotView === "limites" \? "maarif-admin-boundary-explanation" : undefined\}/);
 assert.match(map,/aria-expanded=\{pilotView === "limites"\}/);
 assert.match(map,/pilotView === "limites" \? \(/);
 assert.match(map,/id="maarif-admin-boundary-explanation"/);
});
test("J17 all prior heading styles cover h1 with equal specificity",()=>{
 let occurrences=0;
 for(const name of selectors){
   const text=file("app/map/"+name);
   assert.doesNotMatch(text,/\.p4-premium-context-header h2\b/);
   const matches=text.match(/\.p4-premium-context-header :is\(h1,h2\)/g)||[];
   assert.ok(matches.length>0,name+" missing h1 selector");
   occurrences+=matches.length;
 }
 assert.equal(occurrences,12);
 // The compact mobile sheet hides the section heading, not the primary CTA.
 assert.ok(file("app/map/l2c-sheet.css").includes("[data-l2b-listings] > :is(h2,h3) {"));
});
function luminosity(hex){
 const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 const v=c.map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4));
 return v[0]*0.2126+v[1]*0.7152+v[2]*0.0722;
}
test("J17 editorial evidence text has >=4.5 contrast, and scoped CSS is imported",()=>{
 assert.match(css,/\[data-vivre-ici-page\].*\.p4-premium-market-copy/);
 assert.match(css,/color: #546579/);
 assert.match(css,/min-height: 48px !important/);
 assert.match(css,/height: 48px !important/);
 assert.match(page,/import "\.\/vivre-ici-j17-a11y\.css"/);
 const ratio=(luminosity("#fbfdfd")+0.05)/(luminosity("#546579")+0.05);
 assert.ok(ratio>=4.5,ratio.toFixed(2));
});
