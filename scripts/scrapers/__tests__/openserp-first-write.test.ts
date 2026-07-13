import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEnvValue } from "../../../lib/openserp-ingestion/env.js";
import {
  FIRST_WRITE_SELECTION_ALGORITHM_VERSION,
  selectFirstWriteCandidates,
} from "../../../lib/openserp-ingestion/first-write.js";
import type { OpenSerpListingCandidate } from "../../../lib/openserp-ingestion/types.js";

function makeCandidate(input: Partial<OpenSerpListingCandidate> & { candidate_id: string; city: "Casablanca" | "Rabat" | "Marrakech"; domain?: string }): OpenSerpListingCandidate {
  const domain = input.domain ?? "agenz.ma";
  return {
    query_id: "q-1",
    engine: "bing",
    rank: 1,
    original_url: `https://${domain}/listing/${input.candidate_id}`,
    canonical_source_url: `https://${domain}/listing/${input.candidate_id}`,
    source_domain: domain,
    classification_lane: "individual_listing",
    classification_reasons: ["test"],
    extracted: {
      title: `Title ${input.candidate_id}`,
      short_description: "desc",
      city: input.city,
      district: input.city === "Casablanca" ? "Maarif" : input.city === "Rabat" ? "Agdal" : "Gueliz",
      transaction_type: "sale",
      property_type: "apartment",
      price_mad: 1200000,
      currency: "MAD",
      surface_m2: 90,
      bedrooms_count: 2,
    },
    title: `Title ${input.candidate_id}`,
    snippet: "desc",
    discovered_at: "2026-07-13T00:00:00.000Z",
    raw_result_hash: `hash-${input.candidate_id}`,
    provider_result_id: `prov-${input.candidate_id}`,
    external_id: `ext-${input.candidate_id}`,
    candidate_id: input.candidate_id,
    canonical_fingerprint: `fingerprint-${input.candidate_id}`,
    seen_query_ids: ["q-1"],
    seen_run_ids: ["run-1"],
    ...input,
  };
}

test("normalizeEnvValue strips surrounding quotes", () => {
  assert.equal(normalizeEnvValue('"https://example.supabase.co"'), "https://example.supabase.co");
  assert.equal(normalizeEnvValue("'token-value'"), "token-value");
  assert.equal(normalizeEnvValue("plain"), "plain");
});

test("selectFirstWriteCandidates is deterministic and excludes unsupported domains", () => {
  const candidates: OpenSerpListingCandidate[] = [
    makeCandidate({ candidate_id: "casa-1", city: "Casablanca", domain: "agenz.ma" }),
    makeCandidate({ candidate_id: "rabat-1", city: "Rabat", domain: "sarouty.ma" }),
    makeCandidate({ candidate_id: "marrakech-1", city: "Marrakech", domain: "mouldar.com" }),
    makeCandidate({ candidate_id: "blocked-1", city: "Casablanca", domain: "facebook.com" }),
  ];

  const first = selectFirstWriteCandidates(candidates, 3);
  const second = selectFirstWriteCandidates(candidates, 3);

  assert.equal(FIRST_WRITE_SELECTION_ALGORITHM_VERSION, "openserp-first-write-v1");
  assert.deepEqual(
    first.selectedCandidates.map((candidate) => candidate.candidate_id),
    second.selectedCandidates.map((candidate) => candidate.candidate_id),
  );
  assert.deepEqual(
    first.selectedCandidates.map((candidate) => candidate.candidate_id),
    ["casa-1", "rabat-1", "marrakech-1"],
  );
  assert.ok(
    first.excludedCandidates.some(
      (candidate) =>
        candidate.candidate_id === "blocked-1" &&
        candidate.reason === "source_domain_not_publicly_allowed",
    ),
  );
});
