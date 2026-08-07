import type { NeighborhoodConfidence } from "@/lib/map/canonical-neighborhood-data";

export const MAP_VISUAL_TOKENS = {
  accent: "#0B63CE",
  accentHover: "#084FA8",
  accentSoft: "#EEF6FF",
  accentHalo: "#60A5FA",
  navy: "#0B1F3A",
  muted: "#64748B",
  border: "#DDE7F2",
  surface: "#FFFFFF",
} as const;

export const MAP_CONFIDENCE_META: Record<
  NeighborhoodConfidence,
  { label: string; color: string; soft: string }
> = {
  high: {
    label: "Confiance élevée",
    color: "#15803D",
    soft: "#F0FDF4",
  },
  medium: {
    label: "Confiance moyenne",
    color: "#B45309",
    soft: "#FFFBEB",
  },
  low: {
    label: "Confiance limitée",
    color: "#C2410C",
    soft: "#FFF7ED",
  },
};

export function getMapConfidenceMeta(confidence: NeighborhoodConfidence) {
  return MAP_CONFIDENCE_META[confidence];
}
