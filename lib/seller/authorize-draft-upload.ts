import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { hashSellerUploadToken } from "@/lib/seller/photo-upload";

export async function authorizeSellerDraftUpload(draftId: string, token: string) {
  if (!draftId || !token) return null;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("seller_property_drafts")
    .select("id, upload_token_hash, review_status")
    .eq("id", draftId)
    .single();

  if (error || !data?.upload_token_hash) return null;
  if (hashSellerUploadToken(token) !== data.upload_token_hash) return null;
  return { supabase, draft: data };
}
