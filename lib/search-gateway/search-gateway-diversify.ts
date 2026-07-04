// SERP-RESULT-QUALITY-DEGROUPING-1
// Post-ranking passes: limit repeated source category pages, then
// interleave sources so the SERP never reads as "grouped by source".
// Both passes preserve total coverage — nothing is discarded, only reordered
// or deferred, with a minimum-coverage backfill guard.

import { isSourceCategoryPageResult } from "./search-gateway-category-detector";

const MIN_COVERAGE = 10;
const MIN_COVERAGE_INPUT_THRESHOLD = 15;

/**
 * Keep at most `maxCategoryPagesPerSource` category-page results per source.
 * Extra category pages are deferred (not discarded) and backfilled only if
 * the remaining coverage drops below a reasonable floor.
 */
export function limitCategoryPagesPerSource<
  T extends { source_id: string; title: string; original_url: string },
>(ranked: T[], maxCategoryPagesPerSource = 1): T[] {
  const categoryCountBySource = new Map<string, number>();
  const kept: T[] = [];
  const deferred: T[] = [];

  for (const result of ranked) {
    if (isSourceCategoryPageResult(result)) {
      const count = categoryCountBySource.get(result.source_id) ?? 0;
      if (count < maxCategoryPagesPerSource) {
        categoryCountBySource.set(result.source_id, count + 1);
        kept.push(result);
      } else {
        deferred.push(result);
      }
    } else {
      kept.push(result);
    }
  }

  if (ranked.length > MIN_COVERAGE_INPUT_THRESHOLD && kept.length < MIN_COVERAGE) {
    const needed = MIN_COVERAGE - kept.length;
    kept.push(...deferred.slice(0, needed));
  }

  return kept;
}

/**
 * Interleave results so no more than `maxConsecutiveSameSource` results from
 * the same source appear back to back, as long as another source has items
 * available. Falls back to same-source runs only when it is genuinely the
 * only source left with remaining items.
 */
export function diversifySearchGatewayResults<T extends { source_id: string }>(
  ranked: readonly T[],
  maxConsecutiveSameSource = 1
): T[] {
  if (ranked.length <= 1) return [...ranked];

  const bySource = new Map<string, T[]>();
  for (const result of ranked) {
    const list = bySource.get(result.source_id) ?? [];
    list.push(result);
    bySource.set(result.source_id, list);
  }

  const result: T[] = [];
  let lastSourceId: string | null = null;
  let consecutiveCount = 0;

  while (result.length < ranked.length) {
    const availableSourceIds: string[] = [...bySource.keys()].filter(
      (sourceId): boolean => (bySource.get(sourceId)?.length ?? 0) > 0
    );
    if (availableSourceIds.length === 0) break;

    const currentLastSourceId: string | null = lastSourceId;
    const blockLastSource: boolean =
      currentLastSourceId !== null &&
      consecutiveCount >= maxConsecutiveSameSource &&
      availableSourceIds.some((sourceId): boolean => sourceId !== currentLastSourceId);

    const candidateSourceIds: string[] = blockLastSource
      ? availableSourceIds.filter((sourceId): boolean => sourceId !== currentLastSourceId)
      : availableSourceIds;

    // Prefer the candidate whose next queued item had the best (lowest index) rank.
    let chosenSourceId: string = candidateSourceIds[0];
    let bestGlobalIndex: number = Infinity;
    for (const sourceId of candidateSourceIds) {
      const nextItem: T = bySource.get(sourceId)![0];
      const globalIndex: number = ranked.indexOf(nextItem);
      if (globalIndex < bestGlobalIndex) {
        bestGlobalIndex = globalIndex;
        chosenSourceId = sourceId;
      }
    }

    const queue: T[] = bySource.get(chosenSourceId)!;
    const next: T = queue.shift()!;
    result.push(next);

    if (chosenSourceId === currentLastSourceId) {
      consecutiveCount += 1;
    } else {
      lastSourceId = chosenSourceId;
      consecutiveCount = 1;
    }
  }

  return result;
}
