import test from "node:test";
import assert from "node:assert/strict";
import {domioDetail,probeDomioCardHtml} from "../domio-result-card-probe-v1.mjs";
const page="https://domio.ma/fr/appartement/vendre/casablanca";
test("exact Domio detail id and official host are required",()=>{
 assert.equal(domioDetail("/fr/appartement/vendre/casablanca/12010/appartement",page)?.identity,"domio:12010");
 assert.equal(domioDetail("https://evil.example/fr/appartement/vendre/casablanca/12010/foo",page),null);
 assert.equal(domioDetail("/fr/appartement/vendre/casablanca",page),null);
});
test("two independent anchors produce card price and surface, no fake district",()=>{
 const html='<a href="/fr/appartement/vendre/casablanca/12010/appartement">Appartement Acheter 2 288 000 DH 143.0 m² Casablanca</a><a href="/fr/appartement/vendre/casablanca/12011/autre">Appartement Acheter 980 000 DH 68.0 m² Casablanca, Maarif</a>';
 const r=probeDomioCardHtml(html,page);
 assert.equal(r.unique_identity_count,2);assert.equal(r.price_present,2);assert.equal(r.surface_present,2);
 assert.ok(r.rows.every(x=>x.district===null&&x.freshness_certified===false));
});
test("price and surface ambiguity never become false single values",()=>{
 const html='<a href="/fr/appartement/vendre/casablanca/12010/appartement">900 000 DH 1 000 000 DH 80 m² 90 m²</a>';
 const r=probeDomioCardHtml(html,page);assert.equal(r.rows[0].price_mad,null);assert.equal(r.rows[0].surface_m2,null);
});

test("explicit city and district beside surface within same Domio card",()=>{
 const html='<a href="/fr/appartement/vendre/casablanca/12010/appartement">Appartement Acheter 2 288 000 DH ≈ 211 852 € 16 000 DH/m² Bel appartement Casablanca, Ain Diab 143.0 m²</a>';
 const r=probeDomioCardHtml(html,page);
 assert.equal(r.unique_identity_count,1);
 assert.equal(r.rows[0].city,"Casablanca");
 assert.equal(r.rows[0].district,"Ain Diab");
 assert.equal(r.rows[0].price_mad,2288000);
 assert.equal(r.rows[0].surface_m2,143);
 assert.equal(r.rows[0].five_field_present,true);
});
test("no invented district from city-only text",()=>{
 const html='<a href="/fr/appartement/vendre/casablanca/12010/appartement">Appartement Acheter 950 000 DH Casablanca 80.0 m²</a>';
 const r=probeDomioCardHtml(html,page);
 assert.equal(r.rows[0].district,null);
 assert.equal(r.rows[0].five_field_present,false);
});
test("rejects inconsistent district mentions in one anchor",()=>{
 const html='<a href="/fr/appartement/vendre/casablanca/12010/appartement">Acheter 950 000 DH Casablanca, Racine 80.0 m² Casablanca, Maarif 80.0 m²</a>';
 const r=probeDomioCardHtml(html,page);
 assert.equal(r.rows[0].district,null);
 assert.equal(r.rows[0].district_ambiguous,true);
 assert.equal(r.rows[0].five_field_present,false);
});

test("rejects contaminated district from real Domio title, not falsely 5/5",()=>{
 const html='<a href="/fr/appartement/vendre/casablanca/12351/penthouse">PENTHOUSE D\'EXCEPTION À VENDRE – CASABLANCA, QUARTIER GAUTHIER Casablanca 266.0 m² 8 748 000 DH</a>';
 const r=probeDomioCardHtml(html,page);
 assert.equal(r.rows[0].district,null);
 assert.equal(r.rows[0].five_field_present,false);
});
test("rejects a different municipality as a Casablanca neighborhood",()=>{
 const html='<a href="/fr/appartement/vendre/casablanca/10911/maison">Maison à vendre Casablanca, Bouskoura 50.0 m² 420 000 DH</a>';
 const r=probeDomioCardHtml(html,page);
 assert.equal(r.rows[0].district,null);
});
