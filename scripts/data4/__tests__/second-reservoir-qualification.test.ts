import assert from "node:assert/strict";
import test from "node:test";
import { rankReservoirs, type ReservoirCandidate } from "../second-reservoir-qualification";

const canonical = {
  registryAcquisitionMode: "public_sitemap_canonical_link",
  registryDiscoveryPolicy: "public_sitemap_only",
  registryDisplayPolicy: "canonical_link_only",
  registryDisplayGate: "external_tail_link_only",
  registryMachineGate: "canonical_link_only",
  reviewStatus: "due_soon",
} as const;

const candidates: ReservoirCandidate[] = [
  {
    sourceDomain: "promoimmomarrakech.com",
    totalNormalized: 3005,
    normalizedOk: 3000,
    technicalDisplay: 2923,
    freshConfirmed: 9,
    seedOnly: 2996,
    withCity: 3005,
    withType: 2556,
    withIntent: 2905,
    ...canonical,
  },
  {
    sourceDomain: "limmobiliersansfrontieres.com",
    totalNormalized: 1414,
    normalizedOk: 563,
    technicalDisplay: 573,
    freshConfirmed: 94,
    seedOnly: 1320,
    withCity: 607,
    withType: 1107,
    withIntent: 1068,
    ...canonical,
  },
  {
    sourceDomain: "aykana.ma",
    totalNormalized: 647,
    normalizedOk: 467,
    technicalDisplay: 472,
    freshConfirmed: 62,
    seedOnly: 585,
    withCity: 486,
    withType: 507,
    withIntent: 534,
    ...canonical,
  },
];

test("selects Promo Immo Marrakech as preferred reservoir pending revalidation", () => {
  const ranked = rankReservoirs(candidates);
  assert.equal(ranked[0]?.sourceDomain, "promoimmomarrakech.com");
  assert.equal(ranked[0]?.decision, "PREFERRED_PENDING_REVALIDATION");
  assert.equal(ranked[1]?.decision, "SECONDARY");
  assert.ok((ranked[0]?.totalScore ?? 0) > (ranked[1]?.totalScore ?? 0));
});

test("blocks candidates outside canonical-link Registry contract", () => {
  const ranked = rankReservoirs([
    {
      ...candidates[0]!,
      sourceDomain: "internal-only.example",
      registryAcquisitionMode: "public_index_internal_only",
      registryDiscoveryPolicy: "public_index_only",
      registryDisplayPolicy: "internal_signal_only",
      registryDisplayGate: "hidden",
      registryMachineGate: "internal_signal_only",
      reviewStatus: "current",
    },
  ]);
  assert.equal(ranked[0]?.decision, "BLOCKED");
});

test("blocks overdue review even when the Registry shape is otherwise compatible", () => {
  const ranked = rankReservoirs([{ ...candidates[0]!, reviewStatus: "overdue" }]);
  assert.equal(ranked[0]?.decision, "BLOCKED");
});
