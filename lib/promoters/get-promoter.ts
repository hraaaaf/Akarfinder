import { PROMOTERS, PROJECTS } from "./promoters-data";
import type { Promoter, NewProject } from "./types";

// Legacy local promoter fixtures are demo-only.
// Real public promoter identity, visibility and commercial tier come exclusively
// from professional_organizations via /professionnels/[slug].
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
