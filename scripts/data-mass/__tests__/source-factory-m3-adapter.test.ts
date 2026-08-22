import test from "node:test";
import assert from "node:assert/strict";
import {
  assertM3SourceCanaryReport,
  buildM3PriorityAdapterConfigs,
  buildM3SourceCanaryReport,
  evaluateM3CircuitBreaker,
  isM3SourceSpecificListingUrl,
  validateM3AdapterConfigs,
} from "../source-factory-m3-adapter";
import type { UniversalCandidatePromotionRow } from "../universal-candidate-promotion";

function row(overrides: Partial<UniversalCandidatePromotionRow> = {}): UniversalCandidatePromotionRow {
  return {
    canonicalUrl: "https://marocannonces.com/categorie/315/Appartements/annonce/4274325/appartement-a-vendre.html",
    sourceDomain: "marocannonces.com",
    providers: ["openserp"],
    rawRows: 1,
    firstSeenAt: "2026-08-22T00:00:00.000Z",
    lastSeenAt: "2026-08-22T00:00:00.000Z",
    title: "Appartement à vendre à Rabat",
    snippet: "Appartement 90 m2 à Rabat",
    discoveryQuery: "appartement rabat",
    classification: null,
    promotionStatus: "EXTERNAL_INDEX_CANDIDATE",
    rejectionReason: null,
    ...overrides,
  };
}

test("M3 priority adapters are bounded, native-provider only and side-effect free", () => {
  const configs = buildM3PriorityAdapterConfigs();
  validateM3AdapterConfigs(configs);
  assert.equal(configs.length, 10);
  assert.equal(new Set(configs.map((config) => config.sourceDomain)).size, 10);
  for (const config of configs) {
    assert.equal(config.discoveryMode, "EXISTING_DISCOVERY_RESERVOIR_ONLY");
    assert.equal(config.candidateReadBudget, 40);
    assert.equal(config.validListingCanaryBudget, 10);
    assert.equal(config.sourceNetworkRequestBudget, 0);
    assert.equal(config.directFetchAllowed, false);
    assert.equal(config.publicActivationAllowed, false);
    assert.deepEqual(config.providers, ["openserp", "serper_mass_harvest"]);
  }
});

test("M3 source-specific gates accept evidenced detail structures and reject catalogue surfaces", () => {
  assert.equal(isM3SourceSpecificListingUrl("marocannonces.com", "https://marocannonces.com/categorie/315/Appartements/annonce/4274325/foo.html"), true);
  assert.equal(isM3SourceSpecificListingUrl("marocannonces.com", "https://marocannonces.com/maroc/location-appartements-temara-b321-t605.html"), false);

  assert.equal(isM3SourceSpecificListingUrl("yakeey.com", "https://yakeey.com/fr-ma/acheter-appartement-agadir-cite-charaf-AI146888"), true);
  assert.equal(isM3SourceSpecificListingUrl("yakeey.com", "https://yakeey.com/fr-ma/achat/appartement/rabat/akkari"), false);

  assert.equal(isM3SourceSpecificListingUrl("domio.ma", "https://domio.ma/fr/appartement/louer/agadir/3960/duplex-talborjt-ref-al2275"), true);
  assert.equal(isM3SourceSpecificListingUrl("domio.ma", "https://domio.ma/fr/appartement/louer/marrakech/palmeraie"), false);

  assert.equal(isM3SourceSpecificListingUrl("2p.ma", "https://2p.ma/immobilier-a-vendre/Agadir/toutelaville/Appartements"), false);

  assert.equal(isM3SourceSpecificListingUrl("sakane.ma", "https://sakane.ma/appartements/appartement/casablanca/8410/appartement-a-vendre-californie"), true);
  assert.equal(isM3SourceSpecificListingUrl("sakane.ma", "https://sakane.ma/annonce/mark/spam/8119"), false);
  assert.equal(isM3SourceSpecificListingUrl("sakane.ma", "https://sakane.ma/recherche/categorie,maisons-et-villas"), false);

  assert.equal(isM3SourceSpecificListingUrl("1000-annonces.com", "https://1000-annonces.com/immobilier/vente-immobilier/maroc/appartement-a-vendre-A1427433.html"), true);
  assert.equal(isM3SourceSpecificListingUrl("1000-annonces.com", "https://1000-annonces.com/maroc/rabat/immobilier/vente-immobilier/terrain-CV20d08a26776.html"), false);

  assert.equal(isM3SourceSpecificListingUrl("housing.place", "https://housing.place/fr-ma/catalogue/annonces/MAYR-PP35-AY3T-4L5H"), true);
  assert.equal(isM3SourceSpecificListingUrl("housing.place", "https://housing.place/fr-ma/catalogue/casablanca-settat/casablanca/maarif/appartements"), false);

  assert.equal(isM3SourceSpecificListingUrl("expat.com", "https://expat.com/fr/immobilier/afrique/maroc/43-appartements-a-vendre/807596-appt-titre-larache.html"), true);
  assert.equal(isM3SourceSpecificListingUrl("expat.com", "https://expat.com/fr/immobilier/afrique/maroc/casablanca"), false);

  assert.equal(isM3SourceSpecificListingUrl("milkiya.ma", "https://milkiya.ma/fr_fr/Bien/location-bureau-86-m-a-casablanca"), true);
  assert.equal(isM3SourceSpecificListingUrl("milkiya.ma", "https://milkiya.ma/fr_fr/Quartier/oasis"), false);

  assert.equal(isM3SourceSpecificListingUrl("portail-immobilier.ma", "https://portail-immobilier.ma/fes/appartement/a-vendre"), false);
});

