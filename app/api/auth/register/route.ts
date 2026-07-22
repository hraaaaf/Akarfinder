import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { setConsumerSessionCookies } from "@/lib/auth/session-cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !validEmail(body.email) || typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS_FORMAT" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: body.email.trim().toLowerCase(),
    password: body.password,
  });
  if (error) {
    return NextResponse.json({ error: "REGISTRATION_FAILED" }, { status: 400 });
  }

  if (!data.session) {
    return NextResponse.json({ ok: true, confirmation_required: true });
  }

  const response = NextResponse.json({ ok: true, confirmation_required: false });
  setConsumerSessionCookies(response, data.session);
  return response;
}
