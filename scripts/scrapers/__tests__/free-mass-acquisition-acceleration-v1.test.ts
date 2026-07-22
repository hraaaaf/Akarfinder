import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSitemapSeedRows,
  parseRobotsSitemapUrls,
  parseSitemapLocs,
  qualifySitemapListingUrls,
  robotsExplicitlyBlocksAll,
  selectSitemapHarvestDomains,
} from "../../../lib/acquisition-scale-v1/sitemap-mass-seeds.js";
import { loadSourceDomainRegistry } from "../../../lib/openserp-ingestion/domain-registry.js";

const registry = loadSourceDomainRegistry();

test("sitemap lane is registry-driven and excludes blocked/empty-pattern domains", () => {
  const domains = selectSitemapHarvestDomains(registry);
  assert.ok(domains.includes("mubawab.ma"));
  assert.ok(domains.includes("soukimmobilier.com"));
  assert.equal(domains.includes("yakeey.com"), false);
  assert.equal(domains.includes("logic-immo.com"), false);
  for (const domain of domains) {
    const entry = registry.domains.find((candidate) => candidate.domain === domain)!;
    assert.equal(entry.status, "approved_discovery");
    assert.equal(entry.external_web_result, true);
    assert.ok(entry.listing_url_patterns.length > 0);
  }
});

test("robots parser fails closed on wildcard Disallow slash", () => {
  const robots = `User-agent: *\nDisallow: /\nSitemap: https://soukimmobilier.com/sitemap.xml\n`;
  assert.equal(robotsExplicitlyBlocksAll(robots), true);
  assert.deepEqual(parseRobotsSitemapUrls(robots, "soukimmobilier.com"), []);
});

test("robots parser accepts only explicitly declared same-domain sitemaps", () => {
  const robots = `User-agent: *\nDisallow:\nSitemap: https://www.soukimmobilier.com/sitemap.xml\nSitemap: https://evil.example/sitemap.xml\n`;
  assert.deepEqual(parseRobotsSitemapUrls(robots, "soukimmobilier.com"), ["https://www.soukimmobilier.com/sitemap.xml"]);
});

test("sitemap XML parser distinguishes indexes from urlsets", () => {
  const index = parseSitemapLocs(`<sitemapindex><sitemap><loc>https://a.ma/a.xml</loc></sitemap></sitemapindex>`);
  assert.equal(index.kind, "index");
  assert.deepEqual(index.locs, ["https://a.ma/a.xml"]);
  const urlset = parseSitemapLocs(`<urlset><url><loc>https://a.ma/p/1?a=1&amp;b=2</loc></url></urlset>`);
  assert.equal(urlset.kind, "urlset");
  assert.deepEqual(urlset.locs, ["https://a.ma/p/1?a=1&b=2"]);
});

test("only exact-domain URLs matching audited listing patterns become sitemap seeds", () => {
  const candidates = qualifySitemapListingUrls(
    "soukimmobilier.com",
    "https://soukimmobilier.com/sitemap.xml",
    [
      "https://soukimmobilier.com/fr/casablanca/appartement/12345678",
      "https://soukimmobilier.com/fr/vente/casablanca/maarif",
      "https://other.example/fr/casablanca/appartement/99999999",
    ],
    "2026-07-22T10:00:00.000Z",
    registry,
  );
  assert.deepEqual(candidates.map((candidate) => candidate.canonical_url), [
    "https://soukimmobilier.com/fr/casablanca/appartement/12345678",
  ]);
  const rows = buildSitemapSeedRows(candidates, "2026-07-22T10:01:00.000Z");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].seed_provider, "public_sitemap");
  assert.equal(rows[0].freshness_status, "seed_only");
  assert.equal(rows[0].fresh_last_seen_at, null);
});

test("free acceleration keeps OpenSERP at 10 minutes and sitemap lane separate at 6 hours", () => {
  const openserpWorkflow = readFileSync(join(process.cwd(), ".github/workflows/openserp-github-native-ingestion.yml"), "utf8");
  const sitemapWorkflow = readFileSync(join(process.cwd(), ".github/workflows/sitemap-public-seed-harvest.yml"), "utf8");
  assert.match(openserpWorkflow, /cron:\s*["']\*\/10 \* \* \* \*["']/);
  assert.match(sitemapWorkflow, /cron:\s*["']23 \*\/6 \* \* \*["']/);
});

test("sitemap lane has no public listing write and no arbitrary listing-page fetch path", () => {
  const script = readFileSync(join(process.cwd(), "scripts/openserp/sitemap-registry-mass-harvest.ts"), "utf8");
  assert.ok(script.includes('.from("source_offer_seeds")'));
  assert.equal(script.includes('.from("property_listings")'), false);
  assert.equal(script.includes('.from("listing_sources")'), false);
  assert.equal(script.includes('.from("property_clusters")'), false);
  assert.ok(script.includes('/robots.txt'));
  assert.ok(script.includes("parseRobotsSitemapUrls"));
});