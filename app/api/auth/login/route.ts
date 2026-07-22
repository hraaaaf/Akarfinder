import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { setConsumerSessionCookies } from "@/lib/auth/session-cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password || email.length > 254 || password.length > 128) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS_FORMAT" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json({ error: "AUTHENTICATION_FAILED" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user: { email: data.user?.email ?? null } });
  setConsumerSessionCookies(response, data.session);
  return response;
}
