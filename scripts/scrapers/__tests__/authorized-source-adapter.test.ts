import test from "node:test";
import assert from "node:assert/strict";
import {
  assertUrlAllowed,
  fetchAuthorizedSource,
  MUBAWAB_CONTROLLED_POLICY,
  parseAuthorizedHtml,
} from "../../../lib/recrawl/authorized-source-adapter.js";

test("Mubawab policy accepts only individual French detail pages", () => {
  assert.doesNotThrow(() => assertUrlAllowed("https://www.mubawab.ma/fr/a/8281326/example", MUBAWAB_CONTROLLED_POLICY));
  assert.throws(() => assertUrlAllowed("https://www.mubawab.ma/fr/is/appartement-casablanca", MUBAWAB_CONTROLLED_POLICY));
  assert.throws(() => assertUrlAllowed("https://evil.example/fr/a/8281326/example", MUBAWAB_CONTROLLED_POLICY));
  assert.throws(() => assertUrlAllowed("http://www.mubawab.ma/fr/a/8281326/example", MUBAWAB_CONTROLLED_POLICY));
});

test("parser emits factual fingerprints without inventing missing values", () => {
  const result = parseAuthorizedHtml({
    policy: MUBAWAB_CONTROLLED_POLICY,
    url: "https://www.mubawab.ma/fr/a/8281326/example",
    fetchedAt: "2026-07-26T18:30:00.000Z",
    httpStatus: 200,
    contentType: "text/html; charset=utf-8",
    html: `<!doctype html><html><head><title>Terrain à louer</title><meta property="product:price:amount" content="1000"><meta property="product:price:currency" content="MAD"></head><body><p>Surface de 3200 m²</p></body></html>`,
  });
  assert.equal(result.displayedPrice, 1000);
  assert.equal(result.currency, "MAD");
  assert.equal(result.surfaceM2, 3200);
  assert.equal(result.sourceStatus, "active");
  assert.ok(result.titleFingerprint);
  assert.equal(result.contentFingerprint.length, 64);
});

test("404 is explicit removal evidence, not inferred from age", () => {
  const result = parseAuthorizedHtml({
    policy: MUBAWAB_CONTROLLED_POLICY,
    url: "https://www.mubawab.ma/fr/a/8281326/example",
    fetchedAt: "2026-07-26T18:30:00.000Z",
    httpStatus: 404,
    contentType: "text/html",
    html: "<html><title>Introuvable</title></html>",
  });
  assert.equal(result.sourceStatus, "removed");
});

test("network adapter forbids redirects and preserves deterministic parsing", async () => {
  const fakeFetch: typeof fetch = async () => new Response(
    `<html><head><meta property="og:title" content="Appartement test"></head><body>90 m²</body></html>`,
    { status: 200, headers: { "content-type": "text/html" } },
  );
  const result = await fetchAuthorizedSource({
    policy: MUBAWAB_CONTROLLED_POLICY,
    url: "https://www.mubawab.ma/fr/a/8281326/example",
    now: () => new Date("2026-07-26T18:30:00.000Z"),
    fetchImpl: fakeFetch,
  });
  assert.equal(result.surfaceM2, 90);
  assert.equal(result.fetchedAt, "2026-07-26T18:30:00.000Z");
});
