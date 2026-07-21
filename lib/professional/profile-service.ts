import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { requireProfessionalPermission } from "./repository";
import type { ProfessionalOrganization } from "./types";
import type { UpdateProfessionalProfileInput } from "./validation";

export async function updateProfessionalOrganizationProfile(
  userId: string,
  organizationId: string,
  input: UpdateProfessionalProfileInput,
): Promise<ProfessionalOrganization | null> {
  const context = await requireProfessionalPermission(userId, organizationId, "organization.manage");
  if (!context) return null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("professional_organizations")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", organizationId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`[professional] update profile: ${error?.message ?? "unknown error"}`);
  }
  return data as ProfessionalOrganization;
}
