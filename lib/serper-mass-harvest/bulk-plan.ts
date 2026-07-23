import { createHash } from "node:crypto";
import { buildDiscoveryHarvestQueries, buildFixedHarvestQueries } from "./planner";
import type { HarvestQuery, HarvestSourceId } from "./types";

export const BULK_HARVEST_BUDGET = 1900;

export const BULK_SOURCE_ALLOCATIONS: ReadonlyArray<{
  source_id: HarvestSourceId;
  count: number;
}> = [
  { source_id: "agenz", count: 450 },
  { source_id: "mubawab", count: 350 },
  { source_id: "1immo", count: 250 },
  { source_id: "long_tail", count: 250 },
  { source_id: "dabaannonce", count: 200 },
  { source_id: "sakane", count: 150 },
  { source_id: "mouldar", count: 100 },
  { source_id: "souqcity", count: 75 },
  { source_id: "afribaba", count: 50 },
  { source_id: "darkom", count: 25 },
];

const QUERY_MODIFIERS = [
  "",
  "prix",
  "surface",
  "chambres",
  "m2",
  "annonce",
  "quartier",
] as const;

function stableId(parts: string[]): string {
  return createHash("sha256").update(parts.join("|"), "utf8").digest("hex").slice(0, 20);
}

function variantText(base: HarvestQuery, modifier: string, variantIndex: number): string {
  let query = base.query;
  if (variantIndex % 4 === 1) {
    query = query.replace(/\ba vendre\b/gi, "vente").replace(/\ba louer\b/gi, "location");
  } else if (variantIndex % 4 === 2) {
    query = query.replace(/\bfor sale\b/gi, "sale").replace(/\bfor rent\b/gi, "rent");
  } else if (variantIndex % 4 === 3 && base.property_type) {
    query = `${query} "${base.property_type}"`;
  }
  if (modifier) query = `${query} ${modifier}`;
  return query.replace(/\s+/g, " ").trim();
}

function expandPool(pool: HarvestQuery[], target: number, sourceId: HarvestSourceId): HarvestQuery[] {
  if (target === 0) return [];
  if (pool.length === 0) throw new Error(`bulk plan has no query pool for ${sourceId}`);

  const output: HarvestQuery[] = [];
  const seen = new Set<string>();
  let variantIndex = 0;

  while (output.length < target) {
    let progressed = false;
    const modifier = QUERY_MODIFIERS[variantIndex % QUERY_MODIFIERS.length];

    for (const base of pool) {
      const query = variantText(base, modifier, variantIndex);
      if (seen.has(query)) continue;
      seen.add(query);
      output.push({
        ...base,
        id: `bulk-${sourceId}-${stableId([base.id, query, String(variantIndex)])}`,
        query,
      });
      progressed = true;
      if (output.length >= target) break;
    }

    variantIndex += 1;
    if (!progressed && variantIndex > QUERY_MODIFIERS.length * 8) {
      throw new Error(`unable to generate ${target} unique bulk queries for ${sourceId}; got ${output.length}`);
    }
  }

  return output;
}

export function buildBulkHarvestQueries(): HarvestQuery[] {
  const fixed = buildFixedHarvestQueries();
  const discovery = buildDiscoveryHarvestQueries();
  const output: HarvestQuery[] = [];

  for (const allocation of BULK_SOURCE_ALLOCATIONS) {
    const pool = allocation.source_id === "long_tail"
      ? discovery
      : fixed.filter((query) => query.source_id === allocation.source_id);
    output.push(...expandPool(pool, allocation.count, allocation.source_id));
  }

  if (output.length !== BULK_HARVEST_BUDGET) {
    throw new Error(`bulk harvest invariant failed: expected ${BULK_HARVEST_BUDGET}, got ${output.length}`);
  }
  if (new Set(output.map((query) => query.query)).size !== output.length) {
    throw new Error("bulk harvest invariant failed: duplicate query text");
  }

  return output;
}
