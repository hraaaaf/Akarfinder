import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { permissionsForRole } from "./permissions";
import { resolveActiveProfessionalContext, workspaceStatusFromValidation } from "./identity";
import type {
  ConvertProfessionalActivationInput,
  ConvertProfessionalActivationResult,
  ProfessionalIdentityResolution,
  ProfessionalMembership,
  ProfessionalMembershipContext,
  ProfessionalOrganization,
} from "./types";

function asOrganization(row: unknown): ProfessionalOrganization {
  return row as ProfessionalOrganization;
}

function asMembership(row: unknown): ProfessionalMembership {
  return row as ProfessionalMembership;
}

export async function listCanonicalProfessionalContextsForUser(
  userId: string,
): Promise<ProfessionalMembershipContext[]> {
  const supabase = getSupabaseServerClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("professional_memberships")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipError) {
    throw new Error(`[professional-identity] memberships: ${membershipError.message}`);
  }

  const typedMemberships = (memberships ?? []).map(asMembership);
  if (typedMemberships.length === 0) return [];

  const organizationIds = [...new Set(
    typedMemberships.map((membership) => membership.organization_id),
  )];

  const [{ data: organizations, error: organizationError }, { data: owners, error: ownerError }] = await Promise.all([
    supabase
      .from("professional_organizations")
      .select("*")
      .in("id", organizationIds),
    supabase
      .from("professional_memberships")
      .select("organization_id")
      .in("organization_id", organizationIds)
      .eq("role", "owner")
      .eq("status", "active"),
  ]);

  if (organizationError) {
    throw new Error(`[professional-identity] organizations: ${organizationError.message}`);
  }
  if (ownerError) {
    throw new Error(`[professional-identity] owners: ${ownerError.message}`);
  }

  const organizationsById = new Map((organizations ?? []).map((row) => {
    const organization = asOrganization(row);
    return [organization.id, organization] as const;
  }));
  const organizationsWithActiveOwner = new Set(
    (owners ?? []).map((row) => row.organization_id as string),
  );

  return typedMemberships.flatMap((membership) => {
    const organization = organizationsById.get(membership.organization_id);
    if (!organization || !organizationsWithActiveOwner.has(organization.id)) return [];

    return [{
      organization,
      membership,
      permissions: permissionsForRole(membership.role),
      workspace_status: workspaceStatusFromValidation(organization.validation_status),
      has_active_owner: true as const,
    }];
  });
}

export async function resolveProfessionalIdentityForUser(
  userId: string,
  preferredOrganizationId?: string | null,
): Promise<ProfessionalIdentityResolution> {
  const contexts = await listCanonicalProfessionalContextsForUser(userId);
  return resolveActiveProfessionalContext(contexts, preferredOrganizationId);
}

export async function convertProfessionalActivationToOrganization(
  input: ConvertProfessionalActivationInput,
): Promise<ConvertProfessionalActivationResult> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "convert_professional_activation_request",
    {
      p_activation_request_id: input.activation_request_id,
      p_owner_user_id: input.owner_user_id,
      p_slug: input.slug,
      p_legal_name: input.legal_name ?? null,
      p_display_name: input.display_name ?? null,
    },
  );

  if (error) {
    throw new Error(`[professional-identity] conversion: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("PROFESSIONAL_ACTIVATION_CONVERSION_EMPTY");

  return {
    activation_request_id: row.activation_request_id as string,
    organization_id: row.organization_id as string,
    membership_id: row.membership_id as string,
    converted_at: row.converted_at as string,
  };
}
