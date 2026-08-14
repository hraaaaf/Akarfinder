import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sellerPage = await readFile("app/vendre/dossier/page.tsx", "utf8");

test("seller dossier constrains its visual selector inside the viewport", () => {
  assert.match(
    sellerPage,
    /className="min-w-0 \[&>div\]:min-w-0 \[&>div>section\]:min-w-0"/,
    "the seller dossier must let the inner grid and main section shrink so the horizontal property selector scrolls inside the card instead of widening the page",
  );
});
