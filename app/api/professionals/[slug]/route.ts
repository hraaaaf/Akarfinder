import { NextResponse } from "next/server";
import { getPublicProfessionalProfileBySlug } from "@/lib/professional/repository";
import { normalizeProfessionalSlug } from "@/lib/professional/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug: rawSlug } = await context.params;
    const slug = normalizeProfessionalSlug(rawSlug);
    if (!slug) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const profile = await getPublicProfessionalProfileBySlug(slug);
    if (!profile) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[api/professionals/:slug] failed", error);
    return NextResponse.json({ error: "PROFILE_UNAVAILABLE" }, { status: 503 });
  }
}
