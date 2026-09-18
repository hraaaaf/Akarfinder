export type AvitoDiscoveryLane = {
  key: string;
  source_ids: string[];
};

export type AvitoCoverageManifest = {
  source: "avito";
  generated_at: string;
  control_lane: string;
  control_unique_ids: number;
  union_unique_ids: number;
  lanes: Array<{
    key: string;
    unique_ids: number;
    overlap_with_control: number;
    control_coverage_ratio: number;
  }>;
  control_ids_missing_from_other_lanes: string[];
};

const AVITO_HOSTS = new Set(["avito.ma", "www.avito.ma"]);
const AVITO_DETAIL_ID_RE = /_(\d{6,})\.htm$/i;

function normalizeIds(ids: string[]): Set<string> {
  return new Set(ids.filter((id) => /^\d{6,}$/.test(id)));
}

export function parseAvitoSourceId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (!AVITO_HOSTS.has(url.hostname.toLowerCase())) return null;
  const match = url.pathname.match(AVITO_DETAIL_ID_RE);
  return match?.[1] ?? null;
}

export function buildAvitoCoverageManifest(
  lanes: AvitoDiscoveryLane[],
  controlLane: string,
  options: { now?: () => string } = {},
): AvitoCoverageManifest {
  const normalized = new Map<string, Set<string>>();
  for (const lane of lanes) normalized.set(lane.key, normalizeIds(lane.source_ids));

  const control = normalized.get(controlLane);
  if (!control) throw new Error(`Unknown Avito control lane: ${controlLane}`);

  const union = new Set<string>();
  for (const ids of normalized.values()) {
    for (const id of ids) union.add(id);
  }

  const otherUnion = new Set<string>();
  for (const [key, ids] of normalized) {
    if (key === controlLane) continue;
    for (const id of ids) otherUnion.add(id);
  }

  const laneReports = [...normalized.entries()].map(([key, ids]) => {
    let overlap = 0;
    for (const id of ids) if (control.has(id)) overlap++;

    return {
      key,
      unique_ids: ids.size,
      overlap_with_control: overlap,
      control_coverage_ratio: control.size === 0 ? 0 : overlap / control.size,
    };
  });

  return {
    source: "avito",
    generated_at: options.now?.() ?? new Date().toISOString(),
    control_lane: controlLane,
    control_unique_ids: control.size,
    union_unique_ids: union.size,
    lanes: laneReports,
    control_ids_missing_from_other_lanes: [...control].filter((id) => !otherUnion.has(id)),
  };
}
