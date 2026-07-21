#!/usr/bin/env tsx
// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#4/10) -- quality gate over the
// real harvested seed set. Structural false-positive review (independent of
// the regex that admitted them): flags any matched URL containing a known
// non-listing keyword (legal/about/contact/blog/pagination/search-result
// tokens) that would mean the strict registry pattern let a category/utility
// page through. Also computes the daragadir stability verdict from real data.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { daragadirStabilityVerdict, type QualifiedSeed } from "../openserp/commoncrawl-bulk-seed-harvest.js";

const ARTIFACT = join(process.cwd(), "data/audits/raw-results/commoncrawl-top-sources-seeds.jsonl");

// Non-listing signals that would indicate a structural false positive if
// found inside an admitted canonical_url -- category/legal/search/pagination
// pages, never individual listing detail pages.
const SUSPECT_TOKENS = [
  "a-propos", "about-us", "mentions-legales", "politique-de-confidentialite",
  "conditions-generales", "cgv", "cgu", "contact-us", "/contact",
  "/blog/", "/actualites/", "/actualite/", "/news/",
  "/recherche", "/search", "/resultats", "?page=", "/page/",
  "sitemap", "/faq", "/aide", "/help",
];

const STOP_THRESHOLDS: Record<string, number> = {
  "soukimmobilier.com": 0.05,
  "masaken.ma": 0.05,
  "daragadir.com": 0.10,
  "atlasimmobilier.com": 0.10,
};

function main() {
  const lines = readFileSync(ARTIFACT, "utf8").trim().split("\n");
  const seeds: QualifiedSeed[] = lines.map((l) => JSON.parse(l));

  const byDomain = new Map<string, QualifiedSeed[]>();
  for (const s of seeds) {
    if (!byDomain.has(s.source_domain)) byDomain.set(s.source_domain, []);
    byDomain.get(s.source_domain)!.push(s);
  }

  const report: Record<string, unknown> = {
    audit_id: "commoncrawl-bulk-seed-harvest-quality-gate",
    generated_at_utc: new Date().toISOString(),
    total_seeds: seeds.length,
    per_domain: {},
  };

  let anyStop = false;
  for (const [domain, domainSeeds] of byDomain) {
    const suspects = domainSeeds.filter((s) =>
      SUSPECT_TOKENS.some((tok) => s.canonical_url.toLowerCase().includes(tok)),
    );
    const falsePositiveRate = suspects.length / domainSeeds.length;
    const threshold = STOP_THRESHOLDS[domain];
    const stop = falsePositiveRate > threshold;
    if (stop) anyStop = true;

    (report.per_domain as Record<string, unknown>)[domain] = {
      total_qualified_seeds: domainSeeds.length,
      structural_suspects_found: suspects.length,
      structural_false_positive_rate: Number(falsePositiveRate.toFixed(4)),
      stop_threshold: threshold,
      verdict: stop ? "STOP_THRESHOLD_EXCEEDED" : "PASS",
      suspect_sample: suspects.slice(0, 10).map((s) => s.canonical_url),
    };
  }

  const daragadirSeeds = byDomain.get("daragadir.com") ?? [];
  report.daragadir_stability_verdict = daragadirStabilityVerdict(daragadirSeeds);
  report.daragadir_multi_index_seed_count = daragadirSeeds.filter((s) => s.cdx_indexes_seen.length > 1).length;
  report.daragadir_total_seeds = daragadirSeeds.length;

  report.overall_verdict = anyStop ? "STOP_QUALITY_GATE_FAILED" : "PASS_STRICT";
  console.log(JSON.stringify(report, null, 2));
}

main();
