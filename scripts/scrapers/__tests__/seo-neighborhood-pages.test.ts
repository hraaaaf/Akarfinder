import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidDistrictSlug,
  getValidDistrictSlugs,
} from "@/lib/seo-neighborhood-pages/types";
import {
  getNeighborhoodBySlug,
  getAllNeighborhoods,
  getNeighborhoodsByCity,
  buildNeighborhoodSearchQuery,
} from "@/lib/seo-neighborhood-pages/neighborhood-seo-data";
import {
  neighborhoodPageTitle,
  neighborhoodPageDescription,
  generateNeighborhoodSeoMetadata,
} from "@/lib/seo-neighborhood-pages/seo-metadata";
import {
  assertNeighborhoodPageSafety,
  assertNoSerperInNeighborhoodPages,
} from "@/lib/seo-neighborhood-pages/public-safety";
import { isValidCitySlug } from "@/lib/seo-city-pages/types";

test("getAllNeighborhoods returns exactly 11 neighborhoods for V1", () => {
  const all = getAllNeighborhoods();
  assert.equal(all.length, 11);
});

test("every neighborhood has a valid city slug", () => {
  const all = getAllNeighborhoods();
  for (const n of all) {
    assert.ok(
      isValidCitySlug(n.citySlug),
      `${n.slug} has invalid citySlug: ${n.citySlug}`,
    );
  }
});

test("isValidDistrictSlug validates correctly", () => {
  assert.equal(isValidDistrictSlug("maarif"), true);
  assert.equal(isValidDistrictSlug("agdal"), true);
  assert.equal(isValidDistrictSlug("founty"), true);
  assert.equal(isValidDistrictSlug("quartier-inconnu"), false);
  assert.equal(isValidDistrictSlug(123), false);
});

test("getValidDistrictSlugs returns 11 slugs", () => {
  assert.equal(getValidDistrictSlugs().length, 11);
});

test("getNeighborhoodBySlug returns data for valid city+district", () => {
  const n = getNeighborhoodBySlug("casablanca", "maarif");
  assert.ok(n);
  assert.equal(n.displayName, "Maârif");
  assert.equal(n.citySlug, "casablanca");
  assert.equal(n.cityDisplayName, "Casablanca");
  assert.ok(n.propertyTypes.length > 0);
});

test("getNeighborhoodBySlug returns null for mismatched city+district", () => {
  const n = getNeighborhoodBySlug("rabat", "maarif");
  assert.equal(n, null);
});

test("getNeighborhoodBySlug returns null for invalid district", () => {
  const n = getNeighborhoodBySlug("casablanca", "quartier-inconnu");
  assert.equal(n, null);
});

test("getNeighborhoodsByCity returns correct neighborhoods per city", () => {
  const casa = getNeighborhoodsByCity("casablanca");
  assert.equal(casa.length, 4);

  const rabat = getNeighborhoodsByCity("rabat");
  assert.equal(rabat.length, 3);

  const marrakech = getNeighborhoodsByCity("marrakech");
  assert.equal(marrakech.length, 2);

  const tanger = getNeighborhoodsByCity("tanger");
  assert.equal(tanger.length, 1);

  const agadir = getNeighborhoodsByCity("agadir");
  assert.equal(agadir.length, 1);
});

test("buildNeighborhoodSearchQuery generates valid URL query", () => {
  const query = buildNeighborhoodSearchQuery("Maârif", "Casablanca");
  const decoded = decodeURIComponent(query);
  assert.ok(decoded.includes("Maârif"));
  assert.ok(decoded.includes("Casablanca"));
  assert.ok(decoded.includes("appartement"));
  assert.ok(!query.includes(" "));
});

test("buildNeighborhoodSearchQuery with type param", () => {
  const query = buildNeighborhoodSearchQuery("Agdal", "Rabat", "villa");
  const decoded = decodeURIComponent(query);
  assert.ok(decoded.includes("villa"));
  assert.ok(decoded.includes("Agdal"));
  assert.ok(decoded.includes("Rabat"));
});

test("neighborhoodPageTitle is non-promissive", () => {
  const n = getNeighborhoodBySlug("casablanca", "maarif");
  assert.ok(n);
  const title = neighborhoodPageTitle(n);
  assert.ok(title.includes("Maârif"));
  assert.ok(title.includes("Casablanca"));
  assert.ok(title.includes("AkarFinder"));
  assert.equal(title.toLowerCase().includes("meilleur"), false);
  assert.equal(title.toLowerCase().includes("toutes les annonces"), false);
});

