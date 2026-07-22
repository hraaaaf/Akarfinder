import { NextResponse } from "next/server";
import { clearConsumerSessionCookies } from "@/lib/auth/session-cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearConsumerSessionCookies(response);
  return response;
}
