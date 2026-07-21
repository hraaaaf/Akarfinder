#!/usr/bin/env tsx
// SEARXNG-VS-OPENSERP-DISCOVERY-POC-1
// Builds a fixed, deterministic, reproducible 100-query benchmark from the
// existing query universe (data/openserp/query-universe-v1.json), stratified
// across major/secondary cities, sale/rent, and property types, favoring
// tier-3 (district-level) queries where available (this codebase's own
// documented finding: district-level queries yield individual listings far
// more often than tier-1 city-only queries, which mostly surface category
// pages -- see docs/OPENSERP_QUERY_COVERAGE_STRATEGY.md). Read-only against
// the universe file; writes only the benchmark output file, never touches
// any DB, any rotation state, or the universe file itself.
//
// Every engine in the comparison (OpenSERP and every SearXNG candidate) is
// run against this exact same 100-query list -- generated once and
// committed, not regenerated per run, so the benchmark itself never drifts
// between engines or between repeated runs.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type UniverseQuery = {
  query_id: string;
  city: string;
  district: string | null;
  transaction: "sale" | "rent";
  property_type: string;
  priority_tier: 1 | 2 | 3 | 4;
  query_text: string;
  target_domain: string | null;
  query_family: "general" | "brand_hint";
};

const MAJOR_CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"];
const SECONDARY_CITIES = ["Salé", "Témara", "Meknès", "Kénitra", "El Jadida", "Oujda", "Tétouan", "Nador", "Mohammedia", "Essaouira"];
const PROPERTY_TYPE_CYCLE = ["appartement", "villa", "terrain", "local commercial", "studio", "maison"];

const MAJOR_PICKS_PER_CITY = 10; // 6 cities x 10 = 60
const SECONDARY_PICKS_PER_CITY = 4; // 10 cities x 4 = 40
// 60 + 40 = 100

function pickForCity(universe: UniverseQuery[], city: string, count: number): UniverseQuery[] {
  const cityQueries = universe.filter((q) => q.city === city);
  const picked: UniverseQuery[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    const transaction: "sale" | "rent" = i % 2 === 0 ? "sale" : "rent";
    const propertyType = PROPERTY_TYPE_CYCLE[i % PROPERTY_TYPE_CYCLE.length];

    // Prefer a tier-3 (district-level) match for this (transaction, property_type)
    // slot -- district queries are this codebase's own documented highest-yield
    // category. Fall back to tier-1 (city-only) if no district-level query
    // exists for that exact combination, then to any remaining match.
    const candidates = cityQueries.filter(
      (q) => q.transaction === transaction && q.property_type === propertyType && !usedIds.has(q.query_id),
    );
    const tier3 = candidates.filter((q) => q.priority_tier === 3);
    const tier1 = candidates.filter((q) => q.priority_tier === 1);
    const chosen = tier3[0] ?? tier1[0] ?? candidates[0];

    if (chosen) {
      picked.push(chosen);
      usedIds.add(chosen.query_id);
    }
  }

  return picked;
}

function main() {
  const universePath = join(process.cwd(), "data/openserp/query-universe-v1.json");
  const universe = JSON.parse(readFileSync(universePath, "utf8")) as { queries: UniverseQuery[] };

  const benchmark: UniverseQuery[] = [];
  for (const city of MAJOR_CITIES) {
    benchmark.push(...pickForCity(universe.queries, city, MAJOR_PICKS_PER_CITY));
  }
  for (const city of SECONDARY_CITIES) {
    benchmark.push(...pickForCity(universe.queries, city, SECONDARY_PICKS_PER_CITY));
  }

  const output = {
    generated_from: "data/openserp/query-universe-v1.json",
    total_queries: benchmark.length,
    major_cities: MAJOR_CITIES,
    secondary_cities: SECONDARY_CITIES,
    queries: benchmark.map((q) => ({
      query_id: q.query_id,
      city: q.city,
      district: q.district,
      transaction: q.transaction,
      property_type: q.property_type,
      priority_tier: q.priority_tier,
      query_text: q.query_text,
      target_domain: q.target_domain,
      query_family: q.query_family,
    })),
  };

  const outPath = join(process.cwd(), "scripts/searxng-poc/benchmark-100-queries.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote ${benchmark.length} queries to ${outPath}`);
  console.log(`Cities covered: ${[...new Set(benchmark.map((q) => q.city))].length}`);
  console.log(`Districts present: ${benchmark.filter((q) => q.district).length}/${benchmark.length}`);
  console.log(`Tier breakdown: ${JSON.stringify(benchmark.reduce((acc: Record<number, number>, q) => ({ ...acc, [q.priority_tier]: (acc[q.priority_tier] ?? 0) + 1 }), {}))}`);
}

main();
