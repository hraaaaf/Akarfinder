import { extractListingRefs } from "./discovery.js";
import { paginatedCatalogUrl } from "./catalog-overlap.js";

export type CatalogCoverageSurfaceConfig = {
  id: string;
  base_url: string;
};

export type CatalogCoverageSurfaceState = CatalogCoverageSurfaceConfig & {
  next_page: number;
  completed: boolean;
  stop_reason: "zero_refs" | "zero_new_surface_ids" | null;
  pages_requested: number;
  refs_discovered: number;
  global_unique_added: number;
  seen_source_ids: string[];
};

export type CatalogCoverageWaveRecord = {
  wave_id: string;
  pages_requested: number;
  refs_discovered: number;
  global_unique_added: number;
  completed_surfaces: number;
};

export type CatalogCoverageState = {
  version: 1;
  source: "mubawab";
  baseline_unique_ids: number;
  seen_source_ids: string[];
  surfaces: CatalogCoverageSurfaceState[];
  totals: {
    pages_requested: number;
    refs_discovered: number;
    global_unique_added: number;
  };
  wave_history: CatalogCoverageWaveRecord[];
};

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

export function createCatalogCoverageState(input: {
  baselineSourceIds: Iterable<string>;
  surfaces: CatalogCoverageSurfaceConfig[];
}): CatalogCoverageState {
  const baseline = uniqueSorted(input.baselineSourceIds);
  const ids = new Set<string>();
  for (const surface of input.surfaces) {
    if (!surface.id || ids.has(surface.id)) throw new Error(`lot9_catalog_coverage_duplicate_surface:${surface.id}`);
    if (!surface.base_url.startsWith("https://www.mubawab.ma/")) {
      throw new Error(`lot9_catalog_coverage_invalid_url:${surface.id}`);
    }
    ids.add(surface.id);
  }

  return {
    version: 1,
    source: "mubawab",
    baseline_unique_ids: baseline.length,
    seen_source_ids: baseline,
    surfaces: input.surfaces.map((surface) => ({
      ...surface,
      next_page: 1,
      completed: false,
      stop_reason: null,
      pages_requested: 0,
      refs_discovered: 0,
      global_unique_added: 0,
      seen_source_ids: [],
    })),
    totals: {
      pages_requested: 0,
      refs_discovered: 0,
      global_unique_added: 0,
    },
    wave_history: [],
  };
}

export async function runCatalogCoverageWave(input: {
  state: CatalogCoverageState;
  waveId: string;
  maxPages: number;
  maxPagesPerSurface: number;
  fetchPage: (url: string) => Promise<string>;
  onCheckpoint?: (state: CatalogCoverageState) => Promise<void> | void;
}): Promise<CatalogCoverageState> {
  if (!input.waveId) throw new Error("lot9_catalog_coverage_missing_wave_id");
  if (input.state.wave_history.some((wave) => wave.wave_id === input.waveId)) {
    throw new Error(`lot9_catalog_coverage_duplicate_wave:${input.waveId}`);
  }
  if (!Number.isInteger(input.maxPages) || input.maxPages < 1 || input.maxPages > 300) {
    throw new Error(`lot9_catalog_coverage_invalid_max_pages:${input.maxPages}`);
  }
  if (!Number.isInteger(input.maxPagesPerSurface) || input.maxPagesPerSurface < 1 || input.maxPagesPerSurface > 150) {
    throw new Error(`lot9_catalog_coverage_invalid_surface_page_cap:${input.maxPagesPerSurface}`);
  }

  const state = structuredClone(input.state);
  if (state.version !== 1 || state.source !== "mubawab") throw new Error("lot9_catalog_coverage_invalid_state");
  if (state.seen_source_ids.length < state.baseline_unique_ids) throw new Error("lot9_catalog_coverage_seen_id_regression");

  const globalSeen = new Set(state.seen_source_ids);
  const perSurfaceBudget = new Map(state.surfaces.map((surface) => [surface.id, 0]));
  let wavePages = 0;
  let waveRefs = 0;
  let waveGlobalAdded = 0;
  const completedBefore = state.surfaces.filter((surface) => surface.completed).length;

  while (wavePages < input.maxPages) {
    let progressed = false;

    for (const surface of state.surfaces) {
      if (wavePages >= input.maxPages) break;
      if (surface.completed) continue;
      const used = perSurfaceBudget.get(surface.id) ?? 0;
      if (used >= input.maxPagesPerSurface) continue;
      if (!Number.isInteger(surface.next_page) || surface.next_page < 1 || surface.next_page > 500) {
        throw new Error(`lot9_catalog_coverage_unsafe_next_page:${surface.id}:${surface.next_page}`);
      }

      progressed = true;
      const url = paginatedCatalogUrl(surface.base_url, surface.next_page);
      const html = await input.fetchPage(url);
      const refs = extractListingRefs(html, url);
      const surfaceSeen = new Set(surface.seen_source_ids);
      let newSurfaceIds = 0;
      let newGlobalIds = 0;

      for (const ref of refs) {
        if (!surfaceSeen.has(ref.source_id)) {
          surfaceSeen.add(ref.source_id);
          newSurfaceIds += 1;
        }
        if (!globalSeen.has(ref.source_id)) {
          globalSeen.add(ref.source_id);
          newGlobalIds += 1;
        }
      }

      surface.pages_requested += 1;
      surface.refs_discovered += refs.length;
      surface.global_unique_added += newGlobalIds;
      surface.seen_source_ids = uniqueSorted(surfaceSeen);
      state.totals.pages_requested += 1;
      state.totals.refs_discovered += refs.length;
      state.totals.global_unique_added += newGlobalIds;
      wavePages += 1;
      waveRefs += refs.length;
      waveGlobalAdded += newGlobalIds;
      perSurfaceBudget.set(surface.id, used + 1);

      if (refs.length === 0) {
        surface.completed = true;
        surface.stop_reason = "zero_refs";
      } else if (newSurfaceIds === 0) {
        surface.completed = true;
        surface.stop_reason = "zero_new_surface_ids";
      } else {
        surface.next_page += 1;
      }

      state.seen_source_ids = uniqueSorted(globalSeen);
      if (input.onCheckpoint) await input.onCheckpoint(state);
    }

    if (!progressed) break;
  }

  state.seen_source_ids = uniqueSorted(globalSeen);
  state.wave_history.push({
    wave_id: input.waveId,
    pages_requested: wavePages,
    refs_discovered: waveRefs,
    global_unique_added: waveGlobalAdded,
    completed_surfaces: state.surfaces.filter((surface) => surface.completed).length - completedBefore,
  });
  if (input.onCheckpoint) await input.onCheckpoint(state);
  return state;
}
