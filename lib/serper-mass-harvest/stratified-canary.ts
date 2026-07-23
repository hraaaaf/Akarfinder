import { buildDiscoveryHarvestQueries, buildFixedHarvestQueries } from "./planner";
import type { HarvestQuery, HarvestSourceId } from "./types";

export const STRATIFIED_CANARY_BUDGET = 50;

export const STRATIFIED_CANARY_ALLOCATIONS: ReadonlyArray<{
  source_id: HarvestSourceId;
  count: number;
}> = [
  { source_id: "mubawab", count: 6 },
  { source_id: "avito", count: 6 },
  { source_id: "sarouty", count: 6 },
  { source_id: "agenz", count: 5 },
  { source_id: "1immo", count: 4 },
  { source_id: "mouldar", count: 4 },
  { source_id: "sakane", count: 4 },
  { source_id: "dabaannonce", count: 4 },
  { source_id: "souqcity", count: 3 },
  { source_id: "afribaba", count: 2 },
  { source_id: "darkom", count: 2 },
  { source_id: "long_tail", count: 4 },
];

function sampleEvenly<T>(values: readonly T[], count: number): T[] {
  if (count < 0 || count > values.length) {
    throw new Error(`cannot sample ${count} values from ${values.length}`);
  }
  if (count === 0) return [];
  if (count === values.length) return [...values];

  return Array.from({ length: count }, (_, index) => {
    const midpoint = ((index + 0.5) * values.length) / count;
    const selectedIndex = Math.min(values.length - 1, Math.floor(midpoint));
    return values[selectedIndex];
  });
}

export function buildStratifiedCanaryQueries(): HarvestQuery[] {
  const fixed = buildFixedHarvestQueries();
  const discovery = buildDiscoveryHarvestQueries();
  const output: HarvestQuery[] = [];

  for (const allocation of STRATIFIED_CANARY_ALLOCATIONS) {
    const pool = allocation.source_id === "long_tail"
      ? discovery
      : fixed.filter((query) => query.source_id === allocation.source_id);

    const sampled = sampleEvenly(pool, allocation.count).map((query, index) => ({
      ...query,
      id: `stratified-${allocation.source_id}-${index + 1}-${query.id}`,
    }));
    output.push(...sampled);
  }

  if (output.length !== STRATIFIED_CANARY_BUDGET) {
    throw new Error(`stratified canary invariant failed: expected ${STRATIFIED_CANARY_BUDGET}, got ${output.length}`);
  }
  if (new Set(output.map((query) => query.query)).size !== output.length) {
    throw new Error("stratified canary invariant failed: duplicate query text");
  }

  return output;
}
