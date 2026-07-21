import type {
  ProfessionalMembershipRole,
  ProfessionalPermission,
} from "./types";

const ALL_PERMISSIONS: ProfessionalPermission[] = [
  "organization.read",
  "organization.manage",
  "members.manage",
  "listings.read",
  "listings.manage",
  "projects.read",
  "projects.manage",
  "leads.read",
  "leads.manage",
  "stats.read",
];

const ROLE_PERMISSIONS: Record<ProfessionalMembershipRole, readonly ProfessionalPermission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  editor: [
    "organization.read",
    "listings.read",
    "listings.manage",
    "projects.read",
    "projects.manage",
  ],
  analyst: [
    "organization.read",
    "listings.read",
    "projects.read",
    "leads.read",
    "stats.read",
  ],
  lead_manager: [
    "organization.read",
    "listings.read",
    "projects.read",
    "leads.read",
    "leads.manage",
  ],
  viewer: [
    "organization.read",
    "listings.read",
    "projects.read",
  ],
};

export function permissionsForRole(role: ProfessionalMembershipRole): ProfessionalPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function roleHasPermission(
  role: ProfessionalMembershipRole,
  permission: ProfessionalPermission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function commercialTierBadgeLabel(tier: "none" | "partner" | "gold" | "premium"): string | null {
  if (tier === "premium") return "Partenaire Premium";
  if (tier === "gold") return "Agence partenaire Gold";
  if (tier === "partner") return "Partenaire AkarFinder";
  return null;
}

// Deliberately no ranking weight/boost function exists here.
// Commercial status is display/business metadata, never relevance.
