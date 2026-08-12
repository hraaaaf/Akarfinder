import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyDomainRole,
  classifyReservoirCandidate,
  rankDomainReservoirs,
  summarizeDomainReservoir,
  type RegistryPolicySnapshot,
  type ReservoirCandidate,
} from "../reservoir-qualification";

function candidate(overrides: Partial<ReservoirCandidate> = {}): ReservoirCandidate {
  return {
    sourceDomain: "marocannonces.com",
    url: "https://marocannonces.com/annonce/appartement-rabat-123456",
    title: "Appartement à vendre Rabat 120 m2",
    snippet: "Appartement immobilier à vendre, 3 chambres, 1 800 000 MAD",
    discoveryQuery: "appartement vente rabat",
    contentFingerprint: "fp-1",
    ...overrides,
  };
}

function policy(overrides: Partial<RegistryPolicySnapshot> = {}): RegistryPolicySnapshot {
  return {
    sourceDomain: "example.ma",
    authorizationStatus: "unverified",
    displayPolicy: "internal_signal_only",
    displayGate: "hidden",
    acquisitionMode: "public_index_internal_only",
    ingestionGate: "internal_signal_only",
    ...overrides,
  };
}

test("classifies a strong Morocco property detail URL conservatively", () => {
  const result = classifyReservoirCandidate(candidate());
  assert.equal(result.likelyRealEstate, true);
  assert.equal(result.pageKind, "LIKELY_LISTING_DETAIL");
  assert.equal(result.domainRole, "DIRECT_PORTAL");
  assert.equal(result.geographyScope, "MOROCCO_LIKELY");
  assert.deepEqual(result.detectedCities, ["Rabat"]);
  assert.equal(result.transactionSignal, "SALE");
});

test("detects Morocco city and rent signals without granting eligibility", () => {
  const result = classifyReservoirCandidate(candidate({
    sourceDomain: "example.com",
    url: "https://example.com/property/987654",
    title: "Villa à louer à Marrakech",
    snippet: "Maison 300 m2 for rent in Marrakech Morocco",
    discoveryQuery: null,
  }));
  assert.equal(result.geographyScope, "MOROCCO_LIKELY");
  assert.deepEqual(result.detectedCities, ["Marrakech"]);
  assert.equal(result.transactionSignal, "RENT");
});

test("Morocco neighborhood signal does not masquerade as a city", () => {
  const result = classifyReservoirCandidate(candidate({
    sourceDomain: "agency.example",
    url: "https://agency.example/property/987654",
    title: "Appartement à louer Agdal",
    snippet: "Appartement immobilier 90 m2 à louer Agdal",
    discoveryQuery: null,
  }));
  assert.equal(result.geographyScope, "MOROCCO_LIKELY");
  assert.deepEqual(result.detectedCities, []);
});

test("explicit foreign geography overrides a weak dot-ma domain prior", () => {
  const result = classifyReservoirCandidate(candidate({
    sourceDomain: "example.ma",
    url: "https://example.ma/property/987654",
    title: "Appartement à vendre Paris France",
    snippet: "Property 80 m2 Paris France for sale",
    discoveryQuery: null,
  }));
  assert.equal(result.geographyScope, "FOREIGN_LIKELY");
});

test("does not promote discovery transport into source inventory", () => {
  const row = candidate({
    sourceDomain: "duckduckgo.com",
    url: "https://duckduckgo.com/?q=appartement+rabat+vente",
    title: "Appartement Rabat à vendre",
    contentFingerprint: null,
  });
  const summary = summarizeDomainReservoir("duckduckgo.com", Array.from({ length: 100 }, () => row), null);
  assert.equal(classifyDomainRole("duckduckgo.com"), "DISCOVERY_TRANSPORT");
  assert.equal(summary.massQueue, "HOLD");
  assert.equal(summary.massPotentialScore, 0);
});

test("generic retail directories are discovery transport, not property sources", () => {
  for (const sourceDomain of ["tiendeo.ma", "telecontact.ma"]) {
    const rows = Array.from({ length: 100 }, (_, i) => candidate({
      sourceDomain,
      url: `https://${sourceDomain}/directory/${10000 + i}`,
      title: sourceDomain === "tiendeo.ma" ? "Marjane Market Agadir catalogue magasin" : "Agences immobilières à Fès annuaire professionnels",
      snippet: sourceDomain === "tiendeo.ma" ? "Horaires téléphone produits et économies en magasin" : "Coordonnées des professionnels et pages jaunes du Maroc",
      discoveryQuery: "immobilier maroc",
      contentFingerprint: `directory-${sourceDomain}-${i}`,
    }));
    const summary = summarizeDomainReservoir(sourceDomain, rows, null);
    assert.equal(summary.domainRole, "DISCOVERY_TRANSPORT", sourceDomain);
    assert.equal(summary.massQueue, "HOLD", sourceDomain);
    assert.equal(summary.massPotentialScore, 0, sourceDomain);
  }
});

