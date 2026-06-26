import { PROJECTS, PROMOTERS } from "./promoters-data";
import type { NewProject, Promoter } from "./types";

export function getActiveProject(slug: string): NewProject | null {
  return (
    PROJECTS.find((p) => p.slug === slug && p.visibility_status === "active") ??
    null
  );
}

export function getProjectPromoter(promoterId: string): Promoter | null {
  return PROMOTERS.find((p) => p.id === promoterId) ?? null;
}

export function getAllActiveProjectSlugs(): string[] {
  return PROJECTS.filter((p) => p.visibility_status === "active").map(
    (p) => p.slug
  );
}

// Accès démo interne — uniquement via ?preview=demo (jamais public).
export function getDemoProject(slug: string): NewProject | null {
  return (
    PROJECTS.find((p) => p.slug === slug && p.visibility_status === "demo") ??
    null
  );
}
