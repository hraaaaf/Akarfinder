import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UX-PREMIUM-CARD-DENSITY-1 source contract", () => {
  const css = fs.readFileSync("app/search/search-premium-card-density.css", "utf8");
  const page = fs.readFileSync("app/search/page.tsx", "utf8");
  assert.match(page, /search-premium-card-density\.css/);
  assert.match(css, /UX-PREMIUM-CARD-DENSITY-1/);
  assert.match(css, /height:108px!important/);
  assert.match(css, /-webkit-line-clamp:1!important/);
  assert.match(css, /data-card-provenance/);
  assert.match(css, /data-neighborhood-photo-credit/);
  assert.doesNotMatch(css, /data-card-provenance[^}]*display:none/);
  assert.doesNotMatch(css, /data-neighborhood-photo-credit[^}]*display:none/);
  assert.match(css, /@media\(max-width:639px\)/);
});
