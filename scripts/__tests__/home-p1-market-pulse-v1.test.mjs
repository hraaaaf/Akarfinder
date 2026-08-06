import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/page.tsx", "utf8");
const pulse = readFileSync("components/landing/MarketPulse.tsx", "utf8");
const data = readFileSync("lib/market-pulse/get-market-pulse-listings.ts", "utf8");

test("market pulse follows WhySection on the homepage", () => {
  assert.ok(page.indexOf("<WhySection") < page.indexOf("<MarketPulse"));
});

test("approved market pulse copy and four-card layout remain present", () => {
  assert.match(pulse, /Le marché en mouvement/);
  assert.match(pulse, /Des biens récemment observés, avec leur source et leur niveau d’information/);
  assert.match(pulse, /getMarketPulseListings\(4\)/);
  assert.match(pulse, /lg:grid-cols-4/);
  assert.match(pulse, /snap-mandatory/);
  assert.match(pulse, /Voir le marché/);
  assert.match(pulse, /sort=freshness/);
});

test("source, freshness and full-card navigation are visible", () => {
  assert.match(pulse, /Source :/);
  assert.match(pulse, /item\.freshnessLabel/);
  assert.match(pulse, /<Link href=\{item\.href\}/);
  assert.match(pulse, /line-clamp-2/);
});

test("real images are fail-closed and existing property visuals are reused", () => {
  assert.match(data, /image_permission_status === "allowed"/);
  assert.match(data, /source_access_level === "partner_full"/);
  assert.match(data, /source_access_level === "preview_allowed"/);
  for (const asset of ["appartement.svg", "villa.svg", "studio.webp", "terrain.webp", "bureau.webp", "riad.webp"]) {
    assert.match(data, new RegExp(asset.replace(".", "\\.")));
  }
});

test("available cards are shown without artificial completion", () => {
  assert.match(pulse, /items\.length === 0/);
  assert.doesNotMatch(pulse, /placeholder card|fake card|fictif/i);
});
