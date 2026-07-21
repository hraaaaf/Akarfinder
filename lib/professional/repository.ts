import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { commercialTierBadgeLabel, permissionsForRole, roleHasPermission } from "./permissions";
import type {
  ProfessionalMembership,
  ProfessionalMembershipContext,
  ProfessionalOrganization,
  ProfessionalPermission,
  ProfessionalListingOwnership,
  PublicProfessionalProfile,
} from "./types";
import type { CreateProfessionalOrganizationInput } from "./validation";

function asOrganization(row: unknown): ProfessionalOrganization {
  return row as ProfessionalOrganization;
}

function asMembership(row: unknown): ProfessionalMembership {
  return row as ProfessionalMembership;
}

export async function listProfessionalContextsForUser(
  userId: string,
): Promise<ProfessionalMembershipContext[]> {
  const supabase = getSupabaseServerClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("professional_memberships")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipError) throw new Error(`[professional] memberships: ${membershipError.message}`);
  const typedMemberships = (memberships ?? []).map(asMembership);
  if (typedMemberships.length === 0) return [];

  const organizationIds = typedMemberships.map((membership) => membership.organization_id);
  const { data: organizations, error: organizationError } = await supabase
    .from("professional_organizations")
    .select("*")
    .in("id", organizationIds);

  if (organizationError) throw new Error(`[professional] organizations: ${organizationError.message}`);
  const byId = new Map((organizations ?? []).map((row) => {
    const organization = asOrganization(row);
    return [organization.id, organization] as const;
  }));

  return typedMemberships.flatMap((membership) => {
    const organization = byId.get(membership.organization_id);
    if (!organization) return [];
    return [{
      organization,
      membership,
      permissions: permissionsForRole(membership.role),
    }];
  });
}

export async function requireProfessionalPermission(
  userId: string,
  organizationId: string,
  permission: ProfessionalPermission,
): Promise<ProfessionalMembershipContext | null> {
  const contexts = await listProfessionalContextsForUser(userId);
  const context = contexts.find((candidate) => candidate.organization.id === organizationId);
  if (!context || !roleHasPermission(context.membership.role, permission)) return null;
  return context;
}

export async function createProfessionalOrganizationWithOwner(
  userId: string,
  input: CreateProfessionalOrganizationInput,
): Promise<ProfessionalMembershipContext> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const { data: organizationRow, error: organizationError } = await supabase
    .from("professional_organizations")
    .insert({
      organization_type: input.organization_type,
      slug: input.slug,
      legal_name: input.legal_name,
      display_name: input.display_name,
      city: input.city ?? null,
      validation_status: "pending",
      commercial_tier: "none",
      public_visibility: "draft",
      created_by: userId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (organizationError || !organizationRow) {
    throw new Error(`[professional] create organization: ${organizationError?.message ?? "unknown error"}`);
  }

  const organization = asOrganization(organizationRow);
  const { data: membershipRow, error: membershipError } = await supabase
    .from("professional_memberships")
    .insert({
      organization_id: organization.id,
      user_id: userId,
      role: "owner",
      status: "active",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (membershipError || !membershipRow) {
    await supabase.from("professional_organizations").delete().eq("id", organization.id).eq("created_by", userId);
    throw new Error(`[professional] create owner membership: ${membershipError?.message ?? "unknown error"}`);
  }

  const membership = asMembership(membershipRow);
  return {
    organization,
    membership,
    permissions: permissionsForRole(membership.role),
  };
}

export async function claimProfessionalListingOwnership(
  userId: string,
  organizationId: string,
  propertyListingId: number,
): Promise<ProfessionalListingOwnership | null> {
  const context = await requireProfessionalPermission(userId, organizationId, "listings.manage");
  if (!context) return null;

  const supabase = getSupabaseServerClient();
  const { data: listing } = await supabase
    .from("property_listings")
    .select("id")
    .eq("id", propertyListingId)
    .maybeSingle();
  if (!listing) throw new Error("LISTING_NOT_FOUND");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("professional_listing_ownership")
    .upsert({
      property_listing_id: propertyListingId,
      organization_id: organizationId,
      status: "claimed",
      claimed_by: userId,
      claimed_at: now,
      verified_by: null,
      verified_at: null,
      revoked_at: null,
    }, { onConflict: "property_listing_id,organization_id" })
    .select("*")
    .single();

  if (error || !data) throw new Error(`[professional] claim ownership: ${error?.message ?? "unknown error"}`);
  return data as ProfessionalListingOwnership;
}

export async function getPublicProfessionalProfileBySlug(
  slug: string,
): Promise<(PublicProfessionalProfile & { portfolio: { verified_listings: number; published_projects: number } }) | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("professional_organizations")
    .select("id, slug, organization_type, display_name, description, logo_url, website_url, city, commercial_tier")
    .eq("slug", slug)
    .eq("validation_status", "validated")
    .eq("public_visibility", "public")
    .maybeSingle();

  if (error) throw new Error(`[professional] public profile: ${error.message}`);
  if (!data) return null;

  const [{ count: verifiedListings }, { count: publishedProjects }] = await Promise.all([
    supabase
      .from("professional_listing_ownership")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", data.id)
      .eq("status", "verified"),
    supabase
      .from("professional_projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", data.id)
      .eq("status", "published")
      .eq("public_visibility", "public"),
  ]);

  return {
    id: data.id as string,
    slug: data.slug as string,
    organization_type: data.organization_type as PublicProfessionalProfile["organization_type"],
    display_name: data.display_name as string,
    description: (data.description as string | null) ?? null,
    logo_url: (data.logo_url as string | null) ?? null,
    website_url: (data.website_url as string | null) ?? null,
    city: (data.city as string | null) ?? null,
    commercial_tier: data.commercial_tier as PublicProfessionalProfile["commercial_tier"],
    commercial_badge_label: commercialTierBadgeLabel(data.commercial_tier as PublicProfessionalProfile["commercial_tier"]),
    portfolio: {
      verified_listings: verifiedListings ?? 0,
      published_projects: publishedProjects ?? 0,
    },
  };
}
