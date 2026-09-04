import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCommonCrawlPrefixQuery,
  parseCommonCrawlCdxJsonLines,
} from "../../../data-ingestion/sources/mubawab/commoncrawl-index";

test("parses only Mubawab a/pa detail URLs and deduplicates by source id", () => {
  const raw = [
    JSON.stringify({ url: "https://www.mubawab.ma/fr/a/123/example", timestamp: "20260801" }),
    JSON.stringify({ url: "https://www.mubawab.ma/fr/a/123/example-again", timestamp: "20260802" }),
    JSON.stringify({ url: "https://www.mubawab.ma/fr/pa/456/project-unit", timestamp: "20260803" }),
    JSON.stringify({ url: "https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre", timestamp: "20260803" }),
    JSON.stringify({ url: "https://example.com/fr/a/999/nope", timestamp: "20260803" }),
    "not-json",
  ].join("\n");

  const refs = parseCommonCrawlCdxJsonLines(raw);
  assert.deepEqual(refs.map((ref) => [ref.source_id, ref.detail_family]), [["123", "a"], ["456", "pa"]]);
});

test("builds bounded public prefix queries", () => {
  const query = new URL(buildCommonCrawlPrefixQuery({ index: "CC-MAIN-2026-34", detailFamily: "a", limit: 250 }));
  assert.equal(query.hostname, "index.commoncrawl.org");
  assert.equal(query.searchParams.get("url"), "www.mubawab.ma/fr/a/");
  assert.equal(query.searchParams.get("matchType"), "prefix");
  assert.equal(query.searchParams.get("limit"), "250");
  assert.equal(query.searchParams.get("filter"), "=status:200");
});
