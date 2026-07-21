import type { ProfessionalCommercialTier, ProfessionalOrganization } from "./types";

export const PARTNER_COMMERCIAL_ACTIVATION_VERSION = "1.0" as const;

export type ProfessionalActivationStatus =
  | "pending"
  | "onboarding"
  | "review"
  | "active"
  | "paused"
  | "rejected";

export type SourceAuthorizationStatus = "none" | "pending" | "confirmed" | "revoked";

export type ProfessionalCommercialCapability =
  | "portfolio.manage"
  | "submissions.manage"
  | "media.manage"
  | "leads.receive"
  | "stats.basic"
  | "stats.advanced"
  | "branding.enhanced";

export type CommercialActivationOrganization = Pick<
  ProfessionalOrganization,
  "validation_status" | "commercial_tier"
> & {
  activation_status?: ProfessionalActivationStatus | null;
  source_authorization_status?: SourceAuthorizationStatus | null;
};

/**
 * Commercial capabilities are deliberately independent from search relevance.
 * A tier may unlock business tooling, never ranking/Fit/AkarScore weight.
 */
export function commercialCapabilitiesForOrganization(
  organization: CommercialActivationOrganization,
): ProfessionalCommercialCapability[] {
  if (organization.validation_status !== "validated") return [];
  if ((organization.activation_status ?? "pending") !== "active") return [];
  if ((organization.source_authorization_status ?? "none") !== "confirmed") return [];

  const capabilities: ProfessionalCommercialCapability[] = [
    "portfolio.manage",
    "submissions.manage",
    "media.manage",
    "leads.receive",
    "stats.basic",
  ];

  if (organization.commercial_tier === "gold" || organization.commercial_tier === "premium") {
    capabilities.push("stats.advanced");
  }
  if (organization.commercial_tier === "premium") {
    capabilities.push("branding.enhanced");
  }
  return capabilities;
}

export function hasCommercialCapability(
  organization: CommercialActivationOrganization,
  capability: ProfessionalCommercialCapability,
): boolean {
  return commercialCapabilitiesForOrganization(organization).includes(capability);
}

export function canSubmitPartnerProperty(organization: CommercialActivationOrganization): boolean {
  return hasCommercialCapability(organization, "submissions.manage");
}

export function canReceiveAssignedLeads(organization: CommercialActivationOrganization): boolean {
  return hasCommercialCapability(organization, "leads.receive");
}

export function commercialTierAffectsSearchRanking(_tier: ProfessionalCommercialTier): false {
  return false;
}
