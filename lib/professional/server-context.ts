import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUserClient } from "@/lib/db/supabase-client";
import { authenticateProfessionalRequest, readBearerToken, type ProfessionalAuthIdentity } from "./auth";
import { resolveProfessionalIdentityForUserWithClient } from "./identity-repository";
import type { ProfessionalIdentityResolution } from "./types";

export type ProfessionalServerContext = {
  identity: ProfessionalAuthIdentity;
  supabase: SupabaseClient;
  resolution: ProfessionalIdentityResolution;
};

export async function resolveProfessionalServerContext(
  request: Pick<NextRequest, "headers">,
  preferredOrganizationId?: string | null,
): Promise<ProfessionalServerContext | null> {
  const accessToken = readBearerToken(request);
  if (!accessToken) return null;

  const identity = await authenticateProfessionalRequest(request);
  if (!identity) return null;

  const supabase = getSupabaseUserClient(accessToken);
  const resolution = await resolveProfessionalIdentityForUserWithClient(
    supabase,
    identity.user_id,
    preferredOrganizationId,
  );

  return { identity, supabase, resolution };
}
