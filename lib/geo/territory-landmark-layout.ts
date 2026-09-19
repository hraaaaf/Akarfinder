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

  const near = mobile ? 10 : 12;
  const side = mobile ? 14 : 16;
  const placed: LandmarkPlaced[] = [];
  const occupied: LandmarkReservedRect[] = [...reserved];

  const sorted = [...anchors].sort(
    (a, b) => getLandmarkVisualPriority(b.entry) - getLandmarkVisualPriority(a.entry),
  );
  const acceptedAnchors: LandmarkAnchor[] = [];
  const minAnchorSpacing = mobile ? 86 : tablet ? 98 : 112;

  for (const anchor of sorted) {
    const tooCloseToHigherPriority = acceptedAnchors.some(
      (accepted) => Math.hypot(accepted.x - anchor.x, accepted.y - anchor.y) < minAnchorSpacing,
    );
    if (tooCloseToHigherPriority) continue;

    const horizontal = anchor.x < viewportWidth / 2 ? -width - side : side;
    const oppositeHorizontal = horizontal > 0 ? -width - side : side;
    const vertical = anchor.y < viewportHeight / 2 ? -height - near : near;
    const oppositeVertical = vertical > 0 ? -height - near : near;
    const offsets: Array<[number, number]> = [
      [horizontal, vertical],
      [horizontal, oppositeVertical],
      [oppositeHorizontal, vertical],
      [oppositeHorizontal, oppositeVertical],
      [-width / 2, vertical],
      [-width / 2, oppositeVertical],
    ];
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
    acceptedAnchors.push(anchor);
  }

  return placed;
}
