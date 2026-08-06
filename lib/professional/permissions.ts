import type {
  ProfessionalCapability,
  ProfessionalMembershipContext,
  ProfessionalMembershipRole,
  ProfessionalOrganization,
  ProfessionalPermission,
} from "./types";

export const ALL_PROFESSIONAL_CAPABILITIES: readonly ProfessionalCapability[] = [
  "organization.read", "organization.update", "team.read", "team.manage",
  "catalogue.read", "catalogue.write", "catalogue.submit",
  "feed.read", "feed.import", "feed.review", "feed.approve", "feed.publish", "feed.rollback",
  "projects.read", "projects.write", "leads.read", "leads.manage", "analytics.read",
  "media.read", "media.write", "ownership.read", "ownership.manage",
] as const;

export const ROLE_CAPABILITIES: Record<ProfessionalMembershipRole, readonly ProfessionalCapability[]> = {
  owner: ALL_PROFESSIONAL_CAPABILITIES,
  admin: ALL_PROFESSIONAL_CAPABILITIES,
  editor: ["organization.read", "catalogue.read", "catalogue.write", "catalogue.submit", "feed.read", "feed.import", "feed.review", "projects.read", "projects.write", "leads.read", "analytics.read", "media.read", "media.write", "ownership.read"],
  analyst: ["organization.read", "catalogue.read", "feed.read", "feed.review", "projects.read", "leads.read", "analytics.read", "media.read", "ownership.read"],
  lead_manager: ["organization.read", "catalogue.read", "projects.read", "leads.read", "leads.manage", "analytics.read", "media.read", "ownership.read"],
  viewer: ["organization.read", "catalogue.read", "feed.read", "projects.read", "leads.read", "analytics.read", "media.read", "ownership.read"],
};

const DRAFT_CAPABILITIES = new Set<ProfessionalCapability>(["catalogue.write", "projects.write", "media.write"]);
const PUBLICATION_CAPABILITIES = new Set<ProfessionalCapability>(["feed.approve", "feed.publish", "feed.rollback"]);
const WRITE_CAPABILITIES = new Set<ProfessionalCapability>(ALL_PROFESSIONAL_CAPABILITIES.filter((capability) => capability.endsWith(".write") || capability.endsWith(".manage") || capability.endsWith(".update") || capability.endsWith(".submit") || capability.endsWith(".import") || capability.endsWith(".approve") || capability.endsWith(".publish") || capability.endsWith(".rollback")));

export type CapabilityDecisionReason = "allowed" | "membership_inactive" | "workspace_unavailable" | "role_denied" | "organization_not_validated" | "activation_inactive" | "source_rights_unconfirmed";
export type CapabilityDecision = { allowed: boolean; reason: CapabilityDecisionReason };

export function organizationAllowsCapability(organization: ProfessionalOrganization, capability: ProfessionalCapability): CapabilityDecision {
  const activation = organization.activation_status ?? "pending";
  if (activation === "paused" || activation === "rejected") return { allowed: false, reason: "activation_inactive" };

  if (DRAFT_CAPABILITIES.has(capability) && !["onboarding", "review", "active"].includes(activation)) {
    return { allowed: false, reason: "activation_inactive" };
  }

  if (PUBLICATION_CAPABILITIES.has(capability)) {
    if (organization.validation_status !== "validated") return { allowed: false, reason: "organization_not_validated" };
    if (activation !== "active") return { allowed: false, reason: "activation_inactive" };
    if ((organization.source_authorization_status ?? "none") !== "confirmed") return { allowed: false, reason: "source_rights_unconfirmed" };
  }

  return { allowed: true, reason: "allowed" };
}

export function decideCapability(context: ProfessionalMembershipContext, capability: ProfessionalCapability): CapabilityDecision {
  if (context.membership.status !== "active") return { allowed: false, reason: "membership_inactive" };
  if (context.workspace_status === "suspended" || context.workspace_status === "rejected") return { allowed: false, reason: "workspace_unavailable" };
  if (!ROLE_CAPABILITIES[context.membership.role].includes(capability)) return { allowed: false, reason: "role_denied" };
  if (WRITE_CAPABILITIES.has(capability) && context.workspace_status !== "active" && !DRAFT_CAPABILITIES.has(capability)) return { allowed: false, reason: "organization_not_validated" };
  return organizationAllowsCapability(context.organization, capability);
}

export function can(context: ProfessionalMembershipContext, capability: ProfessionalCapability): boolean { return decideCapability(context, capability).allowed; }
export function capabilitiesForRole(role: ProfessionalMembershipRole): ProfessionalCapability[] { return [...ROLE_CAPABILITIES[role]]; }

const LEGACY_PERMISSION_MAP: Record<ProfessionalPermission, ProfessionalCapability> = {
  "organization.read": "organization.read", "organization.manage": "organization.update", "members.manage": "team.manage",
  "listings.read": "catalogue.read", "listings.manage": "catalogue.write",
  "projects.read": "projects.read", "projects.manage": "projects.write",
  "leads.read": "leads.read", "leads.manage": "leads.manage", "stats.read": "analytics.read",
};

export function permissionsForRole(role: ProfessionalMembershipRole): ProfessionalPermission[] {
  return (Object.keys(LEGACY_PERMISSION_MAP) as ProfessionalPermission[]).filter((permission) => ROLE_CAPABILITIES[role].includes(LEGACY_PERMISSION_MAP[permission]));
}
export function roleHasPermission(role: ProfessionalMembershipRole, permission: ProfessionalPermission): boolean { return ROLE_CAPABILITIES[role].includes(LEGACY_PERMISSION_MAP[permission]); }

export function commercialTierBadgeLabel(tier: "none" | "partner" | "gold" | "premium"): string | null {
  if (tier === "premium") return "Partenaire Premium";
  if (tier === "gold") return "Agence partenaire Gold";
  if (tier === "partner") return "Partenaire AkarFinder";
  return null;
}

// Commercial status remains display/business metadata and never affects Search relevance.
