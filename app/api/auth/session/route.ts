import { NextResponse, type NextRequest } from "next/server";
import { authenticateConsumerRequest, clearConsumerSessionCookies, refreshConsumerSession, setConsumerSessionCookies } from "@/lib/auth/session-cookies";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await authenticateConsumerRequest(request);
  if (identity) return NextResponse.json({ authenticated: true, user: { id: identity.user_id, email: identity.email } });

  const refreshed = await refreshConsumerSession(request);
  if (!refreshed) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearConsumerSessionCookies(response);
    return response;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(refreshed.access_token);
  if (error || !data.user) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearConsumerSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ authenticated: true, user: { id: data.user.id, email: data.user.email ?? null } });
  setConsumerSessionCookies(response, refreshed);
  return response;
}
