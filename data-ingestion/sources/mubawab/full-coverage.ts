import config from "./config.json" with { type: "json" };

export type FullCoveragePartitionStatus = "pending" | "running" | "completed" | "failed";
export type FullCoverageStopReason = "window_exhausted" | "zero_new_unique_ids" | "robots_disallowed" | "source_block" | "manual_kill_switch";

export type FullCoverageScope = {
  scope_id: string;
  city: string;
  city_slug: string;
  category_key: string;
  transaction: "sale" | "rent";
  property_type: string;
};

export type FullCoveragePartition = FullCoverageScope & {
  partition_id: string;
  page_start: number;
  page_end: number;
  next_page: number;
  status: FullCoveragePartitionStatus;
  pages_processed: number;
  listings_discovered: number;
  unique_added: number;
  errors: string[];
  stop_reason: FullCoverageStopReason | null;
};

const DEFAULT_PAGE_WINDOW = 25;

function positiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`lot9_invalid_${field}:${value}`);
  return value;
}

function categoryByKey(key: string) {
  const category = config.categories.find((item) => item.key === key);
  if (!category || !category.enabled) throw new Error(`lot9_unknown_or_disabled_category:${key}`);
  return category;
}

function cityByName(name: string) {
  const city = config.cities.find((item) => item.name === name);
  if (!city) throw new Error(`lot9_unknown_city:${name}`);
  return city;
}

export function buildFullCoverageScopes(): FullCoverageScope[] {
  const scopes: FullCoverageScope[] = [];
  for (const city of config.cities) {
    for (const category of config.categories) {
      if (!category.enabled) continue;
      scopes.push({
        scope_id: `${city.slug}:${category.key}`,
        city: city.name,
        city_slug: city.slug,
        category_key: category.key,
        transaction: category.transaction as "sale" | "rent",
        property_type: category.property_type,
      });
    }
  }
  return scopes;
}

export function createFullCoveragePartition(
  scope: FullCoverageScope,
  pageStart = 1,
  pageWindow = DEFAULT_PAGE_WINDOW,
): FullCoveragePartition {
  positiveInteger(pageStart, "page_start");
  positiveInteger(pageWindow, "page_window");
  const pageEnd = pageStart + pageWindow - 1;
  return {
    ...scope,
    partition_id: `${scope.scope_id}:p${pageStart}-${pageEnd}`,
    page_start: pageStart,
    page_end: pageEnd,
    next_page: pageStart,
    status: "pending",
    pages_processed: 0,
    listings_discovered: 0,
    unique_added: 0,
    errors: [],
    stop_reason: null,
  };
}

export function buildInitialFullCoveragePlan(pageWindow = DEFAULT_PAGE_WINDOW): FullCoveragePartition[] {
  positiveInteger(pageWindow, "page_window");
  return buildFullCoverageScopes().map((scope) => createFullCoveragePartition(scope, 1, pageWindow));
}

export function markPartitionRunning(partition: FullCoveragePartition): FullCoveragePartition {
  if (partition.status !== "pending") throw new Error(`lot9_partition_not_pending:${partition.partition_id}:${partition.status}`);
  return { ...partition, status: "running", stop_reason: null };
}

export function checkpointPartition(
  partition: FullCoveragePartition,
  input: { page: number; listings_discovered: number; unique_added: number },
): FullCoveragePartition {
  if (partition.status !== "running") throw new Error(`lot9_partition_not_running:${partition.partition_id}:${partition.status}`);
  if (!Number.isInteger(input.page) || input.page < partition.next_page || input.page > partition.page_end) {
    throw new Error(`lot9_invalid_checkpoint_page:${partition.partition_id}:${input.page}`);
  }
  if (input.listings_discovered < 0 || input.unique_added < 0 || input.unique_added > input.listings_discovered) {
    throw new Error(`lot9_invalid_checkpoint_counts:${partition.partition_id}`);
  }
  const pagesDelta = input.page - partition.next_page + 1;
  return {
    ...partition,
    next_page: input.page + 1,
    pages_processed: partition.pages_processed + pagesDelta,
    listings_discovered: partition.listings_discovered + input.listings_discovered,
    unique_added: partition.unique_added + input.unique_added,
  };
}

export function pausePartition(partition: FullCoveragePartition): FullCoveragePartition {
  if (partition.status !== "running") throw new Error(`lot9_partition_not_running:${partition.partition_id}:${partition.status}`);
  return { ...partition, status: "pending", stop_reason: "manual_kill_switch" };
}

export function completePartition(
  partition: FullCoveragePartition,
  stopReason: Extract<FullCoverageStopReason, "window_exhausted" | "zero_new_unique_ids" | "robots_disallowed" | "source_block">,
): FullCoveragePartition {
  if (partition.status !== "running") throw new Error(`lot9_partition_not_running:${partition.partition_id}:${partition.status}`);
  return { ...partition, status: "completed", stop_reason: stopReason };
}

export function failPartition(partition: FullCoveragePartition, error: string): FullCoveragePartition {
  if (partition.status !== "running") throw new Error(`lot9_partition_not_running:${partition.partition_id}:${partition.status}`);
  if (!error.trim()) throw new Error(`lot9_empty_partition_error:${partition.partition_id}`);
  return { ...partition, status: "failed", errors: [...partition.errors, error] };
}

export function nextFullCoveragePartition(
  completed: FullCoveragePartition,
  pageWindow = DEFAULT_PAGE_WINDOW,
): FullCoveragePartition | null {
  positiveInteger(pageWindow, "page_window");
  if (completed.status !== "completed") throw new Error(`lot9_partition_not_completed:${completed.partition_id}:${completed.status}`);

  if (completed.stop_reason !== "window_exhausted") return null;

  const scope: FullCoverageScope = {
    scope_id: completed.scope_id,
    city: completed.city,
    city_slug: completed.city_slug,
    category_key: completed.category_key,
    transaction: completed.transaction,
    property_type: completed.property_type,
  };
  return createFullCoveragePartition(scope, completed.page_end + 1, pageWindow);
}

export function buildDiscoveryUrl(partition: FullCoveragePartition, page: number): string {
  if (!Number.isInteger(page) || page < partition.page_start || page > partition.page_end) {
    throw new Error(`lot9_page_outside_partition:${partition.partition_id}:${page}`);
  }
  const city = cityByName(partition.city);
  const category = categoryByKey(partition.category_key);
  const suffix = page === 1 ? "" : `:p:${page}`;
  return `${config.base_url}/fr/st/${encodeURIComponent(city.slug)}/${category.st_slug}${suffix}`;
}
