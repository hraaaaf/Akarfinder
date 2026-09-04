import { extractListingRefs, type DiscoveryFetcher, type DiscoveredListingRef } from "./discovery.js";
import {
  buildDiscoveryUrl,
  checkpointPartition,
  completePartition,
  failPartition,
  markPartitionRunning,
  nextFullCoveragePartition,
  type FullCoveragePartition,
  type FullCoverageStopReason,
} from "./full-coverage.js";

export type FullCoverageWaveRef = DiscoveredListingRef & {
  partition_id: string;
  page: number;
};

export type FullCoverageWaveSummary = {
  partitions_available: number;
  partitions_started: number;
  partitions_completed: number;
  partitions_failed: number;
  partitions_deferred: number;
  pages_requested: number;
  pages_succeeded: number;
  listings_discovered: number;
  unique_added: number;
  duplicate_refs: number;
  next_partitions_created: number;
  stopped_by_kill_switch: boolean;
};

export type FullCoverageWaveResult = {
  partitions: FullCoveragePartition[];
  next_partitions: FullCoveragePartition[];
  new_refs: FullCoverageWaveRef[];
  seen_source_ids: string[];
  summary: FullCoverageWaveSummary;
};

function positiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`lot9_runner_invalid_${field}:${value}`);
  return value;
}

function safetyStopReason(error: unknown): FullCoverageStopReason | null {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("robots_disallowed:")) return "robots_disallowed";
  if (message.startsWith("explicit_source_block:")) return "source_block";
  return null;
}

export async function runFullCoverageWave(input: {
  partitions: FullCoveragePartition[];
  fetchPage: DiscoveryFetcher;
  maxPartitions: number;
  pageWindow?: number;
  seenSourceIds?: Iterable<string>;
  isKilled?: () => boolean;
}): Promise<FullCoverageWaveResult> {
  const maxPartitions = positiveInteger(input.maxPartitions, "max_partitions");
  const pageWindow = positiveInteger(input.pageWindow ?? 25, "page_window");
  const seen = new Set(input.seenSourceIds ?? []);
  const partitions = input.partitions.map((partition) => ({ ...partition, errors: [...partition.errors] }));
  const nextPartitions: FullCoveragePartition[] = [];
  const newRefs: FullCoverageWaveRef[] = [];
  let started = 0;
  let completed = 0;
  let failed = 0;
  let pagesRequested = 0;
  let pagesSucceeded = 0;
  let listingsDiscovered = 0;
  let uniqueAdded = 0;
  let duplicateRefs = 0;
  let stoppedByKillSwitch = false;

  for (let index = 0; index < partitions.length; index++) {
    if (started >= maxPartitions) break;
    const original = partitions[index];
    if (original.status !== "pending") continue;

    let current = markPartitionRunning(original);
    started += 1;

    if (input.isKilled?.()) {
      current = completePartition(current, "manual_kill_switch");
      partitions[index] = current;
      completed += 1;
      stoppedByKillSwitch = true;
      break;
    }

    for (let page = current.next_page; page <= current.page_end; page++) {
      if (input.isKilled?.()) {
        current = completePartition(current, "manual_kill_switch");
        completed += 1;
        stoppedByKillSwitch = true;
        break;
      }

      const url = buildDiscoveryUrl(current, page);
      pagesRequested += 1;

      try {
        const html = await input.fetchPage(url);
        pagesSucceeded += 1;
        const refs = extractListingRefs(html, url);
        listingsDiscovered += refs.length;

        let pageUniqueAdded = 0;
        for (const ref of refs) {
          if (seen.has(ref.source_id)) {
            duplicateRefs += 1;
            continue;
          }
          seen.add(ref.source_id);
          pageUniqueAdded += 1;
          uniqueAdded += 1;
          newRefs.push({ ...ref, partition_id: current.partition_id, page });
        }

        current = checkpointPartition(current, {
          page,
          listings_discovered: refs.length,
          unique_added: pageUniqueAdded,
        });

        if (pageUniqueAdded === 0) {
          current = completePartition(current, "zero_new_unique_ids");
          completed += 1;
          break;
        }

        if (page === current.page_end) {
          current = completePartition(current, "window_exhausted");
          completed += 1;
          const next = nextFullCoveragePartition(current, pageWindow);
          if (next) nextPartitions.push(next);
        }
      } catch (error) {
        const stopReason = safetyStopReason(error);
        if (stopReason) {
          current = completePartition(current, stopReason);
          completed += 1;
        } else {
          const message = error instanceof Error ? error.message : String(error);
          current = failPartition(current, message);
          failed += 1;
        }
        break;
      }
    }

    partitions[index] = current;
    if (stoppedByKillSwitch) break;
  }

  return {
    partitions,
    next_partitions: nextPartitions,
    new_refs: newRefs,
    seen_source_ids: [...seen].sort(),
    summary: {
      partitions_available: partitions.filter((partition) => partition.status === "pending").length + started,
      partitions_started: started,
      partitions_completed: completed,
      partitions_failed: failed,
      partitions_deferred: partitions.filter((partition) => partition.status === "pending").length,
      pages_requested: pagesRequested,
      pages_succeeded: pagesSucceeded,
      listings_discovered: listingsDiscovered,
      unique_added: uniqueAdded,
      duplicate_refs: duplicateRefs,
      next_partitions_created: nextPartitions.length,
      stopped_by_kill_switch: stoppedByKillSwitch,
    },
  };
}
