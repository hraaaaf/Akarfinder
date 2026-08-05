import { type NextRequest, NextResponse } from "next/server";
import { authorizeSellerDraftUpload } from "@/lib/seller/authorize-draft-upload";
import { hasExpectedImageSignature } from "@/lib/seller/photo-signature";
import {
  extensionForSellerPhoto,
  SELLER_PHOTO_ALLOWED_TYPES,
  SELLER_PHOTO_BUCKET,
  SELLER_PHOTO_MAX_BYTES,
  SELLER_PHOTO_MAX_COUNT,
} from "@/lib/seller/photo-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const token = request.headers.get("x-draft-upload-token") ?? "";
  const auth = await authorizeSellerDraftUpload(draftId, token);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès au brouillon refusé." }, { status: 403 });

  const form = await request.formData();
  const value = form.get("photo");
  if (!(value instanceof File)) return NextResponse.json({ ok: false, error: "Photo manquante." }, { status: 400 });
  if (!SELLER_PHOTO_ALLOWED_TYPES.includes(value.type as (typeof SELLER_PHOTO_ALLOWED_TYPES)[number])) {
    return NextResponse.json({ ok: false, error: "Formats acceptés : JPG, PNG ou WebP." }, { status: 400 });
  }
  if (value.size <= 0 || value.size > SELLER_PHOTO_MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "La photo doit faire moins de 15 Mo." }, { status: 400 });
  }

  const { count } = await auth.supabase
    .from("seller_property_draft_photos")
    .select("id", { count: "exact", head: true })
    .eq("draft_id", draftId);
  if ((count ?? 0) >= SELLER_PHOTO_MAX_COUNT) {
    return NextResponse.json({ ok: false, error: "Le maximum de 12 photos est atteint." }, { status: 409 });
  }

  const bytes = new Uint8Array(await value.arrayBuffer());
  if (!hasExpectedImageSignature(bytes, value.type)) {
    return NextResponse.json({ ok: false, error: "Le fichier ne correspond pas à une image valide." }, { status: 400 });
  }

  const position = count ?? 0;
  const storagePath = `${draftId}/${crypto.randomUUID()}.${extensionForSellerPhoto(value.type)}`;
  const { error: uploadError } = await auth.supabase.storage
    .from(SELLER_PHOTO_BUCKET)
    .upload(storagePath, bytes, { contentType: value.type, upsert: false, cacheControl: "3600" });
  if (uploadError) return NextResponse.json({ ok: false, error: "La photo n’a pas pu être envoyée." }, { status: 500 });

  const { data: photo, error: insertError } = await auth.supabase
    .from("seller_property_draft_photos")
    .insert({
      draft_id: draftId,
      storage_path: storagePath,
      original_name: value.name.slice(0, 180),
      mime_type: value.type,
      byte_size: value.size,
      position,
      upload_status: "uploaded",
    })
    .select("id, position")
    .single();

  if (insertError || !photo) {
    await auth.supabase.storage.from(SELLER_PHOTO_BUCKET).remove([storagePath]);
    return NextResponse.json({ ok: false, error: "La photo n’a pas pu être rattachée au brouillon." }, { status: 500 });
  }

  await auth.supabase
    .from("seller_property_drafts")
    .update({ photo_count: position + 1, review_status: "ready_for_review", publication_eligible: false })
    .eq("id", draftId);

  return NextResponse.json({ ok: true, photo_id: photo.id, position: photo.position, status: "ready_for_review" });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const token = request.headers.get("x-draft-upload-token") ?? "";
  const auth = await authorizeSellerDraftUpload(draftId, token);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès au brouillon refusé." }, { status: 403 });

  const body = await request.json().catch(() => null) as { photo_id?: string } | null;
  if (!body?.photo_id) return NextResponse.json({ ok: false, error: "Photo manquante." }, { status: 400 });

  const { data: photo } = await auth.supabase
    .from("seller_property_draft_photos")
    .select("id, storage_path")
    .eq("id", body.photo_id)
    .eq("draft_id", draftId)
    .single();
  if (!photo) return NextResponse.json({ ok: false, error: "Photo introuvable." }, { status: 404 });

  await auth.supabase.storage.from(SELLER_PHOTO_BUCKET).remove([photo.storage_path]);
  await auth.supabase.from("seller_property_draft_photos").delete().eq("id", photo.id);
  const { count } = await auth.supabase.from("seller_property_draft_photos").select("id", { count: "exact", head: true }).eq("draft_id", draftId);
  await auth.supabase.from("seller_property_drafts").update({
    photo_count: count ?? 0,
    review_status: (count ?? 0) > 0 ? "ready_for_review" : "draft",
    publication_eligible: false,
  }).eq("id", draftId);

  return NextResponse.json({ ok: true, photo_count: count ?? 0 });
}
