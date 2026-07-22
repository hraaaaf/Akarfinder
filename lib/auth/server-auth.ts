import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

export type AuthIdentity = {
  user_id: string;
  email: string | null;
  is_akarfinder_staff: boolean;
};

export function readBearerToken(request: Pick<NextRequest, "headers">): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

export async function authenticateBearerRequest(
  request: Pick<NextRequest, "headers">,
): Promise<AuthIdentity | null> {
  const token = readBearerToken(request);
  if (!token) return null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const appMetadata = data.user.app_metadata as Record<string, unknown> | undefined;
  return {
    user_id: data.user.id,
    email: data.user.email ?? null,
    is_akarfinder_staff: appMetadata?.akarfinder_staff === true,
  };
}
