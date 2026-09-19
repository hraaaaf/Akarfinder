import type { VerifiedLandmarkEntry } from "./territory-landmark-registry";
import { getLandmarkVisualPriority } from "./territory-landmark-presentation";

export type LandmarkAnchor = {
  entry: VerifiedLandmarkEntry;
  x: number;
  y: number;
};

export type LandmarkPlaced = LandmarkAnchor & {
  cardX: number;
  cardY: number;
  width: number;
  height: number;
};

export type LandmarkReservedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function overlaps(a: LandmarkReservedRect, b: LandmarkReservedRect, gap = 8): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

function insideViewport(rect: LandmarkReservedRect, width: number, height: number, pad = 8): boolean {
  return (
    rect.x >= pad &&
    rect.y >= pad &&
    rect.x + rect.width <= width - pad &&
    rect.y + rect.height <= height - pad
  );
}

export function layoutLandmarkCards({
  anchors,
  viewportWidth,
  viewportHeight,
  reserved = [],
}: {
  anchors: readonly LandmarkAnchor[];
  viewportWidth: number;
  viewportHeight: number;
  reserved?: readonly LandmarkReservedRect[];
}): LandmarkPlaced[] {
  const mobile = viewportWidth < 640;
  const tablet = viewportWidth >= 640 && viewportWidth < 1024;
  const width = mobile ? 158 : tablet ? 170 : 194;
  const height = mobile ? 56 : 62;

  const offsets: Array<[number, number]> = [
    [16, -height - 10],
    [-width - 16, -height - 10],
    [16, 10],
    [-width - 16, 10],
    [-width / 2, -height - 20],
    [-width / 2, 20],
    [28, -height / 2],
    [-width - 28, -height / 2],
  ];

  const placed: LandmarkPlaced[] = [];
  const occupied: LandmarkReservedRect[] = [...reserved];

  const sorted = [...anchors].sort(
    (a, b) => getLandmarkVisualPriority(b.entry) - getLandmarkVisualPriority(a.entry),
  );

  for (const anchor of sorted) {
    let chosen: LandmarkReservedRect | null = null;
    for (const [dx, dy] of offsets) {
      const candidate = { x: anchor.x + dx, y: anchor.y + dy, width, height };
      if (!insideViewport(candidate, viewportWidth, viewportHeight)) continue;
      if (occupied.some((rect) => overlaps(candidate, rect))) continue;
      chosen = candidate;
      break;
    }
    if (!chosen) continue;

    placed.push({
      ...anchor,
      cardX: chosen.x,
      cardY: chosen.y,
      width,
      height,
    });
    occupied.push(chosen);
  }

  return placed;
}
