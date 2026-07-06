import test from "node:test";
import assert from "node:assert/strict";

import { buildObservationFingerprint } from "@/lib/observation/fingerprint";
import { computeObservationSummary } from "@/lib/observation/observation-policy";
import {
  InMemoryObservationStore,
  NoopObservationStore,
} from "@/lib/observation/observation-store";
import {
  assertNoUnsafeObservationExposure,
  assertObservationWordingIsSafe,
} from "@/lib/observation/public-safety";
import { FORBIDDEN_OBSERVATION_WORDING } from "@/lib/observation/observation-labels";
import { buildAkarInfoPassportForGatewayResult } from "@/lib/akarinfo/akarinfo-passport";
import type { ObservationRecord } from "@/lib/observation/types";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

function createGatewayResult(
  overrides: Partial<SearchGatewayNormalizedResult> = {},
): SearchGatewayNormalizedResult {
  return {
    id: "gw-obs-1",
    title: "Appartement Casablanca Maarif",
    original_url: "https://example.com/listing/42",
    display_url: "example.com/listing/42",
    source_id: "mubawab_serper",
    source_name: "Mubawab",
    domain: "mubawab.ma",
    result_origin: "search_api",
    search_result_display_mode: "thin_indexed_result",
    source_badge: "public_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir l'annonce originale",
    result_attribution_label: "Source originale",
    thumbnail_risk_accepted: false,
    ...overrides,
  };
}

test("fingerprint is stable when original_url and source_host are unchanged", () => {
  const a = buildObservationFingerprint({
    original_url: "https://example.com/listing/42",
    source_host: "mubawab.ma",
    title: "Appartement Casablanca",
  });
  const b = buildObservationFingerprint({
    original_url: "https://example.com/listing/42",
    source_host: "mubawab.ma",
    title: "Titre différent au deuxième passage",
  });

  assert.equal(a, b);
});

test("fingerprint differs across distinct original_url values", () => {
  const a = buildObservationFingerprint({
    original_url: "https://example.com/listing/42",
    source_host: "mubawab.ma",
    title: "Appartement",
  });
  const b = buildObservationFingerprint({
    original_url: "https://example.com/listing/43",
    source_host: "mubawab.ma",
    title: "Appartement",
  });

  assert.notEqual(a, b);
});

test("fingerprint falls back to normalized attributes without original_url", () => {
  const a = buildObservationFingerprint({
    source_host: "mubawab.ma",
    title: "Appartement Casablanca",
    city: "Casablanca",
    district: "Maarif",
    property_type: "Appartement",
    transaction_type: "buy",
  });
  const b = buildObservationFingerprint({
    source_host: "mubawab.ma",
    title: "APPARTEMENT   casablanca",
    city: "casablanca",
    district: "maarif",
    property_type: "appartement",
    transaction_type: "buy",
  });

  assert.equal(a, b);
  assert.match(a, /^f:/);
});

test("fingerprint input never accepts contact-shaped fields", () => {
  const fingerprint = buildObservationFingerprint({
    original_url: "https://example.com/listing/44",
    source_host: "mubawab.ma",
    title: "Appartement avec contact 0600000000",
  });

  assert.doesNotMatch(fingerprint, /0600000000/);
  assert.ok(fingerprint.length > 0);
});

test("assertNoUnsafeObservationExposure rejects contact/gallery-shaped payloads", () => {
  assert.throws(() =>
    assertNoUnsafeObservationExposure({ fingerprint: "u:abc", contact: "0600000000" }),
  );
  assert.throws(() =>
    assertNoUnsafeObservationExposure({ fingerprint: "u:abc", images: ["a.jpg"] }),
  );
  assert.doesNotThrow(() =>
    assertNoUnsafeObservationExposure({
      fingerprint: "u:abc",
      source_kind: "external_web",
      observation_count: 2,
    } satisfies Partial<ObservationRecord>),
  );
});

test("no historical record yields only the current-search label for gateway", () => {
  const summary = computeObservationSummary(null, "external_web");

  assert.deepEqual(summary.labels, [
    "Observé pendant cette recherche",
    "Source originale à confirmer",
  ]);
  assert.match(summary.help_line ?? "", /disponibilité reste à confirmer/i);
});

test("observation_count = 1 maps to first observation", () => {
  const record: ObservationRecord = {
    fingerprint: "u:1",
    source_kind: "external_web",
    observation_count: 1,
    last_observed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const summary = computeObservationSummary(record, "external_web");
  assert.ok(summary.labels.includes("Première observation AkarFinder"));
  assert.equal(summary.labels.includes("Observé récemment"), false);
});

test("observation_count = 2 maps to already observed", () => {
  const record: ObservationRecord = {
    fingerprint: "u:2",
    source_kind: "external_web",
    observation_count: 2,
    last_observed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const summary = computeObservationSummary(record, "external_web");
  assert.ok(summary.labels.includes("Déjà observé"));
  assert.equal(summary.labels.includes("Observé plusieurs fois"), false);
});

test("observation_count >= 3 maps to observed multiple times", () => {
  const record: ObservationRecord = {
    fingerprint: "u:3",
    source_kind: "external_web",
    observation_count: 5,
    last_observed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const summary = computeObservationSummary(record, "external_web");
  assert.ok(summary.labels.includes("Observé plusieurs fois"));
  assert.equal(summary.labels.includes("Déjà observé"), false);
});

test("recent last_observed_at adds Observé récemment", () => {
  const record: ObservationRecord = {
    fingerprint: "u:4",
    source_kind: "external_web",
    observation_count: 1,
    last_observed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  };

  const summary = computeObservationSummary(record, "external_web");
  assert.ok(summary.labels.includes("Observé récemment"));
});

test("gateway summary never includes forbidden wording regardless of record shape", () => {
  const record: ObservationRecord = {
    fingerprint: "u:5",
    source_kind: "external_web",
    observation_count: 12,
    last_observed_at: new Date().toISOString(),
  };

  const summary = computeObservationSummary(record, "external_web");
  assert.doesNotThrow(() => assertObservationWordingIsSafe(summary.labels));

  const forbiddenHit = FORBIDDEN_OBSERVATION_WORDING.some((forbidden) =>
    summary.labels.some((label) => label.toLowerCase().includes(forbidden)),
  );
  assert.equal(forbiddenHit, false);
});

test("InMemoryObservationStore increments observation_count across calls", () => {
  const store = new InMemoryObservationStore();
  const fingerprint = "u:store-1";

  const first = store.recordObservation({ fingerprint, source_kind: "external_web" });
  const second = store.recordObservation({ fingerprint, source_kind: "external_web" });

  assert.equal(first.observation_count, 1);
  assert.equal(second.observation_count, 2);
  assert.equal(second.first_observed_at, first.first_observed_at);
});

test("NoopObservationStore.get never returns fabricated history", () => {
  const store = new NoopObservationStore();
  assert.equal(store.get("u:anything"), null);
});

test("gateway AkarInfo passport carries a safe observation summary with no exposure", () => {
  const passport = buildAkarInfoPassportForGatewayResult(createGatewayResult());

  assert.ok(passport.observation);
  assert.doesNotThrow(() => assertNoUnsafeObservationExposure(passport.observation));
  assert.doesNotThrow(() =>
    assertObservationWordingIsSafe(passport.observation?.labels ?? []),
  );
  assert.deepEqual(passport.observation?.labels, [
    "Observé pendant cette recherche",
    "Source originale à confirmer",
  ]);
});
