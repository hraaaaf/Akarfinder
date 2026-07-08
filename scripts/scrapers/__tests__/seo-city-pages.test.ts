import test from "node:test";
import assert from "node:assert/strict";

import {
  getCityBySlug,
  getAllCities,
  buildSearchQueryForCity,
  buildSearchQueryForIntent,
} from "@/lib/seo-city-pages/city-seo-data";
import { isValidCitySlug } from "@/lib/seo-city-pages/types";
import {
  generateCitySeoMetadata,
  generateIntentSeoMetadata,
  cityPageTitle,
  cityPageDescription,
  intentPageTitle,
  intentPageDescription,
} from "@/lib/seo-city-pages/seo-metadata";
import {
  assertSeoCityPageSafety,
  assertNoSerperInSeoPages,
} from "@/lib/seo-city-pages/public-safety";

test("getAllCities returns 5 cities for V1", () => {
  const cities = getAllCities();
  assert.equal(cities.length, 5);

  const slugs = cities.map((c) => c.slug);
  assert.deepEqual(slugs, [
    "casablanca",
    "rabat",
    "marrakech",
    "tanger",
    "agadir",
  ]);
});

test("getCityBySlug returns city data for valid slug", () => {
  const city = getCityBySlug("casablanca");
  assert.ok(city);
  assert.equal(city.displayName, "Casablanca");
  assert.equal(city.slug, "casablanca");
  assert.ok(city.neighborhoods);
  assert.ok(city.popularSearches.length > 0);
});

test("getCityBySlug returns null for invalid slug", () => {
  const city = getCityBySlug("invalid-city");
  assert.equal(city, null);
});

test("isValidCitySlug validates slugs correctly", () => {
  assert.equal(isValidCitySlug("casablanca"), true);
  assert.equal(isValidCitySlug("rabat"), true);
  assert.equal(isValidCitySlug("invalid"), false);
  assert.equal(isValidCitySlug(123), false);
});

test("buildSearchQueryForCity generates valid URL query", () => {
  const query = buildSearchQueryForCity("Casablanca");
  assert.ok(query.includes("Casablanca"));
  assert.ok(query.includes("appartement"));
  // Should be URL encoded
  assert.ok(!query.includes(" "));
});

test("buildSearchQueryForIntent generates correct intent-based queries", () => {
  const buyQuery = buildSearchQueryForIntent("Casablanca", "acheter");
  // Query is URL encoded, so decode to check content
  assert.ok(decodeURIComponent(buyQuery).includes("acheter"));

  const rentQuery = buildSearchQueryForIntent("Casablanca", "louer");
  // Uses "location" as search term for rental intent
  assert.ok(decodeURIComponent(rentQuery).includes("location"));
});

test("cityPageTitle generates non-promissive title", () => {
  const city = getCityBySlug("casablanca");
  assert.ok(city);

  const title = cityPageTitle(city);
  assert.ok(title.includes("Casablanca"));
  assert.ok(title.includes("Immobilier"));
  assert.ok(title.includes("AkarFinder"));

  // Verify no forbidden wording
  assert.equal(title.toLowerCase().includes("toutes les annonces"), false);
  assert.equal(title.toLowerCase().includes("annonces vérifiées"), false);
  assert.equal(title.toLowerCase().includes("meilleur"), false);
});

test("cityPageDescription is non-promissive", () => {
  const city = getCityBySlug("casablanca");
  assert.ok(city);

  const description = cityPageDescription(city);
  assert.ok(description.includes("AkarFinder"));
  assert.ok(description.includes("source originale"));

  // Check forbidden wording absent
  assert.equal(
    description.toLowerCase().includes("annonces vérifiées"),
    false
  );
  assert.equal(
    description.toLowerCase().includes("annonces fiables"),
    false
  );
  assert.equal(description.toLowerCase().includes("prix officiel"), false);
});

test("generateCitySeoMetadata produces complete metadata", () => {
  const city = getCityBySlug("rabat");
  assert.ok(city);

  const seo = generateCitySeoMetadata(city);

  assert.ok(seo.title);
  assert.ok(seo.description);
  assert.ok(seo.canonical.includes("/immobilier/rabat"));
  assert.equal(seo.canonical, `https://akarfinder.vercel.app/immobilier/${city.slug}`);
  assert.ok(seo.ogTitle);
  assert.ok(seo.ogDescription);
});

test("intentPageTitle includes intent and city", () => {
  const city = getCityBySlug("marrakech");
  assert.ok(city);

  const buyTitle = intentPageTitle(city, "acheter");
  assert.ok(buyTitle.includes("Acheter"));
  assert.ok(buyTitle.includes("Marrakech"));

  const rentTitle = intentPageTitle(city, "louer");
  assert.ok(rentTitle.includes("Louer"));
  assert.ok(rentTitle.includes("Marrakech"));
});

test("assertSeoCityPageSafety throws on forbidden wording", () => {
  const content = "Toutes les annonces vérifiées sur notre site";
  assert.throws(
    () => assertSeoCityPageSafety(content),
    /forbidden wording/i
  );
});

test("assertSeoCityPageSafety passes on safe content", () => {
  const content =
    "AkarFinder aide à explorer des résultats immobiliers publics. Vérifiez sur la source originale.";
  assert.doesNotThrow(() => assertSeoCityPageSafety(content));
});

test("assertSeoCityPageSafety throws on data exposure", () => {
  const content = "Le value_median pour cette annonce est 2M MAD";
  assert.throws(
    () => assertSeoCityPageSafety(content),
    /forbidden concept/i
  );
});

test("assertNoSerperInSeoPages throws on Serper calls", () => {
  const code =
    "const result = await searchGateway({ query: 'apartment' });";
  assert.throws(
    () => assertNoSerperInSeoPages(code),
    /must not call Serper/i
  );
});

test("assertNoSerperInSeoPages passes on clean code", () => {
  const code =
    "return <Link href={`/search?q=${query}`}>Search</Link>";
  assert.doesNotThrow(() => assertNoSerperInSeoPages(code));
});
