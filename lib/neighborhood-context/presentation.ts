import type { NeighborhoodContextCoverageStatus } from "@/lib/neighborhood-context/read-model";

export function neighborhoodCoverageLabel(status: NeighborhoodContextCoverageStatus): string {
  if (status === "covered") return "Couvert";
  if (status === "partial") return "Partiel";
  if (status === "insufficient") return "Insuffisant";
  return "Indisponible";
}

export function neighborhoodCoverageDescription(status: NeighborhoodContextCoverageStatus): string {
  if (status === "covered") return "repères vérifiés disponibles";
  if (status === "partial") return "contexte partiel, sans complément inventé";
  if (status === "insufficient") return "peu de repères certifiés disponibles";
  return "aucun repère frais certifié disponible";
}

export function formatNeighborhoodContextObservedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
