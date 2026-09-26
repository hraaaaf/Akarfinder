import test from "node:test";
import assert from "node:assert/strict";
import { deepJsonLdNodes, jsonLdBedrooms, jsonLdPrice, jsonLdSurface } from "../deep-jsonld-extractors";

test("extracts nested JSON-LD offers price, floor size and rooms", () => {
  const ld=[{
    "@type":"RealEstateListing",
    offers:{"@type":"Offer",price:"1 250 000",priceCurrency:"MAD"},
    itemOffered:{
      "@type":"Apartment",
      floorSize:{"@type":"QuantitativeValue",value:"132",unitText:"m²"},
      numberOfBedrooms:3
    }
  }];
  assert.equal(jsonLdPrice(ld),1250000);
  assert.equal(jsonLdSurface(ld),132);
  assert.equal(jsonLdBedrooms(ld),3);
  assert.ok(deepJsonLdNodes(ld).length>=4);
});

test("rejects implausible nested numeric values", () => {
  const ld=[{offers:{price:20},floorSize:{value:2},numberOfBedrooms:99}];
  assert.equal(jsonLdPrice(ld),null);
  assert.equal(jsonLdSurface(ld),null);
  assert.equal(jsonLdBedrooms(ld),null);
});
