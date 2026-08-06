import { organizationAllowsCapability } from "./permissions";
import type {
  ProfessionalCommercialTier,
  ProfessionalOrganization,
  ProfessionalActivationStatus,
  ProfessionalSourceAuthorizationStatus,
} from "./types";

export const PARTNER_COMMERCIAL_ACTIVATION_VERSION = "1.1" as const;
export type { ProfessionalActivationStatus, ProfessionalSourceAuthorizationStatus } from "./types";
export type SourceAuthorizationStatus = ProfessionalSourceAuthorizationStatus;

/** Legacy presentation vocabulary kept for compatibility only. */
export type ProfessionalCommercialCapability =
  | "portfolio.manage" | "submissions.manage" | "media.manage"
  | "publication.request" | "leads.receive" | "stats.basic" | "stats.advanced" | "branding.enhanced";

export type CommercialActivationOrganization = Pick<
  ProfessionalOrganization,
  "validation_status" | "commercial_tier"
> & {
  activation_status?: ProfessionalActivationStatus | null;
  source_authorization_status?: ProfessionalSourceAuthorizationStatus | null;
};

function asProfessionalOrganization(organization: CommercialActivationOrganization): ProfessionalOrganization {
  return {
    id: "commercial-gate", organization_type: "agency", slug: "commercial-gate", legal_name: "Commercial gate", display_name: "Commercial gate",
    description: null, logo_url: null, website_url: null, city: null, public_email: null, public_phone: null,
    validation_status: organization.validation_status, commercial_tier: organization.commercial_tier, public_visibility: "draft",
    created_by: "commercial-gate", created_at: "1970-01-01T00:00:00.000Z", updated_at: "1970-01-01T00:00:00.000Z",
    activation_status: organization.activation_status, source_authorization_status: organization.source_authorization_status,
  };
}

/** Commercial tooling remains independent from Search relevance/Fit/AkarScore. */
export function commercialCapabilitiesForOrganization(organization: CommercialActivationOrganization): ProfessionalCommercialCapability[] {
  const canonical = asProfessionalOrganization(organization);
  const capabilities: ProfessionalCommercialCapability[] = [];
  if (organizationAllowsCapability(canonical, "projects.write").allowed) capabilities.push("portfolio.manage");
  if (organizationAllowsCapability(canonical, "catalogue.write").allowed) capabilities.push("submissions.manage");
  if (organizationAllowsCapability(canonical, "media.write").allowed) capabilities.push("media.manage");
  if (organizationAllowsCapability(canonical, "feed.publish").allowed) {
    capabilities.push("publication.request", "leads.receive", "stats.basic");
    if (organization.commercial_tier === "gold" || organization.commercial_tier === "premium") capabilities.push("stats.advanced");
    if (organization.commercial_tier === "premium") capabilities.push("branding.enhanced");
  }
  return capabilities;
}

export function hasCommercialCapability(organization: CommercialActivationOrganization, capability: ProfessionalCommercialCapability): boolean {
  return commercialCapabilitiesForOrganization(organization).includes(capability);
}
export function canManagePartnerDrafts(organization: CommercialActivationOrganization): boolean { return hasCommercialCapability(organization, "submissions.manage"); }
export function canRequestPartnerPublication(organization: CommercialActivationOrganization): boolean { return hasCommercialCapability(organization, "publication.request"); }
export function canReceiveAssignedLeads(organization: CommercialActivationOrganization): boolean { return hasCommercialCapability(organization, "leads.receive"); }
export function commercialTierAffectsSearchRanking(_tier: ProfessionalCommercialTier): false { return false; }
