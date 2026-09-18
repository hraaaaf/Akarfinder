export type ProjectedTerritoryLabel = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visibilityScore: number;
  retainPriority: boolean;
};

export type LabelStabilityInput = {
  candidates: readonly ProjectedTerritoryLabel[];
  maxLabels: number;
  previousVisibleIds?: ReadonlySet<string>;
  paddingPx?: number;
  hysteresisBonus?: number;
};

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function toRect(label: ProjectedTerritoryLabel, paddingPx: number): Rect {
  const halfWidth = label.width / 2 + paddingPx;
  const halfHeight = label.height / 2 + paddingPx;
  return {
    left: label.x - halfWidth,
    right: label.x + halfWidth,
    top: label.y - halfHeight,
    bottom: label.y + halfHeight,
  };
}

function intersects(a: Rect, b: Rect): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

export function selectStableTerritoryLabels({
  candidates,
  maxLabels,
  previousVisibleIds = new Set<string>(),
  paddingPx = 6,
  hysteresisBonus = 4,
}: LabelStabilityInput): ProjectedTerritoryLabel[] {
  if (!Number.isInteger(maxLabels) || maxLabels <= 0) return [];
  if (!Number.isFinite(paddingPx) || paddingPx < 0) return [];
  if (!Number.isFinite(hysteresisBonus) || hysteresisBonus < 0) return [];

  const sorted = [...candidates]
    .filter((candidate) =>
      Number.isFinite(candidate.x) &&
      Number.isFinite(candidate.y) &&
      Number.isFinite(candidate.width) &&
      candidate.width > 0 &&
      Number.isFinite(candidate.height) &&
      candidate.height > 0 &&
      Number.isFinite(candidate.visibilityScore),
    )
    .sort((a, b) => {
      if (a.retainPriority !== b.retainPriority) return a.retainPriority ? -1 : 1;

      const aStable = a.visibilityScore + (previousVisibleIds.has(a.id) ? hysteresisBonus : 0);
      const bStable = b.visibilityScore + (previousVisibleIds.has(b.id) ? hysteresisBonus : 0);
      if (aStable !== bStable) return bStable - aStable;

      return a.id.localeCompare(b.id);
    });

  const accepted: ProjectedTerritoryLabel[] = [];
  const acceptedRects: Rect[] = [];

  for (const candidate of sorted) {
    if (accepted.length >= maxLabels) break;
    const rect = toRect(candidate, paddingPx);
    if (acceptedRects.some((existing) => intersects(existing, rect))) continue;
    accepted.push(candidate);
    acceptedRects.push(rect);
  }

  return accepted;
}
