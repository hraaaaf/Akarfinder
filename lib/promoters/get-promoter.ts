import { PROMOTERS, PROJECTS } from "./promoters-data";
import type { Promoter, NewProject } from "./types";

export function getActivePromoter(slug: string): Promoter | null {
  return (
    PROMOTERS.find((p) => p.slug === slug && p.visibility_status === "active") ??
    null
  );
}

export function getActivePromoterProjects(promoterId: string): NewProject[] {
  return PROJECTS.filter(
    (p) => p.promoter_id === promoterId && p.visibility_status === "active"
  );
}

export function getAllActivePromoterSlugs(): string[] {
  return PROMOTERS.filter((p) => p.visibility_status === "active").map(
    (p) => p.slug
  );
}

// Accès démo interne — uniquement via ?preview=demo (jamais public).
export function getDemoPromoter(slug: string): Promoter | null {
  return (
    PROMOTERS.find((p) => p.slug === slug && p.visibility_status === "demo") ??
    null
  );
}

export function getDemoPromoterProjects(promoterId: string): NewProject[] {
  return PROJECTS.filter(
    (p) => p.promoter_id === promoterId && p.visibility_status === "demo"
  );
}
