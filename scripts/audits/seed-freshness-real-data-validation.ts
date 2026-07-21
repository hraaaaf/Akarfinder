#!/usr/bin/env tsx
// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#5/10) -- validates the seed
// freshness matcher against REAL data: the 3027 seeds from the real Common
// Crawl harvest (GH Actions run 29806876923) and REAL discovery_candidates
// rows for the same 4 domains (read-only Supabase query). No direct page
// fetch anywhere in this script.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  matchSeedsToFreshObservations,
  summarizeFreshnessResults,
  type SeedForMatching,
  type FreshDiscoveryObservation,
} from "../../lib/seed-freshness/matcher.js";

const DOMAINS = ["soukimmobilier.com", "daragadir.com", "masaken.ma", "atlasimmobilier.com"];

function loadEnv(): Record<string, string> {
  // Read from the main worktree -- .env.local is gitignored and not
  // duplicated across mission worktrees.
  const envPath = "C:/Users/lenovo/Documents/AkarFinder/.env.local";
  const env: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const seedLines = readFileSync(
    join(process.cwd(), "data/audits/raw-results/commoncrawl-top-sources-seeds.jsonl"),
    "utf8",
  ).trim().split("\n");
  const seeds: SeedForMatching[] = seedLines.map((l) => {
    const parsed = JSON.parse(l);
    return { canonical_url: parsed.canonical_url, source_domain: parsed.source_domain };
  });

  const { data, error } = await supabase
    .from("discovery_candidates")
    .select("canonical_url, source_url, discovered_at, discovery_status")
    .in("source_domain", DOMAINS);
  if (error) throw error;
  const freshObservations: FreshDiscoveryObservation[] = data;

  const now = new Date();
  const results = matchSeedsToFreshObservations(seeds, freshObservations, now);
  const overallSummary = summarizeFreshnessResults(results);

  const byDomain: Record<string, unknown> = {};
  for (const domain of DOMAINS) {
    const domainSeeds = seeds.filter((s) => s.source_domain === domain);
    const domainResults = matchSeedsToFreshObservations(domainSeeds, freshObservations, now);
    byDomain[domain] = summarizeFreshnessResults(domainResults);
  }

  console.log(JSON.stringify({
    audit_id: "seed-freshness-real-data-validation",
    generated_at_utc: now.toISOString(),
    real_seeds_source: "GH Actions run 29806876923 (commoncrawl-bulk-seed-harvest.yml)",
    real_fresh_observations_source: "discovery_candidates (live Supabase, read-only)",
    fresh_observations_rows_queried: freshObservations.length,
    overall: overallSummary,
    by_domain: byDomain,
  }, null, 2));
}

main().catch((error) => {
  console.error("Fatal:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