test("holiday-rental pages are down-weighted outside property inventory", () => {
  const result = classifyReservoirCandidate(candidate({
    sourceDomain: "airbnb.fr",
    url: "https://airbnb.fr/marrakesh-morocco/stays/apartments",
    title: "Marrakech locations d'appartements de vacances Airbnb",
    snippet: "Locations de vacances à partir de 35 euros par nuit à Marrakech Maroc",
    discoveryQuery: null,
  }));
  assert.equal(result.geographyScope, "MOROCCO_LIKELY");
  assert.equal(result.likelyRealEstate, false);
  assert.equal(result.pageKind, "NON_REAL_ESTATE");
});

test("does not promote social platforms into Source Factory", () => {
  const row = candidate({
    sourceDomain: "tiktok.com",
    url: "https://tiktok.com/@agency/video/123456789",
    title: "Villa à vendre Marrakech",
    snippet: "Immobilier villa 400 m2 à vendre Marrakech Maroc",
  });
  const summary = summarizeDomainReservoir("tiktok.com", Array.from({ length: 100 }, (_, i) => ({ ...row, contentFingerprint: `social-${i}` })), null);
  assert.equal(summary.domainRole, "SOCIAL");
  assert.equal(summary.massQueue, "HOLD");
});

test("unregistered high-volume Morocco real-estate domain goes to Source Factory, never public", () => {
  const rows = Array.from({ length: 80 }, (_, i) => candidate({
    sourceDomain: "marocannonces.com",
    url: `https://marocannonces.com/annonce/appartement-rabat-${100000 + i}`,
    contentFingerprint: `fp-${i}`,
  }));
  const summary = summarizeDomainReservoir("marocannonces.com", rows, null);
  assert.equal(summary.massQueue, "SOURCE_FACTORY");
  assert.equal(summary.publicActivableNow, false);
  assert.equal(summary.registryStatus, "UNREGISTERED");
  assert.equal(summary.likelyMoroccoRealEstateUrls, 80);
});

test("Algerian real-estate reservoir is not mistaken for Morocco mass", () => {
  const rows = Array.from({ length: 80 }, (_, i) => candidate({
    sourceDomain: "lkeria.com",
    url: `https://lkeria.com/ar/بيع-شقة-بجاية-${100000 + i}.html`,
    title: "بيع شقة بجاية عقار الجزائر",
    snippet: "Appartement à vendre à Béjaïa Algérie 90 m2",
    discoveryQuery: `nqu2-${i}`,
    contentFingerprint: `dz-${i}`,
  }));
  const summary = summarizeDomainReservoir("lkeria.com", rows, null);
  assert.equal(summary.domainRole, "UNKNOWN");
  assert.equal(summary.foreignLikelyUrls, 80);
  assert.equal(summary.likelyMoroccoRealEstateUrls, 0);
  assert.equal(summary.massQueue, "HOLD");
});

test("foreign portal can still qualify when it carries material Morocco inventory", () => {
  const moroccoRows = Array.from({ length: 30 }, (_, i) => candidate({
    sourceDomain: "foreign-portal.example",
    url: `https://foreign-portal.example/property/marrakech-${100000 + i}`,
    title: "Villa for sale Marrakech Morocco",
    snippet: "Property 300 m2 Marrakech",
    discoveryQuery: null,
    contentFingerprint: `ma-${i}`,
  }));
  const foreignRows = Array.from({ length: 70 }, (_, i) => candidate({
    sourceDomain: "foreign-portal.example",
    url: `https://foreign-portal.example/property/paris-${200000 + i}`,
    title: "Appartement for sale Paris France",
    snippet: "Property 80 m2 Paris France",
    discoveryQuery: null,
    contentFingerprint: `fr-${i}`,
  }));
  const summary = summarizeDomainReservoir("foreign-portal.example", [...moroccoRows, ...foreignRows], null);
  assert.equal(summary.likelyMoroccoRealEstateUrls, 30);
  assert.equal(summary.foreignLikelyUrls, 70);
  assert.equal(summary.massQueue, "SOURCE_FACTORY");
  assert.equal(summary.publicActivableNow, false);
});

test("registered hidden source remains measure-only even with huge Morocco volume", () => {
  const rows = Array.from({ length: 600 }, (_, i) => candidate({
    sourceDomain: "mubawab.ma",
    url: `https://mubawab.ma/fr/a/${100000 + i}/appartement-a-vendre-rabat`,
    contentFingerprint: `m-${i}`,
  }));
  const summary = summarizeDomainReservoir("mubawab.ma", rows, policy({
    sourceDomain: "mubawab.ma",
    authorizationStatus: "prohibited",
  }));
  assert.equal(summary.massQueue, "MEASURE_ONLY");
  assert.equal(summary.publicActivableNow, false);
});

test("restrictive authorization always wins over stale canonical-link fields", () => {
  const rows = Array.from({ length: 50 }, (_, i) => candidate({
    sourceDomain: "blocked-example.ma",
    url: `https://blocked-example.ma/annonce/appartement-rabat-${10000 + i}`,
    contentFingerprint: `blocked-${i}`,
  }));

  for (const authorizationStatus of ["prohibited", "permission_required", "unverified", "expired", " PERMISSION_REQUIRED "]) {
    const summary = summarizeDomainReservoir("blocked-example.ma", rows, policy({
      sourceDomain: "blocked-example.ma",
      authorizationStatus,
      displayPolicy: "canonical_link_only",
      displayGate: "external_tail_link_only",
      acquisitionMode: "public_sitemap_canonical_link",
      ingestionGate: "canonical_link_only",
    }));
    assert.equal(summary.massQueue, "MEASURE_ONLY", authorizationStatus);
    assert.equal(summary.publicActivableNow, false);
  }
});