test("neighborhoodPageDescription is non-promissive", () => {
  const n = getNeighborhoodBySlug("rabat", "souissi");
  assert.ok(n);
  const desc = neighborhoodPageDescription(n);
  assert.ok(desc.includes("Souissi"));
  assert.ok(desc.includes("source originale"));
  assert.equal(desc.toLowerCase().includes("annonces vérifiées"), false);
  assert.equal(desc.toLowerCase().includes("prix officiel"), false);
});

test("generateNeighborhoodSeoMetadata produces complete metadata", () => {
  const n = getNeighborhoodBySlug("marrakech", "gueliz");
  assert.ok(n);
  const seo = generateNeighborhoodSeoMetadata(n);
  assert.ok(seo.title);
  assert.ok(seo.description);
  assert.equal(
    seo.canonical,
    "https://akarfinder.vercel.app/immobilier/marrakech/gueliz",
  );
  assert.ok(seo.ogTitle);
  assert.ok(seo.ogDescription);
  assert.ok(seo.description.length <= 160);
});

test("each neighborhood has unique content", () => {
  const all = getAllNeighborhoods();
  const descriptions = all.map((n) => n.description);
  const uniqueDescriptions = new Set(descriptions);
  assert.equal(uniqueDescriptions.size, all.length);
});

test("assertNeighborhoodPageSafety throws on forbidden wording", () => {
  assert.throws(
    () => assertNeighborhoodPageSafety("Toutes les annonces à Maârif"),
    /forbidden wording/i,
  );
  assert.throws(
    () => assertNeighborhoodPageSafety("C'est un quartier sûr"),
    /forbidden wording/i,
  );
  assert.throws(
    () => assertNeighborhoodPageSafety("Quartier dangereux à éviter"),
    /forbidden wording/i,
  );
  assert.throws(
    () => assertNeighborhoodPageSafety("Investissement garanti ici"),
    /forbidden wording/i,
  );
});

test("assertNeighborhoodPageSafety passes on safe content", () => {
  assert.doesNotThrow(() =>
    assertNeighborhoodPageSafety(
      "AkarFinder aide à explorer des résultats immobiliers publics. Vérifiez sur la source originale.",
    ),
  );
});

test("assertNeighborhoodPageSafety throws on data exposure", () => {
  assert.throws(
    () =>
      assertNeighborhoodPageSafety("Le value_median est 1.5M MAD"),
    /forbidden data key/i,
  );
  assert.throws(
    () =>
      assertNeighborhoodPageSafety("Voir evidence_ref pour les détails"),
    /forbidden data key/i,
  );
});

test("assertNoSerperInNeighborhoodPages throws on Serper calls", () => {
  assert.throws(
    () =>
      assertNoSerperInNeighborhoodPages(
        "const result = await searchGateway({ query: 'apt' });",
      ),
    /must not call/i,
  );
});

test("assertNoSerperInNeighborhoodPages passes on clean code", () => {
  assert.doesNotThrow(() =>
    assertNoSerperInNeighborhoodPages(
      'return <Link href="/search?q=test">Search</Link>',
    ),
  );
});

test("all neighborhoods produce valid search CTAs", () => {
  const all = getAllNeighborhoods();
  for (const n of all) {
    const query = buildNeighborhoodSearchQuery(n.displayName, n.cityDisplayName);
    assert.ok(query.length > 0, `Empty query for ${n.slug}`);
    assert.ok(!query.includes(" "), `Unencoded space in query for ${n.slug}`);
  }
});

test("all neighborhood descriptions pass safety check", () => {
  const all = getAllNeighborhoods();
  for (const n of all) {
    assert.doesNotThrow(
      () => assertNeighborhoodPageSafety(n.description),
      `Description for ${n.slug} contains forbidden content`,
    );
  }
});

test("nearbyDistricts reference valid slugs", () => {
  const all = getAllNeighborhoods();
  const allSlugs = new Set(all.map((n) => n.slug));
  for (const n of all) {
    for (const nearby of n.nearbyDistricts) {
      assert.ok(
        allSlugs.has(nearby),
        `${n.slug} references unknown nearby district: ${nearby}`,
      );
    }
  }
});
