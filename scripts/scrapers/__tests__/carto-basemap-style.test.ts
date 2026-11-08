import assert from "node:assert/strict";
import { test } from "node:test";
import { nationalBasemapConfiguration } from "../../../lib/map/carto-basemap-style";

test("CARTO key config generates official Voyager and Dark Matter vector URLs", () => {
  const light = nationalBasemapConfiguration("light", "example-ci-key");
  const dark = nationalBasemapConfiguration("dark", "example-ci-key");
  assert.equal(light.style, "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json?key=example-ci-key");
  assert.equal(dark.style, "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=example-ci-key");
  assert.equal(light.provider, "carto");
  assert.equal(dark.provider, "carto");
  assert.match(light.attribution, /OpenStreetMap contributors, © CARTO/);
  assert.equal(light.attribution, dark.attribution);
});

test("URL-safe key normalization and blank-key fallback never call unkeyed CARTO", () => {
  assert.match(nationalBasemapConfiguration("light", " test key&x ").style, /key=test%20key%26x$/);
  for (const theme of ["light", "dark"]) {
    const fallback = nationalBasemapConfiguration(theme, " ");
    assert.equal(fallback.style, "https://tiles.openfreemap.org/styles/liberty");
    assert.equal(fallback.provider, "openfreemap");
    assert.match(fallback.attribution, /OpenStreetMap contributors.*OpenFreeMap/);
  }
});
