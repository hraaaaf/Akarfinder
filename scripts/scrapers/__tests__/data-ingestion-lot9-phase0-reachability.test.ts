import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReachability, observeSurface } from "../../../data-ingestion/sources/mubawab/reachability-proof";

test("Phase 0 reachability classifies fully explained control surfaces", () => {
  const primary = observeSurface(
    { id: "st-sale", family: "st", role: "primary_harvest", url: "https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre" },
    '<a href="/fr/a/101/foo"></a><a href="/fr/a/102/bar"></a>',
  );
  const control = observeSurface(
    { id: "ct-sale", family: "ct", role: "control", url: "https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre" },
    '<a href="/fr/a/101/foo"></a><a href="/fr/a/102/bar"></a>',
  );
  const [verdict] = evaluateReachability([primary, control]);
  assert.equal(verdict.verdict, "alias_or_control");
  assert.equal(verdict.unexplained_ids, 0);
  assert.equal(verdict.overlap_ratio, 1);
});

test("Phase 0 reachability flags residual inventory instead of silently ignoring it", () => {
  const primary = observeSurface(
    { id: "sc-sale", family: "sc", role: "primary_harvest", url: "https://www.mubawab.ma/fr/sc/appartements-a-vendre" },
    '<a href="/fr/a/101/foo"></a>',
  );
  const control = observeSurface(
    { id: "is-sale", family: "is", role: "control", url: "https://www.mubawab.ma/fr/is/logement-vente_casablanca_pas-cher" },
    '<a href="/fr/a/101/foo"></a><a href="/fr/pa/999/project-unit"></a>',
  );
  const [verdict] = evaluateReachability([primary, control]);
  assert.equal(verdict.verdict, "inventory_bearing_residual");
  assert.deepEqual(verdict.unexplained_source_ids, ["999"]);
});
