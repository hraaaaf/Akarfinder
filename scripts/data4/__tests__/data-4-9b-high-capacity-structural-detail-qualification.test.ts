import assert from "node:assert/strict";
import test from "node:test";
import {
  DATA_4_9B_SOURCES,
  classifyStructuralIdentity,
  getStructuralRule,
  isCritical49bSource,
} from "../high-capacity-structural-detail-qualification";

function classify(domain: typeof DATA_4_9B_SOURCES[number], url: string) {
  return classifyStructuralIdentity(domain, url, [url]);
}

test("cohort contains five stable critical unverified sources plus optional Capital Properties", () => {
  assert.deepEqual(DATA_4_9B_SOURCES, [
    "valfoncier.ma",
    "christiesrealestatemorocco.com",
    "immo-maroc.com",
    "agadirimmobilier.ma",
    "proimmobilier.ma",
    "capital-properties.ma",
  ]);
  assert.equal(DATA_4_9B_SOURCES.filter(isCritical49bSource).length, 5);
  assert.equal(isCritical49bSource("capital-properties.ma"), false);
});

test("Val Foncier accepts only single detail slug under bien-immobilier", () => {
  assert.equal(classify("valfoncier.ma", "https://valfoncier.ma/bien-immobilier/villa-a-vendre-casablanca").classification, "DETAIL_PATTERN_MATCH");
  assert.equal(classify("valfoncier.ma", "https://valfoncier.ma/bien-immobilier/").classification, "REJECT_NAMESPACE_ROOT");
  assert.equal(classify("valfoncier.ma", "https://valfoncier.ma/ville-du-bien/casablanca").classification, "REJECT_TAXONOMY_OR_ARCHIVE");
  assert.equal(classify("valfoncier.ma", "https://valfoncier.ma/bureau-a-louer-casablanca/page/12").classification, "REJECT_TAXONOMY_OR_ARCHIVE");
});

test("Christie's requires locale + annonces + ref token + detail slug", () => {
  assert.equal(classify("christiesrealestatemorocco.com", "https://www.christiesrealestatemorocco.com/en/annonces/ref-km6-056/buy-buildable-land-casablanca-20000/").classification, "DETAIL_PATTERN_MATCH");
  assert.equal(classify("christiesrealestatemorocco.com", "https://www.christiesrealestatemorocco.com/fr/annonces/").classification, "REJECT_NAMESPACE_ROOT");
  assert.equal(classify("christiesrealestatemorocco.com", "https://www.christiesrealestatemorocco.com/en/sales/").classification, "REJECT_TAXONOMY_OR_ARCHIVE");
  assert.equal(classify("christiesrealestatemorocco.com", "https://www.christiesrealestatemorocco.com/en/annonces/something/no-ref/").classification, "REJECT_NO_DETAIL_PATTERN");
});

test("Immo Maroc requires a flat transactional slug ending in a property reference token", () => {
  assert.equal(classify("immo-maroc.com", "https://immo-maroc.com/vente-terrain-marrakech-autres-secteurs-medina-t84672299").classification, "DETAIL_PATTERN_MATCH");
  assert.equal(classify("immo-maroc.com", "https://immo-maroc.com/vente/appartement/marrakech/agdal/par-date-desc").classification, "REJECT_TAXONOMY_OR_ARCHIVE");
  assert.equal(classify("immo-maroc.com", "https://immo-maroc.com/achat-villa-marrakech2.html").classification, "REJECT_TAXONOMY_OR_ARCHIVE");
  assert.equal(classify("immo-maroc.com", "https://immo-maroc.com/vente-villa-marrakech").classification, "REJECT_NO_DETAIL_PATTERN");
});

test("AgadirImmobilier accepts one slug below immobilier but rejects namespace/archive paths", () => {
  assert.equal(classify("agadirimmobilier.ma", "https://agadirimmobilier.ma/immobilier/villa-haut-standing-a-cite-suisse/").classification, "DETAIL_PATTERN_MATCH");
  assert.equal(classify("agadirimmobilier.ma", "https://agadirimmobilier.ma/immobilier/").classification, "REJECT_NAMESPACE_ROOT");
  assert.equal(classify("agadirimmobilier.ma", "https://agadirimmobilier.ma/biens/appartements/").classification, "REJECT_TAXONOMY_OR_ARCHIVE");
  assert.equal(classify("agadirimmobilier.ma", "https://agadirimmobilier.ma/le-blog-immobilier-a-agadir-maroc/page/2/").classification, "REJECT_TAXONOMY_OR_ARCHIVE");
});

test("ProImmobilier accepts property detail but rejects property taxonomies and namespace roots", () => {
  assert.equal(classify("proimmobilier.ma", "https://proimmobilier.ma/property/26-04-03-vm-charming-estate-with-220-olive-trees-in-had-draa/").classification, "DETAIL_PATTERN_MATCH");
  assert.equal(classify("proimmobilier.ma", "https://proimmobilier.ma/fr/property/my-home/").classification, "DETAIL_PATTERN_MATCH");
  assert.equal(classify("proimmobilier.ma", "https://proimmobilier.ma/property/").classification, "REJECT_NAMESPACE_ROOT");
  assert.equal(classify("proimmobilier.ma", "https://proimmobilier.ma/property-type/terrain-a-vendre-a-essaouira/").classification, "REJECT_TAXONOMY_OR_ARCHIVE");
  assert.equal(classify("proimmobilier.ma", "https://proimmobilier.ma/ht/property-city/essaouira/").classification, "REJECT_TAXONOMY_OR_ARCHIVE");
});

test("Capital Properties uses a deep offres shape and rejects neighborhood archives", () => {
  assert.equal(classify("capital-properties.ma", "https://www.capital-properties.ma/offres/marrakech/gueliz/appartement/programme-neuf/studios-neufs-gueliz-marrakech/").classification, "DETAIL_PATTERN_MATCH");
  assert.equal(classify("capital-properties.ma", "https://www.capital-properties.ma/offres/").classification, "REJECT_NAMESPACE_ROOT");
  assert.equal(classify("capital-properties.ma", "https://www.capital-properties.ma/offres/marrakech/victor-hugo/").classification, "REJECT_TAXONOMY_OR_ARCHIVE");
});

test("identity collisions are always rejected before structural matching", () => {
  const result = classifyStructuralIdentity(
    "valfoncier.ma",
    "https://valfoncier.ma/bien-immobilier/x",
    ["https://valfoncier.ma/bien-immobilier/x", "https://www.valfoncier.ma/bien-immobilier/x/"],
  );
  assert.equal(result.classification, "REJECT_IDENTITY_COLLISION");
  assert.equal(result.canonicalUrls.length, 2);
});

test("all rules are explicit and case-insensitive at match time", () => {
  for (const domain of DATA_4_9B_SOURCES) {
    const rule = getStructuralRule(domain);
    assert.ok(rule.detailPatterns.length > 0);
    assert.equal(rule.sourceDomain, domain);
  }
  assert.equal(classify("christiesrealestatemorocco.com", "https://christiesrealestatemorocco.com/EN/ANNONCES/REF-KM6-181/buy-land/").classification, "DETAIL_PATTERN_MATCH");
});
