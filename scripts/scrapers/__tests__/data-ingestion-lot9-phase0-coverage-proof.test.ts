import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  INITIAL_PHASE0_GATES,
  MUBAWAB_ROUTE_FAMILIES,
  fullHarvestIsBlocked,
  phase0CanPass,
  validateCoverageRegistry,
} from "../../../data-ingestion/sources/mubawab/coverage-proof.js";

describe("Lot 9 Phase 0 Mubawab coverage proof", () => {
  it("keeps harvest, control, project and identity semantics distinct", () => {
    validateCoverageRegistry();

    const byFamily = new Map(MUBAWAB_ROUTE_FAMILIES.map((item) => [item.family, item]));
    assert.equal(byFamily.get("st")?.role, "primary_harvest");
    assert.equal(byFamily.get("sc")?.role, "primary_harvest");
    assert.equal(byFamily.get("cc")?.role, "control");
    assert.equal(byFamily.get("ct")?.role, "control");
    assert.equal(byFamily.get("crp")?.role, "control");
    assert.equal(byFamily.get("is")?.role, "control");
    assert.equal(byFamily.get("t")?.role, "control");
    assert.equal(byFamily.get("pl")?.role, "project_non_unit");
    assert.equal(byFamily.get("pl")?.unit_listing_candidate, false);
    assert.equal(byFamily.get("detail")?.inventory_bearing, false);
  });

  it("blocks Full Harvest while authorized pagination is unresolved", () => {
    const pagination = INITIAL_PHASE0_GATES.find((gate) => gate.id === "P0-D");
    assert.equal(pagination?.status, "fail");
    assert.equal(phase0CanPass(INITIAL_PHASE0_GATES), false);
    assert.equal(fullHarvestIsBlocked(INITIAL_PHASE0_GATES), true);

    const allPass = INITIAL_PHASE0_GATES.map((gate) => ({ ...gate, status: "pass" as const }));
    assert.equal(phase0CanPass(allPass), true);
    assert.equal(fullHarvestIsBlocked(allPass), false);
  });

  it("rejects project pages being silently treated as unit-listing harvest surfaces", () => {
    assert.throws(
      () =>
        validateCoverageRegistry([
          {
            family: "pl",
            role: "project_non_unit",
            inventory_bearing: true,
            unit_listing_candidate: true,
            example: "https://www.mubawab.ma/fr/pl/x/listing-promotion",
            rationale: "bad assumption",
          },
        ]),
      /project_cannot_be_assumed_unit_listing/,
    );
  });
});