test("hidden/internal gates remain fail-closed despite an otherwise compatible authorization", () => {
  const rows = Array.from({ length: 50 }, (_, i) => candidate({
    sourceDomain: "hidden-example.ma",
    url: `https://hidden-example.ma/annonce/appartement-rabat-${10000 + i}`,
    contentFingerprint: `hidden-${i}`,
  }));

  for (const restrictivePolicy of [
    { displayPolicy: "internal_signal_only", displayGate: "external_tail_link_only", ingestionGate: "canonical_link_only" },
    { displayPolicy: "canonical_link_only", displayGate: "hidden", ingestionGate: "canonical_link_only" },
    { displayPolicy: "canonical_link_only", displayGate: "external_tail_link_only", ingestionGate: "internal_signal_only" },
  ]) {
    const summary = summarizeDomainReservoir("hidden-example.ma", rows, policy({
      sourceDomain: "hidden-example.ma",
      authorizationStatus: "policy_compatible",
      ...restrictivePolicy,
    }));
    assert.equal(summary.massQueue, "MEASURE_ONLY");
  }
});

test("existing canonical-link tail is only prioritized after a compatible policy snapshot", () => {
  const rows = Array.from({ length: 50 }, (_, i) => candidate({
    sourceDomain: "promoimmomarrakech.com",
    url: `https://promoimmomarrakech.com/bien/appartement-marrakech-${10000 + i}`,
    contentFingerprint: `p-${i}`,
  }));
  const summary = summarizeDomainReservoir("promoimmomarrakech.com", rows, policy({
    sourceDomain: "promoimmomarrakech.com",
    authorizationStatus: "policy_compatible",
    displayPolicy: "canonical_link_only",
    displayGate: "external_tail_link_only",
    acquisitionMode: "public_sitemap_canonical_link",
    ingestionGate: "canonical_link_only",
  }));
  assert.equal(summary.massQueue, "POLICY_COMPATIBLE_TAIL");
  assert.equal(summary.publicActivableNow, false);
  assert.match(summary.recommendedNextAction, /verify/i);
});

test("aggregates city and transaction coverage for Morocco inventory", () => {
  const rows = [
    candidate({ title: "Appartement à vendre Rabat", contentFingerprint: "a" }),
    candidate({
      url: "https://marocannonces.com/annonce/villa-rabat-654321",
      title: "Villa à louer Rabat",
      snippet: "Villa immobilier 250 m2 à louer Rabat Maroc",
      discoveryQuery: "location rabat",
      contentFingerprint: "b",
    }),
    candidate({ url: "https://marocannonces.com/annonce/terrain-marrakech-777777", title: "Terrain à vendre Marrakech", discoveryQuery: "vente Marrakech", contentFingerprint: "c" }),
  ];
  const summary = summarizeDomainReservoir("marocannonces.com", rows, null);
  assert.equal(summary.saleLikelyMoroccoUrls, 2);
  assert.equal(summary.rentLikelyMoroccoUrls, 1);
  assert.deepEqual(summary.detectedCities.slice(0, 2), [
    { city: "Rabat", urlRepresentations: 2 },
    { city: "Marrakech", urlRepresentations: 1 },
  ]);
});

test("duplicate signal is explicitly a representation-level signal, not property dedup", () => {
  const rows = [
    candidate({ contentFingerprint: "same" }),
    candidate({ url: "https://marocannonces.com/annonce/appartement-rabat-654321", contentFingerprint: "same" }),
    candidate({ url: "https://marocannonces.com/annonce/appartement-rabat-777777", contentFingerprint: "different" }),
  ];
  const summary = summarizeDomainReservoir("marocannonces.com", rows, null);
  assert.equal(summary.duplicateSignalRows, 1);
  assert.equal(summary.duplicateSignalRatio, 0.3333);
  assert.equal(summary.urlRepresentations, 3);
});

test("ranking is deterministic", () => {
  const a = summarizeDomainReservoir("marocannonces.com", Array.from({ length: 80 }, (_, i) => candidate({ url: `https://marocannonces.com/annonce/a-${10000 + i}`, contentFingerprint: `a-${i}` })), null);
  const b = summarizeDomainReservoir("dabaannonce.ma", Array.from({ length: 40 }, (_, i) => candidate({ sourceDomain: "dabaannonce.ma", url: `https://dabaannonce.ma/annonce/a-${10000 + i}`, contentFingerprint: `b-${i}` })), null);
  const once = rankDomainReservoirs([b, a]).map((row) => row.sourceDomain);
  const twice = rankDomainReservoirs([a, b]).map((row) => row.sourceDomain);
  assert.deepEqual(once, twice);
});
