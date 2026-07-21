import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  normalizeInternalNotes,
  validateLeadStatusUpdate,
} from "@/lib/leads/lead-admin";
import { commercialTierBadgeLabel, permissionsForRole, roleHasPermission } from "./permissions";
import type {
  ProfessionalListingOwnership,
  ProfessionalMembership,
  ProfessionalMembershipContext,
  ProfessionalMembershipRole,
  ProfessionalOrganization,
  ProfessionalPermission,
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

export async function listProfessionalMembers(
  userId: string,
  organizationId: string,
): Promise<ProfessionalMembership[] | null> {
  const context = await requireProfessionalPermission(userId, organizationId, "members.manage");
  if (!context) return null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("professional_memberships")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`[professional] list members: ${error.message}`);
  return (data ?? []).map(asMembership);
}

export async function addProfessionalMember(
  actorUserId: string,
  organizationId: string,
  targetUserId: string,
  role: ProfessionalMembershipRole,
): Promise<ProfessionalMembership | null> {
  const context = await requireProfessionalPermission(actorUserId, organizationId, "members.manage");
  if (!context) return null;
  if (role === "owner" && context.membership.role !== "owner") {
    throw new Error("OWNER_ROLE_REQUIRES_OWNER");
  }

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("professional_memberships")
    .upsert({
      organization_id: organizationId,
      user_id: targetUserId,
      role,
      status: "active",
      updated_at: now,
    }, { onConflict: "organization_id,user_id" })
    .select("*")
    .single();

  if (error || !data) throw new Error(`[professional] add member: ${error?.message ?? "unknown error"}`);
  return asMembership(data);
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

export async function getProfessionalPrivateStats(
  userId: string,
  organizationId: string,
): Promise<{
  listings_claimed: number;
  listings_verified: number;
  projects_total: number;
  leads_assigned: number;
} | null> {
  const context = await requireProfessionalPermission(userId, organizationId, "stats.read");
  if (!context) return null;

  const supabase = getSupabaseServerClient();
  const [claimed, verified, projects, leads] = await Promise.all([
    supabase.from("professional_listing_ownership").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "claimed"),
    supabase.from("professional_listing_ownership").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "verified"),
    supabase.from("professional_projects").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("professional_lead_assignments").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);

  for (const result of [claimed, verified, projects, leads]) {
    if (result.error) throw new Error(`[professional] stats: ${result.error.message}`);
  }

  return {
    listings_claimed: claimed.count ?? 0,
    listings_verified: verified.count ?? 0,
    projects_total: projects.count ?? 0,
    leads_assigned: leads.count ?? 0,
  };
}

export async function listAssignedProfessionalLeads(
  userId: string,
  organizationId: string,
  limit = 50,
): Promise<Record<string, unknown>[] | null> {
  const context = await requireProfessionalPermission(userId, organizationId, "leads.read");
  if (!context) return null;

  const supabase = getSupabaseServerClient();
  const { data: assignments, error: assignmentError } = await supabase
    .from("professional_lead_assignments")
    .select("lead_id, assigned_at")
    .eq("organization_id", organizationId)
    .order("assigned_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (assignmentError) throw new Error(`[professional] lead assignments: ${assignmentError.message}`);

  const leadIds = (assignments ?? []).map((row) => row.lead_id as string);
  if (leadIds.length === 0) return [];

  const { data: leads, error: leadError } = await supabase
    .from("buyer_leads")
    .select("id, created_at, updated_at, lead_type, source_channel, listing_id, project_id, city, neighborhood, budget_total, property_type, desired_surface_m2, bedrooms, timing, is_mre, residence_country, full_name, phone_whatsapp, message, lead_temperature, lead_score, status, visit_status, internal_notes")
    .in("id", leadIds)
    .order("created_at", { ascending: false });
  if (leadError) throw new Error(`[professional] assigned leads: ${leadError.message}`);
  return (leads ?? []) as Record<string, unknown>[];
}

export async function updateAssignedProfessionalLead(
  userId: string,
  organizationId: string,
  leadId: string,
  patch: { status?: unknown; internal_notes?: unknown },
): Promise<Record<string, unknown> | null> {
  const context = await requireProfessionalPermission(userId, organizationId, "leads.manage");
  if (!context) return null;

  const supabase = getSupabaseServerClient();
  const { data: assignment, error: assignmentError } = await supabase
    .from("professional_lead_assignments")
    .select("lead_id")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .maybeSingle();
  if (assignmentError) throw new Error(`[professional] lead assignment check: ${assignmentError.message}`);
  if (!assignment) throw new Error("LEAD_NOT_ASSIGNED");

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) {
    const status = validateLeadStatusUpdate(patch.status);
    if (!status) throw new Error("INVALID_LEAD_STATUS");
    update.status = status;
  }
  if (patch.internal_notes !== undefined) {
    update.internal_notes = normalizeInternalNotes(patch.internal_notes);
  }
  if (Object.keys(update).length === 1) throw new Error("EMPTY_LEAD_UPDATE");

  const { data, error } = await supabase
    .from("buyer_leads")
    .update(update)
    .eq("id", leadId)
    .select("id, updated_at, status, internal_notes")
    .single();
  if (error || !data) throw new Error(`[professional] update lead: ${error?.message ?? "unknown error"}`);
  return data as Record<string, unknown>;
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
