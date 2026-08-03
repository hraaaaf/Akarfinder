import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSearchRequestQuery,
  buildSearchStableKey,
} from "../../../lib/search/search-request-query.ts";

const representativeParams: Record<string, string> = {
  city: "Casablanca",
  property_type: "apartment",
  transaction_type: "sale",
  min_price: "100000",
  max_price: "900000",
  min_surface: "20",
  max_surface: "80",
  limit: "5",
  offset: "6",
};

function readRecord(name: string): string | undefined {
  return representativeParams[name];
}

test("record and URLSearchParams readers produce an identical public search query", () => {
  const urlParams = new URLSearchParams(representativeParams);
  const pageQuery = buildSearchRequestQuery(readRecord);
  const apiQuery = buildSearchRequestQuery(
    (name) => urlParams.get(name) ?? undefined,
  );

  assert.deepEqual(pageQuery, apiQuery);
  assert.deepEqual(pageQuery, {
    city: "Casablanca",
    property_type: "apartment",
    transaction_type: "sale",
    min_price: 100000,
    max_price: 900000,
    min_surface: 20,
    max_surface: 80,
    limit: 5,
    offset: 6,
  });
  assert.equal(buildSearchStableKey(pageQuery), buildSearchStableKey(apiQuery));
});

test("shared parser keeps safe defaults and bounds", () => {
  const empty = buildSearchRequestQuery(() => undefined);
  assert.equal(empty.limit, 50);
  assert.equal(empty.offset, 0);

  const boundedParams: Record<string, string> = {
    limit: "999",
    offset: "-7",
    cursor: "12.9",
  };
  const bounded = buildSearchRequestQuery((name) => boundedParams[name]);
  assert.equal(bounded.limit, 100);
  assert.equal(bounded.offset, 0);
  assert.equal(bounded.cursor, 12);
});

test("page and API routes consume the same parser and stable-key builder", () => {
  const page = readFileSync("app/search/page.tsx", "utf8");
  const api = readFileSync("app/api/search/route.ts", "utf8");

  assert.match(page, /buildRawSearchPageQuery\(params\)/);
  assert.match(page, /buildSearchStableKey\(publicRequestQuery\)/);
  assert.match(api, /buildSearchRequestQuery\(/);
  assert.match(api, /buildSearchStableKey\(query\)/);
});
