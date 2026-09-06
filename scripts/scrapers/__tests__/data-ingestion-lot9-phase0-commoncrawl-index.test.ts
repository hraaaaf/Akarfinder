import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCommonCrawlPageCountQuery,
  buildCommonCrawlPrefixQuery,
  parseCommonCrawlCdxJsonLines,
  parseCommonCrawlPageCount,
  selectSpreadPages,
} from "../../../data-ingestion/sources/mubawab/commoncrawl-index";

test("parses only Mubawab a/pa detail URLs, deduplicates by source id and keeps latest capture", () => {
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
  assert.equal(refs.find((ref) => ref.source_id === "123")?.timestamp, "20260802");
  assert.match(refs.find((ref) => ref.source_id === "123")?.url ?? "", /example-again$/);
});

test("builds bounded public paged prefix queries", () => {
  const query = new URL(buildCommonCrawlPrefixQuery({
    index: "CC-MAIN-2026-34",
    detailFamily: "a",
    limit: 1000,
    page: 4,
    pageSize: 1,
  }));
  assert.equal(query.hostname, "index.commoncrawl.org");
  assert.equal(query.searchParams.get("url"), "www.mubawab.ma/fr/a/");
  assert.equal(query.searchParams.get("matchType"), "prefix");
  assert.equal(query.searchParams.get("limit"), "1000");
  assert.equal(query.searchParams.get("page"), "4");
  assert.equal(query.searchParams.get("pageSize"), "1");
  assert.equal(query.searchParams.get("filter"), "=status:200");
});

test("builds and parses Common Crawl page-count queries", () => {
  const query = new URL(buildCommonCrawlPageCountQuery({
    index: "CC-MAIN-2026-30",
    detailFamily: "pa",
    pageSize: 1,
  }));
  assert.equal(query.searchParams.get("showNumPages"), "true");
  assert.equal(query.searchParams.get("pageSize"), "1");
  assert.equal(query.searchParams.get("url"), "www.mubawab.ma/fr/pa/");

  assert.deepEqual(parseCommonCrawlPageCount('{"blocks":7,"pages":7,"pageSize":1}'), {
    blocks: 7,
    pages: 7,
    page_size: 1,
  });
  assert.deepEqual(parseCommonCrawlPageCount("3"), {
    blocks: null,
    pages: 3,
    page_size: null,
  });
});

test("selects first, middle and last pages for a bounded spread sample", () => {
  assert.deepEqual(selectSpreadPages(0, 3), []);
  assert.deepEqual(selectSpreadPages(2, 3), [0, 1]);
  assert.deepEqual(selectSpreadPages(9, 3), [0, 4, 8]);
  assert.deepEqual(selectSpreadPages(10, 1), [0]);
});
