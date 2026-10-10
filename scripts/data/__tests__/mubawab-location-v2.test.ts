import test from "node:test";
import assert from "node:assert/strict";
import { mubawabTitleLocation, resolveMubawabLocation, plausibleMubawabDistrict } from "../mubawab-location-v2.js";

test("Mubawab title resolves district before city",()=>{
  const r=mubawabTitleLocation("Appartement à vendre à Racine, Casablanca - 120 m²","Casablanca");
  assert.equal(r.city,"Casablanca"); assert.equal(r.district,"Racine");
});
test("Mubawab resolver accepts structured district",()=>{
  const r=resolveMubawabLocation("<html></html>",{city:"Rabat",district:"Agdal",_confidence:{district:"high"}},"Appartement moderne");
  assert.equal(r.city,"Rabat"); assert.equal(r.district,"Agdal");
});
test("Mubawab resolver uses strict DOM district-city pair",()=>{
  const html='<div class="location">Maârif à Casablanca</div>';
  const r=resolveMubawabLocation(html,{city:"Casablanca",district:null,location_candidates:[],_confidence:{district:"missing"}},"Appartement");
  assert.equal(r.district,"Maârif");
});
test("Mubawab district rejects property/noise labels",()=>{
  assert.equal(plausibleMubawabDistrict("Appartement premium"),false);
  assert.equal(plausibleMubawabDistrict("Hay Riad"),true);
});
