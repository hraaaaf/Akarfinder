import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDiscoveryRoutes,
  extractListingRefs,
  runDiscovery,
} from "../../../data-ingestion/sources/mubawab/discovery.js";

const HTML_A = `
<html><body>
<a href="/fr/pa/8370202/appartement-a-l-achat-a-roches-noires">A</a>
<a href="https://www.mubawab.ma/fr/pa/8370202/appartement-a-l-achat-a-roches-noires">dup</a>
<a href="/fr/a/8258601/appartement-a-vendre-les-princesses">B</a>
<a href="/fr/p/4612/projet-non-annonce">project page ignored</a>
</body></html>`;

const HTML_B = `
<html><body>
<a href="/fr/a/8258601/appartement-a-vendre-les-princesses">dup B</a>
<a href="/fr/pa/9000002/terrain-test">C</a>
</body></html>`;

describe("Mubawab discovery v2", () => {
  it("builds st routes with :p:N pagination and no detail pages", () => {
    const routes = buildDiscoveryRoutes(2);
    assert.ok(routes.length > 0);
    assert.ok(routes.every((route) => route.url.includes("/fr/st/")));
    assert.ok(routes.some((route) => route.page === 2 && route.url.endsWith(":p:2")));
    assert.equal(routes.some((route) => /\/fr\/(?:a|pa)\//.test(route.url)), false);
  });

  it("extracts both a and pa numeric source ids and ignores project pages", () => {
    const refs = extractListingRefs(HTML_A, "https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre");
    assert.deepEqual(refs.map((ref) => ref.source_id), ["8370202", "8258601"]);
    assert.deepEqual(refs.map((ref) => ref.detail_family), ["pa", "a"]);
    assert.equal(refs.some((ref) => ref.source_id === "4612"), false);
  });

  it("deduplicates globally by source_id and records duplicate refs", async () => {
    let call = 0;
    const result = await runDiscovery(async () => {
      call++;
      return call === 1 ? HTML_A : HTML_B;
    }, { maxPages: 1, now: () => "2026-09-03T18:00:00.000Z" });

    assert.ok(result.listings.length >= 3);
    assert.ok(result.manifest.duplicate_refs >= 1);
    assert.equal(result.manifest.pages_failed, 0);
    assert.equal(result.manifest.source, "mubawab");
    assert.ok(result.manifest.detail_family_counts.a >= 1);
    assert.ok(result.manifest.detail_family_counts.pa >= 1);
  });
});
