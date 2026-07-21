#!/usr/bin/env tsx
// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — sections 10-11.
// Generates data/openserp/query-universe-v1.json: a large, deduplicated pool
// of candidate queries for the rotation planner to draw from (never all
// executed at once — see the bootstrap wave budget and the 30-minute cron's
// per-run budget). Deterministic: rerunning this script with the same inputs
// produces byte-identical query_id/query_hash values (sha256-derived), so
// regenerating never orphans a query's rotation state (last_executed_at/
// next_eligible_at/failure_count/discovery_yield are looked up by query_id
// against the *previous* file and carried forward, never reset to zero).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TIER_1_CITIES,
  TIER_2_CITIES,
  TIER_3_DISTRICTS,
  CITY_ARABIC_NAMES,
  PROPERTY_TYPE_ARABIC_NAMES,
  getCityTier,
} from "@/lib/openserp-ingestion/national-geography";
import type { SourceDomainRegistry } from "@/lib/openserp-ingestion/domain-registry";

type Transaction = "sale" | "rent";
type Engine = "bing" | "duckduckgo" | "ecosia";
type Language = "fr" | "ar";

const PROPERTY_TYPES_FR: readonly string[] = [
  "appartement", "studio", "villa", "maison", "terrain", "riad",
  "bureau", "local commercial", "magasin", "ferme", "immeuble", "duplex",
];

const TRANSACTION_PHRASES_FR: Record<Transaction, string> = {
  sale: "a vendre",
  rent: "a louer",
};

const TRANSACTION_PHRASES_AR: Record<Transaction, string> = {
  sale: "للبيع",
  rent: "كراء",
};

// Deterministic engine rotation: a stable order per query so this run and
// the next don't both hammer the same single engine, without querying every
// engine for every query (section 9's "rotation par moteur").
const ENGINE_ROTATION: readonly Engine[] = ["duckduckgo", "ecosia", "bing"];

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeQueryText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type UniverseQuery = {
  query_id: string;
  normalized_query: string;
  query_hash: string;
  city: string;
  district: string | null;
  transaction: Transaction;
  property_type: string;
  language: Language;
  priority_tier: 1 | 2 | 3 | 4;
  preferred_engine: Engine;
  query_text: string;
  target_domain: string | null;
  query_family: "general" | "brand_hint";
  last_executed_at: string | null;
  next_eligible_at: string | null;
  failure_count: number;
  discovery_yield: number;
};

function buildQuery(input: {
  city: string;
  district: string | null;
  transaction: Transaction;
  propertyType: string;
  language: Language;
  priorityTier: 1 | 2 | 3 | 4;
  targetDomain: string | null;
  queryFamily: "general" | "brand_hint";
  rotationIndex: number;
}): UniverseQuery {
  const transactionPhrase =
    input.language === "fr" ? TRANSACTION_PHRASES_FR[input.transaction] : TRANSACTION_PHRASES_AR[input.transaction];
  const cityLabel = input.language === "fr" ? input.city : (CITY_ARABIC_NAMES[input.city] ?? input.city);
  const propertyTypeLabel =
    input.language === "fr" ? input.propertyType : (PROPERTY_TYPE_ARABIC_NAMES[input.propertyType] ?? input.propertyType);
  const districtLabel = input.district ? ` ${input.district}` : "";

  let queryText: string;
  if (input.targetDomain) {
    queryText = `${input.propertyType} ${transactionPhrase} ${cityLabel} site:${input.targetDomain}`;
  } else {
    queryText = `${propertyTypeLabel} ${transactionPhrase} ${cityLabel}${districtLabel}`;
  }

  const normalized = normalizeQueryText(queryText);
  const idSeed = `${input.city}::${input.district ?? ""}::${input.transaction}::${input.propertyType}::${input.language}::${input.targetDomain ?? ""}`;
  const queryId = `nqu1-${sha256(idSeed).slice(0, 16)}`;
  const queryHash = sha256(`openserp::${normalized}`);
  const preferredEngine = ENGINE_ROTATION[input.rotationIndex % ENGINE_ROTATION.length];

  return {
    query_id: queryId,
    normalized_query: normalized,
    query_hash: queryHash,
    city: input.city,
    district: input.district,
    transaction: input.transaction,
    property_type: input.propertyType,
    language: input.language,
    priority_tier: input.priorityTier,
    preferred_engine: preferredEngine,
    query_text: queryText,
    target_domain: input.targetDomain,
    query_family: input.queryFamily,
    last_executed_at: null,
    next_eligible_at: null,
    failure_count: 0,
    discovery_yield: 0,
  };
}