test("M3 report applies source-specific structure after generic M1 promotion", () => {
  const config = buildM3PriorityAdapterConfigs()[0];
  const rows: UniversalCandidatePromotionRow[] = [
    row(),
    row({ canonicalUrl: "https://marocannonces.com/categorie/319/Villas/annonce/6165846/villa-a-vendre.html" }),
    row({ canonicalUrl: "https://marocannonces.com/maroc/location-appartements-temara-b321-t605.html" }),
  ];
  const report = buildM3SourceCanaryReport(config, rows);
  assert.equal(report.candidateCanonicalUrls, 3);
  assert.equal(report.validListings, 2);
  assert.equal(report.rejectedCanonicalUrls, 1);
  assert.equal(report.candidateToValidListingYield, 2 / 3);
  assert.deepEqual(report.rejectedByReason, { SOURCE_STRUCTURE_NOT_LISTING: 1 });
  assert.equal(report.canaryCanonicalUrls.length, 2);
  assert.equal(report.circuitBreaker, "CLOSED");
  assertM3SourceCanaryReport(config, report);
});

test("M3 circuit breaker fails closed when error budget or rate is exceeded", () => {
  const config = buildM3PriorityAdapterConfigs()[0];
  assert.equal(evaluateM3CircuitBreaker(config, 10, 2), "CLOSED");
  assert.equal(evaluateM3CircuitBreaker(config, 10, 3), "OPEN");
  assert.equal(evaluateM3CircuitBreaker(config, 5, 2), "OPEN");
});

test("M3 rejects provider drift instead of relabeling provenance", () => {
  const config = buildM3PriorityAdapterConfigs()[0];
  assert.throws(
    () => buildM3SourceCanaryReport(config, [row({ providers: ["serper_search"] })]),
    /M3_UNSUPPORTED_PROVIDER/,
  );
});

test("M3 rejects an oversized candidate cohort", () => {
  const config = buildM3PriorityAdapterConfigs()[0];
  const rows = Array.from({ length: 41 }, (_, index) => row({ canonicalUrl: `https://marocannonces.com/categorie/315/Appartements/annonce/${1000 + index}/listing.html` }));
  assert.throws(() => buildM3SourceCanaryReport(config, rows), /M3_CANDIDATE_BUDGET_EXCEEDED/);
});
