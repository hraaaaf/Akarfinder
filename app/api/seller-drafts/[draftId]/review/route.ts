import { type NextRequest, NextResponse } from "next/server";
import { authorizeSellerDraftUpload } from "@/lib/seller/authorize-draft-upload";
import {
  canReviewerDecide,
  canSellerResubmit,
  normalizeSellerReviewReasons,
  type SellerReviewStatus,
} from "@/lib/seller/moderation";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const token = request.headers.get("x-draft-upload-token") ?? "";
  const auth = await authorizeSellerDraftUpload(draftId, token);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès au brouillon refusé." }, { status: 403 });

  const { data, error } = await auth.supabase
    .from("seller_property_drafts")
    .select("id, review_status, review_reasons, reviewer_note, seller_correction_note, reviewed_at, resubmitted_at, publication_eligible")
    .eq("id", draftId)
    .single();

  if (error || !data) return NextResponse.json({ ok: false, error: "Brouillon introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, draft: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const token = request.headers.get("x-draft-upload-token") ?? "";
  const auth = await authorizeSellerDraftUpload(draftId, token);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès au brouillon refusé." }, { status: 403 });

  const body = await request.json().catch(() => null) as { correction_note?: string } | null;
  const status = auth.draft.review_status as SellerReviewStatus;
  if (!canSellerResubmit(status)) {
    return NextResponse.json({ ok: false, error: "Aucune correction n’est demandée pour ce brouillon." }, { status: 409 });
  }

  const correctionNote = body?.correction_note?.trim().slice(0, 1200) ?? "";
  const now = new Date().toISOString();
  const { error } = await auth.supabase
    .from("seller_property_drafts")
    .update({
      review_status: "resubmitted",
      seller_correction_note: correctionNote || null,
      resubmitted_at: now,
      publication_eligible: false,
    })
    .eq("id", draftId)
    .eq("review_status", "needs_changes");

  if (error) return NextResponse.json({ ok: false, error: "Le brouillon n’a pas pu être renvoyé." }, { status: 500 });
  await auth.supabase.from("seller_property_draft_review_events").insert({
    draft_id: draftId,
    event_type: "resubmitted",
    note: correctionNote || null,
  });

  return NextResponse.json({ ok: true, status: "resubmitted" });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const expectedSecret = process.env.SELLER_REVIEW_SECRET;
  const providedSecret = request.headers.get("x-seller-review-secret");
  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "Accès à la revue refusé." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    decision?: "request_changes" | "approve";
    reasons?: unknown;
    note?: string;
  } | null;
  if (!body?.decision) return NextResponse.json({ ok: false, error: "Décision manquante." }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data: draft } = await supabase
    .from("seller_property_drafts")
    .select("id, review_status")
    .eq("id", draftId)
    .single();
  if (!draft || !canReviewerDecide(draft.review_status as SellerReviewStatus)) {
    return NextResponse.json({ ok: false, error: "Ce brouillon n’est pas prêt pour une décision." }, { status: 409 });
  }

  const reasons = normalizeSellerReviewReasons(body.reasons);
  const note = body.note?.trim().slice(0, 1200) || null;
  if (body.decision === "request_changes" && reasons.length === 0) {
    return NextResponse.json({ ok: false, error: "Choisissez au moins une correction simple." }, { status: 400 });
  }

  const approved = body.decision === "approve";
  const status = approved ? "approved" : "needs_changes";
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("seller_property_drafts")
    .update({
      review_status: status,
      review_reasons: approved ? [] : reasons,
      reviewer_note: note,
      reviewed_at: now,
      publication_eligible: false,
    })
    .eq("id", draftId);

  if (error) return NextResponse.json({ ok: false, error: "La décision n’a pas pu être enregistrée." }, { status: 500 });
  await supabase.from("seller_property_draft_review_events").insert({
    draft_id: draftId,
    event_type: approved ? "approved" : "changes_requested",
    reasons: approved ? [] : reasons,
    note,
  });

  return NextResponse.json({ ok: true, status, publication_eligible: false });
}
