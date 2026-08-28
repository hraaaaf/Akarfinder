import assert from "node:assert/strict";
import test from "node:test";
import { getIndexedTransactionVisual } from "../../../lib/ux/indexed-transaction-visual";

test("maps indexed transactions to stable AkarFinder visual identities", () => {
  assert.deepEqual(getIndexedTransactionVisual("buy"), {
    key: "buy",
    label: "Achat",
    background: "#FFFBF7",
    foreground: "#C2410C",
    accent: "#F97316",
  });

  assert.deepEqual(getIndexedTransactionVisual("rent"), {
    key: "rent",
    label: "Location",
    background: "#F8FBFF",
    foreground: "#1D4ED8",
    accent: "#2563EB",
  });

  assert.deepEqual(getIndexedTransactionVisual("new"), {
    key: "new",
    label: "Neuf",
    background: "#F7FCF9",
    foreground: "#15803D",
    accent: "#22A447",
  });
});

test("fails closed to a neutral indexed visual for unknown transactions", () => {
  assert.equal(getIndexedTransactionVisual(undefined).key, "unknown");
  assert.equal(getIndexedTransactionVisual(null).key, "unknown");
  assert.equal(getIndexedTransactionVisual("sale").key, "unknown");
  assert.equal(getIndexedTransactionVisual("").label, "Annonce indexée");
});
