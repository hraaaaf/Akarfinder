import test from "node:test";
import assert from "node:assert/strict";
import {extractMubawabCorroboratedDistrict as district} from "../mubawab-description-district-v2.js";

const u=(slug:string)=>"https://mubawab.ma/fr/a/8374278/"+slug;
test("recovers Mhamid only when named in both primary description and detail slug",()=>{
 assert.deepEqual(district("Cet appartement, situé dans le quartier Mhamid de Marrakech, offre une superficie de 80 m².",u("bel-appartement-a-vendre-a-mhamid"),"Marrakech"),{value:"Mhamid",evidence:"mubawab_primary_description_quartier_and_slug",confidence:"high"});
});
test("recovers a two-word district with preceding descriptor",()=>{
 assert.equal(district("Situé à Marrakech, dans le quartier prisé de Hay Targa, combine confort et élégance.",u("appartement-a-hay-targa"),"Marrakech")?.value,"Hay Targa");
});
test("recovers diacritics in the same neighborhood name",()=>{
 assert.equal(district("Dans le quartier dynamique et très recherché de Aïn Sebaâ, Casablanca.",u("vente-local-a-ain-sebaa"),"Casablanca")?.value,"Aïn Sebaâ");
});
test("recovers Casablanca Californie in explicit neighborhood",()=>{
 assert.equal(district("Situé dans le quartier prisé de Californie, dans un environnement calme.",u("appartement-meuble-californie"),"Casablanca")?.value,"Californie");
});
test("rejects generic lifestyle adjective despite URL",()=>{
 assert.equal(district("Situé dans un quartier calme et résidentiel, à Casablanca.",u("quartier-calme"),"Casablanca"),null);
});
test("rejects title location invented from slug without a description corroboration",()=>{
 assert.equal(district("Appartement à vendre dans une belle résidence.",u("appartement-a-hay-targa"),"Marrakech"),null);
});
test("rejects description quarter without matching slug",()=>{
 assert.equal(district("Situé dans le quartier Racine, Casablanca.",u("appartement-californie"),"Casablanca"),null);
});
test("rejects a city as the district",()=>{
 assert.equal(district("Situé dans le quartier Casablanca, à Casablanca.",u("quartier-casablanca"),"Casablanca"),null);
});
test("rejects more than one corroborated district",()=>{
 assert.equal(district("Dans le quartier Mhamid et près du quartier Hay Targa, Marrakech.",u("mhamid-hay-targa"),"Marrakech"),null);
});
test("rejects catalog route and missing city",()=>{
 assert.equal(district("quartier Racine", "https://mubawab.ma/fr/is/appartement-racine", "Casablanca"),null);
 assert.equal(district("quartier Racine",u("appartement-racine"),null),null);
});
