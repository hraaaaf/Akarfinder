import assert from "node:assert/strict";
import test from "node:test";
import { getIndexedTransactionVisual } from "../../../lib/ux/indexed-transaction-visual";

test("maps indexed transactions to stable AkarFinder visual identities", () => {
  assert.deepEqual(getIndexedTransactionVisual("buy"), {
    key: "buy",
    label: "Achat",
    background: "#FFF1E7",
    foreground: "#9A3412",
    accent: "#F97316",
  });

  assert.deepEqual(getIndexedTransactionVisual("rent"), {
    key: "rent",
    label: "Location",
    background: "#EAF1FF",
    foreground: "#1D4ED8",
    accent: "#2563EB",
  });

  assert.deepEqual(getIndexedTransactionVisual("new"), {
    key: "new",
    label: "Neuf",
    background: "#EAFBF3",
    foreground: "#047857",
    accent: "#10B981",
  });
});

test("fails closed to a neutral indexed visual for unknown transactions", () => {
  assert.equal(getIndexedTransactionVisual(undefined).key, "unknown");
  assert.equal(getIndexedTransactionVisual(null).key, "unknown");
  assert.equal(getIndexedTransactionVisual("sale").key, "unknown");
  assert.equal(getIndexedTransactionVisual("").label, "Annonce indexée");
});
