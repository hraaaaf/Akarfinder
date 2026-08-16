import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { SELLER_PHOTO_BUCKET, SELLER_PHOTO_MAX_COUNT } from "@/lib/seller/photo-upload";

export const OWNER_LISTING_MEDIA_SIGNED_URL_TTL_SECONDS = 15 * 60;

type OwnerPhotoRow = {
  storage_path: string;
  position: number;
};

export function isSafeOwnerMediaStoragePath(draftId: string, storagePath: unknown): storagePath is string {
  if (typeof storagePath !== "string" || !storagePath) return false;
  if (!/^[0-9a-f-]{36}$/i.test(draftId)) return false;
  if (!storagePath.startsWith(`${draftId}/`)) return false;
  if (storagePath.includes("..") || storagePath.includes("\\")) return false;
  return /^[0-9a-f-]{36}\/[-0-9a-zA-Z_.]+$/.test(storagePath);
}

export async function queryOwnerListingMedia(
  draftId: string,
  supabase: SupabaseClient = getSupabaseServerClient(),
): Promise<string[]> {
  if (!/^[0-9a-f-]{36}$/i.test(draftId)) return [];

  const { data, error } = await supabase
    .from("seller_property_draft_photos")
    .select("storage_path, position")
    .eq("draft_id", draftId)
    .eq("upload_status", "uploaded")
    .order("position", { ascending: true })
    .limit(SELLER_PHOTO_MAX_COUNT);

  if (error || !data?.length) return [];

  const rows = data as OwnerPhotoRow[];
  const paths = rows
    .map((row) => row.storage_path)
    .filter((value): value is string => isSafeOwnerMediaStoragePath(draftId, value));
  if (paths.length === 0) return [];

  const { data: signed, error: signingError } = await supabase.storage
    .from(SELLER_PHOTO_BUCKET)
    .createSignedUrls(paths, OWNER_LISTING_MEDIA_SIGNED_URL_TTL_SECONDS);
  if (signingError || !signed) return [];

  return signed.flatMap((item) => {
    const value = item.signedUrl;
    if (typeof value !== "string") return [];
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? [value] : [];
    } catch {
      return [];
    }
  });
}
