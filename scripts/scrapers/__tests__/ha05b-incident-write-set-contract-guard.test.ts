import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  new URL(
    "../../../docs/ha-dr/HA05B_INCIDENT_WRITE_SET_CONTRACT_2026-09-24.md",
    import.meta.url,
  ),
  "utf8",
);

test("HA05-B incident write set stays minimal", () => {
  assert.match(contract, /V0 approved incident-write candidate/);
  assert.match(contract, /buyer_leads/);
  assert.match(contract, /CANDIDATE ONLY \/ NOT YET NEON-ROUTED \/ NOT PROVIDER-PROVED/);
});

test("HA05-B disables mixed and non-HA domains during incident", () => {
  for (const phrase of [
    "saved_alerts",
    "seller_listing_publication_events",
    "professional_activation_requests",
    "user_search_projects",
    "Background ingestion / acquisition / recrawl",
  ]) {
    assert.match(contract, new RegExp(phrase.replace(/[.*+?^$()|[\]{}]/g, "\\$&")));
  }
  assert.match(contract, /Incident-disabled/);
});

test("HA05-B forbids fallback and partial lead creation", () => {
  assert.match(contract, /No partial lead creation is allowed/);
  assert.match(contract, /No write may fall back from Neon to Supabase/);
});

test("HA05-B keeps provider activation behind live proof", () => {
  assert.match(contract, /Provider-specific rehearsal is mandatory/);
  assert.match(contract, /exact source\/target schema fingerprint equality/);
  assert.match(contract, /reverse-delta propagation back to restored Supabase/);
  assert.match(contract, /Prepared code alone never expands the certified incident write set/);
});
