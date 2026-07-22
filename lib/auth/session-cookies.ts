import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import type { AuthIdentity } from "@/lib/auth/server-auth";

const ACCESS_COOKIE = "akarfinder_access_token";
const REFRESH_COOKIE = "akarfinder_refresh_token";
const ACCESS_MAX_AGE = 60 * 60;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export type ConsumerSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
};

export function setConsumerSessionCookies(response: NextResponse, session: ConsumerSession) {
  const common = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, session.access_token, {
    ...common,
    maxAge: Math.max(60, session.expires_in ?? ACCESS_MAX_AGE),
  });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, { ...common, maxAge: REFRESH_MAX_AGE });
}

export function clearConsumerSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export function readConsumerAccessToken(request: Pick<NextRequest, "cookies">): string | null {
  return request.cookies.get(ACCESS_COOKIE)?.value ?? null;
}

export async function authenticateConsumerRequest(
  request: Pick<NextRequest, "headers" | "cookies">,
): Promise<AuthIdentity | null> {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
  const token = bearer || readConsumerAccessToken(request);
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

export async function refreshConsumerSession(request: Pick<NextRequest, "cookies">): Promise<ConsumerSession | null> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return null;
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
  };
}