export function buildUniverse(): UniverseQuery[] {
  const queries: UniverseQuery[] = [];
  let rotationIndex = 0;

  // --- Tier 1 + Tier 2 city-level queries (French + Arabic) -------------
  for (const city of [...TIER_1_CITIES, ...TIER_2_CITIES]) {
    const tier = getCityTier(city) ?? 2;
    for (const propertyType of PROPERTY_TYPES_FR) {
      for (const transaction of ["sale", "rent"] as Transaction[]) {
        for (const language of ["fr", "ar"] as Language[]) {
          queries.push(
            buildQuery({
              city,
              district: null,
              transaction,
              propertyType,
              language,
              priorityTier: tier === 1 ? 1 : 2,
              targetDomain: null,
              queryFamily: "general",
              rotationIndex: rotationIndex++,
            }),
          );
        }
      }
    }
  }

  // --- Tier 3 district-level queries (French only) -----------------------
  for (const [city, districts] of Object.entries(TIER_3_DISTRICTS)) {
    for (const district of districts) {
      for (const propertyType of PROPERTY_TYPES_FR) {
        for (const transaction of ["sale", "rent"] as Transaction[]) {
          queries.push(
            buildQuery({
              city,
              district,
              transaction,
              propertyType,
              language: "fr",
              priorityTier: 3,
              targetDomain: null,
              queryFamily: "general",
              rotationIndex: rotationIndex++,
            }),
          );
        }
      }
    }
  }

  // --- Source-specific queries, approved domains only (section 10.E) -----
  // OPENSERP-QUERY-UNIVERSE-REGIONAL-DOMAIN-CITY-SCOPING-1: a domain with a
  // non-empty coverage_cities generates site:<domain> queries for exactly
  // those cities instead of the full TIER_1_CITIES cross-product -- may
  // include a city outside TIER_1_CITIES (e.g. "Essaouira"), used as-is
  // with no membership check. null/absent coverage_cities keeps the prior
  // national behavior unchanged. Affects only this loop -- the generic
  // city-level and district-level query blocks above never read
  // coverage_cities at all.
  const registryPath = join(process.cwd(), "data/openserp/source-domain-registry.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf8")) as SourceDomainRegistry;
  const approvedEntries = registry.domains.filter(
    (entry) => entry.status === "approved_discovery" || entry.status === "partner" || entry.status === "authorized_static",
  );

  for (const entry of approvedEntries) {
    const cities = entry.coverage_cities && entry.coverage_cities.length > 0 ? entry.coverage_cities : TIER_1_CITIES;
    for (const city of cities) {
      for (const transaction of ["sale", "rent"] as Transaction[]) {
        queries.push(
          buildQuery({
            city,
            district: null,
            transaction,
            propertyType: "appartement",
            language: "fr",
            priorityTier: 4,
            targetDomain: entry.domain,
            queryFamily: "brand_hint",
            rotationIndex: rotationIndex++,
          }),
        );
      }
    }
  }

  // Deduplicate on normalized_query (a French/Arabic mix or a district/no-
  // district collision could theoretically coincide; keep the first, lowest
  // priority_tier number wins since tiers are generated in ascending order).
  const byNormalized = new Map<string, UniverseQuery>();
  for (const query of queries) {
    if (!byNormalized.has(query.normalized_query)) {
      byNormalized.set(query.normalized_query, query);
    }
  }

  return [...byNormalized.values()];
}

function carryForwardRotationState(newUniverse: UniverseQuery[], previousPath: string): UniverseQuery[] {
  if (!existsSync(previousPath)) return newUniverse;
  const previous = JSON.parse(readFileSync(previousPath, "utf8")) as { queries: UniverseQuery[] };
  const previousById = new Map(previous.queries.map((q) => [q.query_id, q]));
  return newUniverse.map((query) => {
    const prior = previousById.get(query.query_id);
    if (!prior) return query;
    return {
      ...query,
      last_executed_at: prior.last_executed_at,
      next_eligible_at: prior.next_eligible_at,
      failure_count: prior.failure_count,
      discovery_yield: prior.discovery_yield,
    };
  });
}

function main() {
  const outPath = join(process.cwd(), "data/openserp/query-universe-v1.json");
  const universe = carryForwardRotationState(buildUniverse(), outPath);

  const byTier: Record<number, number> = {};
  const byLanguage: Record<string, number> = {};
  for (const q of universe) {
    byTier[q.priority_tier] = (byTier[q.priority_tier] ?? 0) + 1;
    byLanguage[q.language] = (byLanguage[q.language] ?? 0) + 1;
  }

  const output = {
    universe_version: "openserp-query-universe-v1",
    generated_at: new Date().toISOString(),
    total_queries: universe.length,
    by_priority_tier: byTier,
    by_language: byLanguage,
    cities_covered: [...new Set(universe.map((q) => q.city))].length,
    districts_covered: [...new Set(universe.filter((q) => q.district).map((q) => `${q.city}::${q.district}`))].length,
    queries: universe,
  };

  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        total_queries: output.total_queries,
        by_priority_tier: output.by_priority_tier,
        by_language: output.by_language,
        cities_covered: output.cities_covered,
        districts_covered: output.districts_covered,
      },
      null,
      2,
    ),
  );
}

// OPENSERP-QUERY-UNIVERSE-REGIONAL-DOMAIN-CITY-SCOPING-1: guard added so
// buildUniverse() can be imported (e.g. by tests, or by an offline
// comparison script) without ever writing to
// data/openserp/query-universe-v1.json as a side effect of module load --
// only running this file directly (tsx scripts/openserp/build-query-
// universe.ts) still triggers main(), exactly as before.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
