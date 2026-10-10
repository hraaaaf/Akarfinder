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

test("Rabat and Tanger explicit geographic cards",()=>{
 const rb='<a href="/fr/appartement/louer/rabat/13001/riad">Louer 9 300 DH Rabat, Agdal 125.0 m²</a>';
 const ta='<a href="/fr/appartement/vendre/tanger/13002/appart">Acheter 2 600 000 DH Tanger, Centre Ville 168.0 m²</a>';
 const r=probeDomioCardHtml(rb+ta,"https://domio.ma/fr/appartement/louer/rabat");
 assert.equal(r.rows.find(x=>x.identity==="domio:13001")?.district,"Agdal");
 assert.equal(r.rows.find(x=>x.identity==="domio:13002")?.district,"Centre Ville");
 assert.equal(r.five_field_present,2);
});
test("rejects sale-price and apartment-surface outliers",()=>{
 const html='<a href="/fr/appartement/vendre/tanger/12345/appart">Acheter 1 000 011 000 DH Tanger, Malabata 22582690.0 m²</a>';
 const r=probeDomioCardHtml(html,"https://domio.ma/fr/appartement/vendre/tanger/300000");
 assert.equal(r.rows[0].price_mad,null);assert.equal(r.rows[0].surface_m2,null);assert.equal(r.five_field_present,false);
});
test("small rent valid; tiny sale price rejected",()=>{
 const html='<a href="/fr/appartement/louer/rabat/13003/flat">Louer 7 000 DH Rabat, Hay Riad 59.0 m²</a><a href="/fr/appartement/vendre/rabat/13004/flat">Acheter 1 500 DH Rabat, Agdal 150.0 m²</a>';
 const r=probeDomioCardHtml(html,"https://domio.ma/fr/appartement/louer/rabat");
 assert.equal(r.rows[0].price_mad,7000);assert.equal(r.rows[1].price_mad,null);
});
