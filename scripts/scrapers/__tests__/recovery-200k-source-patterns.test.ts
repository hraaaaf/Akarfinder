import assert from "node:assert/strict";
import test from "node:test";
import overlayJson from "@/data/recovery/offline-200k-source-overlay.json";

type PatternEntry = string | { pattern: string; case_insensitive?: boolean };
type Entry = {
  domain: string;
  listing_url_patterns: PatternEntry[];
  blocked_url_patterns: PatternEntry[];
};

const entries = (overlayJson as { domains: Entry[] }).domains;

function get(domain: string): Entry {
  const entry = entries.find((row) => row.domain === domain);
  assert.ok(entry, `missing recovery overlay entry: ${domain}`);
  return entry;
}

function compile(entry: PatternEntry): RegExp {
  return typeof entry === "string"
    ? new RegExp(entry)
    : new RegExp(entry.pattern, entry.case_insensitive ? "i" : undefined);
}

function matches(patterns: PatternEntry[], pathname: string): boolean {
  return patterns.some((pattern) => compile(pattern).test(pathname));
}

test("MarocAnnonces recovery pattern admits detail and rejects collection routes", () => {
  const entry = get("marocannonces.com");
  const positive = "/categorie/315/Appartements/annonce/7564632/Appartement-a-vendre-a-sidi-maarouf.html";
  const negative = "/categorie/315/Vente-immobilier/Appartements/379.html";
  assert.equal(matches(entry.listing_url_patterns, positive), true);
  assert.equal(matches(entry.listing_url_patterns, negative), false);
  assert.equal(matches(entry.blocked_url_patterns, negative), true);
});

test("Sarout.ma recovery pattern admits detail and rejects collection routes", () => {
  const entry = get("sarout.ma");
  const positive = "/fr/annonce/723/appartement-189-m2-en-vente-casablanca";
  const negative = "/fr/annonces";
  assert.equal(matches(entry.listing_url_patterns, positive), true);
  assert.equal(matches(entry.listing_url_patterns, negative), false);
  assert.equal(matches(entry.blocked_url_patterns, negative), true);
});

test("recovery overlay is discovery-only and structurally bounded", () => {
  assert.deepEqual(entries.map((entry) => entry.domain).sort(), ["marocannonces.com", "sarout.ma"]);
  for (const entry of entries) {
    assert.ok(entry.listing_url_patterns.length > 0);
    assert.ok(entry.blocked_url_patterns.length > 0);
  }
});
