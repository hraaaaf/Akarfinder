import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import type { CanonicalPropertyType } from "@/lib/property-schema/core";
import { requireProfessionalPermission } from "./repository";
import {
  canManagePartnerDrafts,
  canRequestPartnerPublication,
  commercialCapabilitiesForOrganization,
  type CommercialActivationOrganization,
  type ProfessionalActivationStatus,
  type SourceAuthorizationStatus,
} from "./commercial-activation";
import {
  canSubmitPartnerOnboardingForReview,
  computePartnerOnboardingCompleteness,
  type PartnerDeclaredFacts,
  type PartnerOnboardingStep,
} from "./partner-property-onboarding";

export type PartnerPropertySubmissionRow = {
  id: string;
  organization_id: string;
  property_listing_id: number | null;
  schema_version: string;
  property_type: CanonicalPropertyType;
  transaction_type: "sale" | "rent";
  current_step: number;
  status: "draft" | "in_review" | "approved" | "rejected" | "published" | "archived";
  declared_facts: PartnerDeclaredFacts;
  weighted_completeness: number;
  submitted_by: string;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

function asCommercialOrganization(value: unknown): CommercialActivationOrganization {
  return value as CommercialActivationOrganization;
}

async function requireDraftAccess(userId: string, organizationId: string) {
  const context = await requireProfessionalPermission(userId, organizationId, "listings.manage");
  if (!context) return null;
  return canManagePartnerDrafts(asCommercialOrganization(context.organization)) ? context : null;
}

export async function getProfessionalCommercialDashboard(userId: string, organizationId: string) {
  const context = await requireProfessionalPermission(userId, organizationId, "organization.read");
  if (!context) return null;
  const supabase = getSupabaseServerClient();
  const organization = asCommercialOrganization(context.organization);
  const [submissions, projects, media, assignments] = await Promise.all([
    supabase.from("professional_property_submissions").select("id,status", { count: "exact" }).eq("organization_id", organizationId),
    supabase.from("professional_projects").select("id,status", { count: "exact" }).eq("organization_id", organizationId),
    supabase.from("professional_media_assets").select("id,status", { count: "exact" }).eq("organization_id", organizationId),
    supabase.from("professional_lead_assignments").select("id", { count: "exact" }).eq("organization_id", organizationId),
  ]);
  return {
    organization: context.organization,
    role: context.membership.role,
    permissions: context.permissions,
    commercial_capabilities: commercialCapabilitiesForOrganization(organization),
    counts: {
      submissions: submissions.count ?? 0,
      projects: projects.count ?? 0,
      media: media.count ?? 0,
      assigned_leads: assignments.count ?? 0,
    },
  };
}

export async function listPartnerPropertySubmissions(userId: string, organizationId: string) {
  const context = await requireProfessionalPermission(userId, organizationId, "listings.read");
  if (!context) return null;
  const { data, error } = await getSupabaseServerClient()
    .from("professional_property_submissions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`[professional] submissions: ${error.message}`);
  return (data ?? []) as PartnerPropertySubmissionRow[];
}

export async function createPartnerPropertySubmission(
  userId: string,
  organizationId: string,
  input: { property_type: CanonicalPropertyType; transaction_type: "sale" | "rent" },
): Promise<PartnerPropertySubmissionRow | null> {
  const context = await requireDraftAccess(userId, organizationId);
  if (!context) return null;
  const now = new Date().toISOString();
  const declaredFacts: PartnerDeclaredFacts = {
    "classification.property_type": input.property_type,
    "offer.transaction_type": input.transaction_type,
  };
  const completeness = computePartnerOnboardingCompleteness(input.property_type, declaredFacts);
  const { data, error } = await getSupabaseServerClient()
    .from("professional_property_submissions")
    .insert({
      organization_id: organizationId,
      schema_version: "1.0",
      property_type: input.property_type,
      transaction_type: input.transaction_type,
      current_step: 1,
      status: "draft",
      declared_facts: declaredFacts,
      weighted_completeness: completeness.score,
      submitted_by: userId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`[professional] create submission: ${error?.message ?? "unknown error"}`);
  return data as PartnerPropertySubmissionRow;
}

export async function savePartnerPropertySubmission(
  userId: string,
  organizationId: string,
  submissionId: string,
  input: { declared_facts: PartnerDeclaredFacts; current_step: PartnerOnboardingStep },
): Promise<PartnerPropertySubmissionRow | null> {
  const context = await requireDraftAccess(userId, organizationId);
  if (!context) return null;
  const supabase = getSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .from("professional_property_submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existingError) throw new Error(`[professional] submission lookup: ${existingError.message}`);
  if (!existing) return null;
  if (!["draft", "rejected"].includes(existing.status as string)) throw new Error("SUBMISSION_NOT_EDITABLE");

  const propertyType = existing.property_type as CanonicalPropertyType;
  const immutableFacts = {
    ...input.declared_facts,
    "classification.property_type": propertyType,
    "offer.transaction_type": existing.transaction_type,
  };
  const completeness = computePartnerOnboardingCompleteness(propertyType, immutableFacts);
  const { data, error } = await supabase
    .from("professional_property_submissions")
    .update({
      declared_facts: immutableFacts,
      current_step: input.current_step,
      weighted_completeness: completeness.score,
      status: "draft",
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("organization_id", organizationId)
    .select("*")
    .single();
  if (error || !data) throw new Error(`[professional] save submission: ${error?.message ?? "unknown error"}`);
  return data as PartnerPropertySubmissionRow;
}

export async function submitPartnerPropertyForReview(userId: string, organizationId: string, submissionId: string) {
  const context = await requireDraftAccess(userId, organizationId);
  if (!context) return null;
  const supabase = getSupabaseServerClient();
  const { data: existing, error: lookupError } = await supabase
    .from("professional_property_submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (lookupError) throw new Error(`[professional] submission lookup: ${lookupError.message}`);
  if (!existing) return null;
  if (!["draft", "rejected"].includes(existing.status as string)) throw new Error("SUBMISSION_NOT_SUBMITTABLE");

  const eligibility = canSubmitPartnerOnboardingForReview(
    existing.property_type as CanonicalPropertyType,
    (existing.declared_facts ?? {}) as PartnerDeclaredFacts,
  );
  if (!eligibility.ok) return eligibility;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("professional_property_submissions")
    .update({ status: "in_review", submitted_at: now, updated_at: now, weighted_completeness: eligibility.score })
    .eq("id", submissionId)
    .eq("organization_id", organizationId)
    .select("*")
    .single();
  if (error || !data) throw new Error(`[professional] submit review: ${error?.message ?? "unknown error"}`);
  return { ok: true as const, submission: data as PartnerPropertySubmissionRow };
}

export async function requestApprovedPartnerPublication(userId: string, organizationId: string, submissionId: string) {
  const context = await requireProfessionalPermission(userId, organizationId, "listings.manage");
  if (!context) return null;
  if (!canRequestPartnerPublication(asCommercialOrganization(context.organization))) {
    return { ok: false as const, reason: "ORGANIZATION_NOT_LIVE_AUTHORIZED" };
  }
  const { data, error } = await getSupabaseServerClient()
    .from("professional_property_submissions")
    .select("id,status,property_listing_id")
    .eq("id", submissionId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(`[professional] publication lookup: ${error.message}`);
  if (!data) return null;
  if (data.status !== "approved") return { ok: false as const, reason: "SUBMISSION_NOT_APPROVED" };
  // #19C intentionally does not bypass canonical publication ingestion. The approved
  // submission is now eligible to be consumed by the authorized partner ingestion path.
  return { ok: true as const, submission_id: data.id as string, property_listing_id: (data.property_listing_id as number | null) ?? null };
}

export async function reviewPartnerPropertySubmissionByStaff(
  staffUserId: string,
  submissionId: string,
  decision: "approved" | "rejected",
  rejectionReason?: string | null,
) {
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseServerClient()
    .from("professional_property_submissions")
    .update({
      status: decision,
      reviewed_by: staffUserId,
      reviewed_at: now,
      rejection_reason: decision === "rejected" ? (rejectionReason?.trim().slice(0, 1000) || "Révision demandée") : null,
      updated_at: now,
    })
    .eq("id", submissionId)
    .eq("status", "in_review")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`[professional] review submission: ${error.message}`);
  return data as PartnerPropertySubmissionRow | null;
}

export async function setProfessionalActivationByStaff(
  staffUserId: string,
  organizationId: string,
  input: {
    activation_status: ProfessionalActivationStatus;
    source_authorization_status: SourceAuthorizationStatus;
    validation_status?: "pending" | "validated" | "suspended" | "rejected";
    commercial_tier?: "none" | "partner" | "gold" | "premium";
  },
) {
  const { data, error } = await getSupabaseServerClient()
    .from("professional_organizations")
    .update({
      activation_status: input.activation_status,
      source_authorization_status: input.source_authorization_status,
      ...(input.validation_status ? { validation_status: input.validation_status } : {}),
      ...(input.commercial_tier ? { commercial_tier: input.commercial_tier } : {}),
      activation_reviewed_by: staffUserId,
      activation_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`[professional] activation update: ${error.message}`);
  return data;
}

export async function listPartnerMedia(userId: string, organizationId: string) {
  const context = await requireProfessionalPermission(userId, organizationId, "listings.read");
  if (!context) return null;
  const { data, error } = await getSupabaseServerClient()
    .from("professional_media_assets")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[professional] media: ${error.message}`);
  return data ?? [];
}

export async function createPartnerMedia(
  userId: string,
  organizationId: string,
  input: {
    submission_id?: string;
    project_id?: string;
    media_type: "image" | "video" | "floor_plan" | "document";
    url: string;
    source_url?: string | null;
    rights_status: "allowed" | "partner_only" | "unknown" | "forbidden";
    publication_permission: "allowed" | "partner_only" | "forbidden" | "unknown";
    attribution?: string | null;
  },
) {
  const context = await requireDraftAccess(userId, organizationId);
  if (!context) return null;
  if (!!input.submission_id === !!input.project_id) throw new Error("MEDIA_OWNER_REQUIRED");
  const { data, error } = await getSupabaseServerClient()
    .from("professional_media_assets")
    .insert({
      organization_id: organizationId,
      submission_id: input.submission_id ?? null,
      project_id: input.project_id ?? null,
      media_type: input.media_type,
      url: input.url,
      source_url: input.source_url ?? null,
      rights_status: input.rights_status,
      publication_permission: input.publication_permission,
      attribution: input.attribution?.trim().slice(0, 300) || null,
      uploaded_by: userId,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`[professional] create media: ${error?.message ?? "unknown error"}`);
  return data;
}
