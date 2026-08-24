import assert from "node:assert/strict";
import test from "node:test";

import { getListingUrlPatterns } from "../../../lib/openserp-ingestion/domain-registry";

function matches(domain: string, url: string): boolean {
  const pathname = new URL(url).pathname;
  return getListingUrlPatterns(domain).some((pattern) => pattern.test(pathname));
}

test("1immo detail pattern accepts verified numeric-id slugs without admitting collection routes", () => {
  assert.equal(matches("1immo.ma", "https://1immo.ma/appartement-a-berrechid-3891"), true);
  assert.equal(matches("1immo.ma", "https://1immo.ma/~location-villa-vide-ain-diab-casablanca-509"), true);
  assert.equal(matches("1immo.ma", "https://1immo.ma/%D9%85%D8%AD%D9%84-%D8%AA%D8%AC%D8%A7%D8%B1%D9%8A-%D9%84%D9%84%D8%A8%D9%8A%D8%B9-12411"), true);
  assert.equal(matches("1immo.ma", "https://1immo.ma/s/casablanca/appartement-a-vendre"), false);
  assert.equal(matches("1immo.ma", "https://1immo.ma/search"), false);
});

test("BARNES pattern covers verified numeric-id FR/EN details and rejects category/search pages", () => {
  assert.equal(matches("barnes-marrakech.com", "https://barnes-marrakech.com/fr/vente/marrakech/3722396"), true);
  assert.equal(matches("barnes-marrakech.com", "https://barnes-marrakech.com/fr/location/marrakech/87101113"), true);
  assert.equal(matches("barnes-marrakech.com", "https://barnes-marrakech.com/en/sale/marrakech/85856040"), true);
  assert.equal(matches("barnes-marrakech.com", "https://barnes-marrakech.com/fr/vente/marrakech.html"), false);
  assert.equal(matches("barnes-marrakech.com", "https://barnes-marrakech.com/en/for-sale/marrakech.html"), false);
  assert.equal(matches("barnes-marrakech.com", "https://barnes-marrakech.com/fr/location/rechercher"), false);
});

test("Marrakech Realty pattern follows verified current detail namespaces only", () => {
  assert.equal(matches("marrakechrealty.com", "https://marrakechrealty.com/vente/appartement-2-chambres-a-vendre-a-victor-hugo"), true);
  assert.equal(matches("marrakechrealty.com", "https://marrakechrealty.com/location/villa-de-luxe-en-location-route-de-fes"), true);
  assert.equal(matches("marrakechrealty.com", "https://marrakechrealty.com/en/sale/3-bedroom-apartment-for-sale-on-the-road-to-casablanca"), true);
  assert.equal(matches("marrakechrealty.com", "https://marrakechrealty.com/en/rentals/1-bedroom-apartment-for-rent-on-route-de-casa"), true);
  assert.equal(matches("marrakechrealty.com", "https://marrakechrealty.com/vente-villa"), false);
  assert.equal(matches("marrakechrealty.com", "https://marrakechrealty.com/location-villa"), false);
});
