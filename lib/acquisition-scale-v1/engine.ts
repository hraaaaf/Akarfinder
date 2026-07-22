import type { QueryUniverseV2Item } from "../openserp-ingestion/query-universe-v2";

export const TARGET_RAW_OBSERVATIONS = 100_000;
export const TARGET_UNIQUE_CLUSTERS = 37_000;
export const DEFAULT_SCALE_WAVE_SIZE = 250;

export type AcquisitionBaseline = {
  discovery_candidate_rows: number;
  source_offer_observation_rows: number;
  unique_canonical_urls: number;
  property_clusters: number;
};

export type AcquisitionProgress = AcquisitionBaseline & {
  raw_observations: number;
  observation_progress_pct: number;
  cluster_progress_pct: number;
  remaining_observations: number;
  remaining_clusters: number;
  phase: "bootstrap" | "expansion" | "mass_coverage" | "target_reached";
};

export const ACQUISITION_CHANNELS = [
  { id: "openserp_query_rotation", role: "fresh_discovery", target_share_pct: 55 },
  { id: "commoncrawl_seed_harvest", role: "bulk_seed_discovery", target_share_pct: 25 },
  { id: "direct_authorized_feeds", role: "authorized_structured_supply", target_share_pct: 15 },
  { id: "partner_first_party", role: "owned_or_authorized_supply", target_share_pct: 5 },
] as const;

function pct(value: number, target: number) {
  return Math.min(100, Math.round((Math.max(0, value) / target) * 10_000) / 100);
}

export function computeAcquisitionProgress(input: AcquisitionBaseline): AcquisitionProgress {
  const rawObservations = Math.max(0, input.discovery_candidate_rows) + Math.max(0, input.source_offer_observation_rows);
  const observationProgress = pct(rawObservations, TARGET_RAW_OBSERVATIONS);
  const clusterProgress = pct(input.property_clusters, TARGET_UNIQUE_CLUSTERS);
  const phase = observationProgress >= 100
    ? "target_reached"
    : observationProgress >= 50
      ? "mass_coverage"
      : observationProgress >= 10
        ? "expansion"
        : "bootstrap";
  return {
    ...input,
    raw_observations: rawObservations,
    observation_progress_pct: observationProgress,
    cluster_progress_pct: clusterProgress,
    remaining_observations: Math.max(0, TARGET_RAW_OBSERVATIONS - rawObservations),
    remaining_clusters: Math.max(0, TARGET_UNIQUE_CLUSTERS - input.property_clusters),
    phase,
  };
}

export type AcquisitionWave = {
  wave_id: string;
  query_count: number;
  cities: string[];
  queries: QueryUniverseV2Item[];
};

export function buildAcquisitionWaves(
  queries: readonly QueryUniverseV2Item[],
  waveSize = DEFAULT_SCALE_WAVE_SIZE,
): AcquisitionWave[] {
  if (!Number.isInteger(waveSize) || waveSize < 1) throw new Error("waveSize must be a positive integer");
  const byCity = new Map<string, QueryUniverseV2Item[]>();
  for (const query of queries) {
    const list = byCity.get(query.city) ?? [];
    list.push(query);
    byCity.set(query.city, list);
  }
  for (const list of byCity.values()) {
    list.sort((a, b) => a.priority_tier - b.priority_tier || a.query_id.localeCompare(b.query_id));
  }

  const cities = [...byCity.keys()].sort();
  const ordered: QueryUniverseV2Item[] = [];
  let remaining = queries.length;
  while (remaining > 0) {
    for (const city of cities) {
      const next = byCity.get(city)?.shift();
      if (!next) continue;
      ordered.push(next);
      remaining -= 1;
    }
  }

  const waves: AcquisitionWave[] = [];
  for (let i = 0; i < ordered.length; i += waveSize) {
    const chunk = ordered.slice(i, i + waveSize);
    waves.push({
      wave_id: `scale-v1-${String(waves.length + 1).padStart(3, "0")}`,
      query_count: chunk.length,
      cities: [...new Set(chunk.map((q) => q.city))].sort(),
      queries: chunk,
    });
  }
  return waves;
}
