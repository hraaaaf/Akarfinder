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
  | "publication.request"
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

/** Commercial tooling is deliberately independent from search relevance/Fit/AkarScore. */
export function commercialCapabilitiesForOrganization(
  organization: CommercialActivationOrganization,
): ProfessionalCommercialCapability[] {
  const activation = organization.activation_status ?? "pending";
  if (activation === "rejected" || activation === "paused") return [];

  const capabilities: ProfessionalCommercialCapability[] = [];
  if (activation === "onboarding" || activation === "review" || activation === "active") {
    capabilities.push("portfolio.manage", "submissions.manage", "media.manage");
  }

  const liveAuthorized =
    organization.validation_status === "validated" &&
    activation === "active" &&
    (organization.source_authorization_status ?? "none") === "confirmed";

  if (!liveAuthorized) return capabilities;

  capabilities.push("publication.request", "leads.receive", "stats.basic");
  if (organization.commercial_tier === "gold" || organization.commercial_tier === "premium") {
    capabilities.push("stats.advanced");
  }
  if (organization.commercial_tier === "premium") capabilities.push("branding.enhanced");
  return capabilities;
}

export function hasCommercialCapability(
  organization: CommercialActivationOrganization,
  capability: ProfessionalCommercialCapability,
): boolean {
  return commercialCapabilitiesForOrganization(organization).includes(capability);
}

export function canManagePartnerDrafts(organization: CommercialActivationOrganization): boolean {
  return hasCommercialCapability(organization, "submissions.manage");
}

export function canRequestPartnerPublication(organization: CommercialActivationOrganization): boolean {
  return hasCommercialCapability(organization, "publication.request");
}

export function canReceiveAssignedLeads(organization: CommercialActivationOrganization): boolean {
  return hasCommercialCapability(organization, "leads.receive");
}

export function commercialTierAffectsSearchRanking(_tier: ProfessionalCommercialTier): false {
  return false;
}
