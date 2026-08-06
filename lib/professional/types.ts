export const PROFESSIONAL_DOMAIN_VERSION = "1.1" as const;

export type ProfessionalOrganizationType = "agency" | "promoter";
export type ProfessionalValidationStatus = "pending" | "validated" | "suspended" | "rejected";
export type ProfessionalWorkspaceStatus = "onboarding" | "active" | "suspended" | "rejected";
export type ProfessionalCommercialTier = "none" | "partner" | "gold" | "premium";
export type ProfessionalPublicVisibility = "draft" | "public" | "hidden";
export type ProfessionalMembershipRole =
  | "owner"
  | "admin"
  | "editor"
  | "analyst"
  | "lead_manager"
  | "viewer";
export type ProfessionalMembershipStatus = "invited" | "active" | "suspended";
export type ProfessionalActivationRequestStatus =
  | "received"
  | "qualified"
  | "onboarding"
  | "converted"
  | "rejected";
export type ProfessionalOwnershipStatus = "claimed" | "verified" | "revoked";
export type ProfessionalProjectStatus = "draft" | "published" | "archived";

export type ProfessionalPermission =
  | "organization.read"
  | "organization.manage"
  | "members.manage"
  | "listings.read"
  | "listings.manage"
  | "projects.read"
  | "projects.manage"
  | "leads.read"
  | "leads.manage"
  | "stats.read";

export interface ProfessionalOrganization {
  id: string;
  organization_type: ProfessionalOrganizationType;
  slug: string;
  legal_name: string;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  city: string | null;
  public_email: string | null;
  public_phone: string | null;
  validation_status: ProfessionalValidationStatus;
  commercial_tier: ProfessionalCommercialTier;
  public_visibility: ProfessionalPublicVisibility;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: ProfessionalMembershipRole;
  status: ProfessionalMembershipStatus;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalActivationRequest {
  id: string;
  lead_id: string;
  requested_type: ProfessionalOrganizationType | "exhibitor";
  company_name: string;
  city: string | null;
  requested_addons: unknown[];
  status: ProfessionalActivationRequestStatus;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  converted_at: string | null;
}

export interface ProfessionalListingOwnership {
  id: string;
  property_listing_id: number;
  organization_id: string;
  status: ProfessionalOwnershipStatus;
  claimed_by: string;
  verified_by: string | null;
  claimed_at: string;
  verified_at: string | null;
  revoked_at: string | null;
}

export interface ProfessionalProject {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  status: ProfessionalProjectStatus;
  public_visibility: ProfessionalPublicVisibility;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalMembershipContext {
  organization: ProfessionalOrganization;
  membership: ProfessionalMembership;
  permissions: ProfessionalPermission[];
  workspace_status: ProfessionalWorkspaceStatus;
  has_active_owner: true;
}

export interface ProfessionalIdentityResolution {
  active_context: ProfessionalMembershipContext | null;
  available_contexts: ProfessionalMembershipContext[];
  selection_source: "preferred" | "default" | "none";
}

export interface ConvertProfessionalActivationInput {
  activation_request_id: string;
  owner_user_id: string;
  slug: string;
  legal_name?: string | null;
  display_name?: string | null;
}

export interface ConvertProfessionalActivationResult {
  activation_request_id: string;
  organization_id: string;
  membership_id: string;
  converted_at: string;
}

export interface PublicProfessionalProfile {
  id: string;
  slug: string;
  organization_type: ProfessionalOrganizationType;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  city: string | null;
  commercial_tier: ProfessionalCommercialTier;
  commercial_badge_label: string | null;
}
