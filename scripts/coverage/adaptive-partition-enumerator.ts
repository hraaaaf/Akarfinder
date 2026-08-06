import { auditCoverageSegment, type CoverageSegmentAudit, type CoverageSegmentInput } from "./coverage-gap-auditor";

export type PartitionDimension = "district" | "price" | "surface" | "rooms";

export interface PartitionRange {
  min?: number;
  max?: number;
}

export interface PartitionFilters {
  district?: string;
  price?: PartitionRange;
  surface?: PartitionRange;
  rooms?: PartitionRange;
}

export interface PartitionNode {
  key: string;
  depth: number;
  filters: PartitionFilters;
}

export interface PartitionProbeResult extends Omit<CoverageSegmentInput, "segmentKey"> {
  segmentKey?: string;
}

export interface PartitionStrategy {
  dimension: PartitionDimension;
  split: (node: PartitionNode, audit: CoverageSegmentAudit) => PartitionNode[];
}

export interface AdaptivePartitionOptions {
  rootKey: string;
  maxDepth?: number;
  maxNodes?: number;
  strategies: PartitionStrategy[];
}

export interface AdaptivePartitionDeps {
  probe: (node: PartitionNode) => Promise<PartitionProbeResult>;
}

export interface AdaptivePartitionResult {
  nodesVisited: number;
  leaves: Array<{ node: PartitionNode; audit: CoverageSegmentAudit }>;
  partitioned: Array<{ node: PartitionNode; audit: CoverageSegmentAudit; dimension: PartitionDimension }>;
  stopped: Array<{ node: PartitionNode; audit: CoverageSegmentAudit; reason: "max_depth" | "no_strategy" | "no_progress" | "max_nodes" }>;
  uniqueListingUrls: string[];
}

const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_MAX_NODES = 500;

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${field} must be a positive safe integer`);
}

function normalizeUrl(value: string): string {
  const url = new URL(value.trim());
  url.hash = "";
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

function canonicalFilters(filters: PartitionFilters): string {
  return JSON.stringify({
    district: filters.district,
    price: filters.price ? { min: filters.price.min, max: filters.price.max } : undefined,
    surface: filters.surface ? { min: filters.surface.min, max: filters.surface.max } : undefined,
    rooms: filters.rooms ? { min: filters.rooms.min, max: filters.rooms.max } : undefined,
  });
}

function validateChildren(parent: PartitionNode, children: PartitionNode[]): boolean {
  if (children.length < 2) return false;
  const parentFilters = canonicalFilters(parent.filters);
  const keys = new Set<string>();
  const filters = new Set<string>();
  for (const child of children) {
    if (!child.key.trim() || child.depth !== parent.depth + 1) return false;
    if (child.key === parent.key || canonicalFilters(child.filters) === parentFilters) return false;
    if (keys.has(child.key) || filters.has(canonicalFilters(child.filters))) return false;
    keys.add(child.key);
    filters.add(canonicalFilters(child.filters));
  }
  return true;
}

export async function enumerateAdaptivePartitions(
  options: AdaptivePartitionOptions,
  deps: AdaptivePartitionDeps,
): Promise<AdaptivePartitionResult> {
  if (!options.rootKey.trim()) throw new Error("rootKey is required");
  if (options.strategies.length === 0) throw new Error("at least one partition strategy is required");
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  assertPositiveInteger(maxDepth, "maxDepth");
  assertPositiveInteger(maxNodes, "maxNodes");

  const queue: PartitionNode[] = [{ key: options.rootKey.trim(), depth: 0, filters: {} }];
  const seenNodeFilters = new Set<string>();
  const uniqueListingUrls = new Set<string>();
  const leaves: AdaptivePartitionResult["leaves"] = [];
  const partitioned: AdaptivePartitionResult["partitioned"] = [];
  const stopped: AdaptivePartitionResult["stopped"] = [];
  let nodesVisited = 0;

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (nodesVisited >= maxNodes) {
      const probe = await deps.probe(node);
      const audit = auditCoverageSegment({ ...probe, segmentKey: probe.segmentKey ?? node.key });
      for (const url of probe.listingUrls) uniqueListingUrls.add(normalizeUrl(url));
      stopped.push({ node, audit, reason: "max_nodes" });
      continue;
    }

    const fingerprint = canonicalFilters(node.filters);
    if (seenNodeFilters.has(fingerprint)) continue;
    seenNodeFilters.add(fingerprint);
    nodesVisited++;

    const probe = await deps.probe(node);
    const audit = auditCoverageSegment({ ...probe, segmentKey: probe.segmentKey ?? node.key });
    for (const url of probe.listingUrls) uniqueListingUrls.add(normalizeUrl(url));

    if (!audit.partitionRequired) {
      leaves.push({ node, audit });
      continue;
    }
    if (node.depth >= maxDepth) {
      stopped.push({ node, audit, reason: "max_depth" });
      continue;
    }

    let chosen: { strategy: PartitionStrategy; children: PartitionNode[] } | null = null;
    for (const strategy of options.strategies) {
      const children = strategy.split(node, audit);
      if (validateChildren(node, children)) {
        chosen = { strategy, children };
        break;
      }
    }

    if (!chosen) {
      stopped.push({ node, audit, reason: options.strategies.length ? "no_progress" : "no_strategy" });
      continue;
    }

    partitioned.push({ node, audit, dimension: chosen.strategy.dimension });
    queue.push(...chosen.children);
  }

  return {
    nodesVisited,
    leaves,
    partitioned,
    stopped,
    uniqueListingUrls: [...uniqueListingUrls].sort(),
  };
}

export function numericRangeStrategy(
  dimension: "price" | "surface" | "rooms",
  boundaries: number[],
): PartitionStrategy {
  const sorted = [...new Set(boundaries)].sort((a, b) => a - b);
  if (sorted.length === 0 || sorted.some((v) => !Number.isSafeInteger(v) || v < 0)) {
    throw new Error(`${dimension} boundaries must contain non-negative safe integers`);
  }
  return {
    dimension,
    split(node) {
      if (node.filters[dimension]) return [];
      const ranges: PartitionRange[] = [];
      let min = 0;
      for (const boundary of sorted) {
        if (boundary < min) continue;
        ranges.push({ min, max: boundary });
        min = boundary + 1;
      }
      ranges.push({ min });
      return ranges.map((range, index) => ({
        key: `${node.key}/${dimension}:${index + 1}`,
        depth: node.depth + 1,
        filters: { ...node.filters, [dimension]: range },
      }));
    },
  };
}

export function districtStrategy(districts: string[]): PartitionStrategy {
  const values = [...new Set(districts.map((v) => v.trim()).filter(Boolean))].sort();
  return {
    dimension: "district",
    split(node) {
      if (node.filters.district || values.length < 2) return [];
      return values.map((district) => ({
        key: `${node.key}/district:${district}`,
        depth: node.depth + 1,
        filters: { ...node.filters, district },
      }));
    },
  };
}
