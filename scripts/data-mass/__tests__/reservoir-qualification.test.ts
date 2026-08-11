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

test("classifies a strong property detail URL conservatively", () => {
  const result = classifyReservoirCandidate(candidate());
  assert.equal(result.likelyRealEstate, true);
  assert.equal(result.pageKind, "LIKELY_LISTING_DETAIL");
  assert.equal(result.domainRole, "DIRECT_PORTAL");
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

test("does not promote social platforms into Source Factory", () => {
  const row = candidate({
    sourceDomain: "tiktok.com",
    url: "https://tiktok.com/@agency/video/123456789",
    title: "Villa à vendre Marrakech",
    snippet: "Immobilier villa 400 m2 à vendre",
  });
  const summary = summarizeDomainReservoir("tiktok.com", Array.from({ length: 100 }, (_, i) => ({ ...row, contentFingerprint: `social-${i}` })), null);
  assert.equal(summary.domainRole, "SOCIAL");
  assert.equal(summary.massQueue, "HOLD");
});

test("unregistered high-volume real-estate domain goes to Source Factory, never public", () => {
  const rows = Array.from({ length: 80 }, (_, i) => candidate({
    sourceDomain: "marocannonces.com",
    url: `https://marocannonces.com/annonce/appartement-rabat-${100000 + i}`,
    contentFingerprint: `fp-${i}`,
  }));
  const summary = summarizeDomainReservoir("marocannonces.com", rows, null);
  assert.equal(summary.massQueue, "SOURCE_FACTORY");
  assert.equal(summary.publicActivableNow, false);
  assert.equal(summary.registryStatus, "UNREGISTERED");
});

test("registered hidden source remains measure-only even with huge volume", () => {
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

test("existing canonical-link tail is only prioritized for policy verification", () => {
  const rows = Array.from({ length: 50 }, (_, i) => candidate({
    sourceDomain: "promoimmomarrakech.com",
    url: `https://promoimmomarrakech.com/bien/appartement-${10000 + i}`,
    contentFingerprint: `p-${i}`,
  }));
  const summary = summarizeDomainReservoir("promoimmomarrakech.com", rows, policy({
    sourceDomain: "promoimmomarrakech.com",
    displayPolicy: "canonical_link_only",
    displayGate: "external_tail_link_only",
    acquisitionMode: "public_sitemap_canonical_link",
    ingestionGate: "canonical_link_only",
  }));
  assert.equal(summary.massQueue, "POLICY_COMPATIBLE_TAIL");
  assert.equal(summary.publicActivableNow, false);
  assert.match(summary.recommendedNextAction, /verify/i);
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
