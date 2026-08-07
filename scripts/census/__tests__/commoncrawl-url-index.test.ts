import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCommonCrawlUrlIndexReport,
  buildMaTldRealEstateQuery,
  buildMoroccoExternalRealEstateQuery,
  buildMoroccoLocationUrlRegex,
  buildRealEstateUrlRegex,
} from "../commoncrawl-url-index";

describe("DATA-1.3 Common Crawl URL Index", () => {
  it("builds a .ma URL Index query constrained to metadata discovery", () => {
    const sql = buildMaTldRealEstateQuery({ crawl: "CC-MAIN-2026-25", minSignalPages: 2 });

    assert.match(sql, /crawl = 'CC-MAIN-2026-25'/);
    assert.match(sql, /url_host_registry_suffix = 'ma'/);
    assert.match(sql, /real_estate_signal_pages >= 2/);
    assert.match(sql, /max_by\(url, fetch_time\)/);
    assert.doesNotMatch(sql, /warc_filename|warc_record_offset|warc_record_length/i);
  });

  it("builds the external lane with both Morocco and real-estate signals", () => {
    const sql = buildMoroccoExternalRealEstateQuery();

    assert.match(sql, /url_host_registry_suffix <> 'ma'/);
    assert.equal((sql.match(/regexp_like/g) ?? []).length, 2);
    assert.match(sql, /MOROCCO_EXTERNAL_REAL_ESTATE/);
    assert.doesNotMatch(sql, /warc_filename|warc_record_offset|warc_record_length/i);
  });

  it("reuses the national geography but excludes the ambiguous Sale token", () => {
    const locationRegex = buildMoroccoLocationUrlRegex();
    assert.match(locationRegex, /casablanca/);
    assert.match(locationRegex, /marrakech/);
    assert.match(locationRegex, /laayoune/);
    assert.match(locationRegex, /morocco/);
    assert.match(locationRegex, /maroc/);
    assert.doesNotMatch(locationRegex, /\|sale\|/);
  });

  it("keeps real-estate matching explicit and bounded", () => {
    const regex = new RegExp(buildRealEstateUrlRegex());
    assert.equal(regex.test("example.ma/appartement/casablanca/12"), true);
    assert.equal(regex.test("example.ma/villa-rabat"), true);
    assert.equal(regex.test("example.ma/blog/football"), false);
    assert.equal(regex.test("example.ma/island-guide"), false);
  });

  it("subtracts known Census domains without granting a policy", () => {
    const report = buildCommonCrawlUrlIndexReport(
      [
        {
          lane: "MA_TLD_REAL_ESTATE",
          domain: "rabatimmo.ma",
          registered_domain: "rabatimmo.ma",
          indexed_pages: 250,
          real_estate_signal_pages: 180,
          latest_fetch_at: "2026-06-22T10:00:00Z",
          sample_url: "https://rabatimmo.ma/appartement/rabat/1",
        },
        {
          lane: "MOROCCO_EXTERNAL_REAL_ESTATE",
          domain: "properties-example.com",
          registered_domain: "properties-example.com",
          indexed_pages: 40,
          real_estate_signal_pages: 40,
          latest_fetch_at: "2026-06-21T10:00:00Z",
          sample_url: "https://properties-example.com/morocco/villa/1",
        },
      ],
      ["rabatimmo.ma"],
      "2026-08-07T03:00:00+01:00",
    );

    assert.equal(report.domains, 2);
    assert.equal(report.knownDomains, 1);
    assert.equal(report.newDomains, 1);
    assert.equal(report.candidates[0]!.domain, "properties-example.com");
    assert.equal(report.candidates[0]!.censusState, "NEW_TO_CENSUS");
    assert.equal(report.candidates[0]!.reviewState, "UNREVIEWED");
    assert.equal(report.candidates[0]!.effectivePolicy, null);
    assert.equal(report.candidates[1]!.censusState, "KNOWN_TO_CENSUS");
  });

  it("fails closed on malformed aggregates", () => {
    assert.throws(
      () =>
        buildCommonCrawlUrlIndexReport(
          [
            {
              lane: "MA_TLD_REAL_ESTATE",
              domain: "example.ma",
              registered_domain: "example.ma",
              indexed_pages: 2,
              real_estate_signal_pages: 3,
              latest_fetch_at: null,
              sample_url: "https://example.ma/a",
            },
          ],
          [],
          "2026-08-07T03:00:00+01:00",
        ),
      /exceeds indexed_pages/,
    );

    assert.throws(
      () => buildMaTldRealEstateQuery({ crawl: "latest;drop table x" }),
      /Invalid Common Crawl index/,
    );
  });
});
