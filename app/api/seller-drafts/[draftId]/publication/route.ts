import { type NextRequest, NextResponse } from "next/server";
import { authorizeSellerDraftUpload } from "@/lib/seller/authorize-draft-upload";
import {
  nextSellerPublicationStatus,
  type SellerPublicationAction,
  type SellerPublicationStatus,
} from "@/lib/seller/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const token = request.headers.get("x-draft-upload-token") ?? "";
  const auth = await authorizeSellerDraftUpload(draftId, token);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès au dossier refusé." }, { status: 403 });

  const { data } = await auth.supabase
    .from("seller_listing_publications")
    .select("id, status, published_at, paused_at, withdrawn_at, last_owner_action_at")
    .eq("draft_id", draftId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    review_status: auth.draft.review_status,
    publication: data ?? { status: "unpublished" },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const token = request.headers.get("x-draft-upload-token") ?? "";
  const auth = await authorizeSellerDraftUpload(draftId, token);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès au dossier refusé." }, { status: 403 });

  const body = await request.json().catch(() => null) as { action?: SellerPublicationAction; confirmation?: boolean } | null;
  if (!body?.action || body.confirmation !== true) {
    return NextResponse.json({ ok: false, error: "Confirmez cette action sur votre annonce." }, { status: 400 });
  }

  if (body.action === "publish" && auth.draft.review_status !== "approved") {
    return NextResponse.json({ ok: false, error: "Le dossier doit être validé avant sa mise en ligne." }, { status: 409 });
  }

  const { data: existing } = await auth.supabase
    .from("seller_listing_publications")
    .select("id, status")
    .eq("draft_id", draftId)
    .maybeSingle();

  const current = (existing?.status as SellerPublicationStatus | undefined) ?? null;
  const next = nextSellerPublicationStatus(current, body.action);
  if (!next) return NextResponse.json({ ok: false, error: "Cette action n’est pas disponible dans l’état actuel." }, { status: 409 });

  const now = new Date().toISOString();
  const timestamps = {
    published_at: next === "live" ? now : existing ? undefined : null,
    paused_at: next === "paused" ? now : null,
    withdrawn_at: next === "withdrawn" ? now : null,
  };

  const payload = {
    draft_id: draftId,
    status: next,
    last_owner_action_at: now,
    updated_at: now,
    ...timestamps,
  };

  const query = existing
    ? auth.supabase.from("seller_listing_publications").update(payload).eq("id", existing.id)
    : auth.supabase.from("seller_listing_publications").insert(payload);
  const { data: publication, error } = await query.select("id, status, published_at, paused_at, withdrawn_at").single();
  if (error || !publication) return NextResponse.json({ ok: false, error: "L’état de l’annonce n’a pas pu être modifié." }, { status: 500 });

  await auth.supabase.from("seller_listing_publication_events").insert({
    publication_id: publication.id,
    event_type: body.action === "publish" ? "published" : body.action === "pause" ? "paused" : body.action === "resume" ? "resumed" : "withdrawn",
  });

  return NextResponse.json({ ok: true, publication });
}
